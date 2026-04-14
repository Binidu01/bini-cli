import { select, input } from "@inquirer/prompts";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { isatty } from "tty";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CliFlags {
  force: boolean;
  typescript: boolean | undefined;
  javascript: boolean;
  tailwind: boolean;
  cssModules: boolean;
  noStyle: boolean;
  install: boolean | undefined;
}

interface ParsedArguments {
  projectName: string | undefined;
  flags: CliFlags;
}

type StylingOption = "Tailwind" | "CSS Modules" | "None";
type PackageManager = "bun" | "pnpm" | "yarn" | "npm";
type FileExtension = "tsx" | "jsx";
type ApiExtension = "ts" | "js";
type ConfigExtension = "ts" | "js";

interface ProjectAnswers {
  typescript: boolean;
  styling: StylingOption;
}

interface FileExtensions {
  main: FileExtension;
  config: ConfigExtension;
  api: ApiExtension;
}

interface PackageManagerEntry {
  name: PackageManager;
  command: string;
  priority: number;
}

interface PackageJsonScripts {
  dev: string;
  build: string;
  export: string;
  start: string;
  preview: string;
  "type-check": string;
  lint: string;
  format: string;
  check: string;
}

interface PackageJsonShape {
  name: string;
  type: "module";
  version: string;
  scripts: PackageJsonScripts;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

interface WebManifestIcon {
  src: string;
  sizes: string;
  type: string;
}

interface WebManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: WebManifestIcon[];
}

interface WriteFileOptions {
  force?: boolean;
  mode?: number;
  flag?: string;
}

interface ExecuteCommandOptions {
  stdio?: "pipe" | "inherit" | "ignore";
  timeout?: number;
  cwd?: string;
}

interface ExecuteCommandError extends Error {
  code?: number;
  stdout?: string;
  stderr?: string;
}

