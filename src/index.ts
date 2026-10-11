import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

type StylingOption = "Tailwind" | "CSS Modules" | "None";
type PackageManager = "bun" | "pnpm" | "yarn" | "npm";
type FileExtension = "tsx" | "jsx";
type ScriptExtension = "ts" | "js";
/** "desktop" is one Tauri project that builds for Windows, macOS and Linux. */
type TauriPlatform = "desktop" | "android" | "ios";
type TargetPlatform = "web" | TauriPlatform;
/** Desktop signing is per OS, so signing is keyed by OS rather than by platform. */
type SigningTarget = "windows" | "linux" | "macos" | "android" | "ios";
type UserOS = "windows" | "macos" | "linux";
type Outcome = "added" | "skipped" | "partial" | "failed";
type InitResult = "ok" | "manual" | "failed";
type MobileResult = "ok" | "skipped" | "manual" | "failed";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyJson = Record<string, any>;

interface CliFlags {
  /** Create: overwrite the directory. */
  force: boolean;
  typescript: boolean | undefined;
  tailwind: boolean;
  cssModules: boolean;
  noStyle: boolean;
  noInstall: boolean;
  platforms: TargetPlatform[];
  appName: string | undefined;
  /** Reverse-domain prefix for the bundle identifier, e.g. com.acme. */
  org: string | undefined;
  sign: boolean | undefined;
  /** --yes: skip the confirmation prompt (remove). */
  yes: boolean;
  /** --no-git: skip `git init` on create. */
  noGit: boolean;
  /** --all: clean also clears the Rust build cache (src-tauri/target). */
  all: boolean;
  packageManager: PackageManager | undefined;
}

interface ProjectAnswers {
  typescript: boolean;
  styling: StylingOption;
  /** Web was selected (or nothing else is left to build). */
  web: boolean;
  /** Desktop / mobile targets picked for a new project. */
  platforms: TauriPlatform[];
  appName: string;
  /** Bundle identifier prefix (only used when native platforms are selected). */
  org: string;
  /** iOS was requested on a machine that is not a Mac, so it was left out. */
  iosSkipped: boolean;
}

interface PackageJsonScripts {
  [key: string]: string | undefined;
}

interface NativePackagePatch {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

interface DetectedProject {
  root: string;
  name: string;
  typescript: boolean;
  mainExt: FileExtension;
  pm: PackageManager;
  hasNative: boolean;
  nativeReady: boolean;
  hasAndroid: boolean;
  hasIos: boolean;
  signing: Record<SigningTarget, boolean>;
}

interface SigningContext {
  projectPath: string;
  tauriDir: string;
  platform: TauriPlatform;
  userOS: UserOS;
  signFlag: boolean | undefined;
  pm: PackageManager;
}

interface InitTauriOptions {
  projectPath: string;
  pm: PackageManager;
  projectName: string;
  appName: string;
  /** Bundle identifier prefix, e.g. com.acme (identifier becomes com.acme.<project>). */
  org: string;
  /** true when @tauri-apps/cli is in the project's node_modules */
  localCli: boolean;
}

/* ================================================================== */
/* Constants + logging                                                  */
/* ================================================================== */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "..", "assets");

/** Read and parse a JSON file synchronously (function declaration: usable before its position in the file). */
function readJsonSync<T = AnyJson>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

const BINIJS_VERSION = readJsonSync<{ version: string }>(path.join(__dirname, "..", "package.json")).version;

/** Colours follow the usual conventions: off with NO_COLOR or when piped, forced with FORCE_COLOR. */
const colorEnabled =
  !process.env.NO_COLOR &&
  ((process.env.FORCE_COLOR !== undefined && process.env.FORCE_COLOR !== "0") || Boolean(process.stdout.isTTY));
const ansi = (code: number): string => (colorEnabled ? `\x1b[${code}m` : "");

const c = {
  reset: ansi(0),
  bold: ansi(1),
  dim: ansi(2),
  cyan: ansi(36),
  green: ansi(32),
  yellow: ansi(33),
  red: ansi(31),
  blue: ansi(34),
  magenta: ansi(35),
};

const LOGO = `
${c.cyan}${c.bold}
            XXXXXXXXXXXXXXXX
         XXXXXXXXXXXXXXXXXXXXXz
       YXXXXXXXXXXXXXXXXXXXXXXXX
      vXXXXXXXXXXn    YXXXXXXXXXX
      XXXXXXXXX        XXXXXXXXXX
      XXXXXXXXX       XXXXXXXXXX
      XXXXXXXXX  XXXXXXXXXXXXXX
      XXXXXXXXX  XXXXXXXXXXXYz
      XXXXXXXXX  XXXXXXXXXXXXXXXXY
      XXXXXXXXX      YXXXXXXXXXXXXX
      XXXXXXXXX          YXXXXXXXXXX
      XXXXXXXXX           XXXXXXXXXz
      XXXXXXXXX  Xn     YXXXXXXXXXX
      XXXXXXXXX  XXXXXXXXXXXXXXXXXX
      XXXXXXXXX  XXXXXXXXXXXXXXXX
      XXXXXXXXX  XXXXXXXXXXXXX
${c.reset}
${c.dim}        Developed By Binidu${c.reset}
`;

const REQUIRED_NODE = "20.19.0";
const MAX_PROJECT_WALK = 5;
const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const INVALID_NAME_PATTERN = /^(\.|\.\.|-|npm$|node$)|[^a-z0-9\-.]/;
/** Subcommand names cannot be used as a project name. */
const SUBCOMMANDS = new Set(["add", "sign", "remove", "doctor", "clean", "upgrade"]);
const DEFAULT_ORG = "com.bini";
const TAURI_PREREQUISITES_URL = "https://v2.tauri.app/start/prerequisites/";

const TARGET_PLATFORMS: TargetPlatform[] = ["web", "desktop", "android", "ios"];
const NATIVE_PLATFORMS: TauriPlatform[] = ["desktop", "android", "ios"];

const PLATFORM_LABELS: Record<TargetPlatform, string> = {
  web: "Web",
  desktop: "Desktop (Windows, macOS, Linux)",
  android: "Android",
  ios: "iOS",
};

const log = {
  info: (m: string) => console.log(`${c.cyan}${c.bold}INFO${c.reset} ${m}`),
  success: (m: string) => console.log(`${c.green}${c.bold}OK${c.reset} ${m}`),
  warn: (m: string) => console.log(`${c.yellow}${c.bold}WARN${c.reset} ${m}`),
  error: (m: string) => console.error(`${c.red}${c.bold}ERROR${c.reset} ${m}`),
  step: (m: string) => console.log(`${c.blue}${c.bold}STEP${c.reset} ${m}`),
  skip: (m: string) => console.log(`${c.yellow}${c.bold}SKIP${c.reset} ${m}`),
  command: (m: string) => console.log(`${c.magenta}${c.bold}RUN${c.reset} ${m}`),
  plain: (m: string) => console.log(m),
};

/* ================================================================== */
/* Process lifecycle                                                    */
/* ================================================================== */

/** Manual follow-ups collected during a run; a non-empty list means exit code 2 in add mode. */
const followUps: string[] = [];

function exit(code = 1): never {
  process.exit(code);
}

