import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { randomBytes } from "node:crypto";
import { parseArgs, styleText } from "node:util";
import * as clack from "@clack/prompts";

type StylingOption = "Tailwind" | "CSS Modules" | "None";
type PackageManager = "bun" | "pnpm" | "yarn" | "npm";
type FileExtension = "tsx" | "jsx";
type ScriptExtension = "ts" | "js";
type TauriPlatform = "desktop" | "android" | "ios";
type TargetPlatform = "web" | TauriPlatform;
type SigningTarget = "windows" | "linux" | "macos" | "android" | "ios";
type SignTarget = "desktop" | SigningTarget;
type UserOS = "windows" | "macos" | "linux";
type Outcome = "added" | "skipped" | "partial" | "failed";
type InitResult = "ok" | "manual" | "failed";
type MobileResult = "ok" | "skipped" | "manual" | "failed";
type ActionKind = "init" | "lite" | "signOnly" | "skip";
type AnyJson = Record<string, any>;

interface CliFlags {
  force: boolean;
  typescript: boolean | undefined;
  tailwind: boolean;
  cssModules: boolean;
  noStyle: boolean;
  noInstall: boolean;
  platforms: TargetPlatform[];
  appName: string | undefined;
  org: string | undefined;
  promptAppName: boolean;
  promptOrg: boolean;
  sign: boolean | undefined;
  yes: boolean;
  noGit: boolean;
  packageManager: PackageManager | undefined;
  alias: string | undefined;
  keyPassword: string | undefined;
  profile: string | undefined;
  team: string | undefined;
  identity: string | undefined;
  apiIssuer: string | undefined;
  apiKey: string | undefined;
  apiKeyFile: string | undefined;
  appleId: string | undefined;
  applePassword: string | undefined;
  signCommand: string | undefined;
  ciOnly: boolean;
  generate: boolean;
  publisher: string | undefined;
  thumbprint: string | undefined;
  adhoc: boolean;
}

interface ProjectAnswers {
  typescript: boolean;
  styling: StylingOption;
  web: boolean;
  platforms: TauriPlatform[];
  appName: string;
  org: string;
  iosSkipped: boolean;
}

interface NativePackagePatch {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

interface DetectedProject {
  root: string;
  name: string;
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
  target?: SigningTarget;
  ciOnly?: boolean;
}

interface InitTauriOptions {
  projectPath: string;
  pm: PackageManager;
  projectName: string;
  appName: string;
  org: string;
  localCli: boolean;
}

interface CommandGroup {
  title: string;
  raw?: boolean;
  commands: [script: string, description: string][];
}

interface SignParsed {
  targets: SignTarget[];
  file: string | undefined;
  password: string | undefined;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "..", "assets");
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");

const RENAMED_TEMPLATE_FILES: Record<string, string> = {
  gitignore: ".gitignore",
  npmrc: ".npmrc",
  env: ".env",
};

function render(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined ? vars[key] : `{{${key}}}`
  );
}

async function copyTemplate(
  relativePath: string,
  destPath: string,
  vars: Record<string, string> = {}
): Promise<void> {
  const basename = path.basename(destPath);
  const renamed = RENAMED_TEMPLATE_FILES[basename];
  const finalDestPath = renamed ? path.join(path.dirname(destPath), renamed) : destPath;
  const buf = await fsPromises.readFile(path.join(TEMPLATES_DIR, relativePath));
  const isText = !buf.subarray(0, 8192).includes(0);
  await writeFile(finalDestPath, isText ? render(buf.toString("utf8"), vars) : buf);
}

async function copyTemplateDir(
  relativeDir: string,
  destDir: string,
  vars: Record<string, string> = {},
  exclude?: (topLevelName: string) => boolean
): Promise<void> {
  const srcDir = path.join(TEMPLATES_DIR, relativeDir);
  if (!fs.existsSync(srcDir)) {
    log.warn(`Template folder missing: ${relativeDir}`);
    return;
  }

  const entries = await fsPromises.readdir(srcDir, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => !exclude?.(entry.name))
      .map((entry) =>
      entry.isDirectory()
        ? copyTemplateDir(path.join(relativeDir, entry.name), path.join(destDir, entry.name), vars)
        : copyTemplate(path.join(relativeDir, entry.name), path.join(destDir, entry.name), vars)
    )
  );
}

function readJsonSync<T = AnyJson>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

const BINIJS_VERSION = readJsonSync<{ version: string }>(path.join(__dirname, "..", "package.json")).version;

type Format = Parameters<typeof styleText>[0];

const colorEnabled =
  !process.env.NO_COLOR &&
  ((process.env.FORCE_COLOR !== undefined && process.env.FORCE_COLOR !== "0") || Boolean(process.stdout.isTTY));

const paint = (f: Format, s: string): string => (colorEnabled ? styleText(f, s) : s);
const fmt = (f: Format) => (s: string): string => paint(f, s);
const c = {
  dim: fmt("dim"),
  bold: fmt("bold"),
  cyan: fmt("cyan"),
  green: fmt("green"),
  yellow: fmt("yellow"),
  red: fmt("red"),
  heading: fmt(["bold", "cyan"]),
};

const LOGO_ART = `
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
`;
const LOGO = `\n${c.heading(LOGO_ART)}\n${c.dim("        Developed By Binidu")}\n`;

const REQUIRED_NODE = "20.19.0";
const MAX_PROJECT_WALK = 5;
const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const INVALID_NAME_PATTERN = /^(\.|\.\.|-|npm$|node$)|[^a-z0-9\-.]/;
const SUBCOMMANDS = new Set(["add", "sign", "remove", "doctor", "clean", "upgrade"]);
const DEFAULT_ORG = "com.bini";
const TAURI_PREREQUISITES_URL = "https://v2.tauri.app/start/prerequisites/";

const SLOW_STEP_MS = 300_000;
const INSTALL_TIMEOUT_MS = 600_000;

const TARGET_PLATFORMS: TargetPlatform[] = ["web", "desktop", "android", "ios"];
const NATIVE_PLATFORMS: TauriPlatform[] = ["desktop", "android", "ios"];
const SIGN_TARGETS: SignTarget[] = ["desktop", "windows", "macos", "linux", "android", "ios"];

const ENV_SIGN_PASSWORD = "BINI_SIGN_PASSWORD";
const ENV_KEY_PASSWORD = "BINI_KEY_PASSWORD";
const ENV_APPLE_PASSWORD = "BINI_APPLE_PASSWORD";