interface SafeRmOptions {
  allowedBase?: string;
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const CLI_PACKAGE_PATH = path.join(__dirname, "..", "package.json");
const cliPackageJson   = JSON.parse(fs.readFileSync(CLI_PACKAGE_PATH, "utf-8")) as { version: string };
const BINIJS_VERSION: string = cliPackageJson.version;

const ASSETS_DIR = path.join(__dirname, "..", "assets");

const colors = {
  reset:   "\x1b[0m",
  bold:    "\x1b[1m",
  dim:     "\x1b[2m",
  cyan:    "\x1b[36m",
  green:   "\x1b[32m",
  yellow:  "\x1b[33m",
  red:     "\x1b[31m",
  blue:    "\x1b[34m",
} as const;

const LOGO = `
${colors.cyan}${colors.bold}                XXXXXXXXXXXXXXXX               
             XXXXXXXXXXXXXXXXXXXXXz            
           YXXXXXXXXXXXXXXXXXXXXXXXX           
          vXXXXXXXXXXn    YXXXXXXXXXX          
          XXXXXXXXX        XXXXXXXXXX          
          XXXXXXXXX       XXXXXXXXXX           
          XXXXXXXXX  XXXXXXXXXXXXXX            
          XXXXXXXXX  XXXXXXXXXXXYz             
          XXXXXXXXX  XXXXXXXXXXXXXXXXY         
          XXXXXXXXX      YXXXXXXXXXXXXX        
          XXXXXXXXX          YXXXXXXXXX        
          XXXXXXXXX           XXXXXXXXXz       
          XXXXXXXXX  Xn     YXXXXXXXXXX        
          XXXXXXXXX  XXXXXXXXXXXXXXXXXX        
          XXXXXXXXX  XXXXXXXXXXXXXXXX          
          XXXXXXXXX  XXXXXXXXXXXXX              
${colors.reset}
${colors.dim}             Developed By Binidu${colors.reset}
`;

const REQUIRED_NODE          = "v20.19.0";
const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const INVALID_NAME_PATTERN   = /^(\.|\.\.|npm|node)|[<>:"|?*\\]|[^a-z0-9\-.]/i;

// ─── Logger ───────────────────────────────────────────────────────────────────

const log = {
  info:    (msg: string) => console.log(`${colors.cyan}${colors.bold}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}${colors.bold}✓${colors.reset} ${msg}`),
  warn:    (msg: string) => console.log(`${colors.yellow}${colors.bold}⚠${colors.reset} ${msg}`),
  error:   (msg: string) => console.error(`${colors.red}${colors.bold}✖${colors.reset} ${msg}`),
  step:    (msg: string) => console.log(`${colors.blue}${colors.bold}▶${colors.reset} ${msg}`),
  plain:   (msg: string) => console.log(msg),
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function isInteractive(): boolean {
  return isatty(process.stdin.fd) && isatty(process.stdout.fd);
}

function exit(code = 1): never {
  process.exit(code);
}

async function confirm(options: { message: string; default?: boolean }): Promise<boolean> {
  return select<boolean>({
    message: options.message,
    choices: [
      { name: "Yes", value: true  },
      { name: "No",  value: false },
    ],
    default: options.default !== false,
  });
}

// ─── Signal handling ──────────────────────────────────────────────────────────

process.on("SIGINT", () => {
  log.plain("\n");
  log.warn("Cancelled.");
  exit(0);
});

process.on("uncaughtException", (e: Error) => {
  log.error(`Uncaught exception: ${e.message}`);
  exit(1);
});

process.on("unhandledRejection", (r: unknown) => {
  log.error(`Unhandled rejection: ${r instanceof Error ? r.message : String(r)}`);
  exit(1);
});

// ─── System checks ────────────────────────────────────────────────────────────

function checkNodeVersion(): void {
  const [major = 0, minor = 0] = process.version.slice(1).split(".").map(Number);
  const [reqMajor = 0, reqMinor = 0] = REQUIRED_NODE.slice(1).split(".").map(Number);

  if (major < reqMajor || (major === reqMajor && minor < reqMinor)) {
    log.error(`Node.js ${REQUIRED_NODE}+ required. Current: ${process.version}`);
    log.info("Update at https://nodejs.org");
    exit(1);
  }
}

function checkDiskSpace(requiredMB = 100): void {
  try {
    if (!fs.statfsSync) return;
    const stats     = fs.statfsSync(process.cwd());
    const freeMB    = (stats.bavail * stats.bsize) / (1024 * 1024);
    if (freeMB < requiredMB) {
      log.error(`Insufficient disk space. Need ${requiredMB}MB, have ${Math.floor(freeMB)}MB.`);
      exit(1);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      log.warn(`Could not check disk space: ${(err as Error).message}`);
    }
  }
}

// ─── Argument parsing ─────────────────────────────────────────────────────────

function parseArguments(): ParsedArguments {
  const args = process.argv.slice(2);

  if (args.includes("--version") || args.includes("-v")) {
    log.plain(`${colors.cyan}Bini.js CLI${colors.reset} v${BINIJS_VERSION}`);
    exit(0);
  }

  if (args.includes("--help") || args.includes("-h")) {
    log.plain(`
${colors.bold}${colors.cyan}Usage:${colors.reset} create-bini-app [project-name] [options]

${colors.bold}${colors.cyan}Options:${colors.reset}
  --version, -v       Show version number
  --help, -h          Show help
  --typescript        Use TypeScript (default: prompt, or true if non-interactive)
  --javascript        Use JavaScript
  --tailwind          Use Tailwind CSS
  --css-modules       Use CSS Modules
  --none              No styling
  --force             Overwrite existing directory
  --install           Auto-install dependencies
  --no-install        Skip dependency installation

${colors.bold}${colors.cyan}Examples:${colors.reset}
  ${colors.dim}create-bini-app my-app${colors.reset}
  ${colors.dim}create-bini-app my-app --typescript --tailwind${colors.reset}
  ${colors.dim}create-bini-app my-app --javascript --none --force${colors.reset}
  ${colors.dim}create-bini-app my-app --typescript --tailwind --install --force${colors.reset}
    `);
    exit(0);
  }

  const hasTypeScript  = args.includes("--typescript");
  const hasJavaScript  = args.includes("--javascript") || args.includes("--no-typescript");
  const hasTailwind    = args.includes("--tailwind");
  const hasCSSModules  = args.includes("--css-modules");
  const hasNoStyle     = args.includes("--none");
  const hasInstall     = args.includes("--install");
  const hasNoInstall   = args.includes("--no-install");

  // Conflict checks
  if (hasTypeScript && hasJavaScript) {
    log.error("Cannot use --typescript and --javascript together.");
    exit(1);
  }
  const styleFlags = [hasTailwind, hasCSSModules, hasNoStyle].filter(Boolean).length;
  if (styleFlags > 1) {
    log.error("Cannot use more than one of --tailwind, --css-modules, --none.");
    exit(1);
  }
  if (hasInstall && hasNoInstall) {
    log.error("Cannot use --install and --no-install together.");
    exit(1);
  }

  return {
    projectName: args.find((a) => !a.startsWith("--")),
    flags: {
      force:      args.includes("--force"),
      typescript: hasTypeScript ? true : hasJavaScript ? false : undefined,
      javascript: hasJavaScript,
      tailwind:   hasTailwind,
      cssModules: hasCSSModules,
      noStyle:    hasNoStyle,
      install:    hasInstall ? true : hasNoInstall ? false : undefined,
    },
  };
}

function validateProjectName(name: string): boolean {
  if (!name || name.length > 50)         return false;
  if (WINDOWS_RESERVED_NAMES.test(name)) return false;
  return !INVALID_NAME_PATTERN.test(name);
}

// ─── File system helpers ──────────────────────────────────────────────────────

function robustMkdirSync(dirPath: string): void {
  try {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o750 });
  } catch (err) {
    throw new Error(`Cannot create directory: ${dirPath}. ${(err as Error).message}`);
  }
}

async function writeFile(
  filePath: string,
  content: string | Buffer,
  options: WriteFileOptions = {}
): Promise<void> {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true, mode: 0o750 });
  await fsPromises.writeFile(filePath, content, {
    mode: options.mode ?? 0o640,
    flag: options.flag ?? "w",
  });
}