function addFollowUp(message: string): void {
  if (!followUps.includes(message)) followUps.push(message);
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/** Ctrl-C inside an inquirer prompt rejects with ExitPromptError: treat it as a clean cancel. */
function isPromptCancel(err: unknown): boolean {
  return err instanceof Error && err.name === "ExitPromptError";
}

function fatal(err: unknown, label: string): never {
  if (isPromptCancel(err)) {
    log.plain("");
    log.warn("Operation cancelled.");
    exit(130);
  }
  log.error(`${label}: ${err instanceof Error ? err.message : String(err)}`);
  exit(1);
}

process.on("SIGINT", () => {
  log.plain("");
  log.warn("Operation cancelled.");
  exit(130);
});
process.on("SIGTERM", () => {
  exit(143);
});
process.on("uncaughtException", (e) => fatal(e, "Uncaught exception"));
process.on("unhandledRejection", (r) => fatal(r, "Unhandled rejection"));

const parseVersion = (v: string): number[] => v.split(".").map(Number);

function checkNodeVersion(): void {
  const [major = 0, minor = 0] = parseVersion(process.versions.node);
  const [reqMajor = 0, reqMinor = 0] = parseVersion(REQUIRED_NODE);
  if (!(major > reqMajor || (major === reqMajor && minor >= reqMinor))) {
    log.error(`Node.js v${REQUIRED_NODE}+ required. Current: ${process.version}`);
    log.info("Update at https://nodejs.org");
    exit(1);
  }
}

/* ================================================================== */
/* Prompts (@inquirer/prompts is loaded lazily)                         */
/* ================================================================== */

type Prompts = typeof import("@inquirer/prompts");
let promptsPromise: Promise<Prompts> | null = null;
const loadPrompts = (): Promise<Prompts> => (promptsPromise ??= import("@inquirer/prompts"));

/**
 * One look for every prompt: no help line, round bullets, a cyan pointer and quiet disabled rows.
 * Icons carry their own colour codes, so cyan is re-applied after every reset inside a highlighted row.
 */
const promptTheme = {
  prefix: { idle: `${c.cyan}?${c.reset}`, done: `${c.green}\u2714${c.reset}` },
  helpMode: "never",
  icon: {
    checked: `${c.green}\u25C9${c.reset}`,
    unchecked: `${c.dim}\u25CB${c.reset}`,
    cursor: `${c.cyan}\u276F${c.reset}`,
  },
  style: {
    highlight: (text: string) => `${c.cyan}${text.replace(/\x1b\[(?:0|39)m/g, (m) => `${m}${c.cyan}`)}${c.reset}`,
    help: () => "",
  },
};
const plainTheme = { prefix: promptTheme.prefix } as never;

async function select<T>(o: { message: string; choices: { name: string; value: T }[]; default?: T }): Promise<T> {
  const p = await loadPrompts();
  return p.select<T>({ ...o, loop: false, theme: promptTheme as never });
}

async function input(o: { message: string; default?: string; validate?: (v: string) => true | string }): Promise<string> {
  const p = await loadPrompts();
  return p.input({ ...o, theme: plainTheme });
}

async function password(o: { message: string; mask?: string | boolean; validate?: (v: string) => true | string }): Promise<string> {
  const p = await loadPrompts();
  return p.password({ ...o, theme: plainTheme });
}

/** Locked options become dimmed separator rows: visible, aligned, skipped by the arrow keys. */
async function checkbox<T>(o: {
  message: string;
  choices: { name: string; value: T; checked?: boolean; disabled?: boolean | string }[];
  required?: boolean;
}): Promise<T[]> {
  const p = await loadPrompts();
  const choices = o.choices.map((ch) =>
    ch.disabled
      ? new p.Separator(
          `${c.dim}${ch.checked ? "\u25C9" : "\u25CB"} ${ch.name}${typeof ch.disabled === "string" ? ` ${ch.disabled}` : ""}${c.reset}`
        )
      : ch
  );
  return p.checkbox<T>({ ...o, choices: choices as never, loop: false, theme: promptTheme as never });
}

const confirm = (o: { message: string; default?: boolean }): Promise<boolean> =>
  select<boolean>({
    message: o.message,
    choices: [
      { name: "Yes", value: true },
      { name: "No", value: false },
    ],
    default: o.default !== false,
  });

/* ================================================================== */
/* Generic helpers                                                      */
/* ================================================================== */

function toTitleCase(slug: string): string {
  const words = slug.split(/[-_.\s]+/).filter(Boolean);
  return words.length === 0 ? "My App" : words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function detectUserOS(): UserOS {
  return process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux";
}

function validateProjectName(name: string): boolean {
  return (
    !!name &&
    name.length <= 50 &&
    !WINDOWS_RESERVED_NAMES.test(name) &&
    !SUBCOMMANDS.has(name) &&
    !INVALID_NAME_PATTERN.test(name)
  );
}

const isTargetPlatform = (v: string): v is TargetPlatform => (TARGET_PLATFORMS as string[]).includes(v);

const PROJECT_NAME_RULE =
  "Use lowercase letters, numbers, and hyphens only. Max 50 chars. Command names (add, sign, remove, doctor, clean, upgrade) are reserved.";

const ORG_RULE = "Use a reverse domain: lowercase letters and numbers in dot-separated parts, e.g. com.acme";

/** Reverse-DNS prefix with at least two parts. No hyphens, so it is also a valid Android package. */
const validateOrg = (org: string): boolean => org.length <= 80 && /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(org);

/** Single-quoted JS string literal (for generated source files). */
const jsString = (value: string): string => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

const normalizeAppName = (value: string): string => value.replace(/\s+/g, " ").trim();

/** Shown instead of any iOS setup when the machine is not a Mac. */
const iosNeedsMacMessage = (deployCommand: string): string =>
  `iOS requires macOS. Run \`${deployCommand}\` and choose iOS: it sets up the GitHub Action and pushes to GitHub.`;

/* ---- file system ---- */

async function writeFile(filePath: string, content: string | Buffer, mode = 0o644): Promise<void> {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  await fsPromises.writeFile(filePath, content, { mode });
}

function safeRm(targetPath: string, allowedBase = process.cwd()): void {
  if (!targetPath) throw new Error("Path required.");
  const resolved = path.resolve(targetPath);
  const base = path.resolve(allowedBase);
  const relative = path.relative(base, resolved);

  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to delete: "${resolved}" is outside the allowed base "${base}".`);
  }
  const protectedPaths = [path.resolve("/"), process.env.HOME, process.env.USERPROFILE]
    .filter((p): p is string => Boolean(p))
    .map((p) => path.resolve(p));
  if (protectedPaths.includes(resolved)) throw new Error("Refusing to delete a system directory.");
  if (resolved.split(path.sep).filter(Boolean).length < 2) {
    throw new Error("Refusing to delete a root-level directory (safety check).");
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}

/* ---- processes ---- */

const commandExistsCache = new Map<string, boolean>();

/** Spawns `which` / `where` directly (no shell) and caches the answer. */
function commandExists(command: string): boolean {
  const cached = commandExistsCache.get(command);
  if (cached !== undefined) return cached;
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [command], { stdio: "ignore", windowsHide: true });
  const found = !r.error && r.status === 0;
  commandExistsCache.set(command, found);
  return found;
}

const quoteWinArg = (a: string): string => (/[\s&|<>^()%"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);

/**
 * Run a binary with an argument array (no interpolation of untrusted values).
 * On Windows `.cmd` shims (npm, pnpm, yarn, npx) need a shell, so args are quoted explicitly.
 */
function runBin(bin: string, args: string[], cwd: string, timeout = 120_000): boolean {
  const options = {
    cwd,
    stdio: "inherit" as const,
    timeout,
    windowsHide: true,
    env: colorEnabled ? { ...process.env, FORCE_COLOR: "1" } : process.env,
  };
  const r =
    process.platform === "win32"
      ? spawnSync([bin, ...args.map(quoteWinArg)].join(" "), { ...options, shell: true })
      : spawnSync(bin, args, options);
  return !r.error && r.status === 0;
}

const displayCmd = (bin: string, args: string[]): string =>
  [bin, ...args].map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ");

const pmRun = (pm: PackageManager, script: string): string => `${pm} run ${script}`;

/** Invoke the project's local `tauri` script (same for every package manager). */
const pmTauri = (pm: PackageManager, args: string[]): { bin: string; args: string[] } =>
  pm === "npm" ? { bin: "npm", args: ["run", "tauri", "--", ...args] } : { bin: pm, args: ["run", "tauri", ...args] };

/** With the CLI installed locally use the project script, otherwise a one-off runner (no node_modules changes). */
function tauriCmd(pm: PackageManager, args: string[], localCli: boolean): { bin: string; args: string[] } {
  if (localCli) return pmTauri(pm, args);
  if (pm === "pnpm") return { bin: "pnpm", args: ["dlx", "@tauri-apps/cli", ...args] };
  if (pm === "bun") return { bin: "bunx", args: ["@tauri-apps/cli", ...args] };
  return { bin: "npx", args: ["--yes", "@tauri-apps/cli", ...args] };
}

/** Toolchain checks are the Tauri CLI's job (`tauri info`), so we only point at it. */
function printToolchainHint(pm: PackageManager): void {
  log.info(`Check your toolchain with ${c.cyan}${pmRun(pm, "doctor")}${c.reset}`);
  log.plain(`     ${c.dim}Prerequisites: ${TAURI_PREREQUISITES_URL}${c.reset}`);
}

/* ---- package manager detection ---- */

const PM_PRIORITY: PackageManager[] = ["bun", "pnpm", "yarn", "npm"];

const LOCK_FILES: [file: string, pm: PackageManager][] = [
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

const INSTALL_ARGS: Record<PackageManager, string[]> = {
  npm: ["install", "--no-audit", "--no-fund", "--loglevel=error"],
  yarn: ["install", "--silent", "--no-progress"],
  pnpm: ["install", "--reporter=silent", "--config.enable-pre-post-scripts=true"],
  bun: ["install", "--silent"],
};

/** Order: explicit flag, lockfile (add mode), npm_config_user_agent (npx / pnpm dlx / bunx), installed binaries. */
function resolvePackageManager(
  requested: PackageManager | undefined,
  projectRoot?: string
): { pm: PackageManager; failed: boolean } {
  if (requested) {
    if (!commandExists(requested)) {
      log.error(`Requested package manager "${requested}" was not found on PATH.`);
      exit(1);
    }
    return { pm: requested, failed: false };
  }

  if (projectRoot) {
    const hit = LOCK_FILES.find(([file]) => fs.existsSync(path.join(projectRoot, file)));
    if (hit) return { pm: hit[1], failed: false };
  }

  const ua = process.env.npm_config_user_agent?.split(" ")[0]?.split("/")[0];
  const fromUa = PM_PRIORITY.find((p) => p === ua);
  if (fromUa) return { pm: fromUa, failed: false };

  const installed = PM_PRIORITY.find(commandExists);
  if (installed) return { pm: installed, failed: false };

  log.warn("Could not detect a package manager. Install npm, yarn, pnpm, or bun.");
  return { pm: "npm", failed: true };
}

function installDependencies(projectPath: string, pm: PackageManager, showCd = true): boolean {
  log.step(`Installing dependencies with ${pm}...`);
  if (runBin(pm, INSTALL_ARGS[pm], projectPath, 300_000)) {
    log.success("Dependencies installed.");
    return true;
  }
  log.warn("Auto-install failed. Run manually:");
  if (showCd) log.plain(`    ${c.green}cd ${path.basename(projectPath)}${c.reset}`);
  log.plain(`    ${c.green}${pm} install${c.reset}`);
  return false;
}

/* ================================================================== */
/* Command catalog: what each platform can run                          */
/* ================================================================== */

interface CommandGroup {
  title: string;
  commands: [script: string, description: string][];
}

const COMMAND_CATALOG: Record<TargetPlatform, CommandGroup> = {
  web: {
    title: "Web",
    commands: [
      ["dev", "Start the dev server"],
      ["build", "Production build"],
      ["start", "Serve the production build"],
      ["preview", "Preview the production build"],
    ],
  },
  desktop: {
    title: "Desktop",
    commands: [
      ["tauri:dev", "Launch the desktop app"],
      ["tauri:build", "Build a distributable"],
    ],
  },
  android: {
    title: "Android",
    commands: [
      ["android", "Run on an emulator or device"],
      ["android:build", "Build an APK / AAB"],
    ],
  },
  ios: {
    title: "iOS",
    commands: [
      ["ios", "Run on a simulator or device (macOS only)"],
      ["ios:build", "Build the iOS app (macOS only)"],
    ],
  },
};

/** Only relevant once a desktop / mobile platform is part of the project. */
const SIGN_GROUP: CommandGroup = {
  title: "Signing",
  commands: [["sign", "Set up or redo code signing"]],
};

/** Platform-independent: shown once, whatever platforms were picked. */
const DEPLOY_GROUP: CommandGroup = {
  title: "Deploy",
  commands: [["deploy", "Deploy to github"]],
};

const MAINTENANCE_GROUP: CommandGroup = {
  title: "Maintenance",
  commands: [
    ["clean", "Delete build output and caches"],
    ["upgrade", "Update dependencies to the latest versions"],
  ],
};

/** Print one titled block per selected platform, in a fixed order, then Signing (native only), Maintenance and Deploy. */
function printCommands(pm: PackageManager, selected: TargetPlatform[]): void {
  const platformGroups = TARGET_PLATFORMS.filter((p) => selected.includes(p)).map((p) => COMMAND_CATALOG[p]);
  if (platformGroups.length === 0) return;
  const hasNative = selected.some((p) => p !== "web");
  const maintenance: CommandGroup = {
    ...MAINTENANCE_GROUP,
    commands: [
      ...MAINTENANCE_GROUP.commands,
      ...(hasNative ? ([["doctor", "Check your machine for Tauri (tauri info)"]] as [string, string][]) : []),
    ],
  };
  const groups = [...platformGroups, ...(hasNative ? [SIGN_GROUP] : []), maintenance, DEPLOY_GROUP];
  const width = Math.max(...groups.flatMap((g) => g.commands.map(([s]) => pmRun(pm, s).length)));

  for (const group of groups) {
    log.plain(`\n${c.bold}${c.cyan}${group.title}${c.reset}`);
    for (const [script, description] of group.commands) {
      log.plain(`  ${c.green}${pmRun(pm, script).padEnd(width)}${c.reset}  ${c.dim}${description}${c.reset}`);
    }
  }
}

/* ================================================================== */
/* Argument parsing (node:util parseArgs)                               */
/* ================================================================== */

const CLI_OPTIONS = {
  platform: { type: "string" },
  "app-name": { type: "string" },
  org: { type: "string" },
  typescript: { type: "boolean" },
  javascript: { type: "boolean" },
  "no-typescript": { type: "boolean" },
  tailwind: { type: "boolean" },
  "css-modules": { type: "boolean" },
  none: { type: "boolean" },
  force: { type: "boolean" },
  "no-install": { type: "boolean" },
  "no-git": { type: "boolean" },
  yes: { type: "boolean", short: "y" },
  all: { type: "boolean" },
  sign: { type: "boolean" },
  nosign: { type: "boolean" },
  // Package manager flags: the flag name is the package manager name.
  npm: { type: "boolean" },
  pnpm: { type: "boolean" },
  yarn: { type: "boolean" },
  bun: { type: "boolean" },
} as const;

function printHelp(): void {
  log.plain(`
${c.bold}${c.cyan}Usage:${c.reset}
  create-bini-app [project-name] [options]        Create a new project
  create-bini-app add <targets> [options]         Add platform(s) inside an existing Bini project
  create-bini-app sign [targets]                  Set up or redo code signing (this OS, Android, iOS on macOS)
  create-bini-app remove <targets> [options]      Remove platform(s) from the project (desktop, android, ios)
  create-bini-app doctor                          Check your machine for Tauri (runs \`tauri info\`)
  create-bini-app clean [--all]                   Delete build output and caches
  create-bini-app upgrade                         Update dependencies to the latest versions
  create-bini-app --platform <targets>            Same as above (alias)

${c.bold}${c.cyan}Options:${c.reset}
  --version, -v       Show version number
  --help, -h          Show help
  --typescript        Use TypeScript (create mode)
  --javascript        Use JavaScript (create mode)
  --tailwind          Use Tailwind CSS (create mode)
  --css-modules       Use CSS Modules (create mode)
  --none              No styling (create mode)
  --force             Create: overwrite an existing directory
  --no-install        Skip installing project dependencies (installed automatically by default)
  --no-git            Skip git init on create
  --yes, -y           Skip the confirmation prompt (remove)
  --all               Clean: also clear the Rust build cache (src-tauri/target)
  --platform <target> ${TARGET_PLATFORMS.join(", ")}
                      (comma-separated to pick several: web,desktop,android)
  --app-name <name>   Initial site title (default: from the project name). It lives in
                      src/app/layout.tsx, and the Tauri app name is read from there
  --org <domain>      Bundle ID prefix as a reverse domain, e.g. com.acme (default: com.bini)
  --sign              Auto-confirm code signing setup (still prompts for details).
                      On an already configured platform, runs the signing step only.
  --nosign            Skip code signing setup entirely, no prompts
  --npm | --pnpm | --yarn | --bun   Force a package manager

${c.bold}${c.cyan}Examples:${c.reset}
  ${c.dim}create-bini-app my-app${c.reset}
  ${c.dim}create-bini-app my-app --typescript --tailwind --platform web${c.reset}
  ${c.dim}create-bini-app my-app --platform android --app-name "My App"${c.reset}
  ${c.dim}create-bini-app add android                  # inside an existing project${c.reset}
  ${c.dim}create-bini-app add desktop,android --nosign${c.reset}
  ${c.dim}create-bini-app sign                         # redo signing for everything that applies here${c.reset}
  ${c.dim}create-bini-app sign android                 # redo signing for one target${c.reset}
  ${c.dim}create-bini-app my-app --platform android --org com.acme${c.reset}
  ${c.dim}create-bini-app remove android               # delete the Android project${c.reset}
  ${c.dim}create-bini-app doctor                       # check your machine (tauri info)${c.reset}
  ${c.dim}create-bini-app clean                        # delete dist/ and other build output${c.reset}
  ${c.dim}create-bini-app upgrade                      # update every dependency to latest${c.reset}
`);
}

/** Parse "a,b,c" into validated, de-duplicated platforms. Exits on invalid values. */
function parsePlatformList(raw: string | undefined, source: string): TargetPlatform[] {
  if (raw === undefined) return [];
  const result: TargetPlatform[] = [];
  for (const item of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (!isTargetPlatform(item)) {
      log.error(`Invalid ${source} "${item}". Use one of: ${TARGET_PLATFORMS.join(", ")}.`);
      exit(1);
    }
    if (!result.includes(item)) result.push(item);
  }
  if (result.length === 0) {
    log.error(`${source} requires a value.`);
    exit(1);
  }
  return result;
}

function parseCli(args: string[]) {
  try {
    return parseArgs({ args, options: CLI_OPTIONS, allowPositionals: true, strict: true });
  } catch (err) {
    log.error((err as Error).message);
    log.info("Run with --help to see available options.");
    return exit(1);
  }
}

function parseArguments(): { positionals: string[]; flags: CliFlags } {
  const args = process.argv.slice(2);

  if (args.includes("--version") || args.includes("-v")) {
    log.plain(`${c.cyan}Bini.js CLI${c.reset} v${BINIJS_VERSION}`);
    exit(0);
  }
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    exit(0);
  }

  const { values, positionals } = parseCli(args);

  for (const name of ["platform", "app-name", "org"] as const) {
    const value = values[name];
    if (value !== undefined && value.trim() === "") {
      log.error(`--${name} requires a value.`);
      exit(1);
    }
  }

  // Subcommands take any number of platform positionals; create mode takes exactly one name.
  if (!SUBCOMMANDS.has(positionals[0] ?? "") && positionals.length > 1) {
    log.error(`Unexpected extra argument(s): ${positionals.slice(1).join(" ")}`);
    exit(1);
  }

  const ts = Boolean(values.typescript);
  const js = Boolean(values.javascript || values["no-typescript"]);
  const sign = Boolean(values.sign);
  const noSign = Boolean(values.nosign);
  const pmFlags = PM_PRIORITY.filter((p) => values[p]);

  if (ts && js) {
    log.error("Cannot use --typescript and --javascript together.");
    exit(1);
  }
  if ([values.tailwind, values["css-modules"], values.none].filter(Boolean).length > 1) {
    log.error("Cannot use more than one of --tailwind, --css-modules, --none.");
    exit(1);
  }
  if (sign && noSign) {
    log.error("Cannot use --sign and --nosign together.");
    exit(1);
  }
  if (pmFlags.length > 1) {
    log.error(`Cannot use more than one of ${pmFlags.map((p) => `--${p}`).join(", ")} together.`);
    exit(1);
  }

  const org = values.org?.trim();
  if (org !== undefined && !validateOrg(org)) {
    log.error(`Invalid --org "${values.org}". ${ORG_RULE}`);
    exit(1);
  }

  return {
    positionals,
    flags: {
      force: Boolean(values.force),
      typescript: ts ? true : js ? false : undefined,
      tailwind: Boolean(values.tailwind),
      cssModules: Boolean(values["css-modules"]),
      noStyle: Boolean(values.none),
      noInstall: Boolean(values["no-install"]),
      platforms: parsePlatformList(values.platform, "--platform"),
      appName: values["app-name"],
      org,
      sign: sign ? true : noSign ? false : undefined,
      yes: Boolean(values.yes),
      noGit: Boolean(values["no-git"]),
      all: Boolean(values.all),
      packageManager: pmFlags[0],
    },
  };
}

/* ================================================================== */
/* Question flow (create mode)                                          */
/* ================================================================== */

/** Web starts checked. iOS is only selectable on macOS (Xcode is required). */
function platformChoices(userOS: UserOS) {
  return TARGET_PLATFORMS.map((p) => {
    if (p === "web") return { name: PLATFORM_LABELS.web, value: p, checked: true };
    if (p === "ios" && userOS !== "macos") return { name: PLATFORM_LABELS.ios, value: p, disabled: "(requires macOS)" };
    return { name: PLATFORM_LABELS[p], value: p };
  });
}

/** Initial site title: --app-name, otherwise the project name in title case. Never prompted. */
function resolveAppName(flags: CliFlags, projectName: string): string {
  return (flags.appName && normalizeAppName(flags.appName)) || toTitleCase(projectName);
}

/**
 * The site title lives in the root layout (src/app/layout.tsx or .jsx) and is the single source of
 * truth for the app name: the Tauri product name and window title are read from it.
 */
function readLayoutTitle(root: string): string | null {
  for (const ext of ["tsx", "jsx"]) {
    try {
      const src = fs.readFileSync(path.join(root, "src", "app", `layout.${ext}`), "utf-8");
      const match = /^[ \t]*title\s*:\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)")/m.exec(src);
      const raw = match?.[1] ?? match?.[2];
      if (raw !== undefined) {
        const title = normalizeAppName(raw.replace(/\\(.)/g, "$1"));
        if (title) return title;
      }
    } catch {
      /* no layout file with this extension */
    }
  }
  return null;
}

/** Bundle identifier prefix: the final identifier is `<org>.<project>`. */
async function askOrg(flags: CliFlags): Promise<string> {
  if (flags.org) return flags.org;
  if (!isInteractive()) return DEFAULT_ORG;
  const org = await input({
    message: "Organization (bundle ID prefix)?",
    default: DEFAULT_ORG,
    validate: (v) => (validateOrg(v.trim()) ? true : ORG_RULE),
  });
  return org.trim();
}

async function askQuestions(flags: CliFlags, projectName: string, userOS: UserOS): Promise<ProjectAnswers> {
  const interactive = isInteractive();

  const typescript =
    flags.typescript ?? (interactive ? await confirm({ message: "Use TypeScript?", default: true }) : true);

  let styling: StylingOption = "Tailwind";
  if (flags.tailwind) styling = "Tailwind";
  else if (flags.cssModules) styling = "CSS Modules";
  else if (flags.noStyle) styling = "None";
  else if (interactive) {
    styling = await select<StylingOption>({
      message: "Styling solution?",
      choices: [
        { name: "Tailwind CSS", value: "Tailwind" },
        { name: "CSS Modules", value: "CSS Modules" },
        { name: "None", value: "None" },
      ],
      default: "Tailwind",
    });
  }

  let picked: TargetPlatform[] = ["web"];
  if (flags.platforms.length > 0) picked = flags.platforms;
  else if (interactive) {
    picked = await checkbox<TargetPlatform>({
      message: "Platforms?",
      choices: platformChoices(userOS),
      required: true,
    });
  }

  let platforms = picked.filter((p): p is TauriPlatform => p !== "web");
  // Not a Mac: iOS is left out. The explanation is printed at the end.
  const iosSkipped = platforms.includes("ios") && userOS !== "macos";
  if (iosSkipped) platforms = platforms.filter((p) => p !== "ios");

  // Web is shown when selected, or when nothing else is left to build.
  const web = picked.includes("web") || platforms.length === 0;
  // The app name becomes the site title in src/app/layout.tsx (edit it there any time).
  const appName = resolveAppName(flags, projectName);
  const org = platforms.length > 0 ? await askOrg(flags) : (flags.org ?? DEFAULT_ORG);

  return { typescript, styling, web, platforms, appName, org, iosSkipped };
}