const LOCKFILE_NAMES: [file: string, pm: PackageManager][] = [
  ["bun.lockb", "bun"],
  ["bun.lock", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

const PLATFORM_LABELS: Record<TargetPlatform, string> = {
  web: "Web",
  desktop: "Desktop (Windows, macOS, Linux)",
  android: "Android",
  ios: "iOS",
};

type TagColor = "cyan" | "green" | "yellow" | "red" | "blue" | "magenta";
const tagged = (color: TagColor, label: string, out: (m: string) => void = console.log) => (m: string): void =>
  out(`${paint(["bold", color], label)} ${m}`);

const log = {
  info: tagged("cyan", "INFO"),
  success: tagged("green", "OK"),
  warn: tagged("yellow", "WARN"),
  error: tagged("red", "ERROR", console.error),
  step: tagged("blue", "STEP"),
  skip: tagged("yellow", "SKIP"),
  command: tagged("magenta", "RUN"),
  plain: (m: string): void => console.log(m),
};

const followUps: string[] = [];

function exit(code = 1): never {
  process.exit(code);
}

function addFollowUp(message: string): void {
  if (!followUps.includes(message)) followUps.push(message);
}

function printFollowUps(): void {
  if (followUps.length === 0) return;
  log.plain(`\n${c.bold(c.yellow("Manual follow-ups:"))}`);
  followUps.forEach((f, i) => log.plain(`  ${i + 1}. ${f}`));
}

let assumeYes = false;
const isInteractive = (): boolean => !assumeYes && Boolean(process.stdin.isTTY && process.stdout.isTTY);

function fatal(err: unknown, label: string): never {
  log.error(`${label}: ${err instanceof Error ? err.message : String(err)}`);
  exit(1);
}

process.on("SIGINT", () => {
  log.plain("");
  log.warn("Operation cancelled.");
  exit(130);
});
process.on("SIGTERM", () => exit(143));
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

async function ask<T>(prompt: Promise<T | symbol>): Promise<T> {
  const value = await prompt;
  if (clack.isCancel(value)) {
    log.plain("");
    log.warn("Operation cancelled.");
    exit(130);
  }
  return value as T;
}

const toValidate =
  (check?: (v: string) => true | string, fallback = "") =>
  (v: string | undefined): string | undefined => {
    if (!check) return undefined;
    const result = check(v || fallback);
    return result === true ? undefined : result;
  };

const select = <T extends string | boolean>(o: {
  message: string;
  choices: { name: string; value: T }[];
  default?: T;
}): Promise<T> =>
  ask<T>(
    clack.select<T>({
      message: o.message,
      options: o.choices.map(({ name, value }) => ({ value, label: name })) as never,
      initialValue: o.default,
    })
  );

const input = (o: { message: string; default?: string; validate?: (v: string) => true | string }): Promise<string> =>
  ask<string>(
    clack.text({
      message: o.message,
      defaultValue: o.default,
      placeholder: o.default,
      validate: toValidate(o.validate, o.default),
    })
  );

const password = (o: { message: string; validate?: (v: string) => true | string }): Promise<string> =>
  ask<string>(clack.password({ message: o.message, mask: "*", validate: toValidate(o.validate) }));

const confirm = (o: { message: string; default?: boolean }): Promise<boolean> =>
  ask<boolean>(clack.confirm({ message: o.message, initialValue: o.default !== false }));

function checkbox<T extends string>(o: {
  message: string;
  choices: { name: string; value: T; checked?: boolean; disabled?: boolean | string }[];
  required?: boolean;
}): Promise<T[]> {
  const live = o.choices.filter((ch) => !ch.disabled);
  for (const ch of o.choices.filter((x) => x.disabled)) {
    if (typeof ch.disabled === "string" && /requires macOS/i.test(ch.disabled)) continue;
    const note = typeof ch.disabled === "string" ? ` ${ch.disabled}` : "";
    log.plain(c.dim(`  ${ch.checked ? "[x]" : "[ ]"} ${ch.name}${note}`));
  }
  return ask<T[]>(
    clack.multiselect<T>({
      message: o.message,
      options: live.map((ch) => ({ value: ch.value, label: ch.name })) as never,
      initialValues: live.filter((ch) => ch.checked).map((ch) => ch.value),
      required: o.required ?? false,
    })
  );
}

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
const isSignTarget = (v: string): v is SignTarget => (SIGN_TARGETS as string[]).includes(v);

const PROJECT_NAME_RULE =
  "Use lowercase letters, numbers, and hyphens only. Max 50 chars. Command names (add, sign, remove, doctor, clean, upgrade) are reserved.";

const ORG_RULE = "Use a reverse domain: lowercase letters and numbers in dot-separated parts, e.g. com.acme";

const validateOrg = (org: string): boolean => org.length <= 80 && /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(org);

const TEAM_ID_PATTERN = /^[A-Za-z0-9]{10}$/;
const THUMBPRINT_PATTERN = /^[0-9A-Fa-f]{40}$/;

const normalizeAppName = (value: string): string => value.replace(/\s+/g, " ").trim();

const iosNeedsMacMessage = (deployCommand: string): string =>
  `iOS requires macOS. Run \`${deployCommand}\` and choose iOS: it sets up the GitHub Action and pushes to GitHub.`;

async function writeFile(filePath: string, content: string | Buffer, mode = 0o644): Promise<void> {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  await fsPromises.writeFile(filePath, content, { mode });
}

function safeRm(targetPath: string, allowedBase = process.cwd()): void {
  if (!targetPath) throw new Error("Path required.");
  const resolved = path.resolve(targetPath);
  const base = path.resolve(allowedBase);
  const relative = path.relative(base, resolved);

  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
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

const commandExistsCache = new Map<string, boolean>();

function commandExists(command: string): boolean {
  const cached = commandExistsCache.get(command);
  if (cached !== undefined) return cached;
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [command], { stdio: "ignore", windowsHide: true });
  const found = !r.error && r.status === 0;
  commandExistsCache.set(command, found);
  return found;
}

const quoteWinArg = (a: string): string => (/[\s&|<>^()%"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);

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

const pmRunWithArgs = (pm: PackageManager, script: string, args: string[]): string =>
  pm === "npm" ? `npm run ${script} -- ${args.join(" ")}` : `${pm} run ${script} ${args.join(" ")}`;

const pmTauri = (pm: PackageManager, args: string[]): { bin: string; args: string[] } =>
  pm === "npm" ? { bin: "npm", args: ["run", "tauri", "--", ...args] } : { bin: pm, args: ["run", "tauri", ...args] };

function tauriCmd(pm: PackageManager, args: string[], localCli: boolean): { bin: string; args: string[] } {
  if (localCli) return pmTauri(pm, args);
  if (pm === "pnpm") return { bin: "pnpm", args: ["dlx", "@tauri-apps/cli", ...args] };
  if (pm === "bun") return { bin: "bunx", args: ["@tauri-apps/cli", ...args] };
  return { bin: "npx", args: ["--yes", "@tauri-apps/cli", ...args] };
}

function printToolchainHint(pm: PackageManager): void {
  log.info(`Check your toolchain with ${c.cyan(pmRun(pm, "doctor"))}`);
  log.plain(`     ${c.dim(`Prerequisites: ${TAURI_PREREQUISITES_URL}`)}`);
}

const PACKAGE_MANAGERS: PackageManager[] = ["bun", "yarn", "pnpm", "npm"];

const INSTALL_ARGS: Record<PackageManager, string[]> = {
  npm: ["install", "--prefer-offline", "--no-audit", "--no-fund", "--loglevel=error"],
  yarn: ["install", "--silent", "--no-progress"],
  pnpm: ["install", "--reporter=silent", "--config.enable-pre-post-scripts=true"],
  bun: ["install", "--silent"],
};

function detectPackageManagerFromLockfile(projectRoot: string): PackageManager | undefined {
  for (const [file, pm] of LOCKFILE_NAMES) {
    if (fs.existsSync(path.join(projectRoot, file))) return pm;
  }
  return undefined;
}

function resolvePackageManager(
  requested: PackageManager | undefined,
  projectRoot?: string
): PackageManager {
  if (requested) {
    if (!commandExists(requested)) {
      log.error(`Requested package manager "${requested}" was not found on PATH.`);
      exit(1);
    }
    return requested;
  }

  if (projectRoot) {
    const fromLock = detectPackageManagerFromLockfile(projectRoot);
    if (fromLock) return fromLock;
  }

  const ua = process.env.npm_config_user_agent?.split(" ")[0]?.split("/")[0];
  const fromUa = PACKAGE_MANAGERS.find((p) => p === ua);
  return fromUa ?? "npm";
}

function installDependencies(projectPath: string, pm: PackageManager, showCd = true): boolean {
  log.step(`Installing dependencies with ${pm}...`);
  if (runBin(pm, INSTALL_ARGS[pm], projectPath, INSTALL_TIMEOUT_MS)) {
    log.success("Dependencies installed.");
    return true;
  }
  log.warn("Auto-install failed. Run manually:");
  if (showCd) log.plain(`    ${c.green(`cd ${path.basename(projectPath)}`)}`);
  log.plain(`    ${c.green(`${pm} install`)}`);
  return false;
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
      ["tauri:icon", "Generate app icons from public/logo.png"],
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

const SIGN_GROUP: CommandGroup = {
  title: "Signing",
  commands: [["sign", "Set up or redo code signing"]],
};

const DEPLOY_GROUP: CommandGroup = {
  title: "Deploy",
  commands: [["deploy", "Deploy to github"]],
};

const MAINTENANCE_GROUP: CommandGroup = {
  title: "Maintenance",
  commands: [
    ["clean", "Delete build output (Vite and Tauri)"],
    ["upgrade", "Update dependencies and template files to the latest"],
  ],
};

const PLATFORM_GROUP: CommandGroup = {
  title: "Platform",
  raw: true,
  commands: [
    ["create-bini-app add", "Add a platform (pick from a list)"],
    ["create-bini-app add <target>", "Add desktop, android or ios"],
    ["create-bini-app remove", "Remove a platform (pick from a list)"],
    ["create-bini-app remove <target>", "Remove desktop, android or ios"],
  ],
};

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
  const platform: CommandGroup = {
    ...PLATFORM_GROUP,
    commands: [
      ...PLATFORM_GROUP.commands,
      ...(hasNative
        ? ([
            ["create-bini-app --app-name", "Change the native app name"],
            ["create-bini-app --org", "Change the bundle ID prefix"],
          ] as [string, string][])
        : []),
    ],
  };
  const groups = [
    ...platformGroups,
    ...(hasNative ? [SIGN_GROUP] : []),
    maintenance,
    DEPLOY_GROUP,
    platform,
  ];

  const label = (g: CommandGroup, script: string): string => (g.raw ? script : pmRun(pm, script));
  const widthFor = (raw: boolean): number =>
    Math.max(0, ...groups.filter((g) => Boolean(g.raw) === raw).flatMap((g) => g.commands.map(([s]) => label(g, s).length)));
  const widths = { script: widthFor(false), raw: widthFor(true) };

  for (const group of groups) {
    const width = group.raw ? widths.raw : widths.script;
    log.plain(`\n${c.heading(group.title)}`);
    for (const [script, description] of group.commands) {
      log.plain(`  ${c.green(label(group, script).padEnd(width))}  ${c.dim(description)}`);
    }
  }
}

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
  sign: { type: "boolean" },
  nosign: { type: "boolean" },
  npm: { type: "boolean" },
  pnpm: { type: "boolean" },
  yarn: { type: "boolean" },
  bun: { type: "boolean" },
  alias: { type: "string" },
  "key-password": { type: "string" },
  profile: { type: "string" },
  team: { type: "string" },
  identity: { type: "string" },
  "api-issuer": { type: "string" },
  "api-key": { type: "string" },
  "api-key-file": { type: "string" },
  "apple-id": { type: "string" },
  "apple-password": { type: "string" },
  "sign-command": { type: "string" },
  "ci-only": { type: "boolean" },
  generate: { type: "boolean" },
  publisher: { type: "string" },
  thumbprint: { type: "string" },
  adhoc: { type: "boolean" },
} as const;

const SIGN_ONLY_FLAGS = [
  "alias", "key-password", "profile", "team", "identity", "api-issuer", "api-key", "api-key-file",
  "apple-id", "apple-password", "sign-command", "ci-only", "generate", "publisher", "thumbprint", "adhoc",
] as const;

function printHelp(): void {
  const examples: [cmd: string, note: string][] = [
    ["create-bini-app my-app", ""],
    ["create-bini-app my-app --typescript --tailwind --platform web", ""],
    ['create-bini-app my-app --platform android --app-name "My App"', ""],
    ["create-bini-app my-app --platform android --app-name", "# prompt for the app name"],
    ["create-bini-app my-app --yes --typescript --tailwind --platform web,android --org com.acme", "# no prompts at all"],
    ["create-bini-app add", "# inside an existing project: pick the platforms from a list"],
    ["create-bini-app add android", "# inside an existing project"],
    ["create-bini-app add desktop,android --nosign", ""],
    ["create-bini-app remove", "# pick the platforms to remove from a list"],
    ["create-bini-app --app-name", "# inside a project: prompt for a new native app name"],
    ["create-bini-app --org", "# inside a project: prompt for a new bundle ID prefix"],
    ['create-bini-app --app-name "My App" --org com.acme', "# change both without prompts"],
    ["create-bini-app sign", "# redo signing for everything that applies here"],
    ["create-bini-app sign android", "# redo signing for one target"],
    ["create-bini-app sign desktop", "# only the OS you are on (same as: create-bini-app desktop sign)"],
    ["create-bini-app sign windows,linux --ci-only", "# choose generated or real credentials for GitHub Actions"],
    ['create-bini-app sign desktop ./cert.pfx "pw"', "# sign Windows or macOS, picked from this OS"],
    ['create-bini-app sign macos ./dev-id.p12 "pw" --api-issuer ID --api-key KEY --api-key-file ./AuthKey.p8 --ci-only', ""],
    ['create-bini-app sign ios ./dist.p12 "pw" --profile ./app.mobileprovision', ""],
    ['create-bini-app sign ios --team ABCDE12345 --api-issuer ID --api-key KEY --api-key-file ./AuthKey.p8', "# Xcode automatic signing in CI"],
    ['create-bini-app sign android ./keystore.jks "pw" --alias upload', ""],
    ['create-bini-app sign android --generate "pw"', "# new keystore, no prompts"],
    ['create-bini-app sign linux --generate --publisher "My Co" --ci-only', "# no prompts, no password"],
    ["create-bini-app remove android --yes", "# delete the Android project"],
    ["create-bini-app doctor", "# check your machine (tauri info)"],
    ["create-bini-app clean", "# delete dist/ and other build output"],
    ["create-bini-app upgrade", "# update dependencies and template files"],
  ];

  log.plain(`
${c.heading("Usage:")}
  create-bini-app [project-name] [options]        Create a new project
  create-bini-app add [targets] [options]         Add platform(s) inside an existing Bini project (no targets: pick from a list)
  create-bini-app sign [targets]                  Set up or redo code signing (prompts)
  create-bini-app sign <target> <file> <password> Sign without prompts (see "Signing" below)
  create-bini-app remove [targets] [options]      Remove platform(s) from the project (desktop, android, ios; no targets: pick from a list)
  create-bini-app --app-name [name]               Inside a project: change the native app name (prompts without a value)
  create-bini-app --org [domain]                  Inside a project: change the bundle ID prefix (prompts without a value)
  create-bini-app doctor                          Check your machine for Tauri (runs \`tauri info\`)
  create-bini-app clean                           Delete build output (Vite + Tauri), keeps node_modules
  create-bini-app upgrade                         Update dependencies and copy the latest template files (not src/, package.json, vite.config)
  create-bini-app --platform <targets>            Same as above (alias)

${c.heading("Options:")}
  --version, -v       Show version number
  --help, -h          Show help
  --typescript        Use TypeScript (create mode)
  --javascript        Use JavaScript (create mode)
  --tailwind          Use Tailwind CSS (create mode)
  --css-modules       Use CSS Modules (create mode)
  --none              No styling (create mode)
  --force             Create: overwrite an existing directory. sign --generate --ci-only: replace saved signing values
  --no-install        Skip installing project dependencies (installed automatically by default)
  --no-git            Skip git init on create
  --yes, -y           No prompts: accept the default for every question not answered by a flag and
                      skip every confirmation (create, add, remove, bundle ID change). Signing
                      questions are skipped too: use \`sign <target> <file> <password>\` for those.
  --platform <target> ${TARGET_PLATFORMS.join(", ")}
                      (comma-separated to pick several: web,desktop,android)
  --app-name [name]   App name (default: from the project name). It is the initial site title
                      and the Tauri app name and window title. With no value, you are
                      prompted for it. Inside an existing project it renames the native app
                      (src-tauri/tauri.conf.json); src/app/layout.tsx is not touched.
  --org [domain]      Bundle ID prefix as a reverse domain, e.g. com.acme (default: com.bini).
                      With no value, you are prompted for it. Inside an existing project it
                      changes the bundle identifier (src-tauri/tauri.conf.json).
  --sign              Auto-confirm code signing setup (still prompts for details).
                      On an already configured platform, runs the signing step only.
  --nosign            Skip code signing setup entirely, no prompts
  --npm | --pnpm | --yarn | --bun   Force a package manager

${c.heading("Signing:")}
  desktop                 signs the OS you are on, on this machine (same as: create-bini-app desktop sign)
  android, ios            local signing (iOS needs a Mac)
  <targets> --ci-only     for windows/linux/android: you choose between letting GitHub Actions generate a
                          self-signed key (asks for a publisher name, plus a keystore password for Android)
                          or giving real credentials. Either way the values are saved for GitHub Actions and
                          nothing is set up on this machine. With a generated key the workflow creates the
                          certificate, keystore or GPG key on the first build, saves it as a GitHub secret
                          and reuses it afterwards. With no list, every platform in the project is used.
                          iOS and macOS cannot be generated: iOS asks for your Apple certificate and profile;
                          macOS uses --adhoc for local testing or a real Developer ID .p12 for CI.
  windows, macos and linux by name only work with --ci-only. Use desktop for this machine.

  Local Windows/macOS signing settings are written to src-tauri/tauri.windows.conf.json and
  src-tauri/tauri.macos.conf.json. Tauri merges them automatically on that OS, and they are git-ignored,
  so your committed tauri.conf.json never points at a certificate that only exists on your machine.

  Without prompts for CI:
            sign windows --generate [--publisher Name] --ci-only
            sign linux --generate [--publisher Name] --ci-only
            sign android --generate <password> [--publisher Name] [--alias upload] --ci-only
            (macOS cannot be generated: use --adhoc for local testing, or a real Developer ID .p12)
            (only Android needs a password; Linux GPG keys are generated with no passphrase)

  Real credentials (needed for store releases): give a file and its password and nothing is asked. The
  file is converted to base64 and saved with its password in .env.signing (git-ignored) for GitHub Actions.
  They take precedence over generated keys.

  windows   sign desktop <cert.pfx> <password>                      on Windows: also sets up local signing
            sign windows <cert.pfx> <password> --ci-only
            sign desktop --sign-command "<cloud signing command with %1>"
            sign desktop --thumbprint <sha1>                        certificate already in your Windows store
            sign desktop --generate [--publisher Name]              free self-signed certificate (Windows only)
  macos     sign desktop <cert.p12> <password> [--identity "Developer ID Application: Name (TEAMID)"]
            sign macos <cert.p12> <password> --ci-only
            notarization: --api-issuer <id> --api-key <id> --api-key-file <AuthKey.p8>
                          or --apple-id <email> --apple-password <app password> --team <TEAMID>
            sign desktop --adhoc                                    ad-hoc signing for local testing (no Apple account)
  linux     sign desktop                                            on Linux: GPG key for the AppImage (prompts)
            sign desktop --generate [--publisher Name]              no passphrase (never needed)
  ios       sign ios <cert.p12> <password> --profile <app.mobileprovision> [--team <TEAMID>]
            sign ios <cert.p12> <password> --profile <app.mobileprovision> --ci-only
            sign ios --team <TEAMID> [--api-issuer <id> --api-key <id> --api-key-file <AuthKey.p8>]
                                                                    Xcode automatic signing; the API key is
                                                                    needed for CI (App Store Connect > Integrations)
  android   sign android <keystore.jks> <password> [--alias upload] [--key-password <password>]
            sign android --generate <password>                      create a new keystore.jks (password required)

  --ci-only           Only save the CI values: skip the local keychain / certificate store / Gradle setup
  Passwords can come from the environment instead of the command line (use this for a password that
  starts with "-", or to keep it out of shell history and process lists):
    ${ENV_SIGN_PASSWORD} (certificate or Android keystore password), ${ENV_KEY_PASSWORD} (Android key password),
    ${ENV_APPLE_PASSWORD} (Apple ID app-specific password)
    Linux generated GPG keys never use a passphrase.

${c.heading("Tauri signing guides:")}
${(Object.keys(SIGNING_DOCS) as SigningTarget[]).map((t) => `  ${t.padEnd(8)}${SIGNING_DOCS[t]}`).join("\n")}

${c.heading("Examples:")}
${examples.map(([cmd, note]) => `  ${c.dim(note ? `${cmd}  ${note}` : cmd)}`).join("\n")}
`);
}

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

function parseSignArgs(rest: string[], platformFlags: TargetPlatform[], generate: boolean): SignParsed {
  const targets: SignTarget[] = [];
  const add = (t: SignTarget): void => {
    if (!targets.includes(t)) targets.push(t);
  };

  let i = 0;
  for (; i < rest.length; i++) {
    if (generate && i > 0) break;
    const words = (rest[i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (words.length === 0 || !words.every(isSignTarget)) break;
    for (const w of words) add(w as SignTarget);
  }

  const remaining = rest.slice(i);
  const max = generate ? 1 : 2;
  if (remaining.length > max) {
    log.error(`Unexpected extra argument(s): ${remaining.slice(max).join(" ")}`);
    log.info("Usage: create-bini-app sign <target> <file> <password>");
    exit(1);
  }

  for (const p of platformFlags) {
    if (p === "web") log.warn('"web" has nothing to sign, ignoring it.');
    else add(p);
  }

  const [first, second] = remaining;
  const file = generate ? undefined : first;
  if (file !== undefined && targets.length === 0) {
    log.error(`Which target is "${file}" for? Use e.g.: create-bini-app sign desktop ${file} <password>`);
    log.info(`Targets: ${SIGN_TARGETS.join(", ")}`);
    exit(1);
  }
  if (file !== undefined && targets.length > 1) {
    log.error("A credential file belongs to one target. Run sign once per target.");
    exit(1);
  }
  return { targets, file, password: generate ? first : second };
}

function parseCli(args: string[]) {
  try {
    return parseArgs({ args, options: CLI_OPTIONS, allowPositionals: true, strict: true });
  } catch (err) {
    const message = (err as Error).message;
    log.error(message);
    if (/unknown option|ambiguous/i.test(message)) {
      log.info(`A password that starts with "-" cannot be passed as an argument: set ${ENV_SIGN_PASSWORD} instead.`);
    }
    log.info("Run with --help to see available options.");
    return exit(1);
  }
}

function extractPromptFlags(args: string[]): { args: string[]; promptAppName: boolean; promptOrg: boolean } {
  const bare = new Set<string>();
  const rest = args.filter((arg, i) => {
    if (arg !== "--app-name" && arg !== "--org") return true;
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith("-") && !SUBCOMMANDS.has(next)) return true;
    bare.add(arg);
    return false;
  });
  return { args: rest, promptAppName: bare.has("--app-name"), promptOrg: bare.has("--org") };
}

function parseArguments(): { positionals: string[]; flags: CliFlags } {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.includes("--version") || rawArgs.includes("-v")) {
    log.plain(`${c.cyan("Bini.js CLI")} v${BINIJS_VERSION}`);
    exit(0);
  }
  if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
    printHelp();
    exit(0);
  }

  const { args, promptAppName, promptOrg } = extractPromptFlags(rawArgs);
  const { values, positionals } = parseCli(args);

  const [head, second] = positionals;
  if (second === "sign" && head !== undefined && head.split(",").every(isSignTarget)) {
    positionals.splice(0, 2, "sign", head);
  }

  for (const name of [
    "platform", "app-name", "org", "alias", "profile", "team", "identity",
    "api-issuer", "api-key", "api-key-file", "apple-id", "sign-command", "publisher", "thumbprint",
  ] as const) {
    const value = values[name];
    if (value !== undefined && value.trim() === "") {
      log.error(`--${name} requires a value.`);
      exit(1);
    }
  }

  if (!SUBCOMMANDS.has(positionals[0] ?? "") && positionals.length > 1) {
    log.error(`Unexpected extra argument(s): ${positionals.slice(1).join(" ")}`);
    exit(1);
  }

  const ts = Boolean(values.typescript);
  const js = Boolean(values.javascript || values["no-typescript"]);
  const sign = Boolean(values.sign);
  const noSign = Boolean(values.nosign);
  const pmFlags = PACKAGE_MANAGERS.filter((p) => values[p]);

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

  const team = values.team?.trim().toUpperCase();
  if (team !== undefined && !TEAM_ID_PATTERN.test(team)) {
    log.error(`Invalid --team "${values.team}". A Team ID is 10 letters and numbers, e.g. ABCDE12345.`);
    exit(1);
  }

  const thumbprint = values.thumbprint?.replace(/[\s:]/g, "").toUpperCase();
  if (thumbprint !== undefined && !THUMBPRINT_PATTERN.test(thumbprint)) {
    log.error(`Invalid --thumbprint "${values.thumbprint}". A thumbprint is 40 hex characters.`);
    exit(1);
  }

  const signOnlyUsed = SIGN_ONLY_FLAGS.filter((n) => values[n] !== undefined && values[n] !== false).map((n) => `--${n}`);
  if (signOnlyUsed.length > 0 && positionals[0] !== "sign") {
    log.error(`${signOnlyUsed.join(", ")} can only be used with the sign command, e.g. create-bini-app sign <target> <file> <password>`);
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
      promptAppName,
      promptOrg,
      sign: sign ? true : noSign ? false : undefined,
      yes: Boolean(values.yes),
      noGit: Boolean(values["no-git"]),
      packageManager: pmFlags[0],
      alias: values.alias?.trim(),
      keyPassword: values["key-password"],
      profile: values.profile?.trim(),
      team,
      identity: values.identity?.trim(),
      apiIssuer: values["api-issuer"]?.trim(),
      apiKey: values["api-key"]?.trim(),
      apiKeyFile: values["api-key-file"]?.trim(),
      appleId: values["apple-id"]?.trim(),
      applePassword: values["apple-password"],
      signCommand: values["sign-command"]?.trim(),
      ciOnly: Boolean(values["ci-only"]),
      generate: Boolean(values.generate),
      publisher: values.publisher?.trim(),
      thumbprint,
      adhoc: Boolean(values.adhoc),
    },
  };
}

function platformChoices(userOS: UserOS) {
  return TARGET_PLATFORMS
    .filter((p) => p !== "ios" || userOS === "macos")
    .map((p) => {
      if (p === "web") return { name: PLATFORM_LABELS.web, value: p, checked: true };
      return { name: PLATFORM_LABELS[p], value: p };
    });
}

async function askAppName(flags: CliFlags, projectName: string, current?: string, forcePrompt = false): Promise<string> {
  const fallback = current ?? toTitleCase(projectName);
  const given = flags.appName ? normalizeAppName(flags.appName) : "";

  if (flags.appName && !flags.promptAppName) return given || fallback;
  if (!flags.promptAppName && !forcePrompt) return fallback;

  if (!isInteractive()) {
    if (flags.promptAppName) log.warn(`--app-name needs a terminal to prompt, using "${given || fallback}".`);
    return given || fallback;
  }

  const value = await input({
    message: "App name?",
    default: given || fallback,
    validate: (v) => (normalizeAppName(v).length > 0 ? true : "Name required."),
  });
  return normalizeAppName(value);
}

async function askOrg(flags: CliFlags, current?: string): Promise<string> {
  const fallback = current ?? DEFAULT_ORG;
  const interactive = isInteractive();

  if (flags.promptOrg && !interactive) {
    log.warn(`--org needs a terminal to prompt, using "${flags.org ?? fallback}".`);
  }
  if (flags.org && !flags.promptOrg) return flags.org;
  if (!interactive) return flags.org ?? fallback;

  const org = await input({
    message: "Organization (bundle ID prefix)?",
    default: flags.org ?? fallback,
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
  const iosSkipped = platforms.includes("ios") && userOS !== "macos";
  if (iosSkipped) platforms = platforms.filter((p) => p !== "ios");

  const web = picked.includes("web") || platforms.length === 0;

  let appName: string;
  let org: string;
  if (platforms.length > 0) {
    appName = await askAppName(flags, projectName, undefined, true);
    org = await askOrg(flags);
  } else {
    if (flags.promptAppName) log.info("--app-name only applies to desktop and mobile targets, skipping the prompt.");
    if (flags.promptOrg) log.info("--org only applies to desktop and mobile targets, skipping the prompt.");
    appName = await askAppName(flags, projectName);
    org = flags.org ?? DEFAULT_ORG;
  }

  return { typescript, styling, web, platforms, appName, org, iosSkipped };
}

async function copyAssetFiles(publicPath: string): Promise<void> {
  const files = ["favicon.ico", "apple-touch-icon.png", "og-image.png", "logo.png", "bini.svg"];
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

function generateBundleIdentifier(org: string, projectName: string): string {
  const sanitized = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "") || "app";
  return `${org}.${/^[0-9]/.test(sanitized) ? `app${sanitized}` : sanitized}`;
}

function orgFromIdentifier(identifier: string | undefined): string | undefined {
  if (!identifier) return undefined;
  const parts = identifier.split(".");
  if (parts.length < 3) return undefined;
  const org = parts.slice(0, -1).join(".");
  return validateOrg(org) ? org : undefined;
}

function readTauriConfSync(tauriDir: string): AnyJson | null {
  try {
    return readJsonSync(path.join(tauriDir, "tauri.conf.json"));
  } catch {
    return null;
  }
}

const hasTauriConf = (tauriDir: string): boolean => fs.existsSync(path.join(tauriDir, "tauri.conf.json"));

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

const patchBundle = (tauriDir: string, key: "windows" | "macOS" | "iOS", patch: AnyJson): Promise<boolean> =>
  patchTauriConf(tauriDir, (conf) => {
    conf.bundle ??= {};
    conf.bundle[key] = { ...(conf.bundle[key] ?? {}), ...patch };
  });

type LocalOverrideOS = "windows" | "macos";
type LocalBundleKey = "windows" | "macOS";

const localConfFile = (tauriDir: string, target: LocalOverrideOS): string => path.join(tauriDir, `tauri.${target}.conf.json`);

function readBundleSetting(tauriDir: string, target: LocalOverrideOS, key: LocalBundleKey): AnyJson {
  const base = (readTauriConfSync(tauriDir)?.bundle?.[key] ?? {}) as AnyJson;
  let local: AnyJson = {};
  try {
    local = (readJsonSync(localConfFile(tauriDir, target)).bundle?.[key] ?? {}) as AnyJson;
  } catch {}
  return { ...base, ...local };
}

async function patchLocalBundle(tauriDir: string, target: LocalOverrideOS, key: LocalBundleKey, patch: AnyJson): Promise<boolean> {
  const file = localConfFile(tauriDir, target);
  try {
    await appendGitignoreEntries(path.dirname(tauriDir), SIGNING_GITIGNORE);
    let conf: AnyJson = {};
    try {
      conf = JSON.parse(await fsPromises.readFile(file, "utf-8")) as AnyJson;
    } catch {}
    conf.bundle ??= {};
    conf.bundle[key] = { ...(conf.bundle[key] ?? {}), ...patch };
    await writeFile(file, JSON.stringify(conf, null, 2) + "\n");
    return true;
  } catch (err) {
    log.warn(`Could not update ${file}: ${(err as Error).message}`);
    return false;
  }
}

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const escapeProperty = (value: string): string =>
  value
    .replace(/[\r\n]/g, "")
    .replace(/[\\:=#! ]/g, "\\$&")
    .replace(/[^\x20-\x7e]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`);

const unescapeProperty = (value: string): string =>
  value.replace(/\\u([0-9a-fA-F]{4})|\\(.)/g, (_m, hex: string | undefined, ch: string | undefined) =>
    hex !== undefined ? String.fromCharCode(parseInt(hex, 16)) : (ch as string)
  );

const SIGNING_ENV_HEADER = [
  "# Code signing secrets, never commit this file.",
  "# Used by the deploy script to upload these as GitHub secrets for CI builds.",
  "# Local builds do not need this file: they are signed from your local tauri.<os>.conf.json, keychain and Xcode.",
  "# APPLE_API_KEY_PATH only points at a file on this machine: it is for local notarization, not a CI secret.",
  "",
];

const SIGNING_GITIGNORE = [
  ".env.signing",
  ".bini-signing/",
  "tauri.windows.conf.json",
  "tauri.macos.conf.json",
  "*.jks",
  "*.keystore",
  "*.p12",
  "*.pfx",
  "*.p8",
  "*.mobileprovision",
  "*.key",
  "keystore.properties",
];

const REAL_CREDENTIAL_KEYS: Partial<Record<SigningTarget, string[]>> = {
  windows: ["WINDOWS_CERTIFICATE", "WINDOWS_CERTIFICATE_PASSWORD"],
  android: ["ANDROID_KEY_BASE64", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD", "ANDROID_KEYSTORE_PASSWORD"],
  linux: [
    "GPG_PRIVATE_KEY", "SIGN_KEY", "APPIMAGETOOL_SIGN_PASSPHRASE", "APPIMAGETOOL_FORCE_SIGN",
    "TAURI_SIGNING_RPM_KEY", "TAURI_SIGNING_RPM_KEY_PASSPHRASE",
  ],
  ios: ["IOS_CERTIFICATE", "IOS_CERTIFICATE_PASSWORD", "IOS_MOBILE_PROVISION", "APPLE_DEVELOPMENT_TEAM"],
  macos: [
    "APPLE_CERTIFICATE", "APPLE_CERTIFICATE_PASSWORD", "APPLE_SIGNING_IDENTITY",
    "APPLE_API_ISSUER", "APPLE_API_KEY", "APPLE_API_KEY_P8",
    "APPLE_ID", "APPLE_PASSWORD", "APPLE_TEAM_ID", "KEYCHAIN_PASSWORD",
  ],
};

const SIGNING_ENV_FILE = ".env.signing";

async function writeKeyValueFile(filePath: string, vars: Record<string, string>): Promise<void> {
  let existing = "";
  try { existing = await fsPromises.readFile(filePath, "utf-8"); } catch {}

  const lines = existing ? existing.replace(/\r\n/g, "\n").split("\n") : [];
  if (lines.at(-1) === "") lines.pop();
  if (lines.length === 0) lines.push(...SIGNING_ENV_HEADER);

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

async function removeKeyValueKeys(filePath: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  let existing = "";
  try { existing = await fsPromises.readFile(filePath, "utf-8"); } catch { return; }
  const drop = new Set(keys);
  const lines = existing.replace(/\r\n/g, "\n").split("\n");
  const kept = lines.filter((line) => {
    const key = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(line)?.[1];
    return !(key && drop.has(key));
  });
  if (kept.length === lines.length) return;
  const trailing = kept.at(-1) === "" ? kept : [...kept, ""];
  await fsPromises.writeFile(filePath, trailing.join("\n"), { mode: 0o600 });
  await fsPromises.chmod(filePath, 0o600).catch(() => {});
}

async function appendGitignoreEntries(projectPath: string, entries: string[]): Promise<void> {
  const gitignorePath = path.join(projectPath, ".gitignore");
  let existing = "";
  try { existing = await fsPromises.readFile(gitignorePath, "utf-8"); } catch {}

  const have = new Set(existing.split("\n").map((l) => l.trim()));
  const missing = entries.filter((e) => !have.has(e));
  if (missing.length === 0) return;
  const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  await fsPromises.appendFile(gitignorePath, `${prefix}${missing.join("\n")}\n`);
}

const fileBase64 = async (file: string): Promise<string> => (await fsPromises.readFile(file)).toString("base64");

async function saveCiValues(projectPath: string, vars: Record<string, string>): Promise<void> {
  await appendGitignoreEntries(projectPath, SIGNING_GITIGNORE);
  const envPath = path.join(projectPath, SIGNING_ENV_FILE);
  await writeKeyValueFile(envPath, vars);
  await fsPromises.chmod(envPath, 0o600).catch(() => {});
  log.success(`Saved for GitHub Actions in ${path.relative(projectPath, envPath)}: ${Object.keys(vars).join(", ")}`);
}

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

const isPkcs12File = (file: string): boolean => /\.(p12|pfx)$/i.test(file);

function readKeystoreProperties(file: string): Record<string, string> | null {
  try {
    const out: Record<string, string> = {};
    for (const raw of fs.readFileSync(file, "utf-8").split("\n")) {
      const line = raw.replace(/\r$/, "");
      if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i <= 0) continue;
      out[line.slice(0, i)] = unescapeProperty(line.slice(i + 1));
    }
    return out;
  } catch {
    return null;
  }
}

type KeystoreCheck = "ok" | "bad" | "no-keytool";

function verifyKeystore(file: string, storePass: string, alias: string): KeystoreCheck {
  if (!commandExists("keytool")) return "no-keytool";
  try {
    execFileSync("keytool", ["-list", "-keystore", file, "-storepass:env", "BINI_STOREPASS", "-alias", alias], {
      stdio: "pipe",
      timeout: 30_000,
      windowsHide: true,
      env: { ...process.env, BINI_STOREPASS: storePass },
    });
    return "ok";
  } catch {
    return "bad";
  }
}

function generateAndroidKeystore(file: string, alias: string, storePassword: string, projectName: string): boolean {
  if (!commandExists("keytool")) {
    log.warn("keytool not found on PATH (ships with the JDK). Add it to PATH or use Android Studio's copy.");
  }
  log.step(`Generating ${path.relative(process.cwd(), file) || "keystore.jks"}...`);
  const dname = `CN=${projectName}, OU=Dev, O=Bini, L=Unknown, S=Unknown, C=US`;
  try {
    execFileSync(
      "keytool",
      [
        "-genkeypair", "-v",
        "-keystore", file,
        "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
        "-alias", alias,
        "-storepass:env", "BINI_STOREPASS",
        "-keypass:env", "BINI_KEYPASS",
        "-dname", dname,
      ],
      {
        stdio: "pipe",
        timeout: 30_000,
        windowsHide: true,
        env: { ...process.env, BINI_STOREPASS: storePassword, BINI_KEYPASS: storePassword },
      }
    );
    log.success(`Keystore created at ${path.relative(process.cwd(), file) || "keystore.jks"}`);
    log.info("Back up the keystore and its password: every Play Store update must be signed with the same key.");
    return true;
  } catch (err) {
    log.warn(`Could not generate keystore automatically: ${(err as Error).message.split("\n")[0]}`);
    log.info("Generate it manually with keytool, see https://v2.tauri.app/distribute/sign/android/");
    return false;
  }
}

async function writeAndroidLocalConfig(
  ctx: SigningContext,
  storeFile: string,
  alias: string,
  storePassword: string,
  keyPassword: string
): Promise<boolean> {
  const { projectPath, tauriDir } = ctx;
  const androidGenDir = path.join(tauriDir, "gen", "android");
  if (!fs.existsSync(androidGenDir)) return false;

  const propsPath = path.join(androidGenDir, "keystore.properties");
  await writeFile(
    propsPath,
    [
      `storePassword=${escapeProperty(storePassword)}`,
      `keyPassword=${escapeProperty(keyPassword)}`,
      `keyAlias=${escapeProperty(alias)}`,
      `storeFile=${escapeProperty(storeFile)}`,
      "",
    ].join("\n"),
    0o600
  );
  log.success(`Wrote ${path.relative(projectPath, propsPath)}`);

  await appendGitignoreEntries(projectPath, SIGNING_GITIGNORE);
  await patchAndroidGradleSigning(androidGenDir);
  return true;
}

async function saveAndroidCiValues(
  projectPath: string,
  keystoreFile: string,
  alias: string,
  storePassword: string,
  keyPassword: string
): Promise<void> {
  await saveCiValues(projectPath, {
    ANDROID_KEY_BASE64: await fileBase64(keystoreFile),
    ANDROID_KEY_ALIAS: alias,
    ANDROID_KEY_PASSWORD: keyPassword,
    ANDROID_KEYSTORE_PASSWORD: storePassword,
  });
}

async function setupAndroidCiOnly(ctx: SigningContext): Promise<boolean> {
  const { projectPath } = ctx;
  log.info("Saving Android signing for GitHub Actions only: nothing is changed on this machine.");

  const file = await askFile("Path to your keystore (.jks, .keystore or .p12)", [".jks", ".keystore", ".p12", ".pfx"]);
  const alias = await input({ message: "Key alias:", default: "upload" });
  const storePassword = await password({ message: "Keystore password:", validate: minLength(6, "Password") });

  let keyPassword = storePassword;
  if (!isPkcs12File(file)) {
    const kp = await password({ message: "Key password (leave blank if same as keystore password):" });
    if (kp.length > 0) keyPassword = kp;
  }

  const check = verifyKeystore(file, storePassword, alias);
  if (check === "bad") {
    log.warn("keytool could not open that keystore with that password and alias.");
    if (!(await confirm({ message: "Use it anyway?", default: false }))) return false;
  } else if (check === "ok") {
    log.success("Keystore opened successfully.");
  }

  await saveAndroidCiValues(projectPath, file, alias, storePassword, keyPassword);
  return true;
}

async function setupAndroidSigning(ctx: SigningContext): Promise<boolean> {
  if (ctx.ciOnly) return setupAndroidCiOnly(ctx);

  const { projectPath, tauriDir, pm } = ctx;
  const androidGenDir = path.join(tauriDir, "gen", "android");
  if (!fs.existsSync(androidGenDir)) {
    log.warn("Android project not found (src-tauri/gen/android missing). Run Android init first.");
    return false;
  }

  const propsPath = path.join(androidGenDir, "keystore.properties");
  const rootStore = path.join(projectPath, "keystore.jks");

  if (fs.existsSync(propsPath)) {
    const replace = await confirm({
      message: `${path.relative(projectPath, propsPath)} already exists. Replace it?`,
      default: false,
    });
    if (!replace) {
      log.skip("Kept existing keystore.properties.");
      await appendGitignoreEntries(projectPath, SIGNING_GITIGNORE);
      await patchAndroidGradleSigning(androidGenDir);

      const props = readKeystoreProperties(propsPath);
      const keepStore = props?.storeFile && fs.existsSync(props.storeFile) ? props.storeFile : rootStore;
      if (props?.keyAlias && props.storePassword && props.keyPassword && fs.existsSync(keepStore)) {
        await saveAndroidCiValues(projectPath, keepStore, props.keyAlias, props.storePassword, props.keyPassword);
      } else {
        log.info("Could not read the existing keystore settings, so nothing was saved for GitHub Actions. Run sign again and replace them.");
      }
      return true;
    }
  }

  if (!commandExists("keytool")) {
    log.warn("keytool not found on PATH (ships with the JDK). Add it to PATH or use Android Studio's copy.");
  }

  let source: "root" | "generate" | "file";
  if (fs.existsSync(rootStore)) {
    log.info("Using the existing keystore.jks in the project root.");
    source = "root";
  } else {
    source = await select<"generate" | "file">({
      message: "Android release keystore:",
      choices: [
        { name: "Generate a new keystore (recommended for a new app)", value: "generate" },
        { name: "Use a keystore file I already have (for example from the Play Store)", value: "file" },
      ],
      default: "generate",
    });
  }

  let alias = "upload";
  let storePassword: string;
  let keyPassword: string;

  if (source === "generate") {
    storePassword = await password({ message: "Set a keystore password (min 6 chars):", validate: minLength(6, "Password") });
    keyPassword = storePassword;
    if (!generateAndroidKeystore(rootStore, alias, storePassword, path.basename(projectPath))) return false;
  } else {
    let picked = rootStore;
    if (source === "file") {
      picked = await askFile("Path to your keystore (.jks, .keystore or .p12)", [".jks", ".keystore", ".p12", ".pfx"]);
    }
    alias = await input({ message: "Key alias:", default: "upload" });
    storePassword = await password({ message: "Keystore password:", validate: minLength(6, "Password") });
    const kp = isPkcs12File(picked) ? "" : await password({ message: "Key password (leave blank if same as keystore password):" });
    keyPassword = kp.length > 0 ? kp : storePassword;

    const check = verifyKeystore(picked, storePassword, alias);
    if (check === "bad") {
      log.warn("keytool could not open that keystore with that password and alias.");
      if (!(await confirm({ message: "Use it anyway?", default: false }))) return false;
    } else if (check === "ok") {
      log.success("Keystore opened successfully.");
    }

    if (path.resolve(picked) !== path.resolve(rootStore)) {
      await fsPromises.copyFile(picked, rootStore);
      log.success("Copied the keystore to keystore.jks in the project root.");
    }
  }

  await writeAndroidLocalConfig(ctx, rootStore, alias, storePassword, keyPassword);
  await saveAndroidCiValues(projectPath, rootStore, alias, storePassword, keyPassword);
  log.success(`Android release signing configured. \`${pmRun(pm, "android:build")}\` will now produce a signed release.`);
  return true;
}

async function applyAndroidKeystore(
  ctx: SigningContext,
  flags: CliFlags,
  file: string | undefined,
  pass: string
): Promise<boolean> {
  const { projectPath } = ctx;
  const alias = flags.alias ?? "upload";
  const rootStore = path.join(projectPath, "keystore.jks");
  let source: string;
  let keyPass = flags.keyPassword ?? process.env[ENV_KEY_PASSWORD] ?? pass;

  if (file === undefined) {
    if (pass.length < 6) {
      log.error("The keystore password must be at least 6 characters.");
      return false;
    }
    if (fs.existsSync(rootStore)) {
      log.error("keystore.jks already exists in the project root, so it was not overwritten. To use it: sign android keystore.jks <password>");
      return false;
    }
    if (!generateAndroidKeystore(rootStore, alias, pass, path.basename(projectPath))) return false;
    source = rootStore;
    keyPass = pass;
  } else {
    source = file;
    if (isPkcs12File(file) && keyPass !== pass) {
      log.warn("A .p12/.pfx keystore uses one password for the store and the key, so the key password was ignored.");
      keyPass = pass;
    }
    const check = verifyKeystore(source, pass, alias);
    if (check === "bad") {
      log.error(`keytool could not open that keystore with that password and the alias "${alias}". Check the password and --alias.`);
      return false;
    }
    if (check === "ok") log.success("Keystore opened successfully.");
    else log.info("keytool was not found, so the keystore could not be checked.");
  }

  if (!ctx.ciOnly) {
    if (path.resolve(source) !== path.resolve(rootStore)) await fsPromises.copyFile(source, rootStore);
    const wired = await writeAndroidLocalConfig(ctx, rootStore, alias, pass, keyPass);
    if (!wired) log.info("No Android project here yet, so only the GitHub Actions values were saved. Add it with: create-bini-app add android");
  }
  await saveAndroidCiValues(projectPath, source, alias, pass, keyPass);
  return true;
}

const sanitizeCertName = (name: string): string => name.replace(/[",=+<>#;\\]/g, "").trim() || "Bini App";

function psThumbprint(script: string, env: Record<string, string>, failure: string): string | null {
  try {
    const out = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      stdio: "pipe",
      timeout: 60_000,
      windowsHide: true,
      env: { ...process.env, ...env },
    });
    const thumbprint = (out.trim().split(/\r?\n/).pop() ?? "").trim();
    if (!THUMBPRINT_PATTERN.test(thumbprint)) throw new Error("PowerShell did not return a thumbprint.");
    return thumbprint.toUpperCase();
  } catch (err) {
    log.warn(`${failure}: ${(err as Error).message.split("\n")[0]}`);
    return null;
  }
}

function generateSelfSignedCertificate(publisher: string): string | null {
  const thumbprint = psThumbprint(
    '$c = New-SelfSignedCertificate -Type CodeSigningCert -Subject ("CN=" + $env:BINI_CERT_CN) ' +
      "-CertStoreLocation Cert:\\CurrentUser\\My -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 " +
      "-NotAfter (Get-Date).AddYears(3); $c.Thumbprint",
    { BINI_CERT_CN: publisher },
    "Could not create the certificate automatically"
  );
  if (!thumbprint) {
    log.info('Create one manually: New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Your Name" -CertStoreLocation Cert:\\CurrentUser\\My');
  }
  return thumbprint;
}

const importPfxToWindowsStore = (file: string, pass: string): string | null =>
  psThumbprint(
    "$pw = ConvertTo-SecureString $env:BINI_PFX_PASS -AsPlainText -Force; " +
      "$c = Import-PfxCertificate -FilePath $env:BINI_PFX -CertStoreLocation Cert:\\CurrentUser\\My -Password $pw; " +
      "$c.Thumbprint",
    { BINI_PFX: file, BINI_PFX_PASS: pass },
    "Could not import the certificate into the Windows certificate store"
  );

function importToMacKeychain(file: string, pass: string, identity: string): boolean {
  const have = spawnSync("security", ["find-identity", "-v", "-p", "codesigning"], { encoding: "utf8" });
  if (have.status === 0 && identity && have.stdout.includes(identity)) {
    log.info("That certificate is already in your keychain.");
    return true;
  }
  const keychain = path.join(os.homedir(), "Library", "Keychains", "login.keychain-db");
  const r = spawnSync(
    "security",
    ["import", file, "-k", keychain, "-P", pass, "-T", "/usr/bin/codesign", "-T", "/usr/bin/security"],
    { encoding: "utf8" }
  );
  if (r.status !== 0) {
    log.warn(`Could not import the certificate into your keychain: ${(r.stderr || "security failed").trim().split("\n").pop()}`);
    return false;
  }
  log.success("Imported the certificate into your login keychain.");
  log.info("macOS may ask once for permission to use the key the first time you build.");
  return true;
}

type GuideTarget = "macos" | "ios" | "windows";

const GUIDES: Record<GuideTarget, { title: string; steps: string[] }> = {
  macos: {
    title: "Get a Developer ID Application certificate (apps distributed outside the Mac App Store)",
    steps: [
      "Join the Apple Developer Program (paid, yearly): https://developer.apple.com/programs/",
      "Only the Account Holder can create this certificate. Open https://developer.apple.com/account/resources/certificates/add",
      'Choose "Developer ID Application" and upload a certificate request (CSR). No Mac? Pick "create a request" in this tool and it makes the CSR for you.',
      "Download the .cer Apple gives you. On a Mac, double-click it, then export it from Keychain Access (with its private key) as a .p12. Without a Mac, this tool builds the .p12 from your .cer.",
      "For notarization create an App Store Connect API key: App Store Connect > Users and Access > Integrations. Note the Issuer ID and Key ID, and download the .p8 (it can only be downloaded once).",
    ],
  },
  ios: {
    title: "Get an Apple Distribution certificate and provisioning profile (TestFlight and the App Store)",
    steps: [
      "Join the Apple Developer Program (paid, yearly): https://developer.apple.com/programs/",
      "Register an App ID whose bundle ID matches your app: https://developer.apple.com/account/resources/identifiers/add",
      'Create an "Apple Distribution" certificate with a CSR (pick "create a request" here if you have no Mac) and get it as a .p12: https://developer.apple.com/account/resources/certificates/add',
      'Create a provisioning profile: Profiles > + > "App Store Connect", select the App ID and the certificate, and download the .mobileprovision: https://developer.apple.com/account/resources/profiles/add',
      "For CI automatic signing, create an App Store Connect API key with Admin access: App Store Connect > Users and Access > Integrations. Note the Issuer ID and Key ID, download the .p8 (only once).",
      "To publish, also create the app in App Store Connect with the same bundle ID.",
    ],
  },
  windows: {
    title: "Get a Windows code signing certificate",
    steps: [
      "Buy a code signing certificate (OV or EV) from a certificate authority listed in Microsoft's docs. An SSL certificate does not work.",
      "Since June 2023, new OV/EV certificates are issued on hardware or in a cloud HSM, so you usually cannot export a .pfx. Older certificates may still come as a .pfx.",
      'Have a .pfx? Choose "Use a certificate I already have" and give its thumbprint, then add the .pfx for CI.',
      'Have a .cer and a .key instead? Run: openssl pkcs12 -export -in cert.cer -inkey private-key.key -out certificate.pfx',
      'Cloud or hardware key (Azure Key Vault, Azure Artifact Signing, your CA\'s cloud signer)? Choose the custom sign command option: Tauri runs your tool through bundle.windows.signCommand.',
    ],
  },
};

function printGuide(target: GuideTarget): void {
  const guide = GUIDES[target];
  log.plain(`\n${c.heading(guide.title)}`);
  guide.steps.forEach((step, i) => log.plain(`  ${i + 1}. ${step}`));
  log.plain("");
}

const cleanPath = (v: string): string =>
  v.trim().replace(/^["']|["']$/g, "").replace(/^~(?=$|[\\/])/, os.homedir());

function newestDownload(exts: string[]): string | undefined {
  const dir = path.join(os.homedir(), "Downloads");
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => exts.includes(path.extname(f).toLowerCase()))
      .map((f) => ({ file: path.join(dir, f), time: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    return files[0]?.file;
  } catch {
    return undefined;
  }
}

async function askFile(message: string, exts: string[]): Promise<string> {
  const value = await input({
    message,
    default: newestDownload(exts),
    validate: (v) => (fs.existsSync(cleanPath(v)) ? true : "File not found."),
  });
  return path.resolve(cleanPath(value));
}

interface CertInfo {
  subject: string;
  commonName: string;
  notAfter: Date;
  hasKey: boolean;
  codeSigning: boolean | undefined;
}

type CertInspection = CertInfo | "no-openssl" | "unreadable";

function inspectCertificate(file: string, pass: string): CertInspection {
  if (!commandExists("openssl")) return "no-openssl";
  const env = { ...process.env, BINI_P12_PASS: pass };
  for (const legacy of [false, true]) {
    const extra = legacy ? ["-legacy"] : [];
    const pem = spawnSync("openssl", ["pkcs12", "-in", file, "-nokeys", "-clcerts", "-passin", "env:BINI_P12_PASS", ...extra], {
      encoding: "utf8",
      env,
      windowsHide: true,
    });
    if (pem.status !== 0) continue;
    const info = spawnSync("openssl", ["x509", "-noout", "-subject", "-enddate", "-nameopt", "multiline,utf8"], {
      input: pem.stdout,
      encoding: "utf8",
      windowsHide: true,
    });
    if (info.status !== 0) continue;

    const keys = spawnSync("openssl", ["pkcs12", "-in", file, "-nocerts", "-nodes", "-passin", "env:BINI_P12_PASS", ...extra], {
      encoding: "utf8",
      env,
      windowsHide: true,
    });
    const hasKey = keys.status === 0 && /PRIVATE KEY/.test(keys.stdout);

    const eku = spawnSync("openssl", ["x509", "-noout", "-ext", "extendedKeyUsage"], {
      input: pem.stdout,
      encoding: "utf8",
      windowsHide: true,
    });
    let codeSigning: boolean | undefined;
    if (eku.status === 0 && /Extended Key Usage/i.test(eku.stdout)) codeSigning = /Code Signing/i.test(eku.stdout);

    const commonName = /commonName\s*=\s*(.+)/.exec(info.stdout)?.[1]?.trim() ?? "";
    const end = /notAfter=(.+)/.exec(info.stdout)?.[1]?.trim();
    const notAfter = end ? new Date(end) : new Date(NaN);
    return { subject: commonName || "unknown", commonName, notAfter, hasKey, codeSigning };
  }
  return "unreadable";
}

function describeExpiry(what: string, date: Date): void {
  if (Number.isNaN(date.getTime())) return;
  const days = Math.floor((date.getTime() - Date.now()) / 86_400_000);
  const when = date.toISOString().slice(0, 10);
  if (days < 0) log.warn(`${what} expired on ${when}.`);
  else if (days < 30) log.warn(`${what} expires in ${days} days (${when}).`);
  else log.info(`${what} is valid until ${when}.`);
}

type CertKind = "windows" | "macos" | "ios";

function reportCertificate(info: CertInspection, kind: CertKind): boolean {
  if (info === "unreadable") {
    log.warn("Could not open the certificate: wrong password, or the file is not a .p12/.pfx.");
    return false;
  }
  if (info === "no-openssl") {
    log.info("openssl was not found, so the certificate could not be checked (Git for Windows includes one).");
    return true;
  }

  log.success(`Certificate: ${info.subject}`);
  describeExpiry("The certificate", info.notAfter);
  if (!info.hasKey) log.warn("This file has no private key inside, so it cannot sign. Export it again with the private key.");

  const cn = info.commonName;
  if (kind === "macos") {
    if (/^Developer ID Application:/.test(cn)) {
      // the right kind
    } else if (/^(Apple Distribution|3rd Party Mac Developer Application)/.test(cn)) {
      log.warn("This is a Mac App Store certificate. For apps you distribute yourself you need a \"Developer ID Application\" certificate.");
    } else if (/^(Apple Development|Mac Developer|Developer ID Installer)/.test(cn)) {
      log.warn(`"${cn}" cannot sign apps for download. You need a "Developer ID Application" certificate.`);
    } else {
      log.warn('Expected a certificate named "Developer ID Application: ...". Notarization will fail with any other kind.');
    }
  } else if (kind === "ios") {
    if (/^(Apple Distribution|iPhone Distribution)/.test(cn)) {
      // the right kind
    } else if (/^(Apple Development|iPhone Developer)/.test(cn)) {
      log.warn("This is a development certificate. TestFlight and the App Store need an \"Apple Distribution\" certificate.");
    } else {
      log.warn('Expected a certificate named "Apple Distribution: ...".');
    }
  } else if (info.codeSigning === false) {
    log.warn("This certificate is not marked for code signing. Windows will not accept it for signing apps.");
  }
  return true;
}

interface ProfileInfo {
  name?: string;
  team?: string;
  bundleId?: string;
  expires?: Date;
  development?: boolean;
}

function inspectProvisioningProfile(file: string): ProfileInfo | null {
  try {
    const text = fs.readFileSync(file).toString("latin1");
    const start = text.indexOf("<?xml");
    const end = text.indexOf("</plist>");
    if (start < 0 || end < 0) return null;
    const plist = text.slice(start, end + 8);
    const appId = /<key>application-identifier<\/key>\s*<string>([^<]+)<\/string>/.exec(plist)?.[1];
    const team = /<key>TeamIdentifier<\/key>\s*<array>\s*<string>([^<]+)<\/string>/.exec(plist)?.[1];
    const expires = /<key>ExpirationDate<\/key>\s*<date>([^<]+)<\/date>/.exec(plist)?.[1];
    const taskAllow = /<key>get-task-allow<\/key>\s*<(true|false)\s*\/>/.exec(plist)?.[1];
    return {
      name: /<key>Name<\/key>\s*<string>([^<]*)<\/string>/.exec(plist)?.[1],
      team,
      bundleId: appId && team && appId.startsWith(`${team}.`) ? appId.slice(team.length + 1) : appId,
      expires: expires ? new Date(expires) : undefined,
      development: taskAllow === "true",
    };
  } catch {
    return null;
  }
}

function describeProfile(profile: ProfileInfo, identifier: string | undefined, team: string | undefined): void {
  log.success(`Profile: ${profile.name ?? "unnamed"}${profile.team ? ` (team ${profile.team})` : ""}`);
  if (
    profile.bundleId &&
    identifier &&
    profile.bundleId !== "*" &&
    !profile.bundleId.endsWith("*") &&
    profile.bundleId !== identifier
  ) {
    log.warn(`The profile is for "${profile.bundleId}" but your app's identifier is "${identifier}". The build will fail until they match (create-bini-app --org can change the identifier).`);
  }
  if (team && profile.team && team !== profile.team) {
    log.warn(`The profile belongs to team ${profile.team}, not ${team}.`);
  }
  if (profile.development) {
    log.warn('This is a development profile. For TestFlight and the App Store create one of type "App Store Connect".');
  }
  if (profile.expires) describeExpiry("The profile", profile.expires);
}

async function createAppleCertificate(
  projectPath: string,
  target: "macos" | "ios"
): Promise<{ file: string; pass: string } | null> {
  if (!commandExists("openssl")) {
    log.warn("openssl was not found. Install it (Git for Windows includes one), or create the request in Keychain Access on a Mac.");
    return null;
  }

  const dir = path.join(projectPath, ".bini-signing");
  const keyFile = path.join(dir, "apple-signing.key");
  const csrFile = path.join(dir, "apple-signing.csr");
  const pemFile = path.join(dir, "apple-signing.pem");
  const p12File = path.join(dir, "apple-signing.p12");
  await fsPromises.mkdir(dir, { recursive: true });
  await appendGitignoreEntries(projectPath, SIGNING_GITIGNORE);

  if (!fs.existsSync(keyFile) || !fs.existsSync(csrFile)) {
    const email = (
      await input({
        message: "Your Apple ID email (for the request):",
        validate: (v) => (/^\S+@\S+\.\S+$/.test(v.trim()) ? true : "Enter a valid email address."),
      })
    ).trim();
    const name = (await input({ message: "Your name or company:", default: toTitleCase(path.basename(projectPath)) }))
      .trim()
      .replace(/[\/\\=,+<>#;"]/g, "");

    const gen = spawnSync("openssl", ["genrsa", "-out", keyFile, "2048"], { encoding: "utf8", windowsHide: true });
    const req =
      gen.status === 0
        ? spawnSync("openssl", ["req", "-new", "-key", keyFile, "-out", csrFile, "-subj", `/emailAddress=${email}/CN=${name}/C=US`], {
            encoding: "utf8",
            windowsHide: true,
          })
        : gen;
    if (req.status !== 0) {
      log.warn(`Could not create the request: ${(req.stderr || "openssl failed").trim().split("\n").pop()}`);
      return null;
    }
    log.success("Created the private key and certificate request in .bini-signing/");
  } else {
    log.info("Reusing the request already in .bini-signing/");
  }

  const kind = target === "macos" ? "Developer ID Application" : "Apple Distribution";
  log.plain(`\n${c.bold("Next steps")}`);
  log.plain(`  1. Open https://developer.apple.com/account/resources/certificates/add`);
  log.plain(`  2. Choose "${kind}" and upload this file: ${c.cyan(csrFile)}`);
  log.plain(`  3. Download the .cer file Apple gives you, then give its path below`);
  log.plain(`     ${c.dim("(You can press Ctrl+C now and run create-bini-app sign again later: the request is kept.)")}\n`);

  const cer = await askFile("Path to the downloaded .cer", [".cer", ".crt"]);

  let conv = spawnSync("openssl", ["x509", "-inform", "DER", "-in", cer, "-out", pemFile], { encoding: "utf8", windowsHide: true });
  if (conv.status !== 0) {
    conv = spawnSync("openssl", ["x509", "-inform", "PEM", "-in", cer, "-out", pemFile], { encoding: "utf8", windowsHide: true });
  }
  if (conv.status !== 0) {
    log.warn("That file could not be read as a certificate.");
    return null;
  }

  const pass = randomBytes(12).toString("hex");
  const exp = spawnSync(
    "openssl",
    [
      "pkcs12", "-export",
      "-inkey", keyFile, "-in", pemFile, "-out", p12File,
      "-certpbe", "PBE-SHA1-3DES", "-keypbe", "PBE-SHA1-3DES", "-macalg", "sha1",
      "-passout", "env:BINI_P12_PASS",
    ],
    { encoding: "utf8", env: { ...process.env, BINI_P12_PASS: pass }, windowsHide: true }
  );
  if (exp.status !== 0) {
    log.warn(`Could not build the .p12: ${(exp.stderr || "openssl failed").trim().split("\n").pop()}`);
    log.info("Make sure the certificate matches the request in .bini-signing/ (use the .cer for that exact request).");
    return null;
  }
  log.success("Built apple-signing.p12 in .bini-signing/. Back up apple-signing.key: it is the only copy of the private key.");
  return { file: p12File, pass };
}

interface CollectedCertificate {
  file: string;
  pass: string;
  info: CertInspection;
}

async function collectCertificate(
  projectPath: string,
  target: GuideTarget,
  label: string
): Promise<CollectedCertificate | null> {
  const ext = target === "windows" ? ".pfx" : ".p12";
  const exts = target === "windows" ? [".pfx", ".p12"] : [".p12"];

  for (;;) {
    const choice = await select<"have" | "csr" | "guide" | "skip">({
      message: `${label}:`,
      choices: [
        { name: `I have the ${ext} file`, value: "have" },
        ...(target !== "windows"
          ? [{ name: "I have no certificate yet: create a request (CSR) on this machine", value: "csr" as const }]
          : []),
        { name: "Show me how to get one", value: "guide" },
        { name: "Skip for now (CI will use a basic signature)", value: "skip" },
      ],
      default: "have",
    });

    if (choice === "skip") return null;
    if (choice === "guide") {
      printGuide(target);
      continue;
    }

    let file: string;
    let pass: string;
    if (choice === "csr" && target !== "windows") {
      const made = await createAppleCertificate(projectPath, target);
      if (!made) continue;
      ({ file, pass } = made);
    } else {
      file = await askFile(`Path to the ${ext} file`, exts);
      pass = await password({ message: "Certificate export password:" });
    }

    const info = inspectCertificate(file, pass);
    const readable = reportCertificate(info, target);
    if (!readable && !(await confirm({ message: "Use it anyway?", default: false }))) continue;
    return { file, pass, info };
  }
}

async function saveCiCertificate(
  projectPath: string,
  target: GuideTarget,
  label: string,
  prefix: "APPLE_CERTIFICATE" | "WINDOWS_CERTIFICATE",
  extra: Record<string, string> = {}
): Promise<CollectedCertificate | null> {
  const cert = await collectCertificate(projectPath, target, label);
  if (!cert) {
    log.info("Skipped. CI builds will use a basic signature until you add a certificate.");
    return null;
  }
  try {
    await saveCiValues(projectPath, {
      [prefix]: await fileBase64(cert.file),
      [`${prefix}_PASSWORD`]: cert.pass,
      ...extra,
    });
    return cert;
  } catch (err) {
    log.warn(`Could not read the certificate: ${(err as Error).message}`);
    return null;
  }
}

const CLOUD_SIGN_CONFIG = "tauri.cloud-sign.conf.json";

async function writeWindowsSignCommand(ctx: SigningContext, signCommand: string): Promise<boolean> {
  const { projectPath, tauriDir, pm } = ctx;
  if (!hasTauriConf(tauriDir)) {
    log.error("src-tauri/tauri.conf.json was not found. Add the desktop target first: create-bini-app add desktop");
    return false;
  }
  if (!signCommand.includes("%1")) {
    log.error("The sign command must contain %1 (the file to sign).");
    return false;
  }

  const file = path.join(tauriDir, CLOUD_SIGN_CONFIG);
  await writeFile(file, JSON.stringify({ bundle: { windows: { signCommand } } }, null, 2) + "\n");
  const rel = path.relative(projectPath, file).replace(/\\/g, "/");
  log.success(`Wrote ${rel}`);
  log.info("Your normal tauri.conf.json is untouched, so local builds do not call the signing service.");
  log.info(`Sign a build with it: ${c.cyan(pmRunWithArgs(pm, "tauri:build", ["--config", rel]))}`);
  log.info("GitHub Actions: bini-deploy installs the matching CLI (Azure Artifact Signing, relic, SSL.com eSigner, jsign) when it recognises the command.");
  return true;
}

async function setupWindowsSignCommand(ctx: SigningContext): Promise<boolean> {
  printGuide("windows");
  const signCommand = (
    await input({
      message: "Sign command (%1 is the file to sign):",
      default: "artifact-signing-cli -e <endpoint> -a <account> -c <profile> %1",
      validate: (v) => (v.includes("%1") ? true : "The command must contain %1."),
    })
  ).trim();
  return writeWindowsSignCommand(ctx, signCommand);
}

async function applyWindowsThumbprint(tauriDir: string, certificateThumbprint: string): Promise<boolean> {
  const ok = await patchLocalBundle(tauriDir, "windows", "windows", {
    certificateThumbprint,
    digestAlgorithm: "sha256",
    timestampUrl: "http://timestamp.digicert.com",
  });
  if (ok) {
    log.success(`Windows signing configured (thumbprint ${certificateThumbprint})`);
    log.info("Saved in src-tauri/tauri.windows.conf.json: git-ignored, and Tauri merges it automatically on Windows only.");
  }
  return ok;
}

async function generateWindowsCertificate(ctx: SigningContext, publisherName: string | undefined): Promise<boolean> {
  if (ctx.userOS !== "windows") {
    log.error("--generate needs a Windows PC for the certificate store. On this machine use a .pfx file or --sign-command.");
    return false;
  }
  if (!hasTauriConf(ctx.tauriDir)) {
    log.error("src-tauri/tauri.conf.json was not found. Add the desktop target first: create-bini-app add desktop");
    return false;
  }
  const publisher = sanitizeCertName(publisherName ?? toTitleCase(path.basename(ctx.projectPath)));
  const thumbprint = generateSelfSignedCertificate(publisher);
  if (!thumbprint) return false;
  log.success(`Certificate created for "${publisher}" (thumbprint ${thumbprint})`);
  log.info("Self-signed apps still show a Windows SmartScreen warning to other people.");
  return applyWindowsThumbprint(ctx.tauriDir, thumbprint);
}

async function applyWindowsCertificate(ctx: SigningContext, file: string, pass: string): Promise<boolean> {
  const { projectPath, tauriDir, userOS } = ctx;

  const info = inspectCertificate(file, pass);
  if (!reportCertificate(info, "windows")) return false;

  await saveCiValues(projectPath, {
    WINDOWS_CERTIFICATE: await fileBase64(file),
    WINDOWS_CERTIFICATE_PASSWORD: pass,
  });

  if (ctx.ciOnly || userOS !== "windows") {
    log.info("Saved for GitHub Actions only: local Windows signing needs a Windows PC.");
    return true;
  }
  if (!hasTauriConf(tauriDir)) {
    log.info("No desktop project here yet, so only the GitHub Actions values were saved. Add it with: create-bini-app add desktop");
    return true;
  }

  const thumbprint = importPfxToWindowsStore(file, pass);
  if (!thumbprint) {
    log.info("Local signing was not configured, but the GitHub Actions values are saved.");
    return true;
  }
  await applyWindowsThumbprint(tauriDir, thumbprint);
  return true;
}

async function setupWindowsCiOnly(ctx: SigningContext): Promise<boolean> {
  log.info("Saving Windows signing for GitHub Actions only: this machine does not sign Windows builds locally.");
  const method = await select<"pfx" | "cloud">({
    message: "Windows certificate:",
    choices: [
      { name: "A certificate file (.pfx)", value: "pfx" },
      { name: "Cloud or hardware key: custom sign command (new OV/EV certificates)", value: "cloud" },
    ],
    default: "pfx",
  });
  if (method === "cloud") return setupWindowsSignCommand(ctx);
  const cert = await saveCiCertificate(ctx.projectPath, "windows", "Windows certificate (.pfx) for GitHub Actions", "WINDOWS_CERTIFICATE");
  return cert !== null;
}

async function setupWindowsSigning(ctx: SigningContext): Promise<boolean> {
  const { projectPath, tauriDir } = ctx;

  if (ctx.userOS !== "windows" || ctx.ciOnly || !hasTauriConf(tauriDir)) return setupWindowsCiOnly(ctx);

  const current = readBundleSetting(tauriDir, "windows", "windows");
  if (current.certificateThumbprint) {
    log.info(`Current certificate thumbprint: ${current.certificateThumbprint}`);
    if (!(await confirm({ message: "Windows signing is already configured. Overwrite it?", default: false }))) {
      log.skip("Kept existing Windows signing configuration.");
      return true;
    }
  }

  const method = await select<"generate" | "existing" | "cloud">({
    message: "Windows code signing certificate:",
    choices: [
      { name: "Generate a free self-signed certificate (easiest)", value: "generate" },
      { name: "Use a certificate I already have (enter its thumbprint)", value: "existing" },
      { name: "Cloud or hardware key: custom sign command (new OV/EV certificates)", value: "cloud" },
    ],
    default: "generate",
  });
  if (method === "cloud") return setupWindowsSignCommand(ctx);

  if (method === "generate") {
    const publisher = await input({ message: "Publisher name for the certificate:", default: toTitleCase(path.basename(projectPath)) });
    log.info("For public releases, use a certificate from a trusted authority, or sign in CI.");
    return generateWindowsCertificate(ctx, publisher);
  }

  const certificateThumbprint = (
    await input({
      message: "Certificate thumbprint (Personal > Certificates > Details in certmgr.msc):",
      validate: (v) => (THUMBPRINT_PATTERN.test(v.replace(/[\s:]/g, "")) ? true : "A thumbprint is 40 hex characters."),
    })
  )
    .replace(/[\s:]/g, "")
    .toUpperCase();
  const ok = await applyWindowsThumbprint(tauriDir, certificateThumbprint);
  if (ok) await saveCiCertificate(projectPath, "windows", "Windows certificate (.pfx) for GitHub Actions", "WINDOWS_CERTIFICATE");
  return ok;
}

async function buildApiKeyVars(issuer: string | undefined, keyId: string | undefined, keyFile: string | undefined): Promise<Record<string, string> | null> {
  if (!issuer || !keyId || !keyFile) return null;
  const abs = path.resolve(cleanPath(keyFile));
  if (!fs.existsSync(abs)) {
    log.error(`The .p8 file was not found: ${abs}`);
    return null;
  }
  const text = await fsPromises.readFile(abs, "utf-8");
  if (!text.includes("PRIVATE KEY")) log.warn("That file does not look like an App Store Connect API key (.p8).");
  return {
    APPLE_API_ISSUER: issuer,
    APPLE_API_KEY: keyId,
    APPLE_API_KEY_P8: Buffer.from(text, "utf-8").toString("base64"),
    APPLE_API_KEY_PATH: abs,
  };
}

async function notarizationFromFlags(flags: CliFlags): Promise<Record<string, string> | null | false> {
  const hasKey = flags.apiIssuer !== undefined || flags.apiKey !== undefined || flags.apiKeyFile !== undefined;
  const hasAppleId = flags.appleId !== undefined;

  if (hasKey && hasAppleId) {
    log.error("Use either the API key options (--api-issuer, --api-key, --api-key-file) or --apple-id, not both.");
    return false;
  }
  if (hasKey) {
    if (!flags.apiIssuer || !flags.apiKey || !flags.apiKeyFile) {
      log.error("Notarization with an API key needs all of: --api-issuer, --api-key and --api-key-file.");
      return false;
    }
    const vars = await buildApiKeyVars(flags.apiIssuer, flags.apiKey, flags.apiKeyFile);
    return vars ?? false;
  }
  if (hasAppleId) {
    const appPassword = flags.applePassword ?? process.env[ENV_APPLE_PASSWORD];
    if (!appPassword || !flags.team) {
      log.error(`Notarization with an Apple ID needs --apple-id, --team and an app-specific password (--apple-password or ${ENV_APPLE_PASSWORD}).`);
      return false;
    }
    return { APPLE_ID: flags.appleId as string, APPLE_PASSWORD: appPassword, APPLE_TEAM_ID: flags.team };
  }
  return null;
}

async function promptNotarization(): Promise<Record<string, string> | null> {
  const wantsNotarization = await confirm({
    message: "Set up notarization credentials too? (avoids the 'unidentified developer' warning)",
    default: false,
  });
  if (!wantsNotarization) return null;

  const authMethod = await select<"apiKey" | "appleId">({
    message: "Notarization method:",
    choices: [
      { name: "App Store Connect API key", value: "apiKey" },
      { name: "Apple ID + app-specific password", value: "appleId" },
    ],
    default: "apiKey",
  });

  if (authMethod === "apiKey") {
    const issuer = (await input({ message: "APPLE_API_ISSUER (Issuer ID):", validate: required })).trim();
    const keyId = (await input({ message: "APPLE_API_KEY (Key ID):", validate: required })).trim();
    const keyFile = await askFile("Path to the downloaded .p8 private key", [".p8"]);
    const vars = await buildApiKeyVars(issuer, keyId, keyFile);
    return vars;
  }
  return {
    APPLE_ID: (await input({ message: "Apple ID email:", validate: required })).trim(),
    APPLE_PASSWORD: await password({ message: "App-specific password:" }),
    APPLE_TEAM_ID: (await input({ message: "Apple Team ID:", validate: required })).trim(),
  };
}

const setMacosIdentity = async (tauriDir: string, signingIdentity: string): Promise<boolean> => {
  const ok = await patchLocalBundle(tauriDir, "macos", "macOS", { signingIdentity });
  if (ok) {
    log.success(`macOS signingIdentity set to "${signingIdentity}"`);
    log.info("Saved in src-tauri/tauri.macos.conf.json: git-ignored, and Tauri merges it automatically on macOS only.");
  }
  return ok;
};

async function applyMacosAdhoc(tauriDir: string): Promise<boolean> {
  if (!hasTauriConf(tauriDir)) {
    log.error("src-tauri/tauri.conf.json was not found. Add the desktop target first: create-bini-app add desktop");
    return false;
  }
  return setMacosIdentity(tauriDir, "-");
}

async function applyMacosCertificate(ctx: SigningContext, flags: CliFlags, file: string, pass: string): Promise<boolean> {
  const { projectPath, tauriDir, userOS } = ctx;

  const notarization = await notarizationFromFlags(flags);
  if (notarization === false) return false;

  const info = inspectCertificate(file, pass);
  if (!reportCertificate(info, "macos")) return false;

  const identity = flags.identity ?? (typeof info === "object" ? info.commonName : "");
  if (!identity) {
    log.error('The signing identity could not be read from the certificate. Pass it with --identity "Developer ID Application: Name (TEAMID)".');
    return false;
  }

  await saveCiValues(projectPath, {
    APPLE_CERTIFICATE: await fileBase64(file),
    APPLE_CERTIFICATE_PASSWORD: pass,
    APPLE_SIGNING_IDENTITY: identity,
    KEYCHAIN_PASSWORD: randomBytes(16).toString("hex"),
    ...(notarization ?? {}),
  });

  if (!notarization) {
    log.info("No notarization credentials given. Add them with --api-issuer/--api-key/--api-key-file (or --apple-id) to avoid the Gatekeeper warning.");
  }

  if (ctx.ciOnly || userOS !== "macos") {
    log.info("Saved for GitHub Actions only: local macOS signing needs a Mac.");
    return true;
  }
  if (!hasTauriConf(tauriDir)) {
    log.info("No desktop project here yet, so only the GitHub Actions values were saved. Add it with: create-bini-app add desktop");
    return true;
  }

  importToMacKeychain(file, pass, identity);
  await setMacosIdentity(tauriDir, identity);
  return true;
}

async function setupMacosCiOnly(ctx: SigningContext): Promise<boolean> {
  const { projectPath } = ctx;
  log.info("Saving macOS signing for GitHub Actions only: this machine does not sign macOS builds locally.");

  const cert = await collectCertificate(projectPath, "macos", "Developer ID certificate (.p12) for GitHub Actions");
  if (!cert) {
    log.info("Skipped. CI builds will use a basic signature until you add a certificate.");
    return false;
  }

  let identity = typeof cert.info === "object" ? cert.info.commonName : "";
  if (!identity) {
    identity = (await input({ message: 'Signing identity (for example "Developer ID Application: Name (TEAMID)"):', validate: required })).trim();
  } else {
    log.info(`Signing identity: ${identity}`);
  }

  const notarization = await promptNotarization();
  await saveCiValues(projectPath, {
    APPLE_CERTIFICATE: await fileBase64(cert.file),
    APPLE_CERTIFICATE_PASSWORD: cert.pass,
    APPLE_SIGNING_IDENTITY: identity,
    KEYCHAIN_PASSWORD: randomBytes(16).toString("hex"),
    ...(notarization ?? {}),
  });
  return true;
}

async function setupMacosSigning(ctx: SigningContext): Promise<boolean> {
  const { projectPath, tauriDir, pm } = ctx;

  if (ctx.userOS !== "macos" || ctx.ciOnly || !hasTauriConf(tauriDir)) return setupMacosCiOnly(ctx);

  const existingIdentity = readBundleSetting(tauriDir, "macos", "macOS").signingIdentity as string | undefined;
  let mode: "adhoc" | "identity";
  let identityUsed = existingIdentity ?? "";

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
    identityUsed = signingIdentity;
    if (!(await setMacosIdentity(tauriDir, signingIdentity))) return false;
  }

  if (mode !== "identity") return true;

  await saveCiCertificate(
    projectPath,
    "macos",
    "Developer ID certificate (.p12) for GitHub Actions",
    "APPLE_CERTIFICATE",
    {
      APPLE_SIGNING_IDENTITY: identityUsed,
      KEYCHAIN_PASSWORD: randomBytes(16).toString("hex"),
    }
  );

  const notarization = await promptNotarization();
  if (!notarization) return true;

  await saveCiValues(projectPath, notarization);
  log.info("Local builds are signed with the identity in tauri.macos.conf.json (its certificate must be in your keychain): nothing to export.");
  log.info(`The notarization credentials are used by GitHub Actions. To notarize a local build, run "set -a; source .env.signing; set +a" before \`${pmRun(pm, "tauri:build")}\`.`);
  return true;
}

async function saveIosTeam(tauriDir: string, team: string): Promise<boolean> {
  if (!hasTauriConf(tauriDir)) return false;
  const saved = await patchBundle(tauriDir, "iOS", { developmentTeam: team });
  if (saved) log.success("Saved the Team ID in tauri.conf.json (bundle.iOS.developmentTeam): local iOS builds need no environment variables.");
  return saved;
}

async function applyIosTeam(
  tauriDir: string,
  projectPath: string,
  team: string | undefined,
  flags: CliFlags
): Promise<boolean> {
  if (!team) {
    log.error("iOS needs --team <TEAMID> (automatic signing), or a certificate file with --profile.");
    return false;
  }
  if (!(await saveIosTeam(tauriDir, team))) {
    log.error("src-tauri/tauri.conf.json was not found. Add the iOS target first: create-bini-app add ios");
    return false;
  }

  const apiVars = await buildApiKeyVars(flags.apiIssuer, flags.apiKey, flags.apiKeyFile);
  if (apiVars) {
    await saveCiValues(projectPath, apiVars);
    log.success("Saved the App Store Connect API key for CI automatic signing.");
  } else if (flags.apiIssuer || flags.apiKey || flags.apiKeyFile) {
    log.warn("Part of the App Store Connect API key was given but not all three of --api-issuer, --api-key and --api-key-file. Nothing was saved.");
  } else {
    log.info("No API key provided. Local automatic signing only needs Xcode; CI automatic signing needs --api-issuer, --api-key and --api-key-file.");
  }

  log.info("Sign in with your Apple ID in Xcode (Settings > Accounts) so automatic signing can create the certificates.");
  return true;
}

async function applyIosCredentials(
  ctx: SigningContext,
  flags: CliFlags,
  file: string,
  pass: string
): Promise<boolean> {
  const { projectPath, tauriDir } = ctx;

  if (!flags.profile) {
    log.error("iOS needs the provisioning profile too: --profile <app.mobileprovision>");
    return false;
  }
  const profileFile = path.resolve(cleanPath(flags.profile));
  if (!fs.existsSync(profileFile)) {
    log.error(`The provisioning profile was not found: ${profileFile}`);
    return false;
  }

  const info = inspectCertificate(file, pass);
  if (!reportCertificate(info, "ios")) return false;

  const profile = inspectProvisioningProfile(profileFile);
  const identifier = readTauriConfSync(tauriDir)?.identifier as string | undefined;
  if (profile) describeProfile(profile, identifier, flags.team);
  else log.warn("Could not read the provisioning profile, so it was not checked.");

  const team = flags.team ?? profile?.team;
  if (!team) {
    log.error("The Team ID could not be read from the profile. Pass it with --team ABCDE12345.");
    return false;
  }

  await saveCiValues(projectPath, {
    IOS_CERTIFICATE: await fileBase64(file),
    IOS_CERTIFICATE_PASSWORD: pass,
    IOS_MOBILE_PROVISION: await fileBase64(profileFile),
    APPLE_DEVELOPMENT_TEAM: team,
  });

  if (!ctx.ciOnly) {
    await saveIosTeam(tauriDir, team);
    log.info("Local iOS builds use Xcode's automatic signing, so nothing else is configured on this machine.");
  }
  return true;
}

async function setupIosSigning(ctx: SigningContext): Promise<boolean> {
  const { projectPath, pm, tauriDir } = ctx;
  const isMac = ctx.userOS === "macos" && !ctx.ciOnly;

  let mode: "automatic" | "manual" = "manual";
  if (isMac) {
    mode = await select<"automatic" | "manual">({
      message: "Signing method:",
      choices: [
        { name: "Automatic (Xcode-managed, recommended for local builds)", value: "automatic" },
        { name: "Manual (certificate + provisioning profile, for CI)", value: "manual" },
      ],
      default: "automatic",
    });
  } else {
    log.info("Saving iOS signing for GitHub Actions only: local iOS builds need a Mac with Xcode.");
  }

  if (mode === "automatic") {
    log.info("Local builds use Xcode's automatic signing. Sign in with your Apple ID in Xcode (Settings > Accounts).");
    const team = (
      await input({
        message: "Apple Team ID (10 characters, Enter to skip):",
        validate: (v) => (v.trim() === "" || TEAM_ID_PATTERN.test(v.trim()) ? true : "A Team ID is 10 letters and numbers, e.g. ABCDE12345."),
      })
    )
      .trim()
      .toUpperCase();
    if (team) await saveIosTeam(tauriDir, team);
    if (!(await confirm({ message: "Also add credentials for GitHub Actions builds?", default: false }))) return true;
  }

  const cert = await collectCertificate(projectPath, "ios", "Apple Distribution certificate (.p12)");
  if (!cert) {
    log.info("Skipped. CI will build for the simulator only until you add real credentials.");
    return false;
  }

  const provisionPath = await askFile("Path to the provisioning profile (.mobileprovision)", [".mobileprovision"]);
  const profile = inspectProvisioningProfile(provisionPath);
  const identifier = readTauriConfSync(tauriDir)?.identifier as string | undefined;
  if (profile) describeProfile(profile, identifier, undefined);

  let team = profile?.team;
  if (!team) {
    team = (
      await input({
        message: "Apple Team ID (10 characters):",
        validate: (v) => (TEAM_ID_PATTERN.test(v.trim()) ? true : "A Team ID is 10 letters and numbers, e.g. ABCDE12345."),
      })
    )
      .trim()
      .toUpperCase();
  }

  try {
    await saveCiValues(projectPath, {
      IOS_CERTIFICATE: await fileBase64(cert.file),
      IOS_CERTIFICATE_PASSWORD: cert.pass,
      IOS_MOBILE_PROVISION: await fileBase64(provisionPath),
      APPLE_DEVELOPMENT_TEAM: team,
    });
    if (!ctx.ciOnly && hasTauriConf(tauriDir)) await patchBundle(tauriDir, "iOS", { developmentTeam: team });
    log.info(`These credentials are used by GitHub Actions. Local \`${pmRun(pm, "ios:build")}\` runs use automatic signing: nothing to export.`);
    return true;
  } catch (err) {
    log.warn(`Could not read/encode certificate or profile: ${(err as Error).message}`);
    return false;
  }
}

const gpgCommand = (): string | undefined => ["gpg", "gpg2"].find(commandExists);

function printLinuxGuide(): void {
  log.plain(`\n${c.heading("Sign Linux packages with GPG")}`);
  [
    "Install GnuPG (gpg or gpg2).",
    "Create a key with `gpg --full-gen-key` (RSA 4096), or let this tool generate one.",
    "AppImage: builds read SIGN=1, SIGN_KEY=<key id>, APPIMAGETOOL_FORCE_SIGN=1, and APPIMAGETOOL_SIGN_PASSPHRASE only if the key has one.",
    "RPM: builds read TAURI_SIGNING_RPM_KEY (ASCII-armored private key) and TAURI_SIGNING_RPM_KEY_PASSPHRASE when set.",
    `Full guide: ${SIGNING_DOCS.linux}`,
  ].forEach((step, i) => log.plain(`  ${i + 1}. ${step}`));
  log.plain("");
}

function generateGpgKey(gpg: string, name: string, email: string, passphrase = ""): string | null {
  const realName = name.replace(/[<>()\r\n:]/g, "").trim();
  const batch = [
    "Key-Type: RSA",
    "Key-Length: 4096",
    "Subkey-Type: RSA",
    "Subkey-Length: 4096",
    `Name-Real: ${realName.length >= 5 ? realName : `${realName} App`}`,
    ...(email ? [`Name-Email: ${email}`] : []),
    "Expire-Date: 3y",
    passphrase ? `Passphrase: ${passphrase}` : "%no-protection",
    "%commit",
    "",
  ].join("\n");

  log.step("Generating a GPG key (this can take a minute)...");
  const gen = spawnSync(gpg, ["--batch", "--pinentry-mode", "loopback", "--gen-key"], {
    input: batch,
    encoding: "utf8",
    windowsHide: true,
    timeout: 180_000,
  });
  if (gen.status !== 0) {
    log.warn(`Could not generate the key: ${(gen.stderr || "gpg failed").trim().split("\n").pop()}`);
    return null;
  }

  const fromOutput = /key ([0-9A-Fa-f]{16,40}) marked as ultimately trusted/.exec(gen.stderr)?.[1];
  if (fromOutput) return fromOutput.toUpperCase();

  const list = spawnSync(gpg, ["--list-secret-keys", "--with-colons", "--keyid-format", "LONG"], { encoding: "utf8", windowsHide: true });
  const id = list.stdout.split("\n").filter((l) => l.startsWith("sec:")).at(-1)?.split(":")[4];
  if (!id) {
    log.warn("The key was created, but its ID could not be read. Find it with: gpg --list-secret-keys");
    return null;
  }
  return id;
}

function exportGpgSecretKey(gpg: string, keyId: string, passphrase: string): string | null {
  const r = spawnSync(gpg, ["--batch", "--pinentry-mode", "loopback", "--passphrase-fd", "0", "--armor", "--export-secret-keys", keyId], {
    input: `${passphrase}\n`,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (r.status !== 0 || !r.stdout.includes("PRIVATE KEY")) {
    log.warn(`Could not export the secret key (wrong key ID or passphrase?): ${(r.stderr || "gpg failed").trim().split("\n").pop()}`);
    return null;
  }
  return Buffer.from(r.stdout, "utf8").toString("base64");
}

interface LinuxKey {
  keyId: string;
  pass: string;
  privateKey: string;
}

async function collectLinuxKey(projectName: string): Promise<LinuxKey | null> {
  const gpg = gpgCommand();
  if (!gpg) {
    log.warn(`gpg was not found. Install GnuPG (gpg or gpg2), then run this again. Guide: ${SIGNING_DOCS.linux}`);
    return null;
  }

  for (;;) {
    const choice = await select<"generate" | "have" | "guide" | "skip">({
      message: "Linux package signing key (GPG):",
      choices: [
        { name: "Generate a new GPG key (RSA 4096, valid 3 years)", value: "generate" },
        { name: "Use a GPG key I already have", value: "have" },
        { name: "Show me how", value: "guide" },
        { name: "Skip for now (the AppImage and RPM will be unsigned)", value: "skip" },
      ],
      default: "generate",
    });

    if (choice === "skip") return null;
    if (choice === "guide") {
      printLinuxGuide();
      continue;
    }

    let keyId: string | null;
    let pass: string;
    if (choice === "generate") {
      const name = await input({ message: "Name for the key:", default: toTitleCase(projectName) });
      const email = (
        await input({
          message: "Email for the key (Enter to skip):",
          validate: (v) => (v.trim() === "" || /^\S+@\S+\.\S+$/.test(v.trim()) ? true : "Enter a valid email address."),
        })
      ).trim();
      pass = "";
      keyId = generateGpgKey(gpg, name, email);
    } else {
      keyId = (await input({ message: "Key ID or fingerprint:", validate: required })).trim();
      pass = await password({ message: "Key passphrase (leave blank if it has none):" });
    }
    if (!keyId) continue;

    const privateKey = exportGpgSecretKey(gpg, keyId, pass);
    if (!privateKey) continue;

    log.success(`GPG key ${keyId} is ready.`);
    return { keyId, pass, privateKey };
  }
}

async function saveLinuxValues(ctx: SigningContext, key: LinuxKey): Promise<void> {
  await saveCiValues(ctx.projectPath, {
    GPG_PRIVATE_KEY: key.privateKey,
    SIGN: "1",
    SIGN_KEY: key.keyId,
    APPIMAGETOOL_FORCE_SIGN: "1",
    TAURI_SIGNING_RPM_KEY: key.privateKey,
    ...(key.pass ? {
      APPIMAGETOOL_SIGN_PASSPHRASE: key.pass,
      TAURI_SIGNING_RPM_KEY_PASSPHRASE: key.pass,
    } : {}),
  });
  log.info(`Local builds read these from .env.signing: run "set -a; source .env.signing; set +a" before \`${pmRun(ctx.pm, "tauri:build")}\`.`);
}

async function setupLinuxSigning(ctx: SigningContext): Promise<boolean> {
  const key = await collectLinuxKey(path.basename(ctx.projectPath));
  if (!key) {
    log.info("Skipped. The AppImage and RPM stay unsigned until you set it up again.");
    return false;
  }
  await saveLinuxValues(ctx, key);
  return true;
}

async function applyLinuxKey(ctx: SigningContext, flags: CliFlags): Promise<boolean> {
  const gpg = gpgCommand();
  if (!gpg) {
    log.error(`gpg was not found. Install GnuPG (gpg or gpg2). Guide: ${SIGNING_DOCS.linux}`);
    return false;
  }
  const pass = "";
  const publisher = await resolvePublisherName(ctx.projectPath, flags.publisher);
  const keyId = generateGpgKey(gpg, publisher, "", pass);
  if (!keyId) return false;
  const privateKey = exportGpgSecretKey(gpg, keyId, pass);
  if (!privateKey) return false;
  await saveLinuxValues(ctx, { keyId, pass, privateKey });
  return true;
}

const SAVED_SIGNING_KEYS: Record<SigningTarget, RegExp> = {
  windows: /^(WINDOWS_PUBLISHER|WINDOWS_CERTIFICATE)=/m,
  macos: /^APPLE_CERTIFICATE=/m,
  linux: /^(LINUX_PUBLISHER|GPG_PRIVATE_KEY)=/m,
  android: /^(ANDROID_PUBLISHER|ANDROID_KEY_BASE64)=/m,
  ios: /^(IOS_CERTIFICATE|APPLE_API_KEY)=/m,
};

function hasSavedCiSigning(projectPath: string, target: SigningTarget): boolean {
  try {
    return SAVED_SIGNING_KEYS[target].test(fs.readFileSync(path.join(projectPath, SIGNING_ENV_FILE), "utf-8"));
  } catch {
    return false;
  }
}

async function saveGeneratedValues(
  projectPath: string,
  target: SigningTarget,
  publisher: string,
  pass: string,
  alias = "upload"
): Promise<void> {
  const values: Record<SigningTarget, Record<string, string>> = {
    windows: { WINDOWS_PUBLISHER: publisher },
    macos: {},
    linux: { LINUX_PUBLISHER: publisher },
    android: {
      ANDROID_PUBLISHER: publisher,
      ANDROID_KEY_ALIAS: alias,
      ANDROID_KEYSTORE_PASSWORD: pass,
      ANDROID_KEY_PASSWORD: pass,
    },
    ios: {},
  };
  await saveCiValues(projectPath, values[target]);
}

async function clearRealCredentialsBeforeGenerate(projectPath: string, target: SigningTarget): Promise<void> {
  const keys = REAL_CREDENTIAL_KEYS[target];
  if (!keys?.length) return;
  const removed = keys.filter((key) => {
    try {
      return new RegExp(`^${key}=`, "m").test(fs.readFileSync(path.join(projectPath, SIGNING_ENV_FILE), "utf-8"));
    } catch {
      return false;
    }
  });
  await removeKeyValueKeys(path.join(projectPath, SIGNING_ENV_FILE), keys);
  if (removed.length > 0) {
    log.info(`Removed the previous ${target} credentials from ${SIGNING_ENV_FILE}: ${removed.join(", ")}`);
  }
}

const GENERATED_NOTE: Record<SigningTarget, string> = {
  windows: "GitHub Actions creates a self-signed Windows certificate with this publisher name on the first build and saves it as a GitHub secret.",
  macos: "",
  linux: "GitHub Actions creates a GPG key with this name (no passphrase) on the first build and saves it as a GitHub secret. The same key signs the AppImage and the RPM.",
  android: "GitHub Actions creates a keystore with this publisher name and password on the first build and saves it as a GitHub secret.",
  ios: "",
};

function printGeneratedNotes(target: SigningTarget): void {
  log.info(GENERATED_NOTE[target]);
  log.info("Later builds reuse the saved key. Add a repository secret SECRETS_PAT (a token with Secrets: read and write) so the workflow can save it.");
  log.info("Self-signed keys are not trusted on other people's systems. Use real credentials for store releases (see --help).");
}

async function setupGeneratedInCi(ctx: SigningContext, target: SigningTarget): Promise<boolean> {
  const { projectPath } = ctx;

  if (target === "macos" || target === "ios") {
    log.error(
      target === "macos"
        ? "macOS certificates cannot be generated. Use --adhoc for local testing, or provide a real Developer ID .p12."
        : "iOS credentials come from Apple and cannot be generated in CI."
    );
    return false;
  }

  if (hasSavedCiSigning(projectPath, target)) {
    const redo = await confirm({
      message: `${target} signing is already saved for GitHub Actions. Replace it? (a key already created in GitHub will no longer match)`,
      default: false,
    });
    if (!redo) {
      log.skip(`Kept existing ${target} signing values.`);
      return true;
    }
    await clearRealCredentialsBeforeGenerate(projectPath, target);
  }

  const publisher = await resolvePublisherName(projectPath, undefined);

  let pass = "";
  if (target === "android") {
    pass = await password({ message: "Keystore password (min 6 chars):", validate: minLength(6, "Password") });
  }

  await saveGeneratedValues(projectPath, target, publisher, pass);
  printGeneratedNotes(target);
  return true;
}

async function resolvePublisherName(projectPath: string, given: string | undefined): Promise<string> {
  const fallback = toTitleCase(path.basename(projectPath));
  if (given !== undefined) return sanitizeCertName(given);
  if (isInteractive()) {
    const value = await input({ message: "Publisher name for the signing key:", default: fallback });
    return sanitizeCertName(value);
  }
  return sanitizeCertName(fallback);
}

async function applyGeneratedInCi(ctx: SigningContext, flags: CliFlags, given: string | undefined): Promise<boolean> {
  const target = ctx.target;
  if (!target || target === "ios") {
    log.error("iOS credentials come from Apple and cannot be generated in CI. Use: sign ios <cert.p12> <password> --profile <app.mobileprovision> --ci-only");
    return false;
  }
  if (target === "macos") {
    log.error("macOS certificates cannot be generated. Use ad-hoc for local testing (`sign desktop --adhoc`), or provide a real Developer ID .p12 for CI.");
    return false;
  }
  if (target === "linux" && given !== undefined && given.length > 0) {
    log.warn("Linux generated GPG keys never use a passphrase; ignoring the password argument.");
  }

  if (hasSavedCiSigning(ctx.projectPath, target) && !flags.force) {
    log.error(`${target} signing is already saved in ${SIGNING_ENV_FILE}. Re-run with --force to replace it (a key already created in GitHub will no longer match).`);
    return false;
  }

  await clearRealCredentialsBeforeGenerate(ctx.projectPath, target);

  const publisher = await resolvePublisherName(ctx.projectPath, flags.publisher);
  let pass = "";
  if (target === "android") {
    const resolved = await resolveSecret(given, ENV_SIGN_PASSWORD, "Keystore password:");
    if (resolved === null) return false;
    if (resolved.length < 6) {
      log.error("The password must be at least 6 characters.");
      return false;
    }
    pass = resolved;
  }

  await saveGeneratedValues(ctx.projectPath, target, publisher, pass, flags.alias);
  printGeneratedNotes(target);
  return true;
}

const SIGNING_LABEL: Record<SigningTarget, string> = {
  android: "Android release signing",
  windows: "Windows code signing",
  macos: "macOS code signing",
  linux: "Linux package signing",
  ios: "iOS code signing",
};

const SIGNING_DOCS: Record<SigningTarget, string> = {
  macos: "https://v2.tauri.app/distribute/sign/macos/",
  windows: "https://v2.tauri.app/distribute/sign/windows/",
  linux: "https://v2.tauri.app/distribute/sign/linux/",
  ios: "https://v2.tauri.app/distribute/sign/ios/",
  android: "https://v2.tauri.app/distribute/sign/android/",
};

const signingHint = (platform: TauriPlatform): string => `Set it up later with: create-bini-app sign ${platform}`;

const signingTargetFor = (platform: TauriPlatform, userOS: UserOS): SigningTarget =>
  platform === "desktop" ? userOS : platform;

async function setupCodeSigning(ctx: SigningContext): Promise<boolean> {
  const { platform, signFlag, userOS } = ctx;
  const target = ctx.target ?? signingTargetFor(platform, userOS);

  if (signFlag === false) {
    log.info(`Skipping ${target} signing (--nosign). ${signingHint(platform)}`);
    return false;
  }
  if (!isInteractive()) {
    log.info(`Skipping ${target} signing (no prompts). ${signingHint(platform)}`);
    return false;
  }

  log.step(SIGNING_LABEL[target]);
  log.plain(`     ${c.dim(`Guide: ${SIGNING_DOCS[target]}`)}`);
  const wantsSigning = signFlag === true || (await confirm({ message: `Set up ${target} signing now?`, default: false }));
  if (!wantsSigning) {
    log.info(`Skipped. ${signingHint(platform)}`);
    return false;
  }

  if (platform === "desktop" && !ctx.target) {
    log.info(`Desktop signing is set up for ${userOS} only. Sign the other systems in CI (GitHub Actions) on their own runners.`);
  }

  if (ctx.ciOnly && target === "ios") {
    log.info("iOS certificates are issued by Apple, so they cannot be generated in CI. You will be asked for your certificate and provisioning profile.");
  }

  if (ctx.ciOnly && target !== "ios" && target !== "macos") {
    const mode = await select<"generate" | "real">({
      message: `${target} credentials for GitHub Actions:`,
      choices: [
        { name: "Let GitHub Actions generate a self-signed key (easiest, not trusted by other systems)", value: "generate" },
        { name: "Use real credentials I already have (needed for store releases)", value: "real" },
      ],
      default: "generate",
    });
    if (mode === "generate") return setupGeneratedInCi(ctx, target);
  }

  switch (target) {
    case "android": return setupAndroidSigning(ctx);
    case "windows": return setupWindowsSigning(ctx);
    case "macos": return setupMacosSigning(ctx);
    case "ios": return setupIosSigning(ctx);
    case "linux": return setupLinuxSigning(ctx);
  }
}

async function resolveSecret(given: string | undefined, envName: string, message: string): Promise<string | null> {
  if (given !== undefined) return given;
  const fromEnv = process.env[envName];
  if (fromEnv !== undefined) return fromEnv;
  if (isInteractive()) return password({ message });
  log.error(`A password is required: pass it after the file, or set ${envName}.`);
  return null;
}

const hasSignInputs = (parsed: SignParsed, flags: CliFlags): boolean =>
  parsed.file !== undefined ||
  flags.signCommand !== undefined ||
  flags.thumbprint !== undefined ||
  flags.generate ||
  flags.adhoc ||
  (flags.team !== undefined && parsed.targets.includes("ios")) ||
  (flags.profile !== undefined && parsed.targets.includes("ios"));

async function signWithArguments(
  root: string,
  parsed: SignParsed,
  flags: CliFlags,
  userOS: UserOS,
  pm: PackageManager
): Promise<number> {
  const only = parsed.targets[0];
  if (parsed.targets.length !== 1 || only === undefined) {
    log.error("Name the target to sign, for example: create-bini-app sign desktop ./cert.pfx <password>");
    return 1;
  }

  const target: SigningTarget = only === "desktop" ? userOS : only;
  const modeFlags: [flag: string, used: boolean, targets: SigningTarget[]][] = [
    ["--sign-command", flags.signCommand !== undefined, ["windows"]],
    ["--thumbprint", flags.thumbprint !== undefined, ["windows"]],
    ["--publisher", flags.publisher !== undefined, ["windows", "android", "linux"]],
    ["--adhoc", flags.adhoc, ["macos"]],
    ["--generate", flags.generate, ["windows", "android", "linux"]],
    ["--api-issuer", flags.apiIssuer !== undefined, ["ios", "macos"]],
    ["--api-key", flags.apiKey !== undefined, ["ios", "macos"]],
    ["--api-key-file", flags.apiKeyFile !== undefined, ["ios", "macos"]],
  ];
  for (const [flag, used, targets] of modeFlags) {
    if (used && !targets.includes(target)) {
      log.error(`${flag} only works for the ${targets.join(" and ")} target.`);
      return 1;
    }
  }

  if (target === "ios" && flags.profile !== undefined && parsed.file === undefined) {
    log.error("--profile needs the certificate too: create-bini-app sign ios <cert.p12> <password> --profile <app.mobileprovision>");
    return 1;
  }

  const fileless =
    flags.signCommand !== undefined ||
    flags.thumbprint !== undefined ||
    flags.adhoc ||
    flags.generate ||
    (target === "ios" && parsed.file === undefined);
  if (fileless && parsed.file !== undefined) {
    log.error("Give either a credential file or one of --sign-command, --thumbprint, --generate, --adhoc, not both.");
    return 1;
  }
  if (target === "linux" && !flags.generate) {
    log.error(`Linux signing has no credential file. Run it with prompts (create-bini-app sign desktop, or sign linux --ci-only), or let GitHub Actions create a key with: sign linux --generate --ci-only`);
    return 1;
  }
  if (flags.ciOnly && fileless && !flags.generate) {
    log.error("--sign-command, --thumbprint, --adhoc and ios --team set up this machine, so they cannot be combined with --ci-only.");
    return 1;
  }
  if (flags.generate && target === "macos") {
    log.error("macOS certificates cannot be generated. Use --adhoc for local testing, or provide a real Developer ID .p12 (optionally with --ci-only).");
    return 1;
  }

  const tauriDir = path.join(root, "src-tauri");
  const ctx: SigningContext = {
    projectPath: root,
    tauriDir,
    platform: target === "android" ? "android" : target === "ios" ? "ios" : "desktop",
    userOS,
    signFlag: true,
    pm,
    target,
    ciOnly: flags.ciOnly,
  };

  let ok = false;
  let savedForCi = true;

  if (flags.ciOnly && flags.generate) {
    ok = await applyGeneratedInCi(ctx, flags, parsed.password);
  } else if (fileless && !(flags.generate && (target === "android" || target === "linux"))) {
    savedForCi = false;
    if (flags.signCommand !== undefined) ok = await writeWindowsSignCommand(ctx, flags.signCommand);
    else if (flags.thumbprint !== undefined) ok = await applyWindowsThumbprint(tauriDir, flags.thumbprint);
    else if (target === "windows") ok = await generateWindowsCertificate(ctx, flags.publisher);
    else if (target === "macos") ok = await applyMacosAdhoc(tauriDir);
    else ok = await applyIosTeam(tauriDir, root, flags.team, flags);
  } else {
    const file = parsed.file === undefined ? undefined : path.resolve(cleanPath(parsed.file));
    if (file !== undefined && !fs.existsSync(file)) {
      log.error(`File not found: ${parsed.file}`);
      return 1;
    }

    if (target === "linux" && flags.generate) {
      if (parsed.password) log.warn("Linux generated GPG keys never use a passphrase; ignoring the password argument.");
      ok = await applyLinuxKey(ctx, flags);
    } else {
      const pass = await resolveSecret(parsed.password, ENV_SIGN_PASSWORD, target === "android" ? "Keystore password:" : "Certificate password:");
      if (pass === null) return 1;

      if (file === undefined && !flags.generate) {
        log.error(`File not found: ${parsed.file ?? "(none)"}`);
        return 1;
      }

      if (target === "windows") ok = await applyWindowsCertificate(ctx, file as string, pass);
      else if (target === "macos") ok = await applyMacosCertificate(ctx, flags, file as string, pass);
      else if (target === "ios") ok = await applyIosCredentials(ctx, flags, file as string, pass);
      else ok = await applyAndroidKeystore(ctx, flags, file, pass);
    }
  }

  if (ok) {
    log.plain(`\n${c.green("Done.")}${savedForCi ? ` Upload the saved values to GitHub with: ${c.cyan(pmRun(pm, "deploy"))}` : ""}`);
  }
  return ok ? 0 : 1;
}

async function initTauri(o: InitTauriOptions): Promise<InitResult> {
  const { projectPath, pm, projectName, appName, org, localCli } = o;
  const tauriDir = path.join(projectPath, "src-tauri");

  if (fs.existsSync(path.join(tauriDir, "tauri.conf.json"))) {
    log.skip("Tauri already initialized");
    return "ok";
  }

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
  if (!runBin(cmd.bin, cmd.args, projectPath, SLOW_STEP_MS)) {
    const manual = pmTauri(pm, initArgs);
    log.warn("Tauri init failed. After installing dependencies, run manually:");
    log.plain(`  ${c.yellow(displayCmd(manual.bin, manual.args))}`);
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
    log.success(`App name set to "${appName}", bundle identifier ${c.cyan(identifier)}`);
    log.info("Replace the identifier with your own reverse-DNS id before publishing to an app store.");
    log.info(`Change them later with: ${c.cyan("create-bini-app --app-name")} / ${c.cyan("create-bini-app --org")}`);
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
    log.warn("Could not generate icons automatically.");
    addFollowUp(`Run: ${pmRun(pm, "tauri:icon")}`);
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
  if (!runBin(cmd.bin, cmd.args, projectPath, SLOW_STEP_MS)) {
    if (platform === "android") {
      log.warn("Android init failed (JAVA_HOME / ANDROID_HOME / NDK_HOME set?). Run manually:");
      log.plain(`  ${c.yellow(manualCmd)}`);
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
      if (runBin("rustup", ["target", "add", ...ANDROID_RUST_TARGETS], projectPath, SLOW_STEP_MS)) {
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

async function setupTauri(
  o: InitTauriOptions & { platforms: TauriPlatform[]; userOS: UserOS; signFlag: boolean | undefined }
): Promise<void> {
  const { projectPath, platforms, userOS, pm, localCli, signFlag } = o;
  log.step(`Setting up Tauri for ${platforms.join(", ")} on ${userOS}`);

  const tauriDir = path.join(projectPath, "src-tauri");
  const result = await initTauri(o);

  const mobileResults = new Map<TauriPlatform, MobileResult>();
  for (const p of platforms) {
    if (p !== "desktop") mobileResults.set(p, await initMobile(p, { projectPath, pm, userOS, localCli }));
  }

  if (result === "ok") {
    const signing = detectProject(projectPath, undefined).signing;
    for (const p of platforms) {
      const init = mobileResults.get(p);
      if (init === "failed" || init === "manual") {
        log.skip(`${p}: signing skipped because the ${p} project was not created. ${signingHint(p)}`);
        continue;
      }
      const target = signingTargetFor(p, userOS);
      if (signing[target]) {
        log.skip(`${p}: signing already configured in src-tauri`);
        continue;
      }
      await setupCodeSigning({ projectPath, tauriDir, platform: p, userOS, signFlag, pm });
    }
  }

  printToolchainHint(pm);
  log.success(`Tauri setup complete for ${platforms.join(", ")}`);
}

function nativePackagePatch(): NativePackagePatch {
  return {
    dependencies: { "@tauri-apps/api": "latest" },
    devDependencies: { "@tauri-apps/cli": "latest", "cross-env": "latest", "bini-native": "latest" },
    scripts: {
      "dev:native": "vite",
      tauri: "tauri",
      "tauri:dev": "cross-env TAURI=true tauri dev",
      "tauri:build": "cross-env TAURI=true tauri build",
      "tauri:icon": "tauri icon public/logo.png",
      sign: "npx create-bini-app sign",
      doctor: "npx create-bini-app doctor",
      android: "cross-env TAURI=true tauri android dev",
      "android:build": "cross-env TAURI=true tauri android build",
      ios: "cross-env TAURI=true tauri ios dev",
      "ios:build": "cross-env TAURI=true tauri ios build",
    },
  };
}

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

function findProjectRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i <= MAX_PROJECT_WALK; i++) {
    try {
      const pkg = readJsonSync(path.join(dir, "package.json"));
      if (pkg.dependencies?.["bini-router"] || pkg.devDependencies?.["bini-router"]) return dir;
    } catch {}
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function requireProjectRoot(): string {
  const root = findProjectRoot(process.cwd());
  if (!root) {
    log.error("This doesn't look like a Bini.js project (no bini-router in package.json).");
    exit(1);
  }
  return root;
}

function detectProject(root: string, pmFlag: PackageManager | undefined): DetectedProject {
  const pkg = readJsonSync(path.join(root, "package.json"));
  const deps: Record<string, string> = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

  const tauriDir = path.join(root, "src-tauri");
  const conf = readTauriConfSync(tauriDir);
  let envSigning = "";
  try { envSigning = fs.readFileSync(path.join(root, SIGNING_ENV_FILE), "utf-8"); } catch {}

  const winBundle = readBundleSetting(tauriDir, "windows", "windows");
  const macBundle = readBundleSetting(tauriDir, "macos", "macOS");

  return {
    root,
    name: typeof pkg.name === "string" && pkg.name ? pkg.name : path.basename(root),
    pm: resolvePackageManager(pmFlag, root),
    hasNative: conf !== null,
    nativeReady: Boolean(deps["bini-native"] && deps["@tauri-apps/cli"]),
    hasAndroid: fs.existsSync(path.join(tauriDir, "gen", "android")),
    hasIos: fs.existsSync(path.join(tauriDir, "gen", "apple")),
    signing: {
      android:
        fs.existsSync(path.join(tauriDir, "gen", "android", "keystore.properties")) ||
        /^(ANDROID_KEY_BASE64|ANDROID_PUBLISHER)=/m.test(envSigning),
      windows:
        Boolean(winBundle.certificateThumbprint) ||
        fs.existsSync(path.join(tauriDir, CLOUD_SIGN_CONFIG)) ||
        /^(WINDOWS_CERTIFICATE|WINDOWS_PUBLISHER)=/m.test(envSigning),
      macos:
        Boolean(macBundle.signingIdentity) ||
        /^APPLE_CERTIFICATE=/m.test(envSigning),
      linux: /^(GPG_PRIVATE_KEY|LINUX_PUBLISHER)=/m.test(envSigning),
      ios: /^(IOS_CERTIFICATE|APPLE_API_KEY)=/m.test(envSigning) || Boolean(conf?.bundle?.iOS?.developmentTeam),
    },
  };
}

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
  } catch {}
}

function pickerChoices(project: DetectedProject, userOS: UserOS) {
  const present: Record<TauriPlatform, boolean> = {
    desktop: project.hasNative,
    android: project.hasAndroid,
    ios: project.hasIos,
  };
  return [
    { name: PLATFORM_LABELS.web, value: "web" as TargetPlatform, checked: true, disabled: "(included)" },
    ...NATIVE_PLATFORMS
      .filter((p) => p !== "ios" || userOS === "macos")
      .map((p) => {
        const value: TargetPlatform = p;
        if (present[p]) return { name: PLATFORM_LABELS[p], value, checked: true, disabled: "(already added)" };
        return { name: PLATFORM_LABELS[p], value };
      }),
  ];
}

function printSigningStatus(platforms: TauriPlatform[], signing: Record<SigningTarget, boolean>, userOS: UserOS): void {
  for (const p of platforms) {
    const label = p === "desktop" ? `desktop (${userOS})` : p;
    if (signing[signingTargetFor(p, userOS)]) log.plain(`  ${label}: signing configured`);
    else log.plain(`  ${label}: signing not configured ${c.dim(`(run: create-bini-app sign ${p})`)}`);
  }
}

const nameOrOrgRequested = (flags: CliFlags): boolean =>
  flags.promptAppName || flags.promptOrg || flags.appName !== undefined || flags.org !== undefined;

async function addPlatforms(requested: TargetPlatform[], flags: CliFlags, userOS: UserOS, implicit: boolean): Promise<number> {
  const root = requireProjectRoot();

  const project = detectProject(root, flags.packageManager);
  log.info(`Project ${c.cyan(project.name)} at ${c.dim(root)}`);

  const ignored = [
    flags.typescript !== undefined && (flags.typescript ? "--typescript" : "--javascript"),
    flags.tailwind && "--tailwind",
    flags.cssModules && "--css-modules",
    flags.noStyle && "--none",
  ].filter((v): v is string => typeof v === "string");
  if (ignored.length > 0) log.warn(`Ignored in add mode: ${ignored.join(", ")}`);

  if (project.hasNative && nameOrOrgRequested(flags)) {
    log.info(
      "--app-name and --org only apply when Tauri is first set up. " +
      "To change them now, run: create-bini-app --app-name / create-bini-app --org"
    );
  }

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

  if (userOS !== "macos" && nativePlatforms.includes("ios")) {
    log.warn(iosNeedsMacMessage(pmRun(project.pm, "deploy")));
    nativePlatforms = nativePlatforms.filter((p) => p !== "ios");
  }
  if (nativePlatforms.length === 0) {
    if (showWeb) printCommands(project.pm, ["web"]);
    else log.info("Nothing to do.");
    return 0;
  }

  const shown: TargetPlatform[] = [...(showWeb ? (["web"] as const) : []), ...nativePlatforms];

  const actions: { platform: TauriPlatform; kind: ActionKind }[] = nativePlatforms.map((platform) => {
    if (platform !== "desktop") {
      const configured = platform === "android" ? project.hasAndroid : project.hasIos;
      return { platform, kind: !configured ? "init" : flags.sign === true ? "signOnly" : "skip" };
    }
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
    printCommands(project.pm, shown);
    return 0;
  }

  warnIfGitDirty(root);

  const pkgChanged = project.nativeReady ? false : await applyNativePatch(root);
  const tauriCliPath = path.join(root, "node_modules", "@tauri-apps", "cli");
  const needsCli = active.some((a) => a.kind === "init");
  if (!flags.noInstall && (pkgChanged || (needsCli && !fs.existsSync(tauriCliPath)))) {
    installDependencies(root, project.pm, false);
  }
  const localCli = fs.existsSync(tauriCliPath);

  let nativeResult: InitResult = "ok";
  if (!project.hasNative && needsCli) {
    nativeResult = await initTauri({
      projectPath: root,
      pm: project.pm,
      projectName: project.name,
      appName: await askAppName(flags, project.name, undefined, true),
      org: await askOrg(flags),
      localCli,
    });
  }

  const tauriDir = path.join(root, "src-tauri");
  const signedNow = new Set<TauriPlatform>();

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

  log.step("Summary");
  const outcomeColor = (o: Outcome) => (o === "added" ? c.green : o === "failed" ? c.red : c.yellow);
  for (const e of summary) {
    log.plain(`  ${outcomeColor(e.outcome)(e.outcome.padEnd(8))} ${e.platform} ${c.dim(`(${e.note})`)}`);
  }

  log.plain(`\n${c.heading("Signing:")}`);
  const signing = { ...detectProject(root, flags.packageManager).signing };
  for (const p of signedNow) signing[signingTargetFor(p, userOS)] = true;
  printSigningStatus(nativePlatforms, signing, userOS);

  printFollowUps();
  printCommands(project.pm, shown);

  log.plain(`\n${c.green("Done.")}`);
  return followUps.length > 0 ? 2 : 0;
}

interface SignJob {
  platform: TauriPlatform;
  target: SigningTarget;
  ciOnly: boolean;
}

function validateSignTargets(targets: SignTarget[], flags: CliFlags, userOS: UserOS): boolean {
  if (flags.ciOnly) return true;

  const byName = targets.filter((t) => t === "windows" || t === "macos" || t === "linux");
  if (byName.length > 0) {
    log.error(`${byName.join(", ")} can only be set up with --ci-only, which saves the credentials for GitHub Actions without changing this machine.`);
    log.info("To sign for the OS you are on, run: create-bini-app sign desktop");
    log.info(`For GitHub Actions, run: create-bini-app sign ${byName.join(",")} --ci-only`);
    return false;
  }
  if (targets.includes("ios") && userOS !== "macos") {
    log.error("iOS can only be signed on a Mac. To save the credentials for GitHub Actions, run: create-bini-app sign ios --ci-only");
    return false;
  }
  return true;
}

async function signProject(parsed: SignParsed, flags: CliFlags, userOS: UserOS): Promise<number> {
  const root = requireProjectRoot();
  if (flags.sign === false) {
    log.error("--nosign cannot be used with the sign command.");
    exit(1);
  }
  if (!validateSignTargets(parsed.targets, flags, userOS)) return 1;

  const argMode = hasSignInputs(parsed, flags);
  if (!argMode && !isInteractive()) {
    log.error("Code signing needs interactive prompts. Run this command in a terminal, or pass the credentials:");
    log.info("create-bini-app sign <target> <file> <password>");
    exit(1);
  }

  const project = detectProject(root, flags.packageManager);
  log.info(`Project ${c.cyan(project.name)} at ${c.dim(root)}`);

  if (argMode) return signWithArguments(root, parsed, flags, userOS, project.pm);

  const jobs: SignJob[] = [];
  let problems = 0;
  const platformOf = (t: SigningTarget): TauriPlatform => (t === "android" ? "android" : t === "ios" ? "ios" : "desktop");

  if (parsed.targets.length === 0) {
    if (flags.ciOnly) {
      if (project.hasNative) for (const t of ["windows", "macos", "linux"] as const) jobs.push({ platform: "desktop", target: t, ciOnly: true });
      if (project.hasAndroid) jobs.push({ platform: "android", target: "android", ciOnly: true });
      if (project.hasIos) jobs.push({ platform: "ios", target: "ios", ciOnly: true });
    } else {
      if (project.hasNative) jobs.push({ platform: "desktop", target: userOS, ciOnly: false });
      if (project.hasAndroid) jobs.push({ platform: "android", target: "android", ciOnly: false });
      if (project.hasIos && userOS === "macos") jobs.push({ platform: "ios", target: "ios", ciOnly: false });
      else if (project.hasIos) {
        log.info("iOS local signing is only available on macOS, skipping it here. To save iOS credentials for GitHub Actions run: create-bini-app sign ios --ci-only");
      }
    }
  } else {
    const seen = new Set<SigningTarget>();
    for (const requested of parsed.targets) {
      const target: SigningTarget = requested === "desktop" ? userOS : requested;
      if (seen.has(target)) continue;
      seen.add(target);

      if (flags.ciOnly) {
        jobs.push({ platform: platformOf(target), target, ciOnly: true });
        continue;
      }

      const present = target === "android" ? project.hasAndroid : target === "ios" ? project.hasIos : project.hasNative;
      if (!present) {
        log.warn(`${requested} has not been added to this project. Run: create-bini-app add ${platformOf(target)} (or add --ci-only to only save the GitHub Actions values).`);
        problems++;
        continue;
      }
      jobs.push({ platform: platformOf(target), target, ciOnly: false });
    }
  }

  if (jobs.length === 0) {
    if (problems > 0) return 2;
    log.info("This project has no desktop or mobile platform yet. Add one with: create-bini-app add <target>");
    return 0;
  }

  log.info(`Signing prompts: ${jobs.map((j) => SIGNING_LABEL[j.target]).join(", ")}`);

  const tauriDir = path.join(root, "src-tauri");
  const results: { job: SignJob; ok: boolean }[] = [];
  for (const job of jobs) {
    const ok = await setupCodeSigning({
      projectPath: root,
      tauriDir,
      platform: job.platform,
      userOS,
      signFlag: true,
      pm: project.pm,
      target: job.target,
      ciOnly: job.ciOnly,
    });
    results.push({ job, ok });
  }

  log.step("Signing status");
  const signing = detectProject(root, flags.packageManager).signing;
  for (const { job, ok } of results) {
    const label = job.target;
    const retry = job.ciOnly ? `${label} --ci-only` : job.platform;
    if (!ok) log.plain(`  ${label}: needs attention ${c.dim(`(run: create-bini-app sign ${retry})`)}`);
    else if (job.ciOnly) log.plain(`  ${label}: credentials saved for GitHub Actions`);
    else if (signing[job.target]) log.plain(`  ${label}: signing configured`);
    else log.plain(`  ${label}: done`);
  }

  const pending = results.filter((r) => !r.ok).length + problems;
  log.plain(pending > 0 ? `\n${c.yellow("Some targets still need attention.")}` : `\n${c.green("Done.")}`);
  return pending > 0 ? 2 : 0;
}

const NATIVE_SCRIPTS: Record<TauriPlatform, string[]> = {
  desktop: ["tauri:dev", "tauri:build", "tauri:icon"],
  android: ["android", "android:build"],
  ios: ["ios", "ios:build"],
};
const SHARED_NATIVE_SCRIPTS = ["dev:native", "tauri", "sign", "doctor"];

const REMOVABLE_NATIVE_DEPS = ["@tauri-apps/cli", "@tauri-apps/api", "cross-env", "bini-native"];

async function removeNativeFromPackageJson(root: string, scriptKeys: string[], removeDeps: boolean): Promise<boolean> {
  const pkgPath = path.join(root, "package.json");
  try {
    const pkg = JSON.parse(await fsPromises.readFile(pkgPath, "utf-8")) as AnyJson;
    const patch = nativePackagePatch();
    let changed = false;

    for (const key of scriptKeys) {
      const current = pkg.scripts?.[key];
      if (current !== undefined && (current === patch.scripts[key])) {
        delete pkg.scripts[key];
        changed = true;
      }
    }

    if (removeDeps) {
      for (const section of ["dependencies", "devDependencies"] as const) {
        for (const name of REMOVABLE_NATIVE_DEPS) {
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
  } catch {}
}

async function removePlatforms(requested: TargetPlatform[], flags: CliFlags): Promise<number> {
  const root = requireProjectRoot();

  const project = detectProject(root, flags.packageManager);
  log.info(`Project ${c.cyan(project.name)} at ${c.dim(root)}`);

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
  log.plain(`\n${c.bold("This will delete:")}`);
  for (const e of effects) log.plain(`  - ${e}`);
  if (project.hasAndroid && (removeAll || targets.includes("android"))) {
    log.plain(`  ${c.dim("keystore.jks in the project root is kept.")}`);
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
  log.plain(`\n${c.green("Done.")}`);
  return 0;
}

const escapeAndroidString = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(['"\\])/g, "\\$1");

async function patchAndroidAppName(root: string, name: string): Promise<boolean> {
  const file = path.join(root, "src-tauri", "gen", "android", "app", "src", "main", "res", "values", "strings.xml");
  try {
    const src = await fsPromises.readFile(file, "utf-8");
    const pattern = /(<string\s+name="app_name"[^>]*>)[^<]*(<\/string>)/;
    if (!pattern.test(src)) return false;
    const next = src.replace(pattern, (_m, open: string, close: string) => `${open}${escapeAndroidString(name)}${close}`);
    await writeFile(file, next);
    return true;
  } catch {
    return false;
  }
}

async function renameProject(flags: CliFlags): Promise<number> {
  const root = requireProjectRoot();

  if ((flags.promptAppName || flags.promptOrg) && !isInteractive()) {
    log.error('Prompting needs an interactive terminal. Pass a value instead, e.g. --app-name "My App" or --org com.acme.');
    exit(1);
  }

  const project = detectProject(root, flags.packageManager);
  log.info(`Project ${c.cyan(project.name)} at ${c.dim(root)}`);

  if (!project.hasNative) {
    log.info("This project has no desktop or mobile platform yet, so there is no native app name or bundle ID to change.");
    log.info("Add one with: create-bini-app add <target>");
    return 0;
  }

  const tauriDir = path.join(root, "src-tauri");
  const tauriConf = readTauriConfSync(tauriDir);
  if (!tauriConf) {
    log.error("Could not read src-tauri/tauri.conf.json.");
    return 1;
  }

  const currentName =
    typeof tauriConf.productName === "string" && tauriConf.productName ? tauriConf.productName : toTitleCase(project.name);
  const currentIdentifier = typeof tauriConf.identifier === "string" ? tauriConf.identifier : undefined;
  const hasMobile = project.hasAndroid || project.hasIos;

  const wantsName = flags.promptAppName || flags.appName !== undefined;
  const wantsOrg = flags.promptOrg || flags.org !== undefined;

  const newName = wantsName ? await askAppName(flags, project.name, currentName) : undefined;
  const newIdentifier = wantsOrg
    ? generateBundleIdentifier(await askOrg(flags, orgFromIdentifier(currentIdentifier)), project.name)
    : undefined;

  const nameChanged = newName !== undefined && newName !== currentName;
  const idChanged = newIdentifier !== undefined && newIdentifier !== currentIdentifier;

  if (!nameChanged && !idChanged) {
    log.info("Nothing to change.");
    return 0;
  }

  warnIfGitDirty(root);

  if (idChanged) {
    log.warn(
      `The bundle identifier will change from "${currentIdentifier ?? "(none)"}" to "${newIdentifier}". ` +
      "App stores treat a new identifier as a different app."
    );
    if (!flags.yes && !isInteractive()) {
      log.error("Changing the bundle identifier needs confirmation. Re-run with --yes.");
      exit(1);
    }
    if (!flags.yes && !(await confirm({ message: "Change the bundle identifier?", default: !hasMobile }))) {
      log.info("Cancelled. Nothing was changed.");
      return 0;
    }
  }

  const ok = await patchTauriConf(tauriDir, (conf) => {
    if (nameChanged && newName) {
      conf.productName = newName;
      const win = conf.app?.windows?.[0];
      if (win) win.title = newName;
    }
    if (idChanged && newIdentifier) conf.identifier = newIdentifier;
  });
  if (!ok) return 1;

  if (nameChanged) log.success(`App name set to "${newName}" in tauri.conf.json`);
  if (idChanged) log.success(`Bundle identifier set to ${c.cyan(newIdentifier as string)}`);

  if (nameChanged && newName && project.hasAndroid) {
    if (await patchAndroidAppName(root, newName)) {
      log.success("Updated the Android app name (strings.xml)");
    } else {
      addFollowUp("Update app_name in src-tauri/gen/android/app/src/main/res/values/strings.xml, or remove and re-add Android.");
    }
  }
  if (nameChanged && project.hasIos) {
    addFollowUp("The generated iOS project keeps the old display name. Rename it in Xcode, or remove and re-add iOS (commit first).");
  }
  if (idChanged && hasMobile) {
    addFollowUp("The generated Android/iOS projects still use the old bundle identifier. Remove and re-add them to apply the new one (commit first).");
  }

  printFollowUps();

  log.plain(`\n${c.green("Done.")}`);
  return followUps.length > 0 ? 2 : 0;
}

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

async function cleanProject(): Promise<number> {
  const root = requireProjectRoot();

  const tauriDir = path.join(root, "src-tauri");
  const candidates = [
    "dist",
    "dist-ssr",
    path.join("src-tauri", "gen", "android", "app", "build"),
    path.join("src-tauri", "gen", "android", "build"),
    path.join("src-tauri", "gen", "android", ".gradle"),
    path.join("src-tauri", "gen", "apple", "build"),
    path.join("src-tauri", "gen", "apple", "Externals"),
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

  if (removed === 0) log.info("Nothing to clean.");
  else log.plain(`\n${c.green("Done.")}`);
  return 0;
}

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

async function refreshTemplateFiles(root: string, project: DetectedProject, pkg: AnyJson): Promise<boolean> {
  const deps: Record<string, string> = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const useTypeScript = Boolean(deps.typescript) || fs.existsSync(path.join(root, "tsconfig.json"));
  const productName = readTauriConfSync(path.join(root, "src-tauri"))?.productName;
  const vars = buildTemplateVars({
    projectName: project.name,
    appName: typeof productName === "string" && productName ? productName : toTitleCase(project.name),
    useTypeScript,
    styling: deps.tailwindcss ? "Tailwind" : "None",
    pm: project.pm,
  });
  const skip = (name: string): boolean => name === "src" || name === "package.json" || /^vite\.config\./.test(name);

  log.step("Copying the latest template files (src/, package.json and vite.config are skipped)...");
  try {
    await copyTemplateDir("base", root, vars, skip);
    await copyTemplateDir(useTypeScript ? "typescript" : "javascript", root, vars, skip);
    log.success("Template files updated.");
    return true;
  } catch (err) {
    log.warn(`Could not copy the template files: ${(err as Error).message}`);
    return false;
  }
}

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
  const manifest = path.join(root, "src-tauri", "Cargo.toml");
  const hasRust = fs.existsSync(manifest);

  if (runtime.length + dev.length === 0 && !hasRust) {
    log.info("No registry dependencies to update.");
    return 0;
  }

  log.info(`Project ${c.cyan(project.name)} (${project.pm})`);
  if (runtime.length) log.plain(`  ${c.bold("dependencies")}     ${runtime.join(", ")}`);
  if (dev.length) log.plain(`  ${c.bold("devDependencies")}  ${dev.join(", ")}`);
  if (hasRust) log.plain(`  ${c.bold("Rust")}             cargo update (src-tauri)`);
  log.plain(`${c.dim("Every package above moves to its latest version, package.json records what it resolved to.")}\n`);

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

  if (!(await refreshTemplateFiles(root, project, pkg))) ok = false;

  log.plain(ok ? `\n${c.green("Done.")}` : `\n${c.yellow("Finished with problems, see the warnings above.")}`);
  return ok ? 0 : 2;
}

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

function buildTemplateVars(o: {
  projectName: string;
  appName: string;
  useTypeScript: boolean;
  styling: StylingOption;
  pm: PackageManager;
}): Record<string, string> {
  const { projectName, appName, useTypeScript, styling, pm } = o;
  const mainExt: FileExtension = useTypeScript ? "tsx" : "jsx";
  return {
    PROJECT_NAME: projectName,
    APP_NAME: appName,
    MAIN_EXT: mainExt,
    BUILD_COMMAND: useTypeScript
      ? `tsc --noEmit && vite build && vite build --ssr src/main.${mainExt}`
      : `vite build && vite build --ssr src/main.${mainExt}`,
    TYPE_CHECK: useTypeScript ? "tsc --noEmit" : "echo 'TypeScript not enabled'",
    CHECK_COMMAND: useTypeScript
      ? "oxlint src && oxfmt src && tsc --noEmit"
      : "oxlint src && oxfmt src",
    TS_DEPS: useTypeScript
      ? `,\n    "@types/react": "latest",\n    "@types/react-dom": "latest",\n    "@types/node": "latest",\n    "typescript": "latest"`
      : "",
    TAILWIND_DEPS:
      styling === "Tailwind"
        ? `,\n    "tailwindcss": "latest",\n    "@tailwindcss/vite": "latest"`
        : "",
    TAILWIND_IMPORT:
      styling === "Tailwind" ? `import tailwindcss from '@tailwindcss/vite';` : "",
    TAILWIND_PLUGIN: styling === "Tailwind" ? `\n      tailwindcss(),` : "",
    PM: pm,
    BUILD_DESC: useTypeScript ? "Type-check, build" : "Build",
    TAURI_RUN: pm === "npm" ? "npm run tauri --" : `${pm} run tauri`,
    TS_NOTE: useTypeScript ? ", type-checked with **TypeScript**" : "",
    REQUIRED_NODE,
    BINIJS_VERSION,
  };
}

async function generateProject(
  projectName: string,
  answers: ProjectAnswers,
  flags: CliFlags,
  userOS: UserOS
): Promise<void> {
  const projectPath = path.join(process.cwd(), projectName);
  const publicPath = path.join(projectPath, "public");

  if (fs.existsSync(projectPath) && !flags.force) {
    log.error(`Directory "${projectName}" already exists. Use --force to overwrite.`);
    exit(1);
  }
  if (flags.force && fs.existsSync(projectPath)) {
    log.warn(`Removing existing directory: ${c.dim(projectPath)}`);
    safeRm(projectPath);
  }

  log.info(`Creating project in ${c.cyan(projectPath)}`);

  const { typescript: useTypeScript, styling } = answers;
  const mainExt: FileExtension = useTypeScript ? "tsx" : "jsx";
  const scriptExt: ScriptExtension = useTypeScript ? "ts" : "js";
  const nativePlatforms = answers.platforms;
  const isTauri = nativePlatforms.length > 0;

  const pm = resolvePackageManager(flags.packageManager);
  log.info(`Package manager: ${c.cyan(pm)}${flags.packageManager ? ` (forced via --${pm})` : ""}`);

  log.info("Scaffolding project files from templates");

  const vars = buildTemplateVars({ projectName, appName: answers.appName, useTypeScript, styling, pm });

  await copyTemplateDir("base", projectPath, vars);

  const langDir = useTypeScript ? "typescript" : "javascript";
  await copyTemplateDir(langDir, projectPath, vars);

  const styleKey =
    styling === "Tailwind" ? "tailwind" :
    styling === "CSS Modules" ? "css-modules" : "none";

  await copyTemplate(
    `styling/${styleKey}/globals.css`,
    path.join(projectPath, "src/app/globals.css")
  );

  await copyTemplate(
    `styling/${styleKey}/page.${mainExt}`,
    path.join(projectPath, `src/app/page.${mainExt}`),
    vars
  );

  if (styling === "CSS Modules") {
    await copyTemplate(
      "styling/css-modules/page.module.css",
      path.join(projectPath, "src/app/page.module.css")
    );
  }

  const wrongExt = scriptExt === "ts" ? "js" : "ts";
  const wrongVite = path.join(projectPath, `vite.config.${wrongExt}`);
  if (fs.existsSync(wrongVite)) {
    fs.unlinkSync(wrongVite);
  }

  await copyAssetFiles(publicPath);

  const pkgPath = path.join(projectPath, "package.json");
  let pkg = JSON.parse(await fsPromises.readFile(pkgPath, "utf8")) as AnyJson;
  if (isTauri) mergeNativePatch(pkg, nativePackagePatch());
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  log.success(
    `Generated ${c.green(useTypeScript ? "TypeScript" : "JavaScript")} project with ${c.green(styling)} styling`
  );

  const installed = !flags.noInstall && installDependencies(projectPath, pm);
  const localCli = fs.existsSync(path.join(projectPath, "node_modules", "@tauri-apps", "cli"));

  if (isTauri) {
    await setupTauri({
      projectPath,
      platforms: nativePlatforms,
      userOS,
      pm,
      projectName,
      appName: answers.appName,
      org: answers.org,
      signFlag: flags.sign,
      localCli,
    });
  }

  if (!flags.noGit) initGit(projectPath);

  log.plain(
    `\n${c.green(c.bold("OK"))} ${c.bold("Project created!")}` +
      ` ${c.cyan(projectName)} at ${c.dim(projectPath)}\n`
  );

  log.success("Get started:");
  log.plain(`\n  ${c.green(`cd ${projectName}`)}`);
  if (!installed) log.plain(`  ${c.green(`${pm} install`)}`);

  printCommands(pm, [...(answers.web ? (["web"] as const) : []), ...nativePlatforms]);

  if (answers.iosSkipped) {
    log.warn("iOS requires macOS, so the project was created without it.");
    log.info(
      `Develop on web${nativePlatforms.includes("android") ? " or Android" : ""}, ` +
        `then run \`${pmRun(pm, "deploy")}\` and choose iOS to build the iOS app.`
    );
  }
  log.plain(`\n${c.green("Happy coding!")}`);
}

export async function main(): Promise<void> {
  checkNodeVersion();

  const { positionals, flags } = parseArguments();
  assumeYes = flags.yes;
  const userOS = detectUserOS();
  const first = positionals[0];
  const insideProject = !first && findProjectRoot(process.cwd()) !== null;

  if (!SUBCOMMANDS.has(first ?? "") && !insideProject) log.plain(LOGO);
  log.info(`Detected OS: ${userOS}`);

  if (first === "doctor" || first === "clean" || first === "upgrade") {
    if (positionals.length > 1) {
      log.error(`Unexpected extra argument(s): ${positionals.slice(1).join(" ")}`);
      exit(1);
    }
    exit(first === "doctor" ? await doctorProject(flags) : first === "clean" ? await cleanProject() : await upgradeProject(flags));
  }

  if (first === "sign") {
    const parsed = parseSignArgs(positionals.slice(1), flags.platforms, flags.generate);
    exit(await signProject(parsed, flags, userOS));
  }

  if (first === "remove" || first === "add") {
    const extra = parsePlatformList(positionals.slice(1).join(",") || undefined, "platform");
    const targets = [...new Set<TargetPlatform>([...extra, ...flags.platforms])];
    exit(first === "remove" ? await removePlatforms(targets, flags) : await addPlatforms(targets, flags, userOS, false));
  }

  if (insideProject && nameOrOrgRequested(flags) && flags.platforms.length === 0) {
    exit(await renameProject(flags));
  }

  if (insideProject) {
    exit(await addPlatforms(flags.platforms, flags, userOS, flags.platforms.length === 0));
  }

  let projectName = first;
  if (!projectName) {
    if (!isInteractive()) {
      log.error("Project name required when there are no prompts (pass it as the first argument).");
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

void main().catch((err) => fatal(err, "Fatal"));