function safeRm(targetPath: string, options: SafeRmOptions = {}): void {
  const allowedBase = options.allowedBase ?? process.cwd();
  if (!targetPath) throw new Error("Path required.");

  const resolved = path.resolve(targetPath);
  const base     = path.resolve(allowedBase);
  const relative = path.relative(base, resolved);

  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to delete: "${resolved}" is outside the allowed base "${base}".`);
  }

  const systemPaths = [
    path.resolve("/"),
    process.env.HOME     ? path.resolve(process.env.HOME)     : null,
    process.env.USERPROFILE ? path.resolve(process.env.USERPROFILE) : null,
  ].filter((p): p is string => p !== null);

  if (systemPaths.includes(resolved)) {
    throw new Error("Refusing to delete a system directory.");
  }

  const depth = resolved.split(path.sep).filter(Boolean).length;
  if (depth < 2) {
    throw new Error("Refusing to delete a root-level directory (safety check).");
  }

  if (!fs.existsSync(resolved)) return;

  fs.rmSync(resolved, { recursive: true, force: true });
}

// ─── Command execution ────────────────────────────────────────────────────────

function executeCommand(command: string, options: ExecuteCommandOptions = {}): string {
  try {
    const result = execSync(command, {
      shell:       process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      stdio:       options.stdio ?? "pipe",
      timeout:     options.timeout ?? 120_000,
      cwd:         options.cwd,
      windowsHide: true,
      encoding:    "utf8",
    });
    return String(result);
  } catch (error) {
    throw new Error(
      `Command failed: ${command}\n${(error as ExecuteCommandError).message ?? String(error)}`
    );
  }
}

// ─── Package manager ──────────────────────────────────────────────────────────

function detectPackageManager(): PackageManager {
  const candidates: PackageManagerEntry[] = [
    { name: "bun",  command: "bun --version",  priority: 4 },
    { name: "pnpm", command: "pnpm --version", priority: 3 },
    { name: "yarn", command: "yarn --version", priority: 2 },
    { name: "npm",  command: "npm --version",  priority: 1 },
  ];

  const available = candidates.filter((pm) => {
    try { executeCommand(pm.command, { stdio: "ignore" }); return true; }
    catch { return false; }
  });

  if (available.length === 0) {
    throw new Error("No package manager found. Install npm, yarn, pnpm, or bun.");
  }

  return available.sort((a, b) => b.priority - a.priority)[0].name;
}

async function installDependencies(
  projectPath: string,
  pm: PackageManager,
  shouldInstall: boolean
): Promise<boolean> {
  if (!shouldInstall) return false;

  const commands: Record<PackageManager, string> = {
    npm:  "npm install --no-audit --no-fund --loglevel=error",
    yarn: "yarn install --silent --no-progress",
    pnpm: "pnpm install --reporter=silent",
    bun:  "bun install --silent",
  };

  log.step(`Installing dependencies with ${pm}...`);
  try {
    executeCommand(commands[pm], { cwd: projectPath, stdio: "inherit", timeout: 300_000 });
    log.success("Dependencies installed.");
    return true;
  } catch {
    log.warn("Auto-install failed. Run manually:");
    log.plain(`    ${colors.green}cd ${path.basename(projectPath)}${colors.reset}`);
    log.plain(`    ${colors.green}${pm} install${colors.reset}`);
    return false;
  }
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

function resolveTypeScript(flags: CliFlags, answers: ProjectAnswers): boolean {
  if (flags.typescript === true)  return true;
  if (flags.javascript === true)  return false;
  return answers.typescript;
}

function getExtensions(useTypeScript: boolean): FileExtensions {
  const x = useTypeScript ? ("ts" as const) : ("js" as const);
  return {
    main:   useTypeScript ? "tsx" : "jsx",
    config: x,
    api:    x,
  };
}

async function askQuestions(flags: CliFlags): Promise<ProjectAnswers> {
  // TypeScript
  let typescript: boolean;
  if (flags.typescript !== undefined) {
    typescript = flags.typescript;
  } else if (isInteractive()) {
    typescript = await confirm({ message: "Use TypeScript?", default: true });
  } else {
    typescript = true;
  }

  // Styling
  let styling: StylingOption;
  if (flags.tailwind)   { styling = "Tailwind";    }
  else if (flags.cssModules) { styling = "CSS Modules"; }
  else if (flags.noStyle)    { styling = "None";        }
  else if (isInteractive()) {
    styling = await select<StylingOption>({
      message: "Styling solution?",
      choices: [
        { name: "Tailwind CSS", value: "Tailwind"    },
        { name: "CSS Modules",  value: "CSS Modules" },
        { name: "None",         value: "None"        },
      ],
      default: "Tailwind",
    });
  } else {
    styling = "Tailwind";
  }

  return { typescript, styling };
}

// ─── Asset copying ────────────────────────────────────────────────────────────

async function copyFaviconFiles(publicPath: string): Promise<void> {
  const files = ["favicon.ico", "apple-touch-icon.png", "og-image.png"] as const;
  await Promise.all(
    files.map(async (file) => {
      const src  = path.join(ASSETS_DIR, file);
      const dest = path.join(publicPath, file);
      try {
        await fsPromises.access(src);
        await fsPromises.copyFile(src, dest);
      } catch {
        log.warn(`Asset not found, skipping: ${file}`);
      }
    })
  );
}

async function generateWebManifest(projectPath: string): Promise<void> {
  const manifest: WebManifest = {
    name:             "Bini.js App",
    short_name:       "BiniApp",
    description:      "Modern React application built with Bini.js",
    start_url:        "/",
    display:          "standalone",
    background_color: "#ffffff",
    theme_color:      "#00CFFF",
    icons: [
      { src: "/favicon.ico",         sizes: "64x64 32x32 24x24 16x16", type: "image/x-icon" },
      { src: "/apple-touch-icon.png", sizes: "180x180",                 type: "image/png"    },
    ],
  };
  await writeFile(
    path.join(projectPath, "public", "site.webmanifest"),
    JSON.stringify(manifest, null, 2)
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

function getCSSReset(): string {
  return `* { box-sizing: border-box; }
html { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
body { line-height: 1.5; min-height: 100vh; margin: 0; }
#root { min-height: 100vh; }
`;
}

function getCSSPageStyles(): string {
  return `.root { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }
.hero { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 5rem 2rem; gap: 1.5rem; }
.hero-logo { width: 5rem; height: 5rem; }
.title { font-size: 3.75rem; font-weight: 700; letter-spacing: -0.04em; color: #000; margin: 0; line-height: 1.1; }
.gradient { background: linear-gradient(to right, #00CFFF, #0077FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.subtitle { font-size: 1.125rem; color: #737373; margin: 0; max-width: 28rem; line-height: 1.6; }
.hint { font-size: 0.875rem; color: #a3a3a3; margin: 0; }
.code { font-family: monospace; font-size: 0.75rem; background: #f5f5f5; color: #404040; padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid #e5e5e5; }
.links-section { padding: 0 2rem 4rem; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; max-width: 48rem; margin: 0 auto; }
@media (max-width: 768px) { .grid { grid-template-columns: repeat(2, 1fr); } }
.card { display: flex; flex-direction: column; gap: 0.5rem; padding: 1.25rem; border-radius: 10px; border: 1px solid #e5e5e5; text-decoration: none; transition: border-color 0.15s, background 0.15s; }
.card:hover { border-color: #d4d4d4; background: #fafafa; }
.card-label { font-size: 0.875rem; font-weight: 600; color: #000; }
.card-desc { font-size: 0.75rem; color: #737373; line-height: 1.5; }
.footer { text-align: center; font-size: 0.75rem; color: #a3a3a3; padding: 1.25rem; border-top: 1px solid #f5f5f5; }
.footer-link { color: #737373; text-decoration: underline; }
.footer-link:hover { color: #404040; }

@media (prefers-color-scheme: dark) {
  .root { background: #000; }
  .title { color: #fff; }
  .subtitle { color: #737373; }
  .hint { color: #525252; }
  .code { background: #111; color: #d4d4d4; border-color: #222; }
  .card { border-color: #1a1a1a; }
  .card:hover { border-color: #333; background: #0a0a0a; }
  .card-label { color: #fff; }
  .card-desc { color: #737373; }
  .footer { border-top-color: #111; color: #525252; }
  .footer-link { color: #737373; }
  .footer-link:hover { color: #a3a3a3; }
}
`;
}

function getCSSModuleStyles(): string {
  return `.root { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }
.hero { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 5rem 2rem; gap: 1.5rem; }
.heroLogo { width: 5rem; height: 5rem; }
.title { font-size: 3.75rem; font-weight: 700; letter-spacing: -0.04em; color: #000; margin: 0; line-height: 1.1; }
.gradient { background: linear-gradient(to right, #00CFFF, #0077FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.subtitle { font-size: 1.125rem; color: #737373; margin: 0; max-width: 28rem; line-height: 1.6; }
.hint { font-size: 0.875rem; color: #a3a3a3; margin: 0; }
.code { font-family: monospace; font-size: 0.75rem; background: #f5f5f5; color: #404040; padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid #e5e5e5; }
.linksSection { padding: 0 2rem 4rem; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; max-width: 48rem; margin: 0 auto; }
@media (max-width: 768px) { .grid { grid-template-columns: repeat(2, 1fr); } }
.card { display: flex; flex-direction: column; gap: 0.5rem; padding: 1.25rem; border-radius: 10px; border: 1px solid #e5e5e5; text-decoration: none; transition: border-color 0.15s, background 0.15s; }
.card:hover { border-color: #d4d4d4; background: #fafafa; }
.cardLabel { font-size: 0.875rem; font-weight: 600; color: #000; }
.cardDesc { font-size: 0.75rem; color: #737373; line-height: 1.5; }
.footer { text-align: center; font-size: 0.75rem; color: #a3a3a3; padding: 1.25rem; border-top: 1px solid #f5f5f5; }
.footerLink { color: #737373; text-decoration: underline; }
.footerLink:hover { color: #404040; }

@media (prefers-color-scheme: dark) {
  .root { background: #000; }
  .title { color: #fff; }
  .subtitle { color: #737373; }
  .hint { color: #525252; }
  .code { background: #111; color: #d4d4d4; border-color: #222; }
  .card { border-color: #1a1a1a; }
  .card:hover { border-color: #333; background: #0a0a0a; }
  .cardLabel { color: #fff; }
  .cardDesc { color: #737373; }
  .footer { border-top-color: #111; color: #525252; }
  .footerLink { color: #737373; }
  .footerLink:hover { color: #a3a3a3; }
}
`;
}

function generateGlobalStyles(styling: StylingOption): string {
  const reset = getCSSReset();
  if (styling === "Tailwind")    return `@import "tailwindcss";\n\n${reset}`;
  if (styling === "CSS Modules") return reset;
  return reset + "\n" + getCSSPageStyles(); // None — plain CSS with page styles baked in
}

// ─── package.json ─────────────────────────────────────────────────────────────

function generatePackageJson(
  projectName: string,
  useTypeScript: boolean,
  styling: StylingOption
): PackageJsonShape {
  const dependencies: Record<string, string> = {
    react:              "latest",
    "react-dom":        "latest",
    "react-router-dom": "latest",
    hono:               "latest",
    "bini-router":      "latest",
    "bini-overlay":     "latest",
    "bini-server":      "latest",
  };

  const devDependencies: Record<string, string> = {
    "@vitejs/plugin-react": "latest",
    vite:          "latest",
    oxlint:        "latest",
    oxfmt:         "latest",
    "bini-env":    "latest",
    "bini-export": "latest",
  };

  if (useTypeScript) {
    Object.assign(devDependencies, {
      "@types/react":     "latest",
      "@types/react-dom": "latest",
      "@types/node":      "latest",
      typescript:         "latest",
    });
  }

  if (styling === "Tailwind") {
    Object.assign(devDependencies, {
      tailwindcss:          "latest",
      "@tailwindcss/vite":  "latest",
    });
  }

  const scripts: PackageJsonScripts = {
    dev:          "vite --host --open",
    build:        useTypeScript ? "tsc --noEmit && vite build" : "vite build",
    export:       "vite build --mode export",
    start:        "bini-server",
    preview:      "vite preview --host --open",
    "type-check": useTypeScript ? "tsc --noEmit" : "echo 'TypeScript not enabled'",
    lint:         "oxlint src",
    format:       "oxfmt src",
    check:        useTypeScript
      ? "oxlint src && oxfmt src && tsc --noEmit"
      : "oxlint src && oxfmt src",
  };

  return { name: projectName, type: "module", version: "1.0.0", scripts, dependencies, devDependencies };
}

// ─── vite.config ──────────────────────────────────────────────────────────────

const ROLLDOWN_ASSET_NAMES = `(assetInfo) => {
            const name = assetInfo.names?.[0] ?? assetInfo.name ?? '';
            const ext  = name.split('.').pop() ?? '';
            if (/png|jpe?g|gif|svg|webp|avif/.test(ext)) return 'assets/images/[name]-[hash][extname]';
            if (/woff2?|eot|ttf|otf/.test(ext))          return 'assets/fonts/[name]-[hash][extname]';
            if (ext === 'css')  return 'css/[name]-[hash][extname]';
            if (ext === 'json') return 'data/[name]-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          }`;

async function generateViteConfig(
  projectPath: string,
  useTypeScript: boolean,
  configExt: ConfigExtension,
  styling: StylingOption
): Promise<void> {
  const tailwindImport = styling === "Tailwind" ? `import tailwindcss from '@tailwindcss/vite';\n` : "";
  const tailwindPlugin = styling === "Tailwind" ? `tailwindcss(),\n      `                          : "";
  const typesSection   = useTypeScript ? `,\n    types: ["vite/client"]`                            : "";

  const content = `import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { biniroute } from 'bini-router';
import { biniOverlay } from 'bini-overlay';
import { biniEnv } from 'bini-env';
import { biniExport } from 'bini-export';
${tailwindImport}
export default defineConfig(({ command, mode }) => {
  const env      = loadEnv(mode, process.cwd(), '');
  const isBuild  = command === 'build';
  const port     = parseInt(env['PORT'] ?? '3000', 10);
  const hmrConfig = env['CODESPACE_NAME']
    ? { clientPort: 443, overlay: false }
    : { overlay: false, host: 'localhost' };

  return {
    plugins: [
      ${tailwindPlugin}react(),
      biniroute({ platform: 'node' }),
      biniOverlay(),
      biniEnv(),
      biniExport(),
    ],

    server: {
      port,
      host   : env['CODESPACE_NAME'] ? '0.0.0.0' : 'localhost',
      open   : true,
      cors   : true,
      headers: { 'Access-Control-Allow-Origin': '*' },
      hmr    : hmrConfig,
      watch  : {
        usePolling: !!env['CODESPACE_NAME'],
        ignored   : ['**/dist/**', '**/node_modules/**'],
      },
    },

    preview: { port, host: '0.0.0.0', open: true, cors: true },

    build: {
      outDir               : 'dist',
      sourcemap            : !isBuild,
      emptyOutDir          : true,
      minify               : isBuild,
      cssCodeSplit         : true,
      reportCompressedSize : true,
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        output: {
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: ${ROLLDOWN_ASSET_NAMES},
        },
      },
    },

    resolve    : { alias: { '@': '/src' } },
    css        : { modules: { localsConvention: 'camelCase' }, devSourcemap: true },
    optimizeDeps: { include: ['react', 'react-dom', 'react-router-dom'] }${typesSection}
  };
});
`;

  await writeFile(path.join(projectPath, `vite.config.${configExt}`), content);
}

// ─── tsconfig.json ────────────────────────────────────────────────────────────

async function generateTsConfig(projectPath: string): Promise<void> {
  await writeFile(
    path.join(projectPath, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target:                          "ES2022",
        lib:                             ["ES2022", "DOM", "DOM.Iterable"],
        module:                          "ESNext",
        skipLibCheck:                    true,
        moduleResolution:                "bundler",
        allowImportingTsExtensions:      true,
        allowArbitraryExtensions:        true,
        resolveJsonModule:               true,
        isolatedModules:                 true,
        noEmit:                          true,
        jsx:                             "react-jsx",
        strict:                          true,
        paths:                           { "@/*": ["./src/*"] },
        forceConsistentCasingInFileNames: true,
        types:                           ["vite/client"],
      },
      include: ["src"],
      exclude: ["node_modules", "dist"],
    }, null, 2)
  );
}

// ─── Lint + format configs ────────────────────────────────────────────────────

async function generateLintAndFormatConfigs(projectPath: string): Promise<void> {
  await writeFile(
    path.join(projectPath, ".oxlintrc.json"),
    JSON.stringify({
      $schema:        "./node_modules/oxlint/configuration_schema.json",
      plugins:        ["react"],
      env:            { browser: true, es2022: true },
      ignorePatterns: ["dist", "node_modules"],
    }, null, 2)
  );

  await writeFile(
    path.join(projectPath, ".oxfmtrc.json"),
    JSON.stringify({
      semi:                    false,
      singleQuote:             true,
      tabWidth:                2,
      printWidth:              100,
      trailingComma:           "es5",
      sortImports:             true,
      sortTailwindcssClasses:  true,
    }, null, 2)
  );
}

function generateGitignore(apiExt: ApiExtension): string {
  return `node_modules/
dist/
.env
.env.local
.env.*.local
.DS_Store
Thumbs.db
*.log

# bini-router generated production entry — do not edit directly
netlify/edge-functions/api.${apiExt}
`;
}

// ─── App files ────────────────────────────────────────────────────────────────

const PAGE_LINKS = `[
  { label: 'Docs',     desc: 'Read the documentation',   href: 'https://bini.js.org'                           },
  { label: 'Examples', desc: 'Browse starter templates', href: 'https://github.com/Binidu01/bini-examples'     },
  { label: 'npm',      desc: 'View on npm registry',     href: 'https://www.npmjs.com/package/create-bini-app' },
  { label: 'GitHub',   desc: 'Star us on GitHub',        href: 'https://github.com/Binidu01'                   },
]`;

const LOGO_SVG_INNER = `<defs>
            <linearGradient id="hero-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00CFFF" />
              <stop offset="100%" stopColor="#0077FF" />
            </linearGradient>
          </defs>
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
            fontFamily="Segoe UI, Arial, sans-serif" fontSize="90" fontWeight="700" fill="url(#hero-g)">ß</text>`;

const LOGO_SVG: Record<StylingOption, string> = {
  Tailwind:     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className="w-20 h-20">${LOGO_SVG_INNER}</svg>`,
  "CSS Modules":`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className={styles.heroLogo}>${LOGO_SVG_INNER}</svg>`,
  None:         `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className="hero-logo">${LOGO_SVG_INNER}</svg>`,
};

function buildPageContent(fileExt: string, styling: StylingOption): string {
  const logo = LOGO_SVG[styling];

  if (styling === "Tailwind") {
    return `import React from 'react';

const links = ${PAGE_LINKS};

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center text-center px-8 py-20 gap-6">
        ${logo}
        <h1 className="text-6xl font-bold tracking-tight text-black dark:text-white">
          Welcome to{' '}
          <span className="bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Bini.js
          </span>
        </h1>
        <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-md">
          The React framework for the modern web. Fast, lightweight, and easy to use.
        </p>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          Get started by editing{' '}
          <code className="font-mono text-xs bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
            src/app/page.${fileExt}
          </code>
        </p>
      </main>
      <section className="px-8 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
              className="flex flex-col gap-2 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors">
              <span className="text-sm font-semibold text-black dark:text-white">{l.label} ↗</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{l.desc}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
`;
  }

  if (styling === "CSS Modules") {
    return `import React from 'react';
import styles from './page.module.css';

const links = ${PAGE_LINKS};

export default function Home() {
  return (
    <div className={styles.root}>
      <main className={styles.hero}>
        ${logo}
        <h1 className={styles.title}>
          Welcome to <span className={styles.gradient}>Bini.js</span>
        </h1>
        <p className={styles.subtitle}>
          The React framework for the modern web. Fast, lightweight, and easy to use.
        </p>
        <p className={styles.hint}>
          Get started by editing <code className={styles.code}>src/app/page.${fileExt}</code>
        </p>
      </main>
      <section className={styles.linksSection}>
        <div className={styles.grid}>
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={styles.card}>
              <span className={styles.cardLabel}>{l.label} ↗</span>
              <span className={styles.cardDesc}>{l.desc}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
`;
  }

  // None
  return `import React from 'react';

const links = ${PAGE_LINKS};

export default function Home() {
  return (
    <div className="root">
      <main className="hero">
        ${logo}
        <h1 className="title">
          Welcome to <span className="gradient">Bini.js</span>
        </h1>
        <p className="subtitle">
          The React framework for the modern web. Fast, lightweight, and easy to use.
        </p>
        <p className="hint">
          Get started by editing <code className="code">src/app/page.${fileExt}</code>
        </p>
      </main>
      <section className="links-section">
        <div className="grid">
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="card">
              <span className="card-label">{l.label} ↗</span>
              <span className="card-desc">{l.desc}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
`;
}

async function generateAppFiles(
  projectPath: string,
  mainExt: FileExtension,
  useTypeScript: boolean,
  styling: StylingOption
): Promise<void> {
  const appPath      = path.join(projectPath, "src/app");
  const childrenProp = useTypeScript
    ? `{ children }: { children: React.ReactNode }`
    : `{ children }`;

  await Promise.all([
    writeFile(
      path.join(projectPath, "src", `main.${mainExt}`),
      `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Root container not found');
createRoot(container).render(<App />);
`
    ),
    writeFile(
      path.join(appPath, `layout.${mainExt}`),
      `import React from 'react';
import './globals.css';

// metadata is read by bini-router at build time and injected into index.html.
// It is automatically stripped from the browser bundle — never ships to the client.
export const metadata = {
  title      : 'Bini.js App',
  description: 'Modern React application built with Bini.js',
  keywords   : ['Bini.js', 'React', 'Vite'],
  themeColor : '#00CFFF',
  manifest   : '/site.webmanifest',
  openGraph: {
    title      : 'Bini.js App',
    description: 'Modern React application built with Bini.js',
    images     : [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card   : 'summary_large_image',
    title  : 'Bini.js App',
    creator: '@binidu01',
    images : ['/og-image.png'],
  },
  icons: {
    icon : [{ url: '/favicon.ico', type: 'image/x-icon' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

// Root layout — wraps every page.
export default function RootLayout(${childrenProp}) {
  return <React.Fragment>{children}</React.Fragment>;
}
`
    ),
    writeFile(
      path.join(appPath, `page.${mainExt}`),
      buildPageContent(mainExt, styling)
    ),
  ]);
}

async function generateApiFile(projectPath: string, apiExt: ApiExtension): Promise<void> {
  await writeFile(
    path.join(projectPath, `src/app/api/hello.${apiExt}`),
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
}

// ─── README ───────────────────────────────────────────────────────────────────

function generateReadme(
  projectName: string,
  useTypeScript: boolean,
  ext: FileExtensions,
  pm: PackageManager
): string {
  return `# ${projectName}

A Bini.js app — zero-config React framework.

## Quick Start

\`\`\`bash
${pm} install
${pm} run dev
\`\`\`

## Production

\`\`\`bash
${pm} run build    # type-checks then builds
${pm} start        # served by bini-server
\`\`\`

## Static Export (GitHub Pages / S3 / Firebase / Surge)

\`\`\`bash
${pm} run export   # vite build --mode export
\`\`\`

Pre-renders every static route into \`dist/\`, generates the right \`404.html\`, and strips all platform server files — leaving \`dist/\` ready for any fully static host. No server required.

> **Note:** Static export has no API routes. Use a full deployment platform if you need \`src/app/api/\`.

### Static hosts

| Host | Static routes | Dynamic routes |
|---|---|---|
| GitHub Pages | ✅ | ✅ via \`404.html\` |
| AWS S3 + CloudFront | ✅ | ✅ set error page to \`404.html\` |
| Firebase Hosting | ✅ | ✅ via \`404.html\` |
| Surge.sh | ✅ | ✅ via \`404.html\` |

### \`base\` in \`vite.config.${ext.config}\`

| Situation | \`base\` |
|---|---|
| GitHub Pages without a custom domain | \`'/your-repo-name/'\` |
| GitHub Pages with a custom domain | not needed — remove it |
| S3, Firebase, Surge, or any other static host | not needed — remove it |

## Linting, Formatting & Type Checking

\`\`\`bash
${pm} run lint         # Oxlint — 50-100x faster than ESLint
${pm} run format       # Oxfmt  — Prettier-compatible formatter
${pm} run type-check   # tsc --noEmit${!useTypeScript ? ' (TypeScript not enabled)' : ''}
${pm} run check        # lint + format + type-check combined (great for CI)
\`\`\`

## API Routes

Create files in \`src/app/api/\`. Export a Hono app — write routes **without** the \`/api\` prefix:

\`\`\`${useTypeScript ? "typescript" : "javascript"}
// src/app/api/hello.${ext.api}
import { Hono } from 'hono'

const app = new Hono()

app.get('/hello', (c) => c.json({ message: 'Hello!' }))

export default app
\`\`\`

Access at \`http://localhost:3000/api/hello\`

## Deployment

| Platform | Config | API runtime | Notes |
|---|---|---|---|
| **Netlify** | \`platform: 'netlify'\` | Edge Functions (Deno) | No Node.js built-ins |
| **Vercel** | \`platform: 'vercel'\` | Edge Functions | Commit generated \`api/index.${ext.api}\` |
| **Cloudflare Workers** | \`platform: 'cloudflare'\` | Workers | Requires \`wrangler.toml\` |
| **Node.js** | \`platform: 'node'\` | Node.js | Railway, Render, Fly.io, VPS |
| **Deno** | \`platform: 'deno'\` | Deno.serve | Commit generated \`server/index.${ext.api}\` |

## File Structure

\`\`\`
${projectName}/
├── src/
│   ├── app/
│   │   ├── api/              ← API routes (Hono)
│   │   ├── layout.${ext.main}       ← root layout + metadata
│   │   ├── page.${ext.main}         ← /
│   │   └── globals.css
│   ├── App.${ext.main}               ← auto-generated by bini-router — do not edit
│   └── main.${ext.main}              ← mounts <App />
├── public/
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── og-image.png
│   └── site.webmanifest
├── .oxlintrc.json
├── .oxfmtrc.json
├── vite.config.${ext.config}
└── package.json
\`\`\`

## Powered by

- **Vite** — Rolldown-powered builds
- **bini-router** — filesystem routing + API middleware
- **bini-export** — static SPA export
- **bini-overlay** — dev overlay badge
- **bini-env** — environment file loading
- **bini-server** — production server (zero dependencies)
- **Oxlint** — fast Rust-based linter
- **Oxfmt** — fast Prettier-compatible formatter${useTypeScript ? "\n- **TypeScript** — full type safety" : ""}

---

**Built with Bini.js v${BINIJS_VERSION}** | [Documentation](https://bini.js.org)
`;
}

// ─── Project generator ────────────────────────────────────────────────────────

async function generateProject(
  projectName: string,
  answers: ProjectAnswers,
  flags: CliFlags
): Promise<void> {
  const projectPath = path.join(process.cwd(), projectName);
  const publicPath  = path.join(projectPath, "public");

  // Abort immediately if exists and no --force — touch nothing
  if (fs.existsSync(projectPath) && !flags.force) {
    log.error(`Directory "${projectName}" already exists. Use --force to overwrite.`);
    exit(1);
  }

  // --force: hard-delete existing directory before scaffolding
  if (flags.force && fs.existsSync(projectPath)) {
    log.warn(`Removing existing directory: ${colors.dim}${projectPath}${colors.reset}`);
    safeRm(projectPath);
  }

  log.info(`Creating project in ${colors.cyan}${projectPath}${colors.reset}`);
  checkDiskSpace(100);

  const useTypeScript = resolveTypeScript(flags, answers);
  const ext           = getExtensions(useTypeScript);

  robustMkdirSync(path.join(projectPath, "src/app/api"));
  robustMkdirSync(publicPath);

  log.info("Scaffolding project files...");

  await Promise.all([
    copyFaviconFiles(publicPath),
    generateWebManifest(projectPath),
    writeFile(
      path.join(projectPath, "index.html"),
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- bini-router injects title, meta, icons, and OG tags here at build time -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${ext.main}"></script>
  </body>
</html>
`
    ),
    generateAppFiles(projectPath, ext.main, useTypeScript, answers.styling),
    answers.styling === "CSS Modules"
      ? writeFile(path.join(projectPath, "src/app/page.module.css"), getCSSModuleStyles())
      : Promise.resolve(),
    writeFile(
      path.join(projectPath, "src/app/globals.css"),
      generateGlobalStyles(answers.styling)
    ),
    generateApiFile(projectPath, ext.api),
    writeFile(path.join(projectPath, ".gitignore"), generateGitignore(ext.api)),
    writeFile(
      path.join(projectPath, "package.json"),
      JSON.stringify(generatePackageJson(projectName, useTypeScript, answers.styling), null, 2)
    ),
    generateViteConfig(projectPath, useTypeScript, ext.config, answers.styling),
    useTypeScript ? generateTsConfig(projectPath) : Promise.resolve(),
    generateLintAndFormatConfigs(projectPath),
  ]);

  log.success(
    `Generated ${colors.green}${useTypeScript ? "TypeScript" : "JavaScript"}${colors.reset}` +
    ` project with ${colors.green}${answers.styling}${colors.reset} styling.`
  );

  // Install decision
  let shouldInstall = false;
  if (flags.install === true)       { shouldInstall = true;  }
  else if (flags.install === false) { shouldInstall = false; }
  else if (isInteractive()) {
    shouldInstall = await confirm({
      message: "Install dependencies now?",
      default: true,
    });
  }

  let installedDependencies  = false;
  let detectedPm: PackageManager = "npm";
  let pmFailed               = false;

  try {
    detectedPm = detectPackageManager();
    log.info(`Package manager: ${colors.cyan}${detectedPm}${colors.reset}`);
    installedDependencies = await installDependencies(projectPath, detectedPm, shouldInstall);
  } catch (err) {
    pmFailed = true;
    log.warn(`Could not detect package manager: ${(err as Error).message}`);
    log.warn(`README will use "npm" as fallback.`);
  }

  await writeFile(
    path.join(projectPath, "README.md"),
    generateReadme(projectName, useTypeScript, ext, detectedPm)
  );

  log.plain(
    `\n${colors.green}${colors.bold}✓${colors.reset} ${colors.bold}Done!${colors.reset}` +
    ` Created ${colors.cyan}${projectName}${colors.reset}` +
    ` at ${colors.dim}${projectPath}${colors.reset}\n`
  );

  if (pmFailed) log.warn(`README uses "npm" as placeholder — update manually if needed.\n`);

  log.success("Get started:");
  log.plain(`\n  ${colors.green}cd ${projectName}${colors.reset}`);
  if (!installedDependencies) {
    log.plain(`  ${colors.green}${detectedPm} install${colors.reset}`);
  }
  log.plain(`  ${colors.green}${detectedPm} run dev${colors.reset}\n`);
  log.success("✨ Happy coding!");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  checkNodeVersion();

  const { projectName: argName, flags } = parseArguments();

  log.plain(LOGO);

  let projectName = argName;

  if (!projectName) {
    if (!isInteractive()) {
      log.error("Project name required in non-interactive mode.");
      exit(1);
    }
    projectName = await input({
      message:  "Project name?",
      default:  "my-bini-app",
      validate: (v: string) => {
        if (!v) return "Name required.";
        if (!validateProjectName(v)) return "Lowercase letters, numbers, hyphens only. Max 50 chars.";
        return true;
      },
    });
  }

  if (!validateProjectName(projectName)) {
    log.error("Invalid project name. Use lowercase letters, numbers, and hyphens only. Max 50 chars.");
    exit(1);
  }

  const answers = await askQuestions(flags);
  await generateProject(projectName, answers, flags);
}

main().catch((err) => {
  log.error(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  exit(1);
});