/* ================================================================== */
/* Assets                                                               */
/* ================================================================== */

async function copyAssetFiles(publicPath: string): Promise<void> {
  const files = ["favicon.ico", "apple-touch-icon.png", "og-image.png", "logo.png", "bini.svg"];
  // copyFile does not create missing folders, so public/ must exist first.
  await fsPromises.mkdir(publicPath, { recursive: true });
  await Promise.all(
    files.map(async (file) => {
      try {
        await fsPromises.copyFile(path.join(ASSETS_DIR, file), path.join(publicPath, file));
      } catch (err) {
        const reason = (err as NodeJS.ErrnoException).code === "ENOENT" ? "not found in the package assets" : (err as Error).message;
        log.warn(`Skipping ${file}: ${reason}`);
      }
    })
  );
}

async function generateWebManifest(projectPath: string, appName: string): Promise<void> {
  const manifest = {
    name: appName,
    short_name: appName,
    description: "Modern React application built with Bini.js",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#00CFFF",
    icons: [
      { src: "/favicon.ico", sizes: "64x64 32x32 24x24 16x16", type: "image/x-icon" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
  await writeFile(path.join(projectPath, "public", "site.webmanifest"), JSON.stringify(manifest, null, 2));
}

/* ================================================================== */
/* Vite config (universal: one file for every target)                   */
/* ================================================================== */

async function generateViteConfig(projectPath: string, ext: ScriptExtension, styling: StylingOption): Promise<void> {
  const imports = [
    `import { defineConfig, loadEnv } from 'vite';`,
    `import react from '@vitejs/plugin-react';`,
    `import { biniroute } from 'bini-router';`,
    `import { biniOverlay } from 'bini-overlay';`,
    `import { biniEnv } from 'bini-env';`,
    `import { biniSSG } from 'bini-ssg';`,
    ...(styling === "Tailwind" ? [`import tailwindcss from '@tailwindcss/vite';`] : []),
  ].join("\n");

  const tailwindPlugin = styling === "Tailwind" ? `\n      tailwindcss(),` : "";

  const content = `${imports}

export default defineConfig(async ({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env['PORT'] ?? '3000', 10);

  const isTauri = env['TAURI'] === 'true' || process.env.TAURI === 'true';
  // Set by the Tauri CLI for \`android dev\` / \`ios dev\` (the LAN IP of this machine).
  const tauriDevHost = process.env.TAURI_DEV_HOST;
  const isCodespace = !!env['CODESPACE_NAME'];

  const host = tauriDevHost || (isTauri || isCodespace ? '0.0.0.0' : 'localhost');

  const hmrConfig = tauriDevHost
    ? { protocol: 'ws', host: tauriDevHost, port: port + 1, overlay: false }
    : isCodespace
      ? { clientPort: 443, overlay: false }
      : { overlay: false, host: 'localhost', protocol: 'ws' };

  // bini-native only loads inside Tauri, so web projects never need it installed.
  // It is skipped for the SSR pass: the prerender build only needs to render pages, the
  // native wiring (Rust plugins, capabilities, manifests) comes from the client build.
  // The specifier is a variable so Vite's config bundler doesn't try to resolve it for web builds.
  const nativePkg = 'bini-native';
  const native = isTauri && !isSsrBuild ? (await import(/* @vite-ignore */ nativePkg)).biniNative() : null;

  return {
    plugins: [${tailwindPlugin}
      react(),
      biniroute(),
      biniOverlay(),
      biniEnv(),
      biniSSG(),
      native,
    ],

    server: {
      port,
      host,
      open: !isTauri,
      cors: true,
      hmr: hmrConfig,
      watch: {
        usePolling: isCodespace || isTauri,
        ignored: [
          '**/dist/**',
          '**/node_modules/**',
          ...(isTauri ? ['**/src-tauri/**'] : []),
        ],
      },
      // Tauri's devUrl is fixed (http://localhost:3000): never let Vite hop to another port.
      strictPort: isTauri,
    },

    preview: {
      port,
      host: '0.0.0.0',
      open: true,
      cors: true,
    },

    build: {
      outDir: 'dist',
      // Modern browsers support modulepreload natively; drop the polyfill.
      modulePreload: { polyfill: false },
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        output: {
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.names?.[0] ?? assetInfo.name ?? '';
            const ext = name.split('.').pop()?.toLowerCase() || '';
            if (/png|jpe?g|gif|svg|webp|avif/.test(ext)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/woff2?|eot|ttf|otf/.test(ext)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            if (ext === 'css') return 'css/[name]-[hash][extname]';
            if (ext === 'json') return 'data/[name]-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
        },
        onwarn(warning, warn) {
          const ignoreCodes = [
            'MODULE_EXTERNALIZED',
            'INEFFECTIVE_DYNAMIC_IMPORT',
            'UNRESOLVED_IMPORT',
          ];
          const ignoreMessages = [
            'stream',
            'externalized',
            'dynamic import will not move module',
          ];
          const code = warning.code || '';
          const message = warning.message || '';

          if (ignoreCodes.includes(code)) return;
          if (ignoreMessages.some((msg) => message.includes(msg))) return;
          warn(warning);
        },
      },
    },

    resolve: {
      alias: { '@': '/src' },
    },

    css: {
      modules: { localsConvention: 'camelCase' },
      devSourcemap: true,
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
  };
});
`;

  await writeFile(path.join(projectPath, `vite.config.${ext}`), content);
}

/* ================================================================== */
/* Tauri config patching + signing helpers                              */
/* ================================================================== */

function generateBundleIdentifier(org: string, projectName: string): string {
  const sanitized = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "") || "app";
  return `${org}.${/^[0-9]/.test(sanitized) ? `app${sanitized}` : sanitized}`;
}

function readTauriConfSync(tauriDir: string): AnyJson | null {
  try {
    return readJsonSync(path.join(tauriDir, "tauri.conf.json"));
  } catch {
    return null;
  }
}

/** Read, mutate, validate, write atomically. Leaves the file untouched on any failure. */
async function patchTauriConf(tauriDir: string, mutate: (conf: AnyJson) => void): Promise<boolean> {
  const confPath = path.join(tauriDir, "tauri.conf.json");
  if (!fs.existsSync(confPath)) {
    log.warn(`Could not find ${confPath}.`);
    return false;
  }
  try {
    const conf = JSON.parse(await fsPromises.readFile(confPath, "utf-8")) as AnyJson;
    mutate(conf);
    const out = JSON.stringify(conf, null, 2) + "\n";
    JSON.parse(out);
    await writeFile(confPath, out);
    return true;
  } catch (err) {
    log.warn(`Could not update ${confPath}: ${(err as Error).message}`);
    return false;
  }
}

/** Single-quote a value for POSIX `source`. */
const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

/** Escape a value for a Java .properties file (\ : = # ! and spaces). */
const escapeProperty = (value: string): string => value.replace(/[\r\n]/g, "").replace(/[\\:=#! ]/g, "\\$&");

const SIGNING_ENV_HEADER = [
  "Code signing secrets, never commit this file.",
  "Load before building with: set -a; source .env.signing; set +a",
];
const SIGNING_GITIGNORE = ["# Code signing secrets (never commit)", ".env.signing"];

/** Merge into `.env.signing`: update only the keys being set, keep every other line, mode 600. */
async function writeKeyValueFile(filePath: string, vars: Record<string, string>): Promise<void> {
  let existing = "";
  try { existing = await fsPromises.readFile(filePath, "utf-8"); } catch { /* new file */ }

  const lines = existing ? existing.replace(/\r\n/g, "\n").split("\n") : [];
  if (lines.at(-1) === "") lines.pop();
  if (lines.length === 0) lines.push(...SIGNING_ENV_HEADER.map((h) => `# ${h}`), "");

  const pending = new Map(Object.entries(vars));
  const merged = lines.map((line) => {
    const key = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(line)?.[1];
    if (key && pending.has(key)) {
      const value = pending.get(key) as string;
      pending.delete(key);
      return `${key}=${shellQuote(value)}`;
    }
    return line;
  });
  for (const [key, value] of pending) merged.push(`${key}=${shellQuote(value)}`);

  await writeFile(filePath, merged.join("\n") + "\n", 0o600);
}

async function appendGitignoreEntries(projectPath: string, entries: string[]): Promise<void> {
  const gitignorePath = path.join(projectPath, ".gitignore");
  let existing = "";
  try { existing = await fsPromises.readFile(gitignorePath, "utf-8"); } catch { /* new file */ }

  const have = new Set(existing.split("\n").map((l) => l.trim()));
  const missing = entries.filter((e) => !have.has(e));
  if (missing.every((e) => e.startsWith("#"))) return;
  const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  await fsPromises.appendFile(gitignorePath, `${prefix}\n${missing.join("\n")}\n`);
}

/* ================================================================== */
/* Code signing                                                         */
/* Tauri has no setup wizard for this, it only reads the config we write */
/* ================================================================== */

async function patchAndroidGradleSigning(androidGenDir: string): Promise<void> {
  const gradlePath = path.join(androidGenDir, "app", "build.gradle.kts");
  if (!fs.existsSync(gradlePath)) {
    log.warn(`Could not find ${gradlePath}. Wire up signingConfigs manually, see the docs.`);
    return;
  }

  try {
    let content = await fsPromises.readFile(gradlePath, "utf-8");
    if (content.includes("keystore.properties")) {
      log.skip("build.gradle.kts already configured for release signing.");
      return;
    }
    if (!/buildTypes\s*\{/.test(content)) {
      log.warn(`Could not find "buildTypes" block in ${gradlePath}. Add signingConfigs manually.`);
      return;
    }

    const imports = ["import java.io.FileInputStream", "import java.util.Properties"].filter((i) => !content.includes(i));
    if (imports.length) content = `${imports.join("\n")}\n${content}`;

    // Signing only activates when keystore.properties exists, so debug builds and fresh clones keep working.
    const signingConfigBlock = `    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            if (keystorePropertiesFile.exists()) {
                val keystoreProperties = Properties()
                FileInputStream(keystorePropertiesFile).use { keystoreProperties.load(it) }
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

`;
    content = content.replace(/(\n[^\S\n]*buildTypes\s*\{)/, `\n${signingConfigBlock}$1`);

    if (/getByName\("release"\)\s*\{/.test(content)) {
      content = content.replace(
        /(getByName\("release"\)\s*\{)/,
        `$1\n            if (rootProject.file("keystore.properties").exists()) {\n                signingConfig = signingConfigs.getByName("release")\n            }`
      );
    } else {
      log.warn(`Could not find getByName("release") in ${gradlePath}. Set signingConfig manually.`);
    }

    await writeFile(gradlePath, content);
    log.success("Wired release signingConfig into build.gradle.kts (committed; secrets stay in keystore.properties)");
  } catch (err) {
    log.warn(`Could not patch build.gradle.kts: ${(err as Error).message}`);
    log.info("Configure it manually, see https://v2.tauri.app/distribute/sign/android/");
  }
}

const minLength = (n: number, label: string) => (v: string) =>
  v.length >= n ? true : `${label} must be at least ${n} characters.`;
const required = (v: string) => (v.trim().length > 0 ? true : "Required.");
const fileMustExist = (v: string) => (fs.existsSync(v) ? true : "File not found.");

/* Each setup*Signing assumes the user already said yes (see setupCodeSigning).
   They return true when signing ends up configured. */

async function setupAndroidSigning(ctx: SigningContext): Promise<boolean> {
  const { projectPath, tauriDir, pm } = ctx;
  const androidGenDir = path.join(tauriDir, "gen", "android");
  if (!fs.existsSync(androidGenDir)) {
    log.warn("Android project not found (src-tauri/gen/android missing). Run Android init first.");
    return false;
  }

  const gitignoreEntries = [
    "# Android signing (never commit)",
    "src-tauri/gen/android/keystore.properties",
    "*.jks",
    "*.keystore",
  ];

  const propsPath = path.join(androidGenDir, "keystore.properties");
  if (fs.existsSync(propsPath)) {
    const replace = await confirm({
      message: `${path.relative(projectPath, propsPath)} already exists. Replace it?`,
      default: false,
    });
    if (!replace) {
      log.skip("Kept existing keystore.properties.");
      await appendGitignoreEntries(projectPath, gitignoreEntries);
      await patchAndroidGradleSigning(androidGenDir);
      return true;
    }
  }

  if (!commandExists("keytool")) {
    log.warn("keytool not found on PATH (ships with the JDK). Add it to PATH or use Android Studio's copy.");
  }

  // The keystore always lives in the project root as keystore.jks (git-ignored).
  const storeFile = path.join(projectPath, "keystore.jks");
  let keyAlias = "upload";
  let storePassword: string;
  let keyPassword: string;

  if (fs.existsSync(storeFile)) {
    log.info("Using the existing keystore.jks in the project root.");
    keyAlias = await input({ message: "Key alias:", default: "upload" });
    storePassword = await password({ message: "Keystore password:", mask: "*", validate: minLength(6, "Password") });
    const kp = await password({ message: "Key password (leave blank if same as keystore password):", mask: "*" });
    keyPassword = kp.length > 0 ? kp : storePassword;
  } else {
    storePassword = await password({ message: "Set a keystore password (min 6 chars):", mask: "*", validate: minLength(6, "Password") });
    keyPassword = storePassword; // PKCS12 keystores use one password for store and key.

    log.step("Generating keystore.jks in the project root...");
    const dname = `CN=${path.basename(projectPath)}, OU=Dev, O=Bini, L=Unknown, S=Unknown, C=US`;
    try {
      // Passwords go through the environment, never the command line / process list.
      execFileSync(
        "keytool",
        [
          "-genkeypair", "-v",
          "-keystore", storeFile,
          "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
          "-alias", keyAlias,
          "-storepass:env", "BINI_STOREPASS",
          "-keypass:env", "BINI_KEYPASS",
          "-dname", dname,
        ],
        {
          stdio: "pipe",
          timeout: 30_000,
          windowsHide: true,
          env: { ...process.env, BINI_STOREPASS: storePassword, BINI_KEYPASS: keyPassword },
        }
      );
      log.success("Keystore created at keystore.jks");
      log.info("Back up keystore.jks and its password: every Play Store update must be signed with the same key.");
    } catch (err) {
      log.warn(`Could not generate keystore automatically: ${(err as Error).message.split("\n")[0]}`);
      log.info("Generate it manually with keytool, see https://v2.tauri.app/distribute/sign/android/");
      return false;
    }
  }

  await writeFile(
    propsPath,
    [
      `storePassword=${escapeProperty(storePassword)}`,
      `keyPassword=${escapeProperty(keyPassword)}`,
      `keyAlias=${escapeProperty(keyAlias)}`,
      `storeFile=${escapeProperty(storeFile)}`,
      "",
    ].join("\n"),
    0o600
  );
  log.success(`Wrote ${path.relative(projectPath, propsPath)}`);

  await appendGitignoreEntries(projectPath, gitignoreEntries);
  await patchAndroidGradleSigning(androidGenDir);
  log.success(`Android release signing configured. \`${pmRun(pm, "android:build")}\` will now produce a signed release.`);
  return true;
}

/** Strip characters that would break an X.500 subject name. */
const sanitizeCertName = (name: string): string => name.replace(/[",=+<>#;\\]/g, "").trim() || "Bini App";

/**
 * Create a self-signed code signing certificate in the CurrentUser store (no admin rights needed)
 * and return its thumbprint. The name goes through an environment variable, never into the script text.
 */
function generateSelfSignedCertificate(publisher: string): string | null {
  const script =
    '$c = New-SelfSignedCertificate -Type CodeSigningCert -Subject ("CN=" + $env:BINI_CERT_CN) ' +
    "-CertStoreLocation Cert:\\CurrentUser\\My -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 " +
    "-NotAfter (Get-Date).AddYears(3); $c.Thumbprint";
  try {
    const out = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      stdio: "pipe",
      timeout: 60_000,
      windowsHide: true,
      env: { ...process.env, BINI_CERT_CN: publisher },
    });
    const thumbprint = (out.trim().split(/\r?\n/).pop() ?? "").trim();
    if (!/^[0-9A-Fa-f]{40}$/.test(thumbprint)) throw new Error("PowerShell did not return a thumbprint.");
    return thumbprint.toUpperCase();
  } catch (err) {
    log.warn(`Could not create the certificate automatically: ${(err as Error).message.split("\n")[0]}`);
    log.info('Create one manually: New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Your Name" -CertStoreLocation Cert:\\CurrentUser\\My');
    return null;
  }
}

async function setupWindowsSigning(ctx: SigningContext): Promise<boolean> {
  const { projectPath, tauriDir } = ctx;

  const current = readTauriConfSync(tauriDir)?.bundle?.windows as AnyJson | undefined;
  if (current?.certificateThumbprint) {
    log.info(`Current certificate thumbprint: ${current.certificateThumbprint}`);
    if (!(await confirm({ message: "Windows signing is already configured. Overwrite it?", default: false }))) {
      log.skip("Kept existing Windows signing configuration.");
      return true;
    }
  }

  const method = await select<"generate" | "existing">({
    message: "Windows code signing certificate:",
    choices: [
      { name: "Generate a free self-signed certificate (easiest)", value: "generate" },
      { name: "Use a certificate I already have (enter its thumbprint)", value: "existing" },
    ],
    default: "generate",
  });

  let certificateThumbprint: string;
  if (method === "generate") {
    const publisher = sanitizeCertName(
      await input({ message: "Publisher name for the certificate:", default: toTitleCase(path.basename(projectPath)) })
    );
    const thumbprint = generateSelfSignedCertificate(publisher);
    if (!thumbprint) return false;
    certificateThumbprint = thumbprint;
    log.success(`Certificate created for "${publisher}" (thumbprint ${thumbprint})`);
    log.info("Self-signed apps still show a Windows SmartScreen warning to other people.");
    log.info("For public releases, use a certificate from a trusted authority, or sign in CI.");
  } else {
    certificateThumbprint = (
      await input({ message: "Certificate thumbprint (Personal > Certificates > Details in certmgr.msc):", validate: required })
    ).trim();
  }

  const ok = await patchTauriConf(tauriDir, (conf) => {
    conf.bundle = conf.bundle ?? {};
    conf.bundle.windows = {
      ...(conf.bundle.windows ?? {}),
      certificateThumbprint,
      digestAlgorithm: "sha256",
      timestampUrl: "http://timestamp.digicert.com",
    };
  });
  if (ok) log.success("Windows signing configured in tauri.conf.json");
  return ok;
}

async function setupMacosSigning(ctx: SigningContext): Promise<boolean> {
  const { projectPath, tauriDir, pm } = ctx;

  const existingIdentity = readTauriConfSync(tauriDir)?.bundle?.macOS?.signingIdentity as string | undefined;
  let mode: "adhoc" | "identity";

  let keepExisting = false;
  if (existingIdentity) {
    log.info(`Current signingIdentity: "${existingIdentity}"`);
    keepExisting = !(await confirm({ message: "A macOS signing identity is already set. Overwrite it?", default: false }));
  }

  if (keepExisting && existingIdentity) {
    mode = existingIdentity === "-" ? "adhoc" : "identity";
    log.skip("Kept existing macOS signing identity.");
  } else {
    mode = await select<"adhoc" | "identity">({
      message: "Signing method:",
      choices: [
        { name: "Ad-hoc (local testing, no Apple Developer account)", value: "adhoc" },
        { name: "Apple Developer signing identity (Distribution / Developer ID)", value: "identity" },
      ],
      default: "adhoc",
    });

    const signingIdentity =
      mode === "adhoc"
        ? "-"
        : (await input({ message: 'Signing identity (from "security find-identity -v -p codesigning"):', validate: required })).trim();

    const ok = await patchTauriConf(tauriDir, (conf) => {
      conf.bundle = conf.bundle ?? {};
      conf.bundle.macOS = { ...(conf.bundle.macOS ?? {}), signingIdentity };
    });
    if (!ok) return false;
    log.success(`macOS signingIdentity set to "${signingIdentity}" in tauri.conf.json`);
  }

  if (mode !== "identity") return true;

  const wantsNotarization = await confirm({
    message: "Set up notarization credentials too? (avoids the 'unidentified developer' warning)",
    default: false,
  });
  if (!wantsNotarization) return true;

  const authMethod = await select<"apiKey" | "appleId">({
    message: "Notarization method:",
    choices: [
      { name: "App Store Connect API key", value: "apiKey" },
      { name: "Apple ID + app-specific password", value: "appleId" },
    ],
    default: "apiKey",
  });

  const vars: Record<string, string> = {};
  if (authMethod === "apiKey") {
    vars.APPLE_API_ISSUER = await input({ message: "APPLE_API_ISSUER (Issuer ID):" });
    vars.APPLE_API_KEY = await input({ message: "APPLE_API_KEY (Key ID):" });
    vars.APPLE_API_KEY_PATH = path.resolve(await input({ message: "Path to downloaded .p8 private key:", validate: fileMustExist }));
  } else {
    vars.APPLE_ID = await input({ message: "Apple ID email:" });
    vars.APPLE_PASSWORD = await password({ message: "App-specific password:", mask: "*" });
    vars.APPLE_TEAM_ID = await input({ message: "Apple Team ID:" });
  }

  const envPath = path.join(projectPath, ".env.signing");
  await writeKeyValueFile(envPath, vars);
  await appendGitignoreEntries(projectPath, SIGNING_GITIGNORE);
  log.success(`Wrote notarization credentials to ${path.relative(projectPath, envPath)}`);
  log.info(`Run "set -a; source .env.signing; set +a" before \`${pmRun(pm, "tauri:build")}\` to notarize your app.`);
  return true;
}

async function setupLinuxSigning(ctx: SigningContext): Promise<boolean> {
  const { projectPath, pm } = ctx;

  const gpg = commandExists("gpg") ? "gpg" : commandExists("gpg2") ? "gpg2" : null;
  if (!gpg) {
    log.warn("gpg not found. Install it (for example: sudo apt install gnupg), then re-run: create-bini-app sign desktop");
    return false;
  }

  const method = await select<"generate" | "existing">({
    message: "GPG signing key:",
    choices: [
      { name: "Generate a new key (recommended)", value: "generate" },
      { name: "Use a key I already have", value: "existing" },
    ],
    default: "generate",
  });

  let signKey = "";
  let passphrase: string;

  if (method === "generate") {
    const name = (await input({ message: "Name for the key:", default: toTitleCase(path.basename(projectPath)) })).trim();
    const email = (
      await input({
        message: "Email for the key:",
        validate: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? true : "Enter a valid email address."),
      })
    ).trim();
    passphrase = await password({ message: "Set a key passphrase (min 6 chars):", mask: "*", validate: minLength(6, "Passphrase") });

    log.step("Generating GPG key (RSA 4096, valid for 3 years)...");
    // The passphrase is sent on stdin (--passphrase-fd 0), never on the command line.
    const result = spawnSync(
      gpg,
      ["--batch", "--pinentry-mode", "loopback", "--passphrase-fd", "0", "--quick-generate-key", `${name} <${email}>`, "rsa4096", "sign", "3y"],
      { input: passphrase, encoding: "utf8", timeout: 180_000, windowsHide: true }
    );
    if (result.error || result.status !== 0) {
      log.warn(`Could not generate a GPG key automatically: ${(result.stderr || result.error?.message || "unknown error").trim().split("\n")[0]}`);
      log.info('Generate one manually with `gpg --full-generate-key`, then re-run with --sign and pick "Use a key I already have".');
      return false;
    }
    // gpg reports the new key's fingerprint in the revocation certificate path.
    let fingerprint = /([0-9A-F]{40})\.rev/i.exec(result.stderr ?? "")?.[1];
    if (!fingerprint) {
      const listing = spawnSync(gpg, ["--list-secret-keys", "--with-colons", email], { encoding: "utf8", windowsHide: true });
      fingerprint = (listing.stdout ?? "").split("\n").find((l) => l.startsWith("fpr:"))?.split(":")[9];
    }
    if (!fingerprint) {
      log.warn("The key was created but its ID could not be read. Run `gpg --list-secret-keys` and re-run with --sign.");
      return false;
    }
    signKey = fingerprint.toUpperCase();
    log.success(`GPG key created (${signKey.slice(-16)})`);
    log.info(`Share your public key so people can verify your builds: ${gpg} --armor --export ${signKey}`);
  } else {
    signKey = (await input({ message: "GPG key ID to sign with (blank = default key):" })).trim();
    passphrase = await password({ message: "GPG key passphrase:", mask: "*" });
  }

  const vars: Record<string, string> = { SIGN: "1", APPIMAGETOOL_SIGN_PASSPHRASE: passphrase };
  if (signKey) vars.SIGN_KEY = signKey;

  const envPath = path.join(projectPath, ".env.signing");
  await writeKeyValueFile(envPath, vars);
  await appendGitignoreEntries(projectPath, SIGNING_GITIGNORE);
  log.success(`Wrote AppImage signing config to ${path.relative(projectPath, envPath)}`);
  log.info(`Run "set -a; source .env.signing; set +a" before \`${pmRun(pm, "tauri:build")}\` to sign the AppImage.`);
  return true;
}

async function setupIosSigning(ctx: SigningContext): Promise<boolean> {
  const { projectPath, pm } = ctx;

  const mode = await select<"automatic" | "manual">({
    message: "Signing method:",
    choices: [
      { name: "Automatic (Xcode-managed, recommended for local builds)", value: "automatic" },
      { name: "Manual (certificate + provisioning profile, for CI)", value: "manual" },
    ],
    default: "automatic",
  });

  if (mode === "automatic") {
    log.info("Nothing to configure locally. Sign in with your Apple ID in Xcode (Settings > Accounts).");
    return true;
  }

  const certPath = await input({ message: "Path to exported certificate (.p12):", validate: fileMustExist });
  const certPassword = await password({ message: "Certificate export password:", mask: "*" });
  const provisionPath = await input({ message: "Path to provisioning profile (.mobileprovision):", validate: fileMustExist });

  try {
    const envPath = path.join(projectPath, ".env.signing");
    await writeKeyValueFile(envPath, {
      IOS_CERTIFICATE: (await fsPromises.readFile(certPath)).toString("base64"),
      IOS_CERTIFICATE_PASSWORD: certPassword,
      IOS_MOBILE_PROVISION: (await fsPromises.readFile(provisionPath)).toString("base64"),
    });
    await appendGitignoreEntries(projectPath, SIGNING_GITIGNORE);
    log.success(`Wrote iOS signing credentials to ${path.relative(projectPath, envPath)}`);
    log.info(`Run "set -a; source .env.signing; set +a" before \`${pmRun(pm, "ios:build")}\` to sign your iOS app.`);
    return true;
  } catch (err) {
    log.warn(`Could not read/encode certificate or profile: ${(err as Error).message}`);
    return false;
  }
}

const SIGNING_LABEL: Record<SigningTarget, string> = {
  android: "Android release signing",
  windows: "Windows code signing",
  macos: "macOS code signing",
  linux: "Linux AppImage signing",
  ios: "iOS code signing",
};

const signingHint = (platform: TauriPlatform): string => `Set it up later with: create-bini-app sign ${platform}`;

/** Desktop signing is per OS; it is set up for the OS this command runs on. */
const signingTargetFor = (platform: TauriPlatform, userOS: UserOS): SigningTarget =>
  platform === "desktop" ? userOS : platform;

/**
 * Offer signing for one platform (desktop: for the current OS). Returns true when signing ends up
 * configured. --nosign / non-interactive: skip with a one-line hint.
 */
async function setupCodeSigning(ctx: SigningContext): Promise<boolean> {
  const { platform, signFlag, userOS } = ctx;
  const target = signingTargetFor(platform, userOS);

  if (signFlag === false) {
    log.info(`Skipping ${target} signing (--nosign). ${signingHint(platform)}`);
    return false;
  }
  if (!isInteractive()) {
    log.info(`Skipping ${target} signing (non-interactive). ${signingHint(platform)}`);
    return false;
  }

  log.step(SIGNING_LABEL[target]);
  const wantsSigning = signFlag === true || (await confirm({ message: `Set up ${target} signing now?`, default: false }));
  if (!wantsSigning) {
    log.info(`Skipped. ${signingHint(platform)}`);
    return false;
  }

  if (platform === "desktop") {
    log.info(`Desktop signing is set up for ${userOS} only. Sign the other systems in CI (GitHub Actions) on their own runners.`);
  }

  switch (target) {
    case "android": return setupAndroidSigning(ctx);
    case "windows": return setupWindowsSigning(ctx);
    case "macos": return setupMacosSigning(ctx);
    case "linux": return setupLinuxSigning(ctx);
    case "ios": return setupIosSigning(ctx);
  }
}

/* ================================================================== */
/* Tauri setup                                                          */
/* ================================================================== */

/**
 * `tauri init` only when src-tauri/tauri.conf.json is missing. Name / title / identifier are patched
 * on first init only. Icons come from public/logo.png on first init, through `tauri icon`.
 */
async function initTauri(o: InitTauriOptions): Promise<InitResult> {
  const { projectPath, pm, projectName, appName, org, localCli } = o;
  const tauriDir = path.join(projectPath, "src-tauri");

  if (fs.existsSync(path.join(tauriDir, "tauri.conf.json"))) {
    log.skip("Tauri already initialized");
    return "ok";
  }

  // Safe placeholders for the CLI; the real display name is patched in afterwards.
  // beforeBuildCommand runs the normal `build` script, so the bundled dist/ ships prerendered HTML.
  const initArgs = [
    "init", "--ci",
    "--app-name", projectName,
    "--window-title", projectName,
    "--frontend-dist", "../dist",
    "--dev-url", "http://localhost:3000",
    "--before-dev-command", pmRun(pm, "dev:native"),
    "--before-build-command", pmRun(pm, "build"),
    "--force",
  ];
  const cmd = tauriCmd(pm, initArgs, localCli);
  log.step("Initializing Tauri...");
  log.command(displayCmd(cmd.bin, cmd.args));
  if (!runBin(cmd.bin, cmd.args, projectPath, 120_000)) {
    // What to tell the user to run by hand: always the project-script form.
    const manual = pmTauri(pm, initArgs);
    log.warn("Tauri init failed. After installing dependencies, run manually:");
    log.plain(`  ${c.yellow}${displayCmd(manual.bin, manual.args)}${c.reset}`);
    addFollowUp(`Install dependencies (${pm} install), then run: ${displayCmd(manual.bin, manual.args)}`);
    return "failed";
  }
  log.success("Tauri initialized");

  const identifier = generateBundleIdentifier(org, projectName);
  const patched = await patchTauriConf(tauriDir, (conf) => {
    conf.productName = appName;
    conf.identifier = identifier;
    const win = conf.app?.windows?.[0];
    if (win) win.title = appName;
  });
  if (patched) {
    log.success(`App name set to "${appName}", bundle identifier ${c.cyan}${identifier}${c.reset}`);
    log.info("Replace the identifier with your own reverse-DNS id before publishing to an app store.");
  }

  if (!fs.existsSync(path.join(projectPath, "public", "logo.png"))) {
    log.warn("public/logo.png is missing, keeping Tauri's default icons.");
    return "ok";
  }
  const iconArgs = ["icon", "public/logo.png"];
  const iconCmd = tauriCmd(pm, iconArgs, localCli);
  log.step("Generating Tauri icons from public/logo.png...");
  log.command(displayCmd(iconCmd.bin, iconCmd.args));
  if (runBin(iconCmd.bin, iconCmd.args, projectPath, 60_000)) {
    log.success("Tauri icons generated");
  } else {
    const manual = pmTauri(pm, iconArgs);
    log.warn("Could not generate icons automatically.");
    addFollowUp(`Run: ${displayCmd(manual.bin, manual.args)}`);
  }

  return "ok";
}

const ANDROID_RUST_TARGETS = ["aarch64-linux-android", "armv7-linux-androideabi", "i686-linux-android", "x86_64-linux-android"];

async function initMobile(
  platform: "android" | "ios",
  o: { projectPath: string; pm: PackageManager; userOS: UserOS; localCli: boolean }
): Promise<MobileResult> {
  const { projectPath, pm, userOS, localCli } = o;
  const genDir = path.join(projectPath, "src-tauri", "gen", platform === "android" ? "android" : "apple");
  const label = platform === "android" ? "Android" : "iOS";
  const cmd = tauriCmd(pm, [platform, "init"], localCli);
  const manual = pmTauri(pm, [platform, "init"]);
  const manualCmd = displayCmd(manual.bin, manual.args);

  if (fs.existsSync(genDir)) {
    log.skip(`${label} support already initialized`);
    return "skipped";
  }

  if (platform === "ios" && userOS !== "macos") {
    log.warn("iOS initialization skipped (requires macOS with Xcode).");
    addFollowUp(`On a Mac, run: ${manualCmd}`);
    return "manual";
  }

  log.step(`Initializing ${label} support...`);
  log.command(displayCmd(cmd.bin, cmd.args));
  if (!runBin(cmd.bin, cmd.args, projectPath)) {
    if (platform === "android") {
      log.warn("Android init failed (JAVA_HOME / ANDROID_HOME / NDK_HOME set?). Run manually:");
      log.plain(`  ${c.yellow}${manualCmd}${c.reset}`);
      addFollowUp(`Fix the Android toolchain (JDK 17, ANDROID_HOME, NDK_HOME), then run: ${manualCmd}`);
    } else {
      log.warn(`iOS init failed. Please run manually: ${manualCmd}`);
      addFollowUp(`Run: ${manualCmd}`);
    }
    return "failed";
  }
  log.success(`${label} support initialized`);

  if (platform === "android") {
    if (commandExists("rustup")) {
      log.step("Adding Rust Android targets");
      log.command(`rustup target add ${ANDROID_RUST_TARGETS.join(" ")}`);
      if (runBin("rustup", ["target", "add", ...ANDROID_RUST_TARGETS], projectPath)) {
        log.success("Rust Android targets ready");
      } else {
        log.warn("Could not add Rust Android targets. Run the rustup command above manually.");
        addFollowUp(`Run: rustup target add ${ANDROID_RUST_TARGETS.join(" ")}`);
      }
    } else {
      log.warn("rustup not found. Install Rust, then add the Android targets.");
      addFollowUp("Install Rust (https://rustup.rs), then add the Android targets with rustup.");
    }
  }
  return "ok";
}

/** Create mode: initTauri once, then initMobile + signing for each selected target. */
async function setupTauri(
  o: InitTauriOptions & { platforms: TauriPlatform[]; userOS: UserOS; signFlag: boolean | undefined }
): Promise<void> {
  const { projectPath, platforms, userOS, pm, localCli, signFlag } = o;
  log.step(`Setting up Tauri for ${platforms.join(", ")} on ${userOS}`);

  const tauriDir = path.join(projectPath, "src-tauri");
  const result = await initTauri(o);

  for (const p of platforms) {
    if (p !== "desktop") await initMobile(p, { projectPath, pm, userOS, localCli });
  }

  if (result === "ok") {
    for (const p of platforms) {
      await setupCodeSigning({ projectPath, tauriDir, platform: p, userOS, signFlag, pm });
    }
  }

  printToolchainHint(pm);
  log.success(`Tauri setup complete for ${platforms.join(", ")}`);
}

/* ================================================================== */
/* Generated CSS                                                        */
/* ================================================================== */

const CSS_RESET = `* { box-sizing: border-box; }
html { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
body { line-height: 1.5; min-height: 100vh; margin: 0; }
#root { min-height: 100vh; }
`;

/** Plain-CSS version of the starter page (used for "CSS Modules" and "None"). */
const PAGE_CSS = `.home {
  display: flex;
  min-height: 100vh;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.home-main {
  display: flex;
  min-height: 100vh;
  width: 100%;
  max-width: 48rem;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 6rem 2rem;
}

.home-logo { height: 1.75rem; width: auto; }

.home-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
}

.home-title {
  max-width: 20rem;
  margin: 0;
  font-size: 1.875rem;
  font-weight: 600;
  line-height: 2.5rem;
  letter-spacing: -0.025em;
  color: #000000;
}

.home-code {
  border-radius: 0.25rem;
  background: #f4f4f5;
  padding: 0.125rem 0.375rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
}

.home-desc { max-width: 28rem; margin: 0; font-size: 1.125rem; line-height: 2rem; color: #52525b; }
.home-link { font-weight: 500; color: #09090b; text-decoration: none; }
.home-actions { display: flex; width: 100%; flex-direction: column; gap: 0.75rem; }

.home-btn {
  display: flex;
  height: 3rem;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  padding: 0 2rem;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
}

.home-btn-primary { background: #000000; color: #ffffff; }
.home-btn-primary:hover { background: #27272a; }
.home-btn-secondary { border: 1px solid #d4d4d8; background: #ffffff; color: #000000; }
.home-btn-secondary:hover { background: #fafafa; }

@media (min-width: 640px) {
  .home-main { align-items: flex-start; padding: 8rem 4rem; }
  .home-logo { height: 2rem; }
  .home-text { align-items: flex-start; text-align: left; }
  .home-actions { width: auto; flex-direction: row; }
  .home-btn { width: auto; }
}

@media (prefers-color-scheme: dark) {
  .home { background: #000000; }
  .home-logo { filter: invert(1); }
  .home-title { color: #fafafa; }
  .home-code { background: #18181b; }
  .home-desc { color: #a1a1aa; }
  .home-link { color: #fafafa; }
  .home-btn-primary { background: #ffffff; color: #000000; }
  .home-btn-primary:hover { background: #e4e4e7; }
  .home-btn-secondary { border-color: #3f3f46; background: transparent; color: #ffffff; }
  .home-btn-secondary:hover { background: #18181b; }
}
`;

function generateGlobalStyles(styling: StylingOption): string {
  if (styling === "Tailwind") return `@import "tailwindcss";\n\n${CSS_RESET}`;
  if (styling === "CSS Modules") return CSS_RESET;
  return `${CSS_RESET}\n${PAGE_CSS}`;
}

/* ================================================================== */
/* package.json: base + native patch                                    */
/* ================================================================== */

/**
 * The one production build: type-check, client bundle, SSR bundle. `bini-ssg` prerenders every route
 * from the SSR bundle's `render()` export. Web and Tauri both run this script.
 */
const buildCommand = (useTypeScript: boolean, mainExt: FileExtension): string =>
  `${useTypeScript ? "tsc --noEmit && " : ""}vite build && vite build --ssr src/main.${mainExt}`;

function basePackageJson(projectName: string, useTypeScript: boolean, mainExt: FileExtension, styling: StylingOption) {
  const dependencies: Record<string, string> = {
    react: "latest",
    "react-dom": "latest",
    "react-router-dom": "latest",
    hono: "latest",
    "bini-router": "latest",
    "bini-overlay": "latest",
    "bini-server": "latest",
    "bini-ssg": "latest",
  };

  const devDependencies: Record<string, string> = {
    "@vitejs/plugin-react": "latest",
    vite: "latest",
    oxlint: "latest",
    oxfmt: "latest",
    "bini-env": "latest",
    "bini-deploy": "latest",
  };

  if (useTypeScript) {
    Object.assign(devDependencies, {
      "@types/react": "latest",
      "@types/react-dom": "latest",
      "@types/node": "latest",
      typescript: "latest",
    });
  }
  if (styling === "Tailwind") {
    Object.assign(devDependencies, { tailwindcss: "latest", "@tailwindcss/vite": "latest" });
  }

  const scripts: PackageJsonScripts = {
    dev: "vite --host --open",
    build: buildCommand(useTypeScript, mainExt),
    start: "bini-server",
    preview: "vite preview --host --open",
    deploy: "bini-deploy",
    clean: "npx create-bini-app clean",
    upgrade: "npx create-bini-app upgrade",
    "type-check": useTypeScript ? "tsc --noEmit" : "echo 'TypeScript not enabled'",
    lint: "oxlint src",
    format: "oxfmt src",
    check: useTypeScript ? "oxlint src && oxfmt src && tsc --noEmit" : "oxlint src && oxfmt src",
  };

  return { name: projectName, type: "module", version: "1.0.0", scripts, dependencies, devDependencies };
}

/**
 * What a native target adds on top of the base package.json. Only scripts that need something the
 * Tauri CLI doesn't do on its own are here: `TAURI=true` for the Vite config, and `sign`. Everything
 * else (icons, device lists, toolchain checks) is a plain `tauri <command>` through the `tauri` script.
 */
function nativePackagePatch(): NativePackagePatch {
  return {
    dependencies: { "@tauri-apps/api": "latest" },
    devDependencies: { "@tauri-apps/cli": "latest", "cross-env": "latest", "bini-native": "latest" },
    scripts: {
      // Tauri's beforeDevCommand: plain `vite` so launching the desktop app never opens a browser tab.
      "dev:native": "vite",
      tauri: "tauri",
      "tauri:dev": "cross-env TAURI=true tauri dev",
      "tauri:build": "cross-env TAURI=true tauri build",
      // Re-run the code signing prompts (this OS for desktop, Android, and iOS on macOS).
      sign: "npx create-bini-app sign",
      // Runs `tauri info` to check this machine for the selected platforms.
      doctor: "npx create-bini-app doctor",
      // TAURI=true is required on mobile too: it makes Vite bind to the LAN host / TAURI_DEV_HOST.
      android: "cross-env TAURI=true tauri android dev",
      "android:build": "cross-env TAURI=true tauri android build",
      ios: "cross-env TAURI=true tauri ios dev",
      "ios:build": "cross-env TAURI=true tauri ios build",
    },
  };
}

/**
 * Merge the native patch into a package.json object. Only adds what is missing and never overwrites a
 * user's version or script. Shared by create (in memory) and add (on disk). Returns true when changed.
 */
function mergeNativePatch(pkg: AnyJson, patch: NativePackagePatch): boolean {
  let changed = false;
  for (const section of ["dependencies", "devDependencies", "scripts"] as const) {
    const bucket = (pkg[section] ??= {}) as Record<string, string | undefined>;
    for (const [key, value] of Object.entries(patch[section])) {
      if (bucket[key] === undefined) {
        bucket[key] = value;
        changed = true;
      }
    }
  }
  return changed;
}

/** Add mode: patch the existing package.json (validate, atomic write). */
async function applyNativePatch(root: string): Promise<boolean> {
  const pkgPath = path.join(root, "package.json");
  let pkg: AnyJson;
  try {
    pkg = JSON.parse(await fsPromises.readFile(pkgPath, "utf-8")) as AnyJson;
  } catch (err) {
    log.error(`package.json is not valid JSON, leaving it untouched: ${(err as Error).message}`);
    addFollowUp("Fix package.json, then re-run create-bini-app.");
    return false;
  }

  if (!mergeNativePatch(pkg, nativePackagePatch())) return false;

  try {
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    log.success("Added native scripts and dependencies to package.json");
    return true;
  } catch (err) {
    log.error(`Could not update package.json: ${(err as Error).message}`);
    addFollowUp("Add the native scripts/dependencies to package.json manually.");
    return false;
  }
}

/* ================================================================== */
/* Starter page (3 styling variants, JS + TS safe)                      */
/* ================================================================== */

type PageKey =
  | "root" | "main" | "logo" | "text" | "title" | "code"
  | "desc" | "link" | "actions" | "primary" | "secondary";

const TAILWIND_CLASSES: Record<PageKey, string> = {
  root: "flex min-h-screen w-full flex-col items-center justify-center bg-white font-sans dark:bg-black",
  main: "flex min-h-screen w-full max-w-3xl flex-col items-center justify-between px-8 py-24 sm:items-start sm:px-16 sm:py-32",
  logo: "h-7 w-auto sm:h-8 dark:invert",
  text: "flex flex-col items-center gap-6 text-center sm:items-start sm:text-left",
  title: "max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50",
  code: "rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-zinc-900",
  desc: "max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400",
  link: "font-medium text-zinc-950 no-underline dark:text-zinc-50",
  actions: "flex w-full flex-col gap-3 sm:w-auto sm:flex-row",
  primary:
    "flex h-12 w-full items-center justify-center rounded-full bg-black px-8 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 sm:w-auto",
  secondary:
    "flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-8 font-medium text-black transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:text-white dark:hover:bg-zinc-900 sm:w-auto",
};

const PLAIN_CLASS_NAMES: Record<PageKey, string> = {
  root: "home",
  main: "home-main",
  logo: "home-logo",
  text: "home-text",
  title: "home-title",
  code: "home-code",
  desc: "home-desc",
  link: "home-link",
  actions: "home-actions",
  primary: "home-btn home-btn-primary",
  secondary: "home-btn home-btn-secondary",
};

const MODULE_CLASS_EXPR: Record<PageKey, string> = {
  root: "{styles.home}",
  main: "{styles.homeMain}",
  logo: "{styles.homeLogo}",
  text: "{styles.homeText}",
  title: "{styles.homeTitle}",
  code: "{styles.homeCode}",
  desc: "{styles.homeDesc}",
  link: "{styles.homeLink}",
  actions: "{styles.homeActions}",
  primary: "{`${styles.homeBtn} ${styles.homeBtnPrimary}`}",
  secondary: "{`${styles.homeBtn} ${styles.homeBtnSecondary}`}",
};

/** The starter page has no TypeScript-only syntax, so the same JSX is valid in .tsx and .jsx. */
function buildPageContent(fileExt: FileExtension, styling: StylingOption): string {
  const cn = (key: PageKey): string =>
    styling === "Tailwind"
      ? `className="${TAILWIND_CLASSES[key]}"`
      : styling === "CSS Modules"
        ? `className=${MODULE_CLASS_EXPR[key]}`
        : `className="${PLAIN_CLASS_NAMES[key]}"`;

  const cssImport = styling === "CSS Modules" ? `import styles from './page.module.css';\n\n` : "";

  return `${cssImport}export default function Home() {
  return (
    <div ${cn("root")}>
      <main ${cn("main")}>
        <img
          src="/bini.svg"
          alt="Bini.js"
          width="120"
          height="32"
          ${cn("logo")}
        />

        <div ${cn("text")}>
          <h1 ${cn("title")}>
            To get started, edit the{" "}
            <code ${cn("code")}>
              src/app/page.${fileExt}
            </code>{" "}
            file.
          </h1>

          <p ${cn("desc")}>
            Looking for a starting point or more instructions? Head over to{" "}
            <a href="https://bini.js.org/showcase" ${cn("link")}>
              Templates
            </a>{" "}
            or the{" "}
            <a href="https://bini.js.org" ${cn("link")}>
              Learning
            </a>{" "}
            center.
          </p>
        </div>

        <div ${cn("actions")}>
          <a
            href="https://bini.js.org/showcase"
            target="_blank"
            rel="noopener noreferrer"
            ${cn("primary")}
          >
            Showcase
          </a>
          <a
            href="https://bini.js.org"
            target="_blank"
            rel="noopener noreferrer"
            ${cn("secondary")}
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
`;
}

/* ================================================================== */
/* App files (main entry, layout, page, API): identical for all targets */
/* ================================================================== */

async function generateAppFiles(
  projectPath: string,
  mainExt: FileExtension,
  useTypeScript: boolean,
  styling: StylingOption,
  appName: string
): Promise<void> {
  const appPath = path.join(projectPath, "src/app");

  // Every TypeScript-only construct goes through ts(); JS output gets the fallback.
  const ts = (tsCode: string, jsCode = ""): string => (useTypeScript ? tsCode : jsCode);

  const childrenProp = ts(`{ children }: { children: React.ReactNode }`, `{ children }`);

  // No Tauri code here: bini-native serves /api and opens external links itself, in memory.
  const mainContent = `import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';

const noopSubscribe = () => () => {};

function ClientOnly(${childrenProp}) {
  // false during server render + hydration, true afterwards (no effect / setState needed).
  const hasMounted = React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  if (import.meta.env.DEV && !hasMounted) {
    return null;
  }

  return <>{children}</>;
}

if (typeof window !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const isShell = ${ts(
      `(window as unknown as { __BINI_SHELL__?: boolean }).__BINI_SHELL__ === true`,
      `window.__BINI_SHELL__ === true`
    )};

    if (isShell) {
      createRoot(rootElement).render(<App />);
    } else if (import.meta.env.DEV) {
      hydrateRoot(
        rootElement,
        <ClientOnly>
          <App />
        </ClientOnly>
      );
    } else {
      hydrateRoot(rootElement, <App />);
    }
  }
}

export { App };

export async function render(url${ts(": string")})${ts(": Promise<string>")} {
  const ReactDOMServer = await import('react-dom/server');
  const { createElement } = await import('react');
  const { StaticRouter } = await import('react-router-dom');
  const { AppRoutes, basename: rawBasename } = await import('./App');
  const { Writable } = await import('stream');

  const basename${ts(": string")} = rawBasename;

  const normalizedBase = basename === '/' ? '' : basename.replace(/\\/$/, '');

  const routePath = url.startsWith('/') ? url : \`/\${url}\`;

  const fullUrl = normalizedBase && !routePath.startsWith(normalizedBase)
    ? \`\${normalizedBase}\${routePath}\`
    : routePath;

  return new Promise${ts("<string>")}((resolve, reject) => {
    let html = '';
    const writable = new Writable({
      write(chunk, _enc, callback) {
        html += chunk.toString();
        callback();
      },
    });

    const { pipe } = ReactDOMServer.renderToPipeableStream(
      createElement(
        StaticRouter,
        { location: fullUrl, basename },
        createElement(AppRoutes)
      ),
      {
        onAllReady() {
          pipe(writable);
          writable.on('finish', () => resolve(html));
        },
        onError: (err${ts(": unknown")}) => {
          reject(err);
        },
      }
    );
  });
}
`;

  const siteName = jsString(appName);
  const layoutContent = `import React from 'react';
import './globals.css';

export const metadata = {
  applicationName: ${siteName},
  title      : ${siteName},
  description: 'Modern React application built with Bini.js',
  keywords   : ['Bini.js', 'React', 'Vite'],
  themeColor : '#00CFFF',
  manifest   : '/site.webmanifest',
  openGraph: {
    siteName   : ${siteName},
    title      : ${siteName},
    description: 'Modern React application built with Bini.js',
    images     : [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card   : 'summary_large_image',
    title  : ${siteName},
    creator: '@binidu01',
    images : ['/og-image.png'],
  },
  icons: {
    icon : [{ url: '/favicon.ico', type: 'image/x-icon' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

const jsonLd = {
  '@context'   : 'https://schema.org',
  '@type'      : 'WebSite',
  name         : 'Bini.js',
  alternateName: 'Bini',
  url          : 'https://bini.js.org/',
};

export default function RootLayout(${childrenProp}) {
  return (
    <React.Fragment>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </React.Fragment>
  );
}
`;

  await Promise.all([
    writeFile(path.join(projectPath, "src", `main.${mainExt}`), mainContent),
    writeFile(path.join(appPath, `layout.${mainExt}`), layoutContent),
    writeFile(path.join(appPath, `page.${mainExt}`), buildPageContent(mainExt, styling)),
  ]);
}

const generateApiFile = (projectPath: string, ext: ScriptExtension): Promise<void> =>
  writeFile(
    path.join(projectPath, `src/app/api/hello.${ext}`),
    `import { Hono } from 'hono'

const app = new Hono()

app.all('/hello', (c) => {
  return c.json({
    message  : 'Hello from Bini.js!',
    timestamp: new Date().toISOString(),
    method   : c.req.method,
  })
})

export default app
`
  );

/* ================================================================== */
/* README                                                               */
/* Each fact lives in exactly one place:                                */
/*   intro: the stack and Node version                                  */
/*   Commands table: what every script does (build, doctor, sign,       */
/*     deploy targets, clean --all, upgrade)                            */
/*   Features: what each package provides                               */
/*   Tauri section: how native builds work                              */
/*   Code signing: where secrets live and how `sign` scopes itself      */
/* ================================================================== */

/** The README documents only the platforms that were selected for this project. */
function generateReadme(
  projectName: string,
  useTypeScript: boolean,
  pm: PackageManager,
  web: boolean,
  platforms: TauriPlatform[]
): string {
  const mainExt = useTypeScript ? "tsx" : "jsx";
  const has = (p: TauriPlatform): boolean => platforms.includes(p);
  const native = platforms.length > 0;
  const run = (script: string): string => `${pm} run ${script}`;
  const tauriRun = (args: string): string => (pm === "npm" ? `${pm} run tauri -- ${args}` : `${pm} run tauri ${args}`);
  const fence = (body: string): string => "```bash\n" + body + "\n```";
  const bullets = (items: string[]): string => items.map((i) => `- ${i}`).join("\n");
  const table = (rows: [string, string][]): string =>
    ["| Command | Description |", "|---|---|", ...rows.map(([cmd, desc]) => `| \`${cmd}\` | ${desc} |`)].join("\n");

  const names = [web && "Web", has("desktop") && "Desktop", has("android") && "Android", has("ios") && "iOS"].filter(
    (n): n is string => typeof n === "string"
  );
  const listed = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];

  /* ---- Commands: the single place every script is described ---- */
  const rows: [string, string][] = [];
  if (web) {
    rows.push(
      [run("dev"), "Start the Vite development server with HMR"],
      [run("build"), `${useTypeScript ? "Type-check, build" : "Build"} the client and SSR bundle, then prerender every route`],
      [run("start"), "Serve the production build with bini-server"],
      [run("preview"), "Preview the production build"]
    );
  }
  if (has("desktop")) {
    rows.push([run("tauri:dev"), "Desktop app in development mode"], [run("tauri:build"), "Build a distributable desktop app"]);
  }
  if (has("android")) {
    rows.push([run("android"), "Run on an emulator or device"], [run("android:build"), "Build an APK / AAB"]);
  }
  if (has("ios")) {
    rows.push([run("ios"), "Run on a simulator or device (macOS only)"], [run("ios:build"), "Build the iOS app (macOS only)"]);
  }
  if (native) {
    rows.push(
      [run("sign"), "Set up or redo code signing"],
      [run("doctor"), "Check your machine for Tauri (runs `tauri info`)"],
      [tauriRun("<args>"), "Pass-through to the Tauri CLI"]
    );
  }
  rows.push([run("clean"), "Delete build output and caches"]);
  if (native) {
    rows.push([
      `${run("clean")}${pm === "npm" ? " --" : ""} --all`,
      "Also clear the Rust build cache (`src-tauri/target`), the next native build is slow",
    ]);
  }
  rows.push(
    [run("upgrade"), "Update every dependency to its latest version (and `cargo update` for Rust)"],
    [run("deploy"), "Deploy with bini-deploy (Netlify, Vercel, Cloudflare Workers, Node.js, Deno or GitHub)"]
  );

  const sections: string[] = [];

  /* ---- Intro: the stack is named here and nowhere else ---- */
  sections.push(
    `# ${projectName}\n\nA **Bini.js** application for **${listed}**, built with ${native ? "**Vite**, **Hono** and **Tauri**" : "**Vite** and **Hono**"}.\n\nRequires Node.js >= ${REQUIRED_NODE}.`
  );

  sections.push(["## Commands", table(rows)].join("\n\n"));

  /* ---- Features: what each package provides, no command or deploy repeats ---- */
  if (web) {
    sections.push(
      [
        "## Features",
        bullets([
          "File-based routing, nested layouts, per-route metadata and code splitting (**bini-router**).",
          "API routes in `src/app/api/` (Vite middleware in dev, **bini-server** in production, edge runtimes when deployed).",
          `Static site generation (**bini-ssg**) from the \`render()\` export of \`src/main.${mainExt}\`.`,
          "Dev overlay with Shiki-powered error highlighting (**bini-overlay**) and GitHub Codespaces support.",
          "Environment variables (**bini-env**).",
          "Linting with **Oxlint** and formatting with **Oxfmt**" + (useTypeScript ? ", type-checked with **TypeScript**." : "."),
        ]),
      ].join("\n\n")
    );
  }

  /* ---- Native: how it works, not what the scripts are called ---- */
  if (native) {
    const targetNotes = [
      has("desktop") &&
        `Desktop bundles are not cross-compiled: build on the OS you target. Regenerate icons with \`${tauriRun("icon public/logo.png")}\`.`,
      has("android") &&
        "Android: commit the generated `src-tauri/gen/android`. Only `keystore.properties`, `.gradle/` and build output are git-ignored.",
      has("ios") && "iOS: needs macOS with Xcode.",
    ].filter((s): s is string => typeof s === "string");

    sections.push(
      [
        "## Desktop and mobile (Tauri v2)",
        `Native targets add \`src-tauri/\`, \`bini-native\` and the scripts above. Every Tauri script sets \`TAURI=true\`, so the dev server binds to \`TAURI_DEV_HOST\` / \`0.0.0.0\` on port 3000 (Tauri's \`devUrl\`) and no browser tab opens. ` +
          `Release builds run \`${run("build")}\` first, so the packaged app ships the same prerendered HTML as the web.`,
        `\`bini-native\` is loaded by \`vite.config\` only when \`TAURI=true\`. It serves \`/api/*\` in-process, opens external links in the system browser and wires Cargo, capabilities and manifests for the web APIs you use.`,
        `Prerequisites: ${TAURI_PREREQUISITES_URL}`,
        bullets(targetNotes),
      ].join("\n\n")
    );

    const secretFiles = [
      (has("desktop") || has("ios")) &&
        `${has("desktop") && has("ios") ? "Desktop and iOS" : has("desktop") ? "Desktop" : "iOS"}: \`.env.signing\` (load with \`set -a; source .env.signing; set +a\`).`,
      has("android") &&
        "Android: `keystore.jks` in the project root and `src-tauri/gen/android/keystore.properties`. The Gradle config only signs when that file exists, so debug builds and fresh clones keep working. Back up `keystore.jks` and its password.",
    ].filter((s): s is string => typeof s === "string");

    sections.push(
      [
        "## Code signing",
        `Secrets live in git-ignored files:\n\n${bullets(secretFiles)}`,
        `\`${run("sign")}\` prompts only for what applies here: desktop signs for the OS you run it on${has("android") ? ", Android is included because it was added" : ""}${has("ios") ? ", iOS appears only on macOS" : ""}. ` +
          `Pass a target to redo just one, e.g. \`npx create-bini-app sign ${has("android") ? "android" : "desktop"}\`.`,
      ].join("\n\n")
    );
  }

  /* ---- Adding and removing platforms ---- */
  const remaining = NATIVE_PLATFORMS.filter((p) => !has(p));
  const platformLines: string[] = [];
  if (remaining.length > 0) platformLines.push(`npx create-bini-app add ${remaining.join(",")}`);
  if (native) platformLines.push(`npx create-bini-app remove <${platforms.join("|")}>`);
  if (platformLines.length > 0) {
    sections.push(
      [
        "## Adding and removing platforms",
        `Run from inside the project. \`vite.config\`, \`src/main.${mainExt}\` and \`src/app/*\` are never touched, and re-running skips anything already configured.`,
        fence(platformLines.join("\n")),
      ].join("\n\n")
    );
  }

  sections.push(`Docs: https://bini.js.org\n\nBuilt with **Bini.js v${BINIJS_VERSION}**`);

  return sections.join("\n\n---\n\n") + "\n";
}

/* ================================================================== */
/* tsconfig / lint / gitignore                                          */
/* ================================================================== */

const generateTsConfig = (projectPath: string): Promise<void> =>
  writeFile(
    path.join(projectPath, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          allowArbitraryExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          paths: { "@/*": ["./src/*"] },
          forceConsistentCasingInFileNames: true,
          // Types are configured here (NOT in vite.config).
          types: ["vite/client", "node"],
        },
        include: ["src"],
        exclude: ["node_modules", "dist"],
      },
      null,
      2
    )
  );

async function generateLintAndFormatConfigs(projectPath: string): Promise<void> {
  await Promise.all([
    writeFile(
      path.join(projectPath, ".oxlintrc.json"),
      JSON.stringify(
        {
          $schema: "./node_modules/oxlint/configuration_schema.json",
          plugins: ["react"],
          env: { browser: true, es2022: true },
          ignorePatterns: ["dist", "node_modules"],
        },
        null,
        2
      )
    ),
    // The Oxfmt config file name must be exactly `.oxfmtrc.json`.
    writeFile(
      path.join(projectPath, ".oxfmtrc.json"),
      JSON.stringify(
        {
          semi: false,
          singleQuote: true,
          tabWidth: 2,
          printWidth: 100,
          trailingComma: "es5",
          sortImports: true,
          sortTailwindcssClasses: true,
        },
        null,
        2
      )
    ),
  ]);
}

/**
 * Lock files are intentionally NOT ignored: commit them for reproducible installs.
 * src-tauri/gen/ and src-tauri/icons/ are committed; only secrets and build output are ignored.
 * Bundles (exe, dmg, apk, ...) land under src-tauri/target or gen/**\/build, which are already ignored.
 */
const GITIGNORE = `# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
dist-ssr/
*.local
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.*.local
.env.signing

# Tauri build artifacts
src-tauri/target/
src-tauri/gen/**/build/
src-tauri/gen/android/.gradle/
src-tauri/gen/android/local.properties
src-tauri/gen/apple/Externals/

# Editor and OS
.vscode/
.idea/
.DS_Store
Thumbs.db

# Logs
*.log
`;

/* ================================================================== */
/* Project detection (add mode)                                         */
/* ================================================================== */

/** Walk upward from `startDir` (max 5 levels) to the first package.json that depends on bini-router. */
function findProjectRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i <= MAX_PROJECT_WALK; i++) {
    try {
      const pkg = readJsonSync(path.join(dir, "package.json"));
      if (pkg.dependencies?.["bini-router"] || pkg.devDependencies?.["bini-router"]) return dir;
    } catch {
      /* missing or unreadable package.json: keep walking */
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Same as findProjectRoot for the current directory, but exits with the standard message when nothing is found. */
function requireProjectRoot(): string {
  const root = findProjectRoot(process.cwd());
  if (!root) {
    log.error("This doesn't look like a Bini.js project (no bini-router in package.json).");
    exit(1);
  }
  return root;
}

/** Disk is the source of truth; there is no state file. */
function detectProject(root: string, pmFlag: PackageManager | undefined): DetectedProject {
  const pkg = readJsonSync(path.join(root, "package.json"));
  const deps: Record<string, string> = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  const tauriDir = path.join(root, "src-tauri");
  const conf = readTauriConfSync(tauriDir);
  let envSigning = "";
  try { envSigning = fs.readFileSync(path.join(root, ".env.signing"), "utf-8"); } catch { /* none yet */ }

  const typescript = fs.existsSync(path.join(root, "tsconfig.json"));
  const mainExt: FileExtension = fs.existsSync(path.join(root, "src", "main.tsx"))
    ? "tsx"
    : fs.existsSync(path.join(root, "src", "main.jsx"))
      ? "jsx"
      : typescript ? "tsx" : "jsx";

  return {
    root,
    name: typeof pkg.name === "string" && pkg.name ? pkg.name : path.basename(root),
    typescript,
    mainExt,
    pm: resolvePackageManager(pmFlag, root).pm,
    hasNative: conf !== null,
    nativeReady: Boolean(deps["bini-native"] && deps["@tauri-apps/cli"]),
    hasAndroid: fs.existsSync(path.join(tauriDir, "gen", "android")),
    hasIos: fs.existsSync(path.join(tauriDir, "gen", "apple")),
    signing: {
      android: fs.existsSync(path.join(tauriDir, "gen", "android", "keystore.properties")),
      windows: Boolean(conf?.bundle?.windows?.certificateThumbprint),
      macos: Boolean(conf?.bundle?.macOS?.signingIdentity),
      linux: /^SIGN=/m.test(envSigning),
      ios: /^IOS_CERTIFICATE=/m.test(envSigning),
    },
  };
}

/* ================================================================== */
/* Add mode                                                             */
/* ================================================================== */

type ActionKind = "init" | "lite" | "signOnly" | "skip";

function warnIfGitDirty(root: string): void {
  try {
    const out = execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
      timeout: 5_000,
      windowsHide: true,
    });
    if (out.trim().length > 0) {
      log.warn("Your git working tree has uncommitted changes. Commit first so you can review the diff.");
    }
  } catch {
    /* not a git repo / git missing: nothing to warn about */
  }
}

/** Web and every target the project already has are shown checked and locked. iOS is disabled off macOS. */
function pickerChoices(project: DetectedProject, userOS: UserOS) {
  const present: Record<TauriPlatform, boolean> = {
    desktop: project.hasNative,
    android: project.hasAndroid,
    ios: project.hasIos,
  };
  return [
    { name: PLATFORM_LABELS.web, value: "web" as TargetPlatform, checked: true, disabled: "(included)" },
    ...NATIVE_PLATFORMS.map((p) => {
      const value: TargetPlatform = p;
      if (present[p]) return { name: PLATFORM_LABELS[p], value, checked: true, disabled: "(already added)" };
      if (p === "ios" && userOS !== "macos") return { name: PLATFORM_LABELS[p], value, disabled: "(requires macOS)" };
      return { name: PLATFORM_LABELS[p], value };
    }),
  ];
}

function printSigningStatus(platforms: TauriPlatform[], signing: Record<SigningTarget, boolean>, userOS: UserOS): void {
  for (const p of platforms) {
    const label = p === "desktop" ? `desktop (${userOS})` : p;
    if (signing[signingTargetFor(p, userOS)]) log.plain(`  ${label}: signing configured`);
    else log.plain(`  ${label}: signing not configured ${c.dim}(run: create-bini-app sign ${p})${c.reset}`);
  }
}

/**
 * Inside an existing Bini project, add one or more targets.
 * Returns the process exit code (0 ok / no-op, 2 manual follow-up needed).
 */
async function addPlatforms(requested: TargetPlatform[], flags: CliFlags, userOS: UserOS, implicit: boolean): Promise<number> {
  const root = requireProjectRoot();

  const project = detectProject(root, flags.packageManager);
  log.info(`Project ${c.cyan}${project.name}${c.reset} at ${c.dim}${root}${c.reset}`);

  const ignored = [
    flags.typescript !== undefined && (flags.typescript ? "--typescript" : "--javascript"),
    flags.tailwind && "--tailwind",
    flags.cssModules && "--css-modules",
    flags.noStyle && "--none",
  ].filter((v): v is string => typeof v === "string");
  if (ignored.length > 0) log.warn(`Ignored in add mode: ${ignored.join(", ")}`);

  /* ---- which platforms ---- */
  let platforms = requested;
  if (platforms.length === 0) {
    if (!isInteractive()) {
      log.error("No platform given. Use e.g. `create-bini-app add android`.");
      exit(1);
    }
    if (implicit && !(await confirm({ message: "Add a platform to this project?", default: true }))) {
      log.info("Nothing to do.");
      return 0;
    }
    const choices = pickerChoices(project, userOS);
    if (choices.every((ch) => ch.checked || ch.disabled)) {
      log.info("Every platform available on this machine is already added.");
      log.info("To set up code signing, run: create-bini-app sign");
      return 0;
    }
    const existing = new Set<TargetPlatform>(choices.filter((ch) => ch.checked).map((ch) => ch.value));
    const picked = await checkbox<TargetPlatform>({ message: "Add platforms?", choices });
    platforms = picked.filter((p) => !existing.has(p));
    if (platforms.length === 0) {
      log.info("No new platform selected. Nothing to do.");
      return 0;
    }
  }

  const showWeb = platforms.includes("web");
  if (showWeb) log.skip("web: always part of the project.");
  let nativePlatforms = platforms.filter((p): p is TauriPlatform => p !== "web");

  // iOS can't be set up on Windows / Linux: say how to get it built, touch nothing else.
  if (userOS !== "macos" && nativePlatforms.includes("ios")) {
    log.warn(iosNeedsMacMessage(pmRun(project.pm, "deploy")));
    nativePlatforms = nativePlatforms.filter((p) => p !== "ios");
  }
  if (nativePlatforms.length === 0) {
    if (showWeb) printCommands(project.pm, ["web"]);
    else log.info("Nothing to do.");
    return 0;
  }

  /* ---- plan ---- */
  const actions: { platform: TauriPlatform; kind: ActionKind }[] = nativePlatforms.map((platform) => {
    if (platform !== "desktop") {
      const configured = platform === "android" ? project.hasAndroid : project.hasIos;
      return { platform, kind: !configured ? "init" : flags.sign === true ? "signOnly" : "skip" };
    }
    // "desktop" is one src-tauri/ for every OS: once it exists, adding it again only offers signing.
    if (!project.hasNative) return { platform, kind: "init" };
    return { platform, kind: !project.signing[userOS] || flags.sign === true ? "lite" : "skip" };
  });

  const summary: { platform: TargetPlatform; outcome: Outcome; note: string }[] = [];
  for (const a of actions.filter((x) => x.kind === "skip")) {
    log.skip(`${a.platform}: already configured`);
    summary.push({ platform: a.platform, outcome: "skipped", note: "already configured" });
  }

  const active = actions.filter((a) => a.kind !== "skip");
  if (active.length === 0) {
    log.info("Nothing to do.");
    printSigningStatus(nativePlatforms, project.signing, userOS);
    printCommands(project.pm, [...(showWeb ? (["web"] as const) : []), ...nativePlatforms]);
    return 0;
  }

  warnIfGitDirty(root);

  /* ---- package.json, install ---- */
  const pkgChanged = project.nativeReady ? false : await applyNativePatch(root);
  // Dependencies install automatically unless --no-install. With --no-install the Tauri CLI
  // steps run through a one-off runner instead.
  const tauriCliPath = path.join(root, "node_modules", "@tauri-apps", "cli");
  const needsCli = active.some((a) => a.kind === "init");
  if (!flags.noInstall && (pkgChanged || (needsCli && !fs.existsSync(tauriCliPath)))) {
    installDependencies(root, project.pm, false);
  }
  const localCli = fs.existsSync(tauriCliPath);

  /* ---- first native target ---- */
  let nativeResult: InitResult = "ok";
  if (!project.hasNative && active.some((a) => a.kind === "init")) {
    nativeResult = await initTauri({
      projectPath: root,
      pm: project.pm,
      projectName: project.name,
      appName: readLayoutTitle(root) ?? resolveAppName(flags, project.name),
      org: await askOrg(flags),
      localCli,
    });
  }

  const tauriDir = path.join(root, "src-tauri");
  const signedNow = new Set<TauriPlatform>();

  /* ---- per platform ---- */
  for (const { platform: p, kind } of active) {
    log.step(`${kind === "signOnly" ? "Signing for" : "Adding"} ${p}`);

    if (kind === "init" && nativeResult !== "ok") {
      summary.push({
        platform: p,
        outcome: nativeResult === "manual" ? "partial" : "failed",
        note: nativeResult === "manual" ? "Tauri init needs a manual step" : "Tauri init failed",
      });
      continue;
    }

    if (p !== "desktop" && kind === "init") {
      const r = await initMobile(p, { projectPath: root, pm: project.pm, userOS, localCli });
      if (r === "failed") {
        summary.push({ platform: p, outcome: "failed", note: "init failed" });
        continue;
      }
      if (r === "manual") {
        summary.push({ platform: p, outcome: "partial", note: "init skipped, see follow-ups" });
        continue;
      }
    }

    if (await setupCodeSigning({ projectPath: root, tauriDir, platform: p, userOS, signFlag: flags.sign, pm: project.pm })) {
      signedNow.add(p);
    }

    summary.push({
      platform: p,
      outcome: kind === "init" ? "added" : "skipped",
      note: kind === "signOnly" ? "signing step only" : p === "desktop" && kind === "lite" ? "shares src-tauri; signing offer only" : "added",
    });
  }

  /* ---- summary ---- */
  log.step("Summary");
  const outcomeColor = (o: Outcome) => (o === "added" ? c.green : o === "failed" ? c.red : c.yellow);
  for (const e of summary) {
    log.plain(`  ${outcomeColor(e.outcome)}${e.outcome.padEnd(8)}${c.reset} ${e.platform} ${c.dim}(${e.note})${c.reset}`);
  }

  log.plain(`\n${c.bold}${c.cyan}Signing:${c.reset}`);
  const signing = { ...detectProject(root, flags.packageManager).signing };
  for (const p of signedNow) signing[signingTargetFor(p, userOS)] = true;
  printSigningStatus(nativePlatforms, signing, userOS);

  if (followUps.length > 0) {
    log.plain(`\n${c.bold}${c.yellow}Manual follow-ups:${c.reset}`);
    followUps.forEach((f, i) => log.plain(`  ${i + 1}. ${f}`));
  }

  printCommands(project.pm, [...(showWeb ? (["web"] as const) : []), ...nativePlatforms]);

  log.plain(`\n${c.green}Done.${c.reset}`);
  return followUps.length > 0 ? 2 : 0;
}

/* ================================================================== */
/* Sign mode: (re)run code signing for an existing project              */
/* ================================================================== */

/**
 * Prompts are limited to what applies to this machine and this project:
 *   - desktop signs for the OS you are on (macOS, Windows or Linux), if desktop was added
 *   - Android is included only if it was added
 *   - iOS is included only on macOS, and only if it was added
 * Returns the process exit code (0 ok, 2 when something still needs attention).
 */
async function signProject(requested: TargetPlatform[], flags: CliFlags, userOS: UserOS): Promise<number> {
  const root = requireProjectRoot();
  if (flags.sign === false) {
    log.error("--nosign cannot be used with the sign command.");
    exit(1);
  }
  if (!isInteractive()) {
    log.error("Code signing needs interactive prompts. Run this command in a terminal.");
    exit(1);
  }

  const project = detectProject(root, flags.packageManager);
  log.info(`Project ${c.cyan}${project.name}${c.reset} at ${c.dim}${root}${c.reset}`);

  const available: TauriPlatform[] = [];
  if (project.hasNative) available.push("desktop");
  if (project.hasAndroid) available.push("android");
  if (project.hasIos && userOS === "macos") available.push("ios");

  const wanted = requested.filter((p): p is TauriPlatform => p !== "web");
  let targets = available;

  if (wanted.length > 0) {
    targets = wanted.filter((p) => available.includes(p));
    for (const p of wanted.filter((x) => !available.includes(x))) {
      if (p === "ios" && userOS !== "macos") log.warn("iOS signing is only available on macOS.");
      else log.warn(`${p} has not been added to this project. Run: create-bini-app add ${p}`);
    }
  } else if (project.hasIos && userOS !== "macos") {
    log.info("iOS signing is only available on macOS, skipping it here.");
  }

  if (targets.length === 0) {
    if (wanted.length > 0) return 2;
    log.info("This project has no desktop or mobile platform yet. Add one with: create-bini-app add <target>");
    return 0;
  }

  const labelOf = (p: TauriPlatform) => SIGNING_LABEL[signingTargetFor(p, userOS)];
  log.info(`Signing prompts: ${targets.map(labelOf).join(", ")}`);

  const tauriDir = path.join(root, "src-tauri");
  const done = new Set<TauriPlatform>();
  for (const platform of targets) {
    // signFlag: true skips the "set up now?" question, since running `sign` is already the answer.
    if (await setupCodeSigning({ projectPath: root, tauriDir, platform, userOS, signFlag: true, pm: project.pm })) {
      done.add(platform);
    }
  }

  log.step("Signing status");
  const signing = { ...detectProject(root, flags.packageManager).signing };
  for (const p of done) signing[signingTargetFor(p, userOS)] = true;
  printSigningStatus(targets, signing, userOS);

  const pending = targets.filter((p) => !signing[signingTargetFor(p, userOS)]);
  log.plain(pending.length > 0 ? `\n${c.yellow}Some targets still need attention.${c.reset}` : `\n${c.green}Done.${c.reset}`);
  return pending.length > 0 ? 2 : 0;
}

/* ================================================================== */
/* Remove mode                                                          */
/* ================================================================== */

const NATIVE_SCRIPTS: Record<TauriPlatform, string[]> = {
  desktop: ["tauri:dev", "tauri:build"],
  android: ["android", "android:build"],
  ios: ["ios", "ios:build"],
};
const SHARED_NATIVE_SCRIPTS = ["dev:native", "tauri", "sign", "doctor"];

/**
 * Remove the scripts this CLI generated (only when their value is unchanged, so customised scripts are
 * kept) and, when no native target is left, the packages it added.
 */
async function removeNativeFromPackageJson(root: string, scriptKeys: string[], removeDeps: boolean): Promise<boolean> {
  const pkgPath = path.join(root, "package.json");
  try {
    const pkg = JSON.parse(await fsPromises.readFile(pkgPath, "utf-8")) as AnyJson;
    const patch = nativePackagePatch();
    let changed = false;

    for (const key of scriptKeys) {
      if (pkg.scripts?.[key] !== undefined && pkg.scripts[key] === patch.scripts[key]) {
        delete pkg.scripts[key];
        changed = true;
      }
    }
    if (removeDeps) {
      for (const section of ["dependencies", "devDependencies"] as const) {
        for (const name of Object.keys(patch[section])) {
          if (pkg[section]?.[name] !== undefined) {
            delete pkg[section][name];
            changed = true;
          }
        }
      }
    }

    if (changed) await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    return changed;
  } catch (err) {
    log.warn(`Could not update package.json: ${(err as Error).message}`);
    addFollowUp("Remove the native scripts/dependencies from package.json manually.");
    return false;
  }
}

function removeDirIfEmpty(dir: string): void {
  try {
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch {
    /* missing or not empty: leave it */
  }
}

/**
 * Remove platform(s) from an existing project. Mobile targets delete their generated folder.
 * Desktop shares src-tauri/ with mobile, so it can only go together with every mobile target
 * and then removes all of src-tauri/. Returns the process exit code.
 */
async function removePlatforms(requested: TargetPlatform[], flags: CliFlags): Promise<number> {
  const root = requireProjectRoot();

  const project = detectProject(root, flags.packageManager);
  log.info(`Project ${c.cyan}${project.name}${c.reset} at ${c.dim}${root}${c.reset}`);

  const present: Record<TauriPlatform, boolean> = {
    desktop: project.hasNative,
    android: project.hasAndroid,
    ios: project.hasIos,
  };
  const options = NATIVE_PLATFORMS.filter((p) => present[p]);

  let wanted = requested;
  if (wanted.length === 0) {
    if (options.length === 0) {
      log.info("This project has no desktop or mobile platform to remove.");
      return 0;
    }
    if (!isInteractive()) {
      log.error("No platform given. Use e.g. `create-bini-app remove android`.");
      exit(1);
    }
    wanted = await checkbox<TargetPlatform>({
      message: "Remove platforms?",
      choices: options.map((p) => ({ name: PLATFORM_LABELS[p], value: p as TargetPlatform })),
      required: true,
    });
  }

  if (wanted.includes("web")) log.warn("web cannot be removed: it is part of every project.");
  const asked = wanted.filter((p): p is TauriPlatform => p !== "web");
  for (const p of asked.filter((x) => !present[x])) log.skip(`${p}: not in this project`);

  let targets = asked.filter((p) => present[p]);
  if (targets.length === 0) {
    log.info("Nothing to remove.");
    return 0;
  }

  // Desktop shares src-tauri/ with the mobile targets.
  const mobileLeft = (project.hasAndroid && !targets.includes("android")) || (project.hasIos && !targets.includes("ios"));
  if (targets.includes("desktop") && mobileLeft) {
    log.warn("desktop shares src-tauri/ with the mobile targets, so it can only be removed together with them.");
    log.info("To remove everything native: create-bini-app remove desktop android ios");
    targets = targets.filter((p) => p !== "desktop");
    if (targets.length === 0) return 2;
  }
  const removeAll = targets.includes("desktop");

  const effects: string[] = [];
  if (removeAll) {
    effects.push("src-tauri/ (including any Rust code you added), the native scripts and the Tauri packages in package.json");
  } else {
    if (targets.includes("android")) effects.push("src-tauri/gen/android");
    if (targets.includes("ios")) effects.push("src-tauri/gen/apple");
  }
  log.plain(`\n${c.bold}This will delete:${c.reset}`);
  for (const e of effects) log.plain(`  - ${e}`);
  if (project.hasAndroid && (removeAll || targets.includes("android"))) {
    log.plain(`  ${c.dim}keystore.jks in the project root is kept.${c.reset}`);
  }
  log.plain("");

  warnIfGitDirty(root);
  if (!flags.yes) {
    if (!isInteractive()) {
      log.error("Removing platforms needs confirmation. Re-run with --yes.");
      exit(1);
    }
    if (!(await confirm({ message: "Continue?", default: false }))) {
      log.info("Cancelled. Nothing was removed.");
      return 0;
    }
  }

  const tauriDir = path.join(root, "src-tauri");
  try {
    if (removeAll) {
      safeRm(tauriDir, root);
      log.success("Removed src-tauri/");
    } else {
      if (targets.includes("android")) {
        safeRm(path.join(tauriDir, "gen", "android"), root);
        log.success("Removed Android (src-tauri/gen/android)");
      }
      if (targets.includes("ios")) {
        safeRm(path.join(tauriDir, "gen", "apple"), root);
        log.success("Removed iOS (src-tauri/gen/apple)");
      }
      removeDirIfEmpty(path.join(tauriDir, "gen"));
    }
  } catch (err) {
    log.error(`Could not remove files: ${(err as Error).message}`);
    return 1;
  }

  const keys = removeAll
    ? [...Object.values(NATIVE_SCRIPTS).flat(), ...SHARED_NATIVE_SCRIPTS]
    : targets.flatMap((p) => NATIVE_SCRIPTS[p]);
  if (await removeNativeFromPackageJson(root, keys, removeAll)) {
    log.success("Cleaned the native scripts" + (removeAll ? " and packages" : "") + " from package.json");
  }
  log.plain(`\n${c.green}Done.${c.reset}`);
  return 0;
}

/* ================================================================== */
/* Doctor: a thin wrapper, the Tauri CLI does the actual checking       */
/* ================================================================== */

/** Run `tauri info` (Rust, MSVC, WebView2, Xcode, Android SDK/NDK, versions). Returns the exit code. */
async function doctorProject(flags: CliFlags): Promise<number> {
  const root = requireProjectRoot();

  const project = detectProject(root, flags.packageManager);
  if (!project.hasNative) {
    log.info("This project has no desktop or mobile platform yet. Add one with: create-bini-app add <target>");
    return 0;
  }

  const localCli = fs.existsSync(path.join(root, "node_modules", "@tauri-apps", "cli"));
  const cmd = tauriCmd(project.pm, ["info"], localCli);
  log.command(displayCmd(cmd.bin, cmd.args));
  return runBin(cmd.bin, cmd.args, root, 60_000) ? 0 : 2;
}

/* ================================================================== */
/* Clean / upgrade                                                      */
/* Neither exists in the Tauri CLI. They call the tools underneath it:  */
/* cargo and the project's package manager.                              */
/* ================================================================== */

/**
 * Delete build output and caches. Everything removed is regenerated by the next build. The Rust build
 * cache (src-tauri/target, often several GB) is only cleared with --all, through `cargo clean`.
 */
async function cleanProject(flags: CliFlags): Promise<number> {
  const root = requireProjectRoot();

  const tauriDir = path.join(root, "src-tauri");
  const candidates = [
    "dist",
    "dist-ssr",
    path.join("node_modules", ".vite"),
    path.join("src-tauri", "gen", "android", "app", "build"),
    path.join("src-tauri", "gen", "android", "build"),
    path.join("src-tauri", "gen", "apple", "build"),
    ...(flags.all ? [path.join("src-tauri", "gen", "apple", "Externals")] : []),
  ];

  let removed = 0;
  for (const rel of candidates) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    try {
      safeRm(abs, root);
      removed++;
      log.success(`Removed ${rel}`);
    } catch (err) {
      log.warn(`Could not remove ${rel}: ${(err as Error).message}`);
    }
  }

  const targetDir = path.join(tauriDir, "target");
  if (fs.existsSync(targetDir)) {
    if (flags.all) {
      log.step("Clearing the Rust build cache (cargo clean)...");
      const manifest = path.join(tauriDir, "Cargo.toml");
      let cleaned =
        commandExists("cargo") && fs.existsSync(manifest) && runBin("cargo", ["clean", "--manifest-path", manifest], root, 600_000);
      if (!cleaned) {
        try {
          safeRm(targetDir, root);
          cleaned = true;
        } catch (err) {
          log.warn(`Could not remove src-tauri/target: ${(err as Error).message}`);
        }
      }
      if (cleaned) {
        removed++;
        log.success("Cleared src-tauri/target");
      }
    }
  }

  if (removed === 0) log.info("Nothing to clean.");
  else log.plain(`\n${c.green}Done.${c.reset}`);
  return 0;
}

/** Versions that do not come from the registry are never touched. */
const NON_REGISTRY_SPEC = /^(file:|link:|workspace:|portal:|patch:|git\+|git:|github:|https?:|npm:)/;

function upgradeArgs(pm: PackageManager, names: string[], dev: boolean): string[] {
  const specs = names.map((n) => `${n}@latest`);
  switch (pm) {
    case "npm":
      return ["install", ...specs, dev ? "--save-dev" : "--save", "--no-audit", "--no-fund", "--loglevel=error"];
    case "pnpm":
    case "yarn":
      return ["add", ...specs, ...(dev ? ["-D"] : [])];
    case "bun":
      return ["add", ...specs, ...(dev ? ["--dev"] : [])];
  }
}

/**
 * Update every direct dependency to its latest version with the project's package manager, then refresh
 * the Rust side with `cargo update` when src-tauri exists. Returns the process exit code.
 */
async function upgradeProject(flags: CliFlags): Promise<number> {
  const root = requireProjectRoot();

  const project = detectProject(root, flags.packageManager);
  const pkg = readJsonSync(path.join(root, "package.json"));
  const pick = (section: "dependencies" | "devDependencies"): string[] =>
    Object.entries((pkg[section] ?? {}) as Record<string, unknown>)
      .filter(([, spec]) => typeof spec === "string" && !NON_REGISTRY_SPEC.test(spec))
      .map(([name]) => name);

  const runtime = pick("dependencies");
  const dev = pick("devDependencies");
  const total = runtime.length + dev.length;
  const manifest = path.join(root, "src-tauri", "Cargo.toml");
  const hasRust = fs.existsSync(manifest);

  if (total === 0 && !hasRust) {
    log.info("No registry dependencies to update.");
    return 0;
  }

  log.info(`Project ${c.cyan}${project.name}${c.reset} (${project.pm})`);
  if (runtime.length) log.plain(`  ${c.bold}dependencies${c.reset}     ${runtime.join(", ")}`);
  if (dev.length) log.plain(`  ${c.bold}devDependencies${c.reset}  ${dev.join(", ")}`);
  if (hasRust) log.plain(`  ${c.bold}Rust${c.reset}             cargo update (src-tauri)`);
  log.plain(`${c.dim}Every package above moves to its latest version, package.json records what it resolved to.${c.reset}\n`);

  warnIfGitDirty(root);

  let ok = true;
  for (const [names, isDev] of [[runtime, false], [dev, true]] as [string[], boolean][]) {
    if (names.length === 0) continue;
    const args = upgradeArgs(project.pm, names, isDev);
    log.step(`Updating ${isDev ? "devDependencies" : "dependencies"}...`);
    log.command(displayCmd(project.pm, args));
    if (!runBin(project.pm, args, root, 900_000)) {
      ok = false;
      log.warn(`Updating ${isDev ? "devDependencies" : "dependencies"} failed. Fix the error above and run the command again.`);
    }
  }

  if (hasRust) {
    if (!commandExists("cargo")) {
      log.warn("cargo not found, skipped the Rust update. Install Rust (https://rustup.rs), then run: cargo update --manifest-path src-tauri/Cargo.toml");
      ok = false;
    } else {
      log.step("Updating Rust dependencies...");
      log.command(`cargo update --manifest-path ${path.join("src-tauri", "Cargo.toml")}`);
      if (!runBin("cargo", ["update", "--manifest-path", manifest], root, 600_000)) {
        ok = false;
        log.warn("cargo update failed. Run it manually inside src-tauri.");
      }
    }
  }

  if (ok) log.plain(`\n${c.green}Done.${c.reset}`);
  else log.plain(`\n${c.yellow}Finished with problems, see the warnings above.${c.reset}`);
  return ok ? 0 : 2;
}

/* ================================================================== */
/* Project generation (create mode)                                     */
/* ================================================================== */

/** `git init` unless git is missing or the folder is already inside a repository (e.g. a monorepo). */
function initGit(projectPath: string): void {
  if (!commandExists("git")) {
    log.info("git not found, skipping git init.");
    return;
  }
  const inside = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: projectPath, stdio: "ignore", windowsHide: true });
  if (inside.status === 0) {
    log.info("Already inside a git repository, skipping git init.");
    return;
  }
  const init = spawnSync("git", ["init", "--quiet"], { cwd: projectPath, stdio: "ignore", windowsHide: true });
  if (!init.error && init.status === 0) log.success("Initialized a git repository");
  else log.warn("git init failed. Run it manually inside the project: git init");
}

async function generateProject(projectName: string, answers: ProjectAnswers, flags: CliFlags, userOS: UserOS): Promise<void> {
  const projectPath = path.join(process.cwd(), projectName);
  const publicPath = path.join(projectPath, "public");

  if (fs.existsSync(projectPath) && !flags.force) {
    log.error(`Directory "${projectName}" already exists. Use --force to overwrite.`);
    exit(1);
  }
  if (flags.force && fs.existsSync(projectPath)) {
    log.warn(`Removing existing directory: ${c.dim}${projectPath}${c.reset}`);
    safeRm(projectPath);
  }

  log.info(`Creating project in ${c.cyan}${projectPath}${c.reset}`);

  const { typescript: useTypeScript, styling } = answers;
  const mainExt: FileExtension = useTypeScript ? "tsx" : "jsx";
  const scriptExt: ScriptExtension = useTypeScript ? "ts" : "js";
  const nativePlatforms = answers.platforms;
  const isTauri = nativePlatforms.length > 0;

  // Decide the package manager up front so Tauri steps can run after install.
  const { pm, failed: pmFailed } = resolvePackageManager(flags.packageManager);
  if (!pmFailed) {
    log.info(`Package manager: ${c.cyan}${pm}${c.reset}${flags.packageManager ? ` (forced via --${pm})` : ""}`);
  }

  log.info("Scaffolding project files");

  // Same result as `add` on an existing project: base + the shared native patch.
  const pkg = basePackageJson(projectName, useTypeScript, mainExt, styling);
  if (isTauri) mergeNativePatch(pkg, nativePackagePatch());

  await Promise.all([
    copyAssetFiles(publicPath),
    generateWebManifest(projectPath, answers.appName),
    writeFile(
      path.join(projectPath, "index.html"),
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${mainExt}"></script>
  </body>
</html>
`
    ),
    generateAppFiles(projectPath, mainExt, useTypeScript, styling, answers.appName),
    styling === "CSS Modules" ? writeFile(path.join(projectPath, "src/app/page.module.css"), PAGE_CSS) : Promise.resolve(),
    writeFile(path.join(projectPath, "src/app/globals.css"), generateGlobalStyles(styling)),
    generateApiFile(projectPath, scriptExt),
    writeFile(path.join(projectPath, ".gitignore"), GITIGNORE),
    writeFile(path.join(projectPath, "package.json"), JSON.stringify(pkg, null, 2) + "\n"),
    generateViteConfig(projectPath, scriptExt, styling),
    useTypeScript ? generateTsConfig(projectPath) : Promise.resolve(),
    generateLintAndFormatConfigs(projectPath),
  ]);

  log.success(
    `Generated ${c.green}${useTypeScript ? "TypeScript" : "JavaScript"}${c.reset}` +
    ` project with ${c.green}${styling}${c.reset} styling`
  );

  // 1) install first ...
  const installed = !pmFailed && !flags.noInstall && installDependencies(projectPath, pm);
  const localCli = fs.existsSync(path.join(projectPath, "node_modules", "@tauri-apps", "cli"));

  // 2) ... then Tauri (needs the local CLI). Without install it prints manual instructions.
  if (isTauri) {
    await setupTauri({
      projectPath,
      platforms: nativePlatforms,
      userOS,
      pm,
      projectName,
      appName: readLayoutTitle(projectPath) ?? answers.appName,
      org: answers.org,
      signFlag: flags.sign,
      localCli,
    });
  }

  await writeFile(path.join(projectPath, "README.md"), generateReadme(projectName, useTypeScript, pm, answers.web, nativePlatforms));
  if (!flags.noGit) initGit(projectPath);

  log.plain(
    `\n${c.green}${c.bold}OK${c.reset} ${c.bold}Project created!${c.reset}` +
    ` ${c.cyan}${projectName}${c.reset} at ${c.dim}${projectPath}${c.reset}\n`
  );
  if (pmFailed) log.warn(`README uses "npm" as placeholder, update manually if needed.\n`);

  log.success("Get started:");
  log.plain(`\n  ${c.green}cd ${projectName}${c.reset}`);
  if (!installed && !pmFailed) log.plain(`  ${c.green}${pm} install${c.reset}`);

  // Commands grouped by the platforms that were actually selected.
  printCommands(pm, [...(answers.web ? (["web"] as const) : []), ...nativePlatforms]);

  log.plain(`\n${c.dim}Add more platforms later from inside the project: create-bini-app add <target>${c.reset}`);

  if (answers.iosSkipped) {
    log.warn("iOS requires macOS, so the project was created without it.");
    log.info(
      `Develop on web${nativePlatforms.includes("android") ? " or Android" : ""}, ` +
      `then run \`${pmRun(pm, "deploy")}\` and choose iOS to build the iOS app.`
    );
  }
  log.plain(`\n${c.green}Happy coding!${c.reset}`);
}

/* ================================================================== */
/* main                                                                 */
/* ================================================================== */

async function main(): Promise<void> {
  checkNodeVersion();

  const { positionals, flags } = parseArguments();
  const userOS = detectUserOS();
  const first = positionals[0];
  const insideProject = !first && findProjectRoot(process.cwd()) !== null;

  // The logo is only for creating a project; adding a platform stays quiet.
  if (!SUBCOMMANDS.has(first ?? "") && !insideProject) log.plain(LOGO);
  log.info(`Detected OS: ${userOS}`);

  // `doctor` / `clean` / `upgrade` take no platform arguments.
  if (first === "doctor" || first === "clean" || first === "upgrade") {
    if (positionals.length > 1) {
      log.error(`Unexpected extra argument(s): ${positionals.slice(1).join(" ")}`);
      exit(1);
    }
    exit(first === "doctor" ? await doctorProject(flags) : first === "clean" ? await cleanProject(flags) : await upgradeProject(flags));
  }

  // `remove <targets>` -> delete platforms from the project.
  if (first === "remove") {
    const extra = parsePlatformList(positionals.slice(1).join(",") || undefined, "platform");
    exit(await removePlatforms([...new Set<TargetPlatform>([...extra, ...flags.platforms])], flags));
  }

  // `sign [targets]` -> redo code signing; remaining positionals narrow it to specific platforms.
  if (first === "sign") {
    const extra = parsePlatformList(positionals.slice(1).join(",") || undefined, "platform");
    exit(await signProject([...new Set<TargetPlatform>([...extra, ...flags.platforms])], flags, userOS));
  }

  // `add <targets>` -> add mode; remaining positionals are platforms.
  if (first === "add") {
    const extra = parsePlatformList(positionals.slice(1).join(",") || undefined, "platform");
    exit(await addPlatforms([...new Set<TargetPlatform>([...extra, ...flags.platforms])], flags, userOS, false));
  }

  // No name, inside a Bini project -> add mode.
  if (insideProject) {
    exit(await addPlatforms(flags.platforms, flags, userOS, flags.platforms.length === 0));
  }

  // Create mode.
  let projectName = first;
  if (!projectName) {
    if (!isInteractive()) {
      log.error("Project name required in non-interactive mode.");
      exit(1);
    }
    projectName = await input({
      message: "Project name?",
      default: "my-bini-app",
      validate: (v) => (!v ? "Name required." : validateProjectName(v) ? true : PROJECT_NAME_RULE),
    });
  }

  if (!validateProjectName(projectName)) {
    log.error(`Invalid project name. ${PROJECT_NAME_RULE}`);
    exit(1);
  }

  const answers = await askQuestions(flags, projectName, userOS);
  await generateProject(projectName, answers, flags, userOS);
}

main().catch((err) => fatal(err, "Fatal"));