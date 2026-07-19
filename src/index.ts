import { select, input, password } from "@inquirer/prompts";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { isatty } from "tty";

interface CliFlags {
  force: boolean;
  typescript: boolean | undefined;
  javascript: boolean;
  tailwind: boolean;
  cssModules: boolean;
  noStyle: boolean;
  install: boolean | undefined;
  platform: string | undefined;
  appName: string | undefined;
  sign: boolean | undefined;
  packageManager: PackageManager | undefined;
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
type TauriPlatform = "windows" | "linux" | "macos" | "android" | "ios";
type TargetPlatform = "web" | "windows" | "linux" | "macos" | "android" | "ios";
type UserOS = "windows" | "macos" | "linux";

interface ProjectAnswers {
  typescript: boolean;
  styling: StylingOption;
  platform: TargetPlatform;
  appName: string;
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
  predev?: string;
  prebuild?: string;
  tauri?: string;
  "tauri:dev"?: string;
  "tauri:build"?: string;
  "tauri:icon"?: string;
  android?: string;
  "android:dev"?: string;
  "android:build"?: string;
  ios?: string;
  "ios:dev"?: string;
  "ios:build"?: string;
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_PACKAGE_PATH = path.join(__dirname, "..", "package.json");
const cliPackageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_PATH, "utf-8")) as { version: string };
const BINIJS_VERSION: string = cliPackageJson.version;

const ASSETS_DIR = path.join(__dirname, "..", "assets");

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
} as const;

const LOGO = `
${colors.cyan}${colors.bold}               
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
${colors.reset}
${colors.dim}     Developed By Binidu${colors.reset}
`;

const REQUIRED_NODE = "v20.19.0";
const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const INVALID_NAME_PATTERN = /^(\.|\.\.|npm|node)|[<>:"|?*\\]|[^a-z0-9\-.]/i;

const log = {
  info: (msg: string) => console.log(`${colors.cyan}${colors.bold}INFO${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}${colors.bold}OK${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}${colors.bold}WARN${colors.reset} ${msg}`),
  error: (msg: string) => console.error(`${colors.red}${colors.bold}ERROR${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`${colors.blue}${colors.bold}STEP${colors.reset} ${msg}`),
  plain: (msg: string) => console.log(msg),
  skip: (msg: string) => console.log(`${colors.yellow}${colors.bold}SKIP${colors.reset} ${msg}`),
  command: (msg: string) => console.log(`${colors.magenta}${colors.bold}RUN${colors.reset} ${msg}`),
};

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
      { name: "Yes", value: true },
      { name: "No", value: false },
    ],
    default: options.default !== false,
  });
}

function toTitleCase(slug: string): string {
  const words = slug.split(/[-_\s]+/).filter(Boolean);
  if (words.length === 0) return "My App";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

process.on("SIGINT", () => {
  log.plain("\n");
  log.warn("Operation cancelled.");
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
    const stats = fs.statfsSync(process.cwd());
    const freeMB = (stats.bavail * stats.bsize) / (1024 * 1024);
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
  --typescript        Use TypeScript
  --javascript        Use JavaScript
  --tailwind          Use Tailwind CSS
  --css-modules       Use CSS Modules
  --none              No styling
  --force             Overwrite existing directory
  --install           Auto-install dependencies
  --no-install        Skip dependency installation
  --platform <target> Target platform: web, windows, linux, macos, android, ios
  --app-name <name>   Display app name (used as Tauri app name and window title)
  --sign              Auto-confirm code signing setup (still prompts for details)
  --nosign            Skip code signing setup entirely, no prompts
  --npm               Force npm as the package manager
  --pnpm              Force pnpm as the package manager
  --yarn              Force yarn as the package manager
  --bun               Force bun as the package manager

${colors.bold}${colors.cyan}Examples:${colors.reset}
  ${colors.dim}create-bini-app my-app${colors.reset}
  ${colors.dim}create-bini-app my-app --typescript --tailwind${colors.reset}
  ${colors.dim}create-bini-app my-app --platform windows${colors.reset}
  ${colors.dim}create-bini-app my-app --platform android --app-name "My App"${colors.reset}
  ${colors.dim}create-bini-app my-app --platform android --nosign --pnpm${colors.reset}
    `);
    exit(0);
  }

  const hasTypeScript = args.includes("--typescript");
  const hasJavaScript = args.includes("--javascript") || args.includes("--no-typescript");
  const hasTailwind = args.includes("--tailwind");
  const hasCSSModules = args.includes("--css-modules");
  const hasNoStyle = args.includes("--none");
  const hasInstall = args.includes("--install");
  const hasNoInstall = args.includes("--no-install");
  const platformIndex = args.indexOf("--platform");
  const platform = platformIndex !== -1 ? args[platformIndex + 1] : undefined;
  const appNameIndex = args.indexOf("--app-name");
  const appNameFlag = appNameIndex !== -1 ? args[appNameIndex + 1] : undefined;
  const hasSign = args.includes("--sign");
  const hasNoSign = args.includes("--nosign");

  const PM_FLAG_MAP: Record<string, PackageManager> = {
    "--npm": "npm",
    "--pnpm": "pnpm",
    "--yarn": "yarn",
    "--bun": "bun",
  };
  const pmFlagsPresent = Object.keys(PM_FLAG_MAP).filter((f) => args.includes(f));

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
  if (hasSign && hasNoSign) {
    log.error("Cannot use --sign and --nosign together.");
    exit(1);
  }
  if (pmFlagsPresent.length > 1) {
    log.error(`Cannot use more than one of ${Object.keys(PM_FLAG_MAP).join(", ")} together.`);
    exit(1);
  }

  const packageManager = pmFlagsPresent.length === 1 ? PM_FLAG_MAP[pmFlagsPresent[0]] : undefined;

  return {
    projectName: args.find((a) => !a.startsWith("--") && a !== platform && a !== appNameFlag),
    flags: {
      force: args.includes("--force"),
      typescript: hasTypeScript ? true : hasJavaScript ? false : undefined,
      javascript: hasJavaScript,
      tailwind: hasTailwind,
      cssModules: hasCSSModules,
      noStyle: hasNoStyle,
      install: hasInstall ? true : hasNoInstall ? false : undefined,
      platform: platform,
      appName: appNameFlag,
      sign: hasSign ? true : hasNoSign ? false : undefined,
      packageManager: packageManager,
    },
  };
}

function validateProjectName(name: string): boolean {
  if (!name || name.length > 50) return false;
  if (WINDOWS_RESERVED_NAMES.test(name)) return false;
  return !INVALID_NAME_PATTERN.test(name);
}

function validatePlatform(platform: string): platform is TargetPlatform {
  return ["web", "windows", "linux", "macos", "android", "ios"].includes(platform);
}

function detectUserOS(): UserOS {
  const platform = process.platform;
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "macos";
  if (platform === "linux") return "linux";
  return "windows";
}

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
  const base = path.resolve(allowedBase);
  const relative = path.relative(base, resolved);

  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to delete: "${resolved}" is outside the allowed base "${base}".`);
  }

  const systemPaths = [
    path.resolve("/"),
    process.env.HOME ? path.resolve(process.env.HOME) : null,
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

function executeCommand(command: string, options: ExecuteCommandOptions = {}): string {
  try {
    const result = execSync(command, {
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      stdio: options.stdio ?? "pipe",
      timeout: options.timeout ?? 120_000,
      cwd: options.cwd,
      windowsHide: true,
      encoding: "utf8",
    });
    return String(result);
  } catch (error) {
    throw new Error(
      `Command failed: ${command}\n${(error as ExecuteCommandError).message ?? String(error)}`
    );
  }
}

function commandExists(command: string): boolean {
  try {
    const whichCmd = process.platform === "win32" ? `where ${command}` : `which ${command}`;
    executeCommand(whichCmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function execSilent(command: string, cwd?: string): void {
  try {
    execSync(command, {
      cwd: cwd,
      stdio: "ignore",
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      timeout: 120000,
      windowsHide: true,
    });
  } catch {
    // ignored; caller handles the outcome
  }
}

function pmExec(pm: PackageManager, args: string): string {
  switch (pm) {
    case "npm":
      return `npx ${args}`;
    case "yarn":
      return `yarn ${args}`;
    case "pnpm":
      return `pnpm ${args}`;
    case "bun":
      return `bunx ${args}`;
  }
}

function pmRun(pm: PackageManager, script: string): string {
  return pm === "npm" ? `npm run ${script}` : `${pm} ${script}`;
}

const PM_VERSION_COMMAND: Record<PackageManager, string> = {
  bun: "bun --version",
  pnpm: "pnpm --version",
  yarn: "yarn --version",
  npm: "npm --version",
};

function detectPackageManager(): PackageManager {
  const candidates: PackageManagerEntry[] = [
    { name: "bun", command: PM_VERSION_COMMAND.bun, priority: 4 },
    { name: "pnpm", command: PM_VERSION_COMMAND.pnpm, priority: 3 },
    { name: "yarn", command: PM_VERSION_COMMAND.yarn, priority: 2 },
    { name: "npm", command: PM_VERSION_COMMAND.npm, priority: 1 },
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

function resolvePackageManager(requested: PackageManager | undefined): {
  pm: PackageManager;
  failed: boolean;
  forced: boolean;
} {
  if (requested) {
    try {
      executeCommand(PM_VERSION_COMMAND[requested], { stdio: "ignore" });
      return { pm: requested, failed: false, forced: true };
    } catch {
      log.error(`Requested package manager "${requested}" was not found on PATH.`);
      exit(1);
    }
  }

  try {
    return { pm: detectPackageManager(), failed: false, forced: false };
  } catch (err) {
    log.warn(`Could not detect package manager: ${(err as Error).message}`);
    return { pm: "npm", failed: true, forced: false };
  }
}

async function installDependencies(
  projectPath: string,
  pm: PackageManager,
  shouldInstall: boolean
): Promise<boolean> {
  if (!shouldInstall) return false;

  const commands: Record<PackageManager, string> = {
    npm: "npm install --no-audit --no-fund --loglevel=error",
    yarn: "yarn install --silent --no-progress",
    pnpm: "pnpm install --reporter=silent",
    bun: "bun install --silent",
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

function resolveTypeScript(flags: CliFlags, answers: ProjectAnswers): boolean {
  if (flags.typescript === true) return true;
  if (flags.javascript === true) return false;
  return answers.typescript;
}

function getExtensions(useTypeScript: boolean): FileExtensions {
  const x = useTypeScript ? ("ts" as const) : ("js" as const);
  return {
    main: useTypeScript ? "tsx" : "jsx",
    config: x,
    api: x,
  };
}

async function askQuestions(flags: CliFlags, projectName: string): Promise<ProjectAnswers> {
  let typescript: boolean;
  if (flags.typescript !== undefined) {
    typescript = flags.typescript;
  } else if (isInteractive()) {
    typescript = await confirm({ message: "Use TypeScript?", default: true });
  } else {
    typescript = true;
  }

  let styling: StylingOption;
  if (flags.tailwind) { styling = "Tailwind"; }
  else if (flags.cssModules) { styling = "CSS Modules"; }
  else if (flags.noStyle) { styling = "None"; }
  else if (isInteractive()) {
    styling = await select<StylingOption>({
      message: "Styling solution?",
      choices: [
        { name: "Tailwind CSS", value: "Tailwind" },
        { name: "CSS Modules", value: "CSS Modules" },
        { name: "None", value: "None" },
      ],
      default: "Tailwind",
    });
  } else {
    styling = "Tailwind";
  }

  let platform: TargetPlatform;
  const userOS = detectUserOS();

  if (flags.platform && validatePlatform(flags.platform)) {
    platform = flags.platform as TargetPlatform;
  } else if (isInteractive()) {
    const platformChoices = [
      { name: "Web Application", value: "web" as TargetPlatform },
      { name: "Windows Desktop", value: "windows" as TargetPlatform },
      { name: "Linux Desktop", value: "linux" as TargetPlatform },
      { name: "macOS Desktop", value: "macos" as TargetPlatform },
      { name: "Android", value: "android" as TargetPlatform },
      { name: "iOS", value: "ios" as TargetPlatform },
    ];

    console.log(`\nDetected OS: ${userOS}`);

    platform = await select<typeof platformChoices[number]["value"]>({
      message: "Select target platform:",
      choices: platformChoices,
      default: "web",
    });
  } else {
    platform = "web";
  }

  let appName: string = projectName;
  if (platform !== "web") {
    if (flags.appName) {
      appName = flags.appName;
    } else if (isInteractive()) {
      appName = await input({
        message: "App name? (used as the app name and window title)",
        default: toTitleCase(projectName),
        validate: (v: string) => (v.trim().length > 0 ? true : "Required."),
      });
    } else {
      appName = toTitleCase(projectName);
    }
  }

  return { typescript, styling, platform, appName };
}

async function copyFaviconFiles(publicPath: string): Promise<void> {
  const files = ["favicon.ico", "apple-touch-icon.png", "og-image.png", "logo.png"] as const;
  await Promise.all(
    files.map(async (file) => {
      const src = path.join(ASSETS_DIR, file);
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
    name: "Bini.js App",
    short_name: "BiniApp",
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
  await writeFile(
    path.join(projectPath, "public", "site.webmanifest"),
    JSON.stringify(manifest, null, 2)
  );
}

async function generateViteConfig(
  projectPath: string,
  useTypeScript: boolean,
  configExt: ConfigExtension,
  styling: StylingOption,
  isTauri: boolean
): Promise<void> {
  const tailwindImport = styling === "Tailwind" ? `import tailwindcss from '@tailwindcss/vite';\n` : "";
  const tailwindPlugin = styling === "Tailwind" ? `\n      tailwindcss(),` : "";
  const typesSection = useTypeScript ? `,\n    types: ["vite/client"]` : "";
  const biniNativeImport = isTauri ? `import { biniNative } from 'bini-native';\n` : "";
  const biniNativePlugin = isTauri ? `\n      biniNative(),` : "";

  const ignoredPatterns = [
    "'**/dist/**'",
    "'**/node_modules/**'",
  ];

  if (isTauri) {
    ignoredPatterns.push("'**/src-tauri/**'");
    ignoredPatterns.push("'**/target/**'");
    ignoredPatterns.push("'**/*.exe'");
    ignoredPatterns.push("'**/*.dll'");
    ignoredPatterns.push("'**/*.pdb'");
  }

  const ignoredString = ignoredPatterns.join(",\n          ");

  const content = `import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { biniroute } from 'bini-router';
import { biniOverlay } from 'bini-overlay';
import { biniEnv } from 'bini-env';
import { biniExport } from 'bini-export';
${biniNativeImport}${tailwindImport}
import { existsSync } from 'fs';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isBuild = command === 'build';
  const port = parseInt(env['PORT'] ?? '3000', 10);

  const isTauri = env['TAURI'] === 'true' ||
                  process.env.TAURI === 'true' ||
                  existsSync('./src-tauri');

  const tauriDevHost = process.env.TAURI_DEV_HOST;

  const host = tauriDevHost
    ? true
    : isTauri
      ? '0.0.0.0'
      : (env['CODESPACE_NAME'] ? '0.0.0.0' : 'localhost');

  const hmrConfig = env['CODESPACE_NAME']
    ? { clientPort: 443, overlay: false }
    : tauriDevHost
      ? {
          overlay: false,
          protocol: 'ws',
          host: tauriDevHost,
          port,
        }
      : {
          overlay: false,
          host: 'localhost',
          protocol: 'ws',
        };

  return {
    plugins: [${tailwindPlugin}
      react(),
      biniroute({ platform: 'node' }),
      biniOverlay(),
      biniEnv(),
      biniExport(),${biniNativePlugin}
    ],

    server: {
      port,
      host,
      open: !isTauri,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      hmr: hmrConfig,
      watch: {
        usePolling: !!env['CODESPACE_NAME'] || isTauri,
        ignored: [
          ${ignoredString}
        ],
      },
      strictPort: true,
    },

    preview: {
      port,
      host: '0.0.0.0',
      open: true,
      cors: true
    },

    build: {
      outDir: 'dist',
      sourcemap: !isBuild,
      emptyOutDir: true,
      minify: isBuild,
      cssCodeSplit: true,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.names?.[0] ?? assetInfo.name ?? '';
            const ext = name.split('.').pop() ?? '';
            if (/png|jpe?g|gif|svg|webp|avif/.test(ext)) return 'assets/images/[name]-[hash][extname]';
            if (/woff2?|eot|ttf|otf/.test(ext)) return 'assets/fonts/[name]-[hash][extname]';
            if (ext === 'css') return 'css/[name]-[hash][extname]';
            if (ext === 'json') return 'data/[name]-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },

    resolve: { alias: { '@': '/src' } },
    css: {
      modules: { localsConvention: 'camelCase' },
      devSourcemap: true
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom']
    }${typesSection}
  };
});
`;

  await writeFile(path.join(projectPath, `vite.config.${configExt}`), content);
}

function getSetupInstructions(platform: TauriPlatform, userOS: UserOS): string {
  const instructions: Record<string, string> = {
    windows: `
----------------------------------------------------------------------
  Windows Setup Requirements
----------------------------------------------------------------------

  1. Microsoft C++ Build Tools
     Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
     Install with "Desktop development with C++"

  2. Microsoft Edge WebView2 Runtime
     Download: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
     Install the Evergreen Bootstrapper

  3. Verify: Run "cl" in terminal after installation
----------------------------------------------------------------------`,

    linux: `
----------------------------------------------------------------------
  Linux Setup Requirements
----------------------------------------------------------------------

  Debian/Ubuntu:
    sudo apt update
    sudo apt install -y libwebkit2gtk-4.0-dev build-essential \\
      libssl-dev libgtk-3-dev libayatana-appindicator3-dev \\
      librsvg2-dev libxdo-dev pkg-config

  Fedora:
    sudo dnf groupinstall "C Development Tools and Libraries"
    sudo dnf install webkit2gtk4.0-devel openssl-devel \\
      gtk3-devel libappindicator-gtk3-devel librsvg2-devel \\
      libxdo-devel pkg-config

  Arch:
    sudo pacman -S webkit2gtk base-devel openssl gtk3 \\
      libappindicator-gtk3 librsvg libxdo pkg-config
----------------------------------------------------------------------`,

    macos: `
----------------------------------------------------------------------
  macOS Setup Requirements
----------------------------------------------------------------------

  1. Xcode Command Line Tools:
     xcode-select --install

  2. Homebrew:
     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  3. Tauri Dependencies:
     brew install gtk+3 webkit2gtk pkg-config

  4. iOS Development (optional):
     Install Xcode from Mac App Store
----------------------------------------------------------------------`,

    android: `
----------------------------------------------------------------------
  Android Setup Requirements
----------------------------------------------------------------------

  1. Java JDK 17
     Download: https://adoptium.net/temurin/releases/
     Set JAVA_HOME environment variable

  2. Android Studio
     Download: https://developer.android.com/studio
     Install SDK, Build Tools, and NDK
     Set ANDROID_HOME environment variable

  3. Rust Android Targets:
     rustup target add aarch64-linux-android armv7-linux-androideabi
     rustup target add i686-linux-android x86_64-linux-android
----------------------------------------------------------------------`,

    ios: `
----------------------------------------------------------------------
  iOS Setup Requirements (macOS only)
----------------------------------------------------------------------

  1. Xcode from Mac App Store
  2. Xcode Command Line Tools: xcode-select --install
  3. Cocoapods: sudo gem install cocoapods
  4. Rust iOS Targets:
     rustup target add aarch64-apple-ios
     rustup target add x86_64-apple-ios
     rustup target add aarch64-apple-ios-sim
----------------------------------------------------------------------`
  };

  const key = platform === "ios" ? "ios" :
              platform === "android" ? "android" :
              userOS === "windows" ? "windows" :
              userOS === "macos" ? "macos" : "linux";

  return instructions[key] || instructions.linux;
}

function generateBundleIdentifier(projectName: string): string {
  const sanitized = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const safe = sanitized.length > 0 ? sanitized : "app";
  const finalSegment = /^[0-9]/.test(safe) ? `app${safe}` : safe;
  return `com.bini.${finalSegment}`;
}

async function setBundleIdentifier(tauriDir: string, projectName: string): Promise<void> {
  const confPath = path.join(tauriDir, "tauri.conf.json");
  if (!fs.existsSync(confPath)) return;

  try {
    const raw = await fsPromises.readFile(confPath, "utf-8");
    const conf = JSON.parse(raw);
    const identifier = generateBundleIdentifier(projectName);

    if (conf.identifier === identifier) {
      log.skip(`Bundle identifier already set to ${identifier}`);
      return;
    }

    conf.identifier = identifier;
    await fsPromises.writeFile(confPath, JSON.stringify(conf, null, 2) + "\n", { mode: 0o640 });
    log.success(`Bundle identifier set to ${colors.cyan}${identifier}${colors.reset}`);
    log.info("Replace this with your own reverse-DNS identifier before publishing to an app store.");
  } catch (err) {
    log.warn(`Could not set bundle identifier automatically: ${(err as Error).message}`);
    log.info(`Edit "identifier" in ${confPath} manually before building for Android/iOS/macOS.`);
  }
}

async function writeKeyValueFile(
  filePath: string,
  vars: Record<string, string>,
  header?: string
): Promise<void> {
  const lines: string[] = [];
  if (header) {
    for (const line of header.split("\n")) lines.push(`# ${line}`);
    lines.push("");
  }
  for (const [key, value] of Object.entries(vars)) {
    lines.push(`${key}=${value}`);
  }
  await writeFile(filePath, lines.join("\n") + "\n", { mode: 0o600 });
}

async function appendGitignoreEntries(projectPath: string, entries: string[]): Promise<void> {
  const gitignorePath = path.join(projectPath, ".gitignore");
  let existing = "";
  try {
    existing = await fsPromises.readFile(gitignorePath, "utf-8");
  } catch {
    existing = "";
  }
  const existingLines = new Set(existing.split("\n").map((l) => l.trim()));
  const toAdd = entries.filter((e) => e.startsWith("#") || !existingLines.has(e));
  if (toAdd.length === 0) return;
  const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  await fsPromises.appendFile(gitignorePath, `${prefix}\n${toAdd.join("\n")}\n`, { mode: 0o640 });
}

async function patchTauriConfBundle(
  tauriDir: string,
  mutate: (conf: Record<string, any>) => void
): Promise<boolean> {
  const confPath = path.join(tauriDir, "tauri.conf.json");
  if (!fs.existsSync(confPath)) {
    log.warn(`Could not find ${confPath}.`);
    return false;
  }
  try {
    const raw = await fsPromises.readFile(confPath, "utf-8");
    const conf = JSON.parse(raw);
    mutate(conf);
    await fsPromises.writeFile(confPath, JSON.stringify(conf, null, 2) + "\n", { mode: 0o640 });
    return true;
  } catch (err) {
    log.warn(`Could not update ${confPath}: ${(err as Error).message}`);
    return false;
  }
}

async function patchAndroidGradleSigning(androidGenDir: string): Promise<void> {
  const gradlePath = path.join(androidGenDir, "app", "build.gradle.kts");
  if (!fs.existsSync(gradlePath)) {
    log.warn(`Could not find ${gradlePath}. Wire up signingConfigs manually — see the docs.`);
    return;
  }

  try {
    let content = await fsPromises.readFile(gradlePath, "utf-8");

    if (content.includes("keystore.properties")) {
      log.skip("build.gradle.kts already configured for release signing.");
      return;
    }

    if (!content.includes("import java.io.FileInputStream")) {
      content = `import java.io.FileInputStream\n${content}`;
    }
    if (!content.includes("import java.util.Properties")) {
      content = content.replace(
        "import java.io.FileInputStream",
        "import java.io.FileInputStream\nimport java.util.Properties"
      );
    }

    const signingConfigBlock = `    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            }

            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["password"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }

`;

    if (!/buildTypes\s*\{/.test(content)) {
      log.warn(`Could not find "buildTypes" block in ${gradlePath}. Add signingConfigs manually.`);
      return;
    }
    content = content.replace(/(\n[^\S\n]*buildTypes\s*\{)/, `\n${signingConfigBlock}$1`);

    if (/getByName\("release"\)\s*\{/.test(content)) {
      content = content.replace(
        /(getByName\("release"\)\s*\{)/,
        `$1\n            signingConfig = signingConfigs.getByName("release")`
      );
    } else {
      log.warn(`Could not find getByName("release") in ${gradlePath}. Set signingConfig manually.`);
    }

    await fsPromises.writeFile(gradlePath, content, { mode: 0o640 });
    log.success("Wired release signingConfig into build.gradle.kts");
  } catch (err) {
    log.warn(`Could not patch build.gradle.kts: ${(err as Error).message}`);
    log.info("Configure it manually — see https://v2.tauri.app/distribute/sign/android/");
  }
}

async function setupAndroidSigning(
  projectPath: string,
  tauriDir: string,
  signFlag: boolean | undefined
): Promise<void> {
  log.step("Android release signing");
  const wantsSigning = signFlag === true
    ? true
    : await confirm({ message: "Set up Android release signing now?", default: false });
  if (!wantsSigning) {
    log.info("Skipped. See: https://v2.tauri.app/distribute/sign/android/");
    return;
  }

  const androidGenDir = path.join(tauriDir, "gen", "android");
  if (!fs.existsSync(androidGenDir)) {
    log.warn("Android project not found (src-tauri/gen/android missing). Run Android init first.");
    return;
  }

  if (!commandExists("keytool")) {
    log.warn("keytool not found on PATH (ships with the JDK). Add it to PATH or use Android Studio's copy.");
  }

  const useExisting = await confirm({ message: "Do you already have a keystore (.jks) file?", default: false });

  let storeFile: string;
  let keyAlias: string;
  let storePassword: string;

  if (useExisting) {
    storeFile = await input({
      message: "Path to existing keystore file:",
      validate: (v: string) => (fs.existsSync(v) ? true : "File not found."),
    });
    keyAlias = await input({ message: "Key alias:", default: "upload" });
    storePassword = await password({ message: "Keystore password:", mask: "*" });
  } else {
    const defaultPath = path.join(projectPath, "keystore.jks");
    storeFile = await input({ message: "Where should the keystore be created?", default: defaultPath });
    keyAlias = await input({ message: "Key alias:", default: "upload" });
    storePassword = await password({ message: "Set a keystore password (min 6 chars):", mask: "*" });

    if (fs.existsSync(storeFile)) {
      log.warn(`File already exists at ${storeFile} — leaving it untouched.`);
    } else {
      log.step("Generating keystore with keytool...");
      const dname = `CN=${path.basename(projectPath)}, OU=Dev, O=Bini, L=Unknown, S=Unknown, C=US`;
      const cmd = `keytool -genkey -v -keystore "${storeFile}" -keyalg RSA -keysize 2048 -validity 10000 -alias "${keyAlias}" -storepass "${storePassword}" -keypass "${storePassword}" -dname "${dname}"`;
      try {
        executeCommand(cmd, { stdio: "pipe", timeout: 30_000 });
        log.success(`Keystore created at ${storeFile}`);
      } catch (err) {
        log.warn(`Could not generate keystore automatically: ${(err as Error).message}`);
        log.info("Generate it manually with keytool — see https://v2.tauri.app/distribute/sign/android/");
        return;
      }
    }
  }

  const propsPath = path.join(androidGenDir, "keystore.properties");
  const normalizedStoreFile = process.platform === "win32" ? storeFile.replace(/\\/g, "\\\\") : storeFile;
  await writeFile(
    propsPath,
    `password=${storePassword}\nkeyAlias=${keyAlias}\nstoreFile=${normalizedStoreFile}\n`,
    { mode: 0o600 }
  );
  log.success(`Wrote ${path.relative(projectPath, propsPath)}`);

  await appendGitignoreEntries(projectPath, [
    "# Android signing (never commit)",
    "src-tauri/gen/android/keystore.properties",
    "*.jks",
    "*.keystore",
  ]);

  await patchAndroidGradleSigning(androidGenDir);
  log.success("Android release signing configured. `pnpm android:build` will now produce a signed release.");
}

async function setupWindowsSigning(tauriDir: string, signFlag: boolean | undefined): Promise<void> {
  log.step("Windows code signing");
  const wantsSigning = signFlag === true
    ? true
    : await confirm({ message: "Configure Windows code signing now?", default: false });
  if (!wantsSigning) {
    log.info("Skipped. See: https://v2.tauri.app/distribute/sign/windows/");
    return;
  }

  log.plain(
    `${colors.dim}Requires a code signing certificate already imported into your Windows\ncertificate store (Import-PfxCertificate). See the docs if you haven't done that yet.${colors.reset}`
  );

  const certificateThumbprint = await input({
    message: "Certificate thumbprint (Personal > Certificates > Details in certmgr.msc):",
    validate: (v: string) => (v.trim().length > 0 ? true : "Required."),
  });
  const digestAlgorithm = await select<string>({
    message: "Digest algorithm:",
    choices: [
      { name: "sha256", value: "sha256" },
      { name: "sha1", value: "sha1" },
    ],
    default: "sha256",
  });
  const timestampUrl = await input({
    message: "Timestamp server URL:",
    default: "http://timestamp.comodoca.com",
  });

  const ok = await patchTauriConfBundle(tauriDir, (conf) => {
    conf.bundle = conf.bundle ?? {};
    conf.bundle.windows = { ...(conf.bundle.windows ?? {}), certificateThumbprint, digestAlgorithm, timestampUrl };
  });

  if (ok) {
    log.success("Windows signing configured in tauri.conf.json");
    log.info("Cross-compiling from Linux/macOS requires a custom signCommand instead — see the docs.");
  }
}

async function setupMacosSigning(
  projectPath: string,
  tauriDir: string,
  signFlag: boolean | undefined
): Promise<void> {
  log.step("macOS code signing");
  const wantsSigning = signFlag === true
    ? true
    : await confirm({ message: "Configure macOS code signing now?", default: false });
  if (!wantsSigning) {
    log.info("Skipped. See: https://v2.tauri.app/distribute/sign/macos/");
    return;
  }

  const mode = await select<"adhoc" | "identity">({
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
      : await input({
          message: 'Signing identity (from "security find-identity -v -p codesigning"):',
          validate: (v: string) => (v.trim().length > 0 ? true : "Required."),
        });

  const ok = await patchTauriConfBundle(tauriDir, (conf) => {
    conf.bundle = conf.bundle ?? {};
    conf.bundle.macOS = { ...(conf.bundle.macOS ?? {}), signingIdentity };
  });
  if (ok) log.success(`macOS signingIdentity set to "${signingIdentity}" in tauri.conf.json`);

  if (mode !== "identity") return;

  const wantsNotarization = await confirm({
    message: "Set up notarization credentials too? (avoids the 'unidentified developer' warning)",
    default: false,
  });
  if (!wantsNotarization) return;

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
    vars.APPLE_API_KEY_PATH = await input({
      message: "Path to downloaded .p8 private key:",
      validate: (v: string) => (fs.existsSync(v) ? true : "File not found."),
    });
  } else {
    vars.APPLE_ID = await input({ message: "Apple ID email:" });
    vars.APPLE_PASSWORD = await password({ message: "App-specific password:", mask: "*" });
    vars.APPLE_TEAM_ID = await input({ message: "Apple Team ID:" });
  }

  const envPath = path.join(projectPath, ".env.signing");
  await writeKeyValueFile(
    envPath,
    vars,
    "macOS notarization credentials — never commit this file.\nRun `source .env.signing` before `pnpm tauri:build`."
  );
  await appendGitignoreEntries(projectPath, ["# Code signing secrets (never commit)", ".env.signing"]);
  log.success(`Wrote notarization credentials to ${path.relative(projectPath, envPath)}`);
  log.info('Run "source .env.signing" before building to notarize your app.');
}

async function setupLinuxSigning(projectPath: string, signFlag: boolean | undefined): Promise<void> {
  log.step("Linux AppImage signing");
  const wantsSigning = signFlag === true
    ? true
    : await confirm({ message: "Configure AppImage signing (gpg) now?", default: false });
  if (!wantsSigning) {
    log.info("Skipped. See: https://v2.tauri.app/distribute/sign/linux/");
    return;
  }

  if (!commandExists("gpg") && !commandExists("gpg2")) {
    log.warn("gpg/gpg2 not found. Install it, generate a key with `gpg2 --full-gen-key`, then re-run.");
    return;
  }

  const signKey = await input({ message: "GPG key ID to sign with (blank = default key):" });
  const passphrase = await password({ message: "GPG key passphrase:", mask: "*" });

  const vars: Record<string, string> = {
    SIGN: "1",
    APPIMAGETOOL_SIGN_PASSPHRASE: passphrase,
  };
  if (signKey.trim()) vars.SIGN_KEY = signKey.trim();

  const envPath = path.join(projectPath, ".env.signing");
  await writeKeyValueFile(
    envPath,
    vars,
    "AppImage signing secrets — never commit this file.\nRun `source .env.signing` before `pnpm tauri:build`."
  );
  await appendGitignoreEntries(projectPath, ["# Code signing secrets (never commit)", ".env.signing"]);
  log.success(`Wrote AppImage signing config to ${path.relative(projectPath, envPath)}`);
  log.info('Run "source .env.signing" before building to sign the AppImage.');
}

async function setupIosSigning(projectPath: string, signFlag: boolean | undefined): Promise<void> {
  log.step("iOS code signing");
  const wantsSigning = signFlag === true
    ? true
    : await confirm({ message: "Configure iOS code signing now?", default: false });
  if (!wantsSigning) {
    log.info("Skipped. Xcode-managed automatic signing is used by default.");
    return;
  }

  const mode = await select<"automatic" | "manual">({
    message: "Signing method:",
    choices: [
      { name: "Automatic (Xcode-managed, recommended for local builds)", value: "automatic" },
      { name: "Manual (certificate + provisioning profile, for CI)", value: "manual" },
    ],
    default: "automatic",
  });

  if (mode === "automatic") {
    log.info("Nothing to configure locally — sign in with your Apple ID in Xcode (Settings > Accounts).");
    return;
  }

  const certPath = await input({
    message: "Path to exported certificate (.p12):",
    validate: (v: string) => (fs.existsSync(v) ? true : "File not found."),
  });
  const certPassword = await password({ message: "Certificate export password:", mask: "*" });
  const provisionPath = await input({
    message: "Path to provisioning profile (.mobileprovision):",
    validate: (v: string) => (fs.existsSync(v) ? true : "File not found."),
  });

  try {
    const certBase64 = (await fsPromises.readFile(certPath)).toString("base64");
    const provisionBase64 = (await fsPromises.readFile(provisionPath)).toString("base64");

    const envPath = path.join(projectPath, ".env.signing");
    await writeKeyValueFile(
      envPath,
      {
        IOS_CERTIFICATE: certBase64,
        IOS_CERTIFICATE_PASSWORD: certPassword,
        IOS_MOBILE_PROVISION: provisionBase64,
      },
      "iOS manual signing secrets — never commit this file.\nRun `source .env.signing` before `pnpm tauri ios build`."
    );
    await appendGitignoreEntries(projectPath, ["# Code signing secrets (never commit)", ".env.signing"]);
    log.success(`Wrote iOS signing credentials to ${path.relative(projectPath, envPath)}`);
    log.info('Run "source .env.signing" before building to sign your iOS app.');
  } catch (err) {
    log.warn(`Could not read/encode certificate or profile: ${(err as Error).message}`);
  }
}

async function setupCodeSigning(
  projectPath: string,
  tauriDir: string,
  targetPlatform: TauriPlatform,
  signFlag: boolean | undefined
): Promise<void> {
  if (signFlag === false) {
    log.info("Skipping code signing setup (--nosign). See https://v2.tauri.app/distribute/sign/");
    return;
  }

  if (!isInteractive()) {
    log.info("Skipping code signing setup (non-interactive). See https://v2.tauri.app/distribute/sign/");
    return;
  }

  switch (targetPlatform) {
    case "android":
      await setupAndroidSigning(projectPath, tauriDir, signFlag);
      break;
    case "windows":
      await setupWindowsSigning(tauriDir, signFlag);
      break;
    case "macos":
      await setupMacosSigning(projectPath, tauriDir, signFlag);
      break;
    case "linux":
      await setupLinuxSigning(projectPath, signFlag);
      break;
    case "ios":
      await setupIosSigning(projectPath, signFlag);
      break;
  }
}

async function setupTauri(
  projectPath: string,
  targetPlatform: TauriPlatform,
  userOS: UserOS,
  pm: PackageManager,
  projectName: string,
  appName: string,
  signFlag: boolean | undefined
): Promise<void> {
  log.step(`Setting up Tauri for ${targetPlatform} on ${userOS}`);

  log.step("Installing Tauri dependencies...");

  const depsToInstall = [
    { type: "dev", packages: ["@tauri-apps/cli@latest", "cross-env@latest", "bini-native@latest"] },
    { type: "prod", packages: ["@tauri-apps/api@latest"] },
  ];

  for (const dep of depsToInstall) {
    const cmd = dep.type === "dev"
      ? `${pm} add -D ${dep.packages.join(" ")}`
      : `${pm} add ${dep.packages.join(" ")}`;
    try {
      execSilent(cmd, projectPath);
    } catch {
      // continue regardless
    }
  }
  log.success("Tauri dependencies installed");

  const tauriDir = path.join(projectPath, "src-tauri");

  if (!fs.existsSync(tauriDir)) {
    log.step("Initializing Tauri with auto-filled values...");

    const tauriInitCmd = `npx @tauri-apps/cli init \
      --app-name "${appName}" \
      --window-title "${appName}" \
      --frontend-dist "../dist" \
      --dev-url "http://localhost:3000" \
      --before-dev-command "${pmRun(pm, "dev")}" \
      --before-build-command "${pmRun(pm, "build")}" \
      --force`;

    log.command(tauriInitCmd);

    try {
      execSync(tauriInitCmd, {
        cwd: projectPath,
        stdio: 'inherit',
        timeout: 60000,
        shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
        env: { ...process.env, FORCE_COLOR: 'true' }
      });
      log.success("Tauri initialized with auto-filled values");
    } catch (error) {
      log.warn("Tauri init failed. Please run manually:");
      log.plain(`  ${colors.yellow}${tauriInitCmd}${colors.reset}`);
      return;
    }
  } else {
    log.skip("Tauri already initialized");
  }

  await setBundleIdentifier(tauriDir, projectName);

  const iconsDir = path.join(tauriDir, "icons");
  if (fs.existsSync(iconsDir)) {
    log.step("Removing existing Tauri icons...");
    try {
      fs.rmSync(iconsDir, { recursive: true, force: true });
      log.success("Existing icons removed");
    } catch (error) {
      log.warn(`Could not remove icons: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  log.step("Generating Tauri icons from public/logo.png...");
  const iconCmd = pmExec(pm, "tauri icon public/logo.png");
  log.command(iconCmd);
  try {
    execSync(iconCmd, {
      cwd: projectPath,
      stdio: 'inherit',
      timeout: 60000,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh"
    });
    log.success("Tauri icons generated from logo.png");
  } catch (error) {
    log.warn("Could not generate icons automatically.");
    log.info(`Run: ${colors.cyan}${iconCmd}${colors.reset}`);
  }

  if (targetPlatform === "android") {
    const androidDir = path.join(projectPath, "src-tauri", "gen", "android");
    if (!fs.existsSync(androidDir)) {
      log.step("Initializing Android support...");
      const androidInitCmd = pmExec(pm, "tauri android init");
      log.command(androidInitCmd);
      try {
        execSync(androidInitCmd, {
          cwd: projectPath,
          stdio: 'inherit',
          timeout: 120000,
          shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh"
        });
        log.success("Android support initialized");
      } catch (error) {
        log.warn("Android init failed. Please run manually:");
        log.plain(`  ${colors.yellow}${androidInitCmd}${colors.reset}`);
      }
    } else {
      log.skip("Android support already initialized");
    }
  }

  if (targetPlatform === "ios") {
    const iosDir = path.join(projectPath, "src-tauri", "gen", "ios");
    if (!fs.existsSync(iosDir)) {
      log.step("Initializing iOS support...");
      const iosInitCmd = pmExec(pm, "tauri ios init");
      log.command(iosInitCmd);
      if (userOS === "macos") {
        try {
          execSync(iosInitCmd, {
            cwd: projectPath,
            stdio: 'inherit',
            timeout: 120000,
            shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh"
          });
          log.success("iOS support initialized");
        } catch {
          log.warn(`iOS init failed. Please run manually: ${iosInitCmd}`);
        }
      } else {
        log.warn("iOS initialization skipped (requires macOS)");
      }
    } else {
      log.skip("iOS support already initialized");
    }
  }

  await setupCodeSigning(projectPath, tauriDir, targetPlatform, signFlag);

  log.step("Setup Instructions");
  log.plain(getSetupInstructions(targetPlatform, userOS));

  log.step("Checking prerequisites...");
  if (targetPlatform === "android") {
    if (!commandExists("java")) log.warn("Java JDK 17 not found (required for Android)");
    if (!process.env.ANDROID_HOME) log.warn("ANDROID_HOME not set (required for Android)");

    log.step("Adding Rust Android targets");
    const androidTargets = ["aarch64-linux-android", "armv7-linux-androideabi", "i686-linux-android", "x86_64-linux-android"];
    for (const target of androidTargets) {
      log.command(`rustup target add ${target}`);
      try {
        const output = execSync(`rustup target list | grep ${target}`, {
          stdio: "pipe",
          shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh"
        });
        if (!output.toString().includes("installed")) {
          execSilent(`rustup target add ${target}`, projectPath);
        }
      } catch {
        execSilent(`rustup target add ${target}`, projectPath);
      }
    }
    log.success("Rust Android targets ready");
  }

  if (targetPlatform === "ios" && userOS !== "macos") {
    log.warn("iOS development requires macOS with Xcode");
  }
  if (userOS === "windows" && targetPlatform === "windows" && !commandExists("cl")) {
    log.warn("Visual Studio Build Tools not found (required for Windows)");
  }

  log.success(`Tauri setup complete for ${targetPlatform}`);

  log.step("Available Commands");

  if (targetPlatform === "android") {
    const androidDevCmd = pmRun(pm, "android");
    const androidBuildCmd = pmRun(pm, "android:build");
    log.plain(`\n  ${colors.green}${colors.bold}Run on Android:${colors.reset} ${colors.cyan}${androidDevCmd}${colors.reset}`);
    log.plain(`  ${colors.green}${colors.bold}Build APK:${colors.reset} ${colors.cyan}${androidBuildCmd}${colors.reset}`);
    log.plain(`  ${colors.green}${colors.bold}Manual Command:${colors.reset} ${colors.dim}npx @tauri-apps/cli android dev${colors.reset}\n`);

    log.plain(`  ${colors.yellow}${colors.bold}Quick Start Guide:${colors.reset}`);
    log.plain(`  1. Start an Android emulator or connect a device with USB debugging`);
    log.plain(`  2. Run: ${colors.green}${androidDevCmd}${colors.reset}`);
    log.plain(`  3. Build APK: ${colors.green}${androidBuildCmd}${colors.reset}\n`);
  } else {
    const cmds: Record<TauriPlatform, { dev: string; build: string }> = {
      windows: { dev: pmRun(pm, "tauri:dev"), build: pmRun(pm, "tauri:build") },
      linux: { dev: pmRun(pm, "tauri:dev"), build: pmRun(pm, "tauri:build") },
      macos: { dev: pmRun(pm, "tauri:dev"), build: pmRun(pm, "tauri:build") },
      android: { dev: pmRun(pm, "android"), build: pmRun(pm, "android:build") },
      ios: { dev: pmRun(pm, "ios"), build: pmRun(pm, "ios:build") },
    };
    const cmd = cmds[targetPlatform];
    log.plain(`\n  ${colors.green}${colors.bold}Development:${colors.reset} ${cmd.dev}`);
    log.plain(`  ${colors.green}${colors.bold}Build:${colors.reset} ${cmd.build}\n`);
  }
}

function getCSSReset(): string {
  return `* { box-sizing: border-box; }
html { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
body { line-height: 1.5; min-height: 100vh; margin: 0; }
#root { min-height: 100vh; }
`;
}

function getCSSPageStyles(): string {
  return `.root { 
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #ffffff; 
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem 1rem;
  gap: 1rem;
  width: fit-content;
  height: fit-content;
}

@media (min-width: 640px) {
  .content { padding: 3rem 2rem; gap: 1.5rem; }
}

.hero-logo { 
  width: 4rem; 
  height: 4rem; 
  object-fit: contain;
}

@media (min-width: 640px) {
  .hero-logo { width: 5rem; height: 5rem; }
}

.gradient-text-wrap {
  display: inline-block;
  overflow: visible;
  position: relative;
}

.gradient-text {
  background: linear-gradient(to right, #22D3EE, #3B82F6);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  display: inline-block;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  -webkit-mask-image: none;
  mask-image: none;
  padding-bottom: 0.2em;
  padding-top: 0.05em;
  margin-bottom: -0.15em;
  line-height: 1.2;
}

.gradient-text-fallback {
  position: absolute;
  color: #3B82F6;
  opacity: 0;
  pointer-events: none;
}

.title { 
  font-size: 1.875rem; 
  font-weight: 700; 
  letter-spacing: -0.04em; 
  color: #000000; 
  margin: 0; 
  line-height: 1.1; 
}

@media (min-width: 640px) {
  .title { font-size: 2.25rem; }
}

@media (min-width: 768px) {
  .title { font-size: 3rem; }
}

@media (min-width: 1024px) {
  .title { font-size: 3.75rem; }
}

.subtitle { 
  font-size: 1rem; 
  color: #737373; 
  margin: 0; 
  max-width: 28rem; 
  line-height: 1.6; 
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .subtitle { font-size: 1.125rem; padding: 0; }
}

.hint { 
  font-size: 0.75rem; 
  color: #a3a3a3; 
  margin: 0; 
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .hint { font-size: 0.875rem; padding: 0; }
}

.platforms { 
  display: flex; 
  flex-wrap: wrap; 
  align-items: center; 
  justify-content: center; 
  gap: 0.375rem; 
  padding: 0 0.5rem;
}

@media (min-width: 640px) {
  .platforms { gap: 0.5rem; padding: 0; }
}

.platform-badge { 
  font-size: 0.625rem; 
  font-weight: 500; 
  color: #737373; 
  background: #f5f5f5; 
  border: 1px solid #e5e5e5; 
  border-radius: 9999px; 
  padding: 0.125rem 0.625rem; 
}

@media (min-width: 640px) {
  .platform-badge { 
    font-size: 0.75rem; 
    padding: 0.25rem 0.75rem; 
  }
}

.code { 
  font-family: monospace; 
  font-size: 0.625rem; 
  background: #f5f5f5; 
  color: #404040; 
  padding: 0.125rem 0.375rem; 
  border-radius: 4px; 
  border: 1px solid #e5e5e5; 
}

@media (min-width: 640px) {
  .code { font-size: 0.75rem; padding: 0.2rem 0.5rem; }
}

.links-section { 
  padding: 0 1rem 3rem; 
  width: 100%;
}

@media (min-width: 640px) {
  .links-section { padding: 0 2rem 4rem; }
}

.grid { 
  display: grid; 
  grid-template-columns: repeat(2, 1fr); 
  gap: 0.75rem; 
  max-width: 48rem; 
  margin: 0 auto; 
}

@media (min-width: 640px) {
  .grid { gap: 1rem; }
}

@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(4, 1fr); gap: 1rem; }
}

.card { 
  display: flex; 
  flex-direction: column; 
  gap: 0.375rem; 
  padding: 0.75rem; 
  border-radius: 10px; 
  border: 1px solid #e5e5e5; 
  text-decoration: none; 
  transition: border-color 0.15s, background 0.15s; 
}

@media (min-width: 640px) {
  .card { gap: 0.5rem; padding: 1.25rem; }
}

.card:hover { 
  border-color: #d4d4d4; 
  background: #fafafa; 
}

.card-label { 
  font-size: 0.75rem; 
  font-weight: 600; 
  color: #000000; 
}

@media (min-width: 640px) {
  .card-label { font-size: 0.875rem; }
}

.card-desc { 
  font-size: 0.625rem; 
  color: #737373; 
  line-height: 1.5; 
}

@media (min-width: 640px) {
  .card-desc { font-size: 0.75rem; }
}

@media (prefers-color-scheme: dark) {
  .root { background: #000000; }
  .title { color: #ffffff; }
  .subtitle { color: #737373; }
  .hint { color: #525252; }
  .platform-badge { background: #111111; border-color: #222222; color: #a3a3a3; }
  .code { background: #111111; color: #d4d4d4; border-color: #222222; }
  .card { border-color: #1a1a1a; }
  .card:hover { border-color: #333333; background: #0a0a0a; }
  .card-label { color: #ffffff; }
  .card-desc { color: #737373; }
}
`;
}

function getCSSModuleStyles(): string {
  return `.root { 
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #ffffff; 
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem 1rem;
  gap: 1rem;
  width: fit-content;
  height: fit-content;
}

@media (min-width: 640px) {
  .content { padding: 3rem 2rem; gap: 1.5rem; }
}

.heroLogo { 
  width: 4rem; 
  height: 4rem; 
  object-fit: contain;
}

@media (min-width: 640px) {
  .heroLogo { width: 5rem; height: 5rem; }
}

.gradientTextWrap {
  display: inline-block;
  overflow: visible;
  position: relative;
}

.gradientText {
  background: linear-gradient(to right, #22D3EE, #3B82F6);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  display: inline-block;
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  -webkit-mask-image: none;
  mask-image: none;
  padding-bottom: 0.2em;
  padding-top: 0.05em;
  margin-bottom: -0.15em;
  line-height: 1.2;
}

.gradientTextFallback {
  position: absolute;
  color: #3B82F6;
  opacity: 0;
  pointer-events: none;
}

.title { 
  font-size: 1.875rem; 
  font-weight: 700; 
  letter-spacing: -0.04em; 
  color: #000000; 
  margin: 0; 
  line-height: 1.1; 
}

@media (min-width: 640px) {
  .title { font-size: 2.25rem; }
}

@media (min-width: 768px) {
  .title { font-size: 3rem; }
}

@media (min-width: 1024px) {
  .title { font-size: 3.75rem; }
}

.subtitle { 
  font-size: 1rem; 
  color: #737373; 
  margin: 0; 
  max-width: 28rem; 
  line-height: 1.6; 
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .subtitle { font-size: 1.125rem; padding: 0; }
}

.hint { 
  font-size: 0.75rem; 
  color: #a3a3a3; 
  margin: 0; 
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .hint { font-size: 0.875rem; padding: 0; }
}

.platforms { 
  display: flex; 
  flex-wrap: wrap; 
  align-items: center; 
  justify-content: center; 
  gap: 0.375rem; 
  padding: 0 0.5rem;
}

@media (min-width: 640px) {
  .platforms { gap: 0.5rem; padding: 0; }
}

.platformBadge { 
  font-size: 0.625rem; 
  font-weight: 500; 
  color: #737373; 
  background: #f5f5f5; 
  border: 1px solid #e5e5e5; 
  border-radius: 9999px; 
  padding: 0.125rem 0.625rem; 
}

@media (min-width: 640px) {
  .platformBadge { 
    font-size: 0.75rem; 
    padding: 0.25rem 0.75rem; 
  }
}

.code { 
  font-family: monospace; 
  font-size: 0.625rem; 
  background: #f5f5f5; 
  color: #404040; 
  padding: 0.125rem 0.375rem; 
  border-radius: 4px; 
  border: 1px solid #e5e5e5; 
}

@media (min-width: 640px) {
  .code { font-size: 0.75rem; padding: 0.2rem 0.5rem; }
}

.linksSection { 
  padding: 0 1rem 3rem; 
  width: 100%;
}

@media (min-width: 640px) {
  .linksSection { padding: 0 2rem 4rem; }
}

.grid { 
  display: grid; 
  grid-template-columns: repeat(2, 1fr); 
  gap: 0.75rem; 
  max-width: 48rem; 
  margin: 0 auto; 
}

@media (min-width: 640px) {
  .grid { gap: 1rem; }
}

@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(4, 1fr); gap: 1rem; }
}

.card { 
  display: flex; 
  flex-direction: column; 
  gap: 0.375rem; 
  padding: 0.75rem; 
  border-radius: 10px; 
  border: 1px solid #e5e5e5; 
  text-decoration: none; 
  transition: border-color 0.15s, background 0.15s; 
}

@media (min-width: 640px) {
  .card { gap: 0.5rem; padding: 1.25rem; }
}

.card:hover { 
  border-color: #d4d4d4; 
  background: #fafafa; 
}

.cardLabel { 
  font-size: 0.75rem; 
  font-weight: 600; 
  color: #000000; 
}

@media (min-width: 640px) {
  .cardLabel { font-size: 0.875rem; }
}

.cardDesc { 
  font-size: 0.625rem; 
  color: #737373; 
  line-height: 1.5; 
}

@media (min-width: 640px) {
  .cardDesc { font-size: 0.75rem; }
}

@media (prefers-color-scheme: dark) {
  .root { background: #000000; }
  .title { color: #ffffff; }
  .subtitle { color: #737373; }
  .hint { color: #525252; }
  .platformBadge { background: #111111; border-color: #222222; color: #a3a3a3; }
  .code { background: #111111; color: #d4d4d4; border-color: #222222; }
  .card { border-color: #1a1a1a; }
  .card:hover { border-color: #333333; background: #0a0a0a; }
  .cardLabel { color: #ffffff; }
  .cardDesc { color: #737373; }
}
`;
}

function generateGlobalStyles(styling: StylingOption): string {
  const reset = getCSSReset();
  if (styling === "Tailwind") return `@import "tailwindcss";\n\n${reset}`;
  if (styling === "CSS Modules") return reset;
  return reset + "\n" + getCSSPageStyles();
}

function generatePackageJson(
  projectName: string,
  useTypeScript: boolean,
  styling: StylingOption,
  platform: TargetPlatform
): PackageJsonShape {
  const isTauri = platform !== "web";

  const dependencies: Record<string, string> = {
    react: "latest",
    "react-dom": "latest",
    "react-router-dom": "latest",
    hono: "latest",
    "bini-router": "latest",
    "bini-overlay": "latest",
    "bini-server": "latest",
  };

  const devDependencies: Record<string, string> = {
    "@vitejs/plugin-react": "latest",
    vite: "latest",
    oxlint: "latest",
    oxfmt: "latest",
    "bini-env": "latest",
    "bini-export": "latest",
  };

  if (isTauri) {
    devDependencies["@tauri-apps/cli"] = "latest";
    devDependencies["cross-env"] = "latest";
    devDependencies["bini-native"] = "latest";
    dependencies["@tauri-apps/api"] = "latest";
  }

  if (useTypeScript) {
    Object.assign(devDependencies, {
      "@types/react": "latest",
      "@types/react-dom": "latest",
      "@types/node": "latest",
      typescript: "latest",
    });
  }

  if (styling === "Tailwind") {
    Object.assign(devDependencies, {
      tailwindcss: "latest",
      "@tailwindcss/vite": "latest",
    });
  }

  const scripts: PackageJsonScripts = {
    dev: isTauri ? "vite" : "vite --host --open",
    build: useTypeScript ? "tsc --noEmit && vite build" : "vite build",
    export: "vite build --mode export",
    start: "bini-server",
    preview: "vite preview --host --open",
    "type-check": useTypeScript ? "tsc --noEmit" : "echo 'TypeScript not enabled'",
    lint: "oxlint src",
    format: "oxfmt src",
    check: useTypeScript
      ? "oxlint src && oxfmt src && tsc --noEmit"
      : "oxlint src && oxfmt src",
  };

  if (isTauri) {
    scripts["predev"] = "npx @tauri-apps/cli icon public/logo.png";
    scripts["prebuild"] = "npx @tauri-apps/cli icon public/logo.png";
    scripts["tauri:dev"] = "cross-env TAURI=true tauri dev";
    scripts["tauri:build"] = "cross-env TAURI=true tauri build";
    scripts["tauri:icon"] = "npx @tauri-apps/cli icon public/logo.png";
    scripts["android"] = "npx @tauri-apps/cli android dev";
    scripts["android:dev"] = "npx @tauri-apps/cli android dev";
    scripts["android:build"] = "npx @tauri-apps/cli android build";
    scripts["ios"] = "npx @tauri-apps/cli ios dev";
    scripts["ios:dev"] = "npx @tauri-apps/cli ios dev";
    scripts["ios:build"] = "npx @tauri-apps/cli ios build";
  }

  // ⭐ CRITICAL: Add this ONLY for iOS projects
  // Xcode's Run Script build phase is hardcoded to `npm run tauri`
  // Without this, Xcode builds fail with "Missing script: tauri"
  if (platform === "ios") {
    scripts["tauri"] = "npx @tauri-apps/cli";
  }

  return {
    name: projectName,
    type: "module",
    version: "1.0.0",
    scripts,
    dependencies,
    devDependencies,
  };
}

const PAGE_LINKS = `[
  { label: 'Docs',     desc: 'Read the documentation',   href: 'https://bini.js.org'                           },
  { label: 'Examples', desc: 'Browse starter templates', href: 'https://github.com/Binidu01/bini-examples'     },
  { label: 'npm',      desc: 'View on npm registry',     href: 'https://www.npmjs.com/package/create-bini-app' },
  { label: 'GitHub',   desc: 'Star us on GitHub',        href: 'https://github.com/Binidu01'                   },
]`;

const PLATFORMS = `['Web', 'Windows', 'macOS', 'Linux', 'Android', 'iOS']`;

function buildPageContent(fileExt: string, styling: StylingOption): string {
  const useTypeScript = fileExt === "tsx";

  if (styling === "Tailwind") {
    const interfaceBlock = useTypeScript
      ? `interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
}

`
      : "";
    const propsSig = useTypeScript
      ? "({ children, className = '' }: GradientTextProps)"
      : "({ children, className = '' })";

    return `import React, { useEffect, useRef, useState } from 'react';

const links = ${PAGE_LINKS};
const platforms = ${PLATFORMS};

${interfaceBlock}const GradientText = ${propsSig} => {
  return (
    <span className={\`inline-block \${className}\`} style={{ overflow: 'visible' }}>
      <span
        style={{
          background: 'linear-gradient(to right, #22D3EE, #3B82F6)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          display: 'inline-block',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          WebkitMaskImage: 'none',
          maskImage: 'none',
          paddingBottom: '0.2em',
          paddingTop: '0.05em',
          marginBottom: '-0.15em',
          lineHeight: '1.2',
        }}
      >
        {children}
      </span>
      <span
        style={{
          position: 'absolute',
          color: '#3B82F6',
          opacity: 0,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {children}
      </span>
    </span>
  );
};

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fitContent = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const content = container.firstElementChild as HTMLElement;
      if (!content) return;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const contentWidth = content.scrollWidth;
      const contentHeight = content.scrollHeight;
      
      const scaleX = viewportWidth / contentWidth;
      const scaleY = viewportHeight / contentHeight;
      const newScale = Math.min(scaleX, scaleY, 1);
      
      setScale(newScale);
    };

    fitContent();
    window.addEventListener('resize', fitContent);
    
    const timeout = setTimeout(fitContent, 100);
    
    return () => {
      window.removeEventListener('resize', fitContent);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-screen h-screen overflow-hidden bg-white dark:bg-black flex items-center justify-center"
    >
      <div
        style={{
          transform: \`scale(\${scale})\`,
          transformOrigin: 'center center',
          width: 'fit-content',
          height: 'fit-content',
          maxWidth: '100vw',
          maxHeight: '100vh',
        }}
      >
        <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-8 py-8 sm:py-12 gap-4 sm:gap-6">
          <img 
            src="/logo.png" 
            alt="Bini.js Logo" 
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
          />
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-black dark:text-white">
            Welcome to{' '}
            <GradientText className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Bini.js
            </GradientText>
          </h1>
          
          <p className="text-base sm:text-lg text-neutral-500 dark:text-neutral-400 max-w-md px-4 sm:px-0">
            Build full-stack React apps that run on web, desktop, and mobile — powered by Tauri.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-2">
            {platforms.map((p) => (
              <span key={p}
                className="text-[10px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1">
                {p}
              </span>
            ))}
          </div>
          
          <p className="text-xs sm:text-sm text-neutral-400 dark:text-neutral-500 px-4">
            Get started by editing{' '}
            <code className="font-mono text-[10px] sm:text-xs bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
              src/app/page.${fileExt}
            </code>
          </p>
          
          <section className="px-4 sm:px-8 pb-8 sm:pb-12 w-full">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
              {links.map((l) => (
                <a 
                  key={l.label} 
                  href={l.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col gap-1.5 sm:gap-2 p-3 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-semibold text-black dark:text-white">{l.label} ↗</span>
                  <span className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{l.desc}</span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
`;
  }

  if (styling === "CSS Modules") {
    const interfaceBlock = useTypeScript
      ? `interface GradientTextProps {
  children: React.ReactNode;
}

`
      : "";
    const propsSig = useTypeScript
      ? "({ children }: GradientTextProps)"
      : "({ children })";

    return `import React, { useEffect, useRef, useState } from 'react';
import styles from './page.module.css';

const links = ${PAGE_LINKS};
const platforms = ${PLATFORMS};

${interfaceBlock}const GradientText = ${propsSig} => {
  return (
    <span className={styles.gradientTextWrap}>
      <span className={styles.gradientText}>{children}</span>
      <span className={styles.gradientTextFallback} aria-hidden="true">{children}</span>
    </span>
  );
};

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fitContent = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const content = container.firstElementChild as HTMLElement;
      if (!content) return;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const contentWidth = content.scrollWidth;
      const contentHeight = content.scrollHeight;
      
      const scaleX = viewportWidth / contentWidth;
      const scaleY = viewportHeight / contentHeight;
      const newScale = Math.min(scaleX, scaleY, 1);
      
      setScale(newScale);
    };

    fitContent();
    window.addEventListener('resize', fitContent);
    
    const timeout = setTimeout(fitContent, 100);
    
    return () => {
      window.removeEventListener('resize', fitContent);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={styles.root}
    >
      <div
        style={{
          transform: \`scale(\${scale})\`,
          transformOrigin: 'center center',
          width: 'fit-content',
          height: 'fit-content',
          maxWidth: '100vw',
          maxHeight: '100vh',
        }}
      >
        <div className={styles.content}>
          <img src="/logo.png" alt="Bini.js Logo" className={styles.heroLogo} />

          <h1 className={styles.title}>
            Welcome to <GradientText>Bini.js</GradientText>
          </h1>

          <p className={styles.subtitle}>
            Build full-stack React apps that run on web, desktop, and mobile — powered by Tauri.
          </p>

          <div className={styles.platforms}>
            {platforms.map((p) => (
              <span key={p} className={styles.platformBadge}>{p}</span>
            ))}
          </div>

          <p className={styles.hint}>
            Get started by editing <code className={styles.code}>src/app/page.${fileExt}</code>
          </p>

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
      </div>
    </div>
  );
}
`;
  }

  // None styling - using plain global CSS classes
  const interfaceBlockNone = useTypeScript
    ? `interface GradientTextProps {
  children: React.ReactNode;
}

`
    : "";
  const propsSigNone = useTypeScript
    ? "({ children }: GradientTextProps)"
    : "({ children })";

  return `import React, { useEffect, useRef, useState } from 'react';
import './globals.css';

const links = ${PAGE_LINKS};
const platforms = ${PLATFORMS};

${interfaceBlockNone}const GradientText = ${propsSigNone} => {
  return (
    <span className="gradient-text-wrap">
      <span className="gradient-text">{children}</span>
      <span className="gradient-text-fallback" aria-hidden="true">{children}</span>
    </span>
  );
};

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fitContent = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const content = container.firstElementChild as HTMLElement;
      if (!content) return;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      const contentWidth = content.scrollWidth;
      const contentHeight = content.scrollHeight;
      
      const scaleX = viewportWidth / contentWidth;
      const scaleY = viewportHeight / contentHeight;
      const newScale = Math.min(scaleX, scaleY, 1);
      
      setScale(newScale);
    };

    fitContent();
    window.addEventListener('resize', fitContent);
    
    const timeout = setTimeout(fitContent, 100);
    
    return () => {
      window.removeEventListener('resize', fitContent);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="root"
    >
      <div
        style={{
          transform: \`scale(\${scale})\`,
          transformOrigin: 'center center',
          width: 'fit-content',
          height: 'fit-content',
          maxWidth: '100vw',
          maxHeight: '100vh',
        }}
      >
        <div className="content">
          <img src="/logo.png" alt="Bini.js Logo" className="hero-logo" />

          <h1 className="title">
            Welcome to <GradientText>Bini.js</GradientText>
          </h1>

          <p className="subtitle">
            Build full-stack React apps that run on web, desktop, and mobile — powered by Tauri.
          </p>

          <div className="platforms">
            {platforms.map((p) => (
              <span key={p} className="platform-badge">{p}</span>
            ))}
          </div>

          <p className="hint">
            Get started by editing <code className="code">src/app/page.${fileExt}</code>
          </p>

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
      </div>
    </div>
  );
}
`;
}

async function generateAppFiles(
  projectPath: string,
  mainExt: FileExtension,
  useTypeScript: boolean,
  styling: StylingOption,
  isTauri: boolean
): Promise<void> {
  const appPath = path.join(projectPath, "src/app");
  const childrenProp = useTypeScript
    ? `{ children }: { children: React.ReactNode }`
    : `{ children }`;

  const mainContent = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
${isTauri ? `import { openUrl } from '@tauri-apps/plugin-opener';
import { Hono } from 'hono';` : ''}

const container = document.getElementById('root');
if (!container) throw new Error('Root container not found');

${isTauri ? `
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

if (isTauri) {
  const apiApp = new Hono();
  const modules = import.meta.glob('./app/api/*.{ts,tsx,js,jsx}', { eager: true })${useTypeScript ? ` as Record<string, { default: Hono }>` : ''};

  for (const mod of Object.values(modules)) {
    apiApp.route('/api', ${useTypeScript ? '(mod as { default: Hono }).default' : 'mod.default'});
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const requestPath = new URL(url, window.location.origin).pathname;

    if (requestPath.startsWith('/api/')) {
      return apiApp.fetch(new Request(url, init));
    }
    return originalFetch(input, init);
  };
}

if (isTauri) {
  document.addEventListener('click', async (e) => {
    const anchor = (e.target${useTypeScript ? ' as HTMLElement' : ''}).closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('?') || (href.startsWith('/') && !href.startsWith('//'))) {
      return;
    }

    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      return;
    }

    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) {
        e.preventDefault();
        e.stopPropagation();
        await openUrl(href);
      }
    } catch (err) {
      console.error('Failed to open external link:', err);
    }
  }, true);
}
` : ''}

createRoot(container).render(<App />);
`;

  await Promise.all([
    writeFile(
      path.join(projectPath, "src", `main.${mainExt}`),
      mainContent
    ),
    writeFile(
      path.join(appPath, `layout.${mainExt}`),
      `import React from 'react';
import './globals.css';

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

function generateReadme(
  projectName: string,
  useTypeScript: boolean,
  _ext: FileExtensions,
  pm: PackageManager,
  _hasTauri: boolean,
  _platform: TauriPlatform | null
): string {
  return `# ${projectName}

A **Bini.js** application — build full-stack React applications for **web, desktop, and mobile** using a single unified development experience.

Powered by **Bini.js**, **Vite**, **Hono**, and **Tauri**.

---

# Web

## Features

- File-based routing, nested layouts, per-route metadata, and automatic code splitting powered by **bini-router**.
- API routes powered by **Hono**:
  - Plain function handlers
  - Full Hono applications
  - Located inside \`src/app/api/\`
- API execution through:
  - Vite development middleware
  - bini-server in production
  - Edge runtimes when deployed
- Zero-dependency production server (**bini-server**) with:
  - ETag support
  - 304 responses
  - Graceful shutdown
  - Automatic port fallback
- Static SPA export (**bini-export**):
  - Pre-renders static routes
  - Generates optimized \`404.html\`
  - Compatible with static hosting platforms
- Deploy anywhere:
  - Netlify Edge Functions
  - Vercel Edge Runtime
  - Cloudflare Workers
  - Node.js
  - Deno
- Development overlay with:
  - Shiki-powered error highlighting
  - Automatic import support
  - GitHub Codespaces compatibility

## Commands

| Command | Description |
|---|---|
| \`${pm} run dev\` | Start the Vite development server with HMR |
| \`${pm} run build\` | Type-check and build the production application |
| \`${pm} start\` | Serve production output using bini-server |
| \`${pm} run export\` | Export the application as a static SPA |
| \`${pm} run preview\` | Preview the production build |

\`start\` and \`export\` are available only for web-target projects.

Desktop and mobile targets ship as native applications instead.

## Requirements

- Node.js >= 20.19.0

No native SDKs, platform toolchains, or signing setup required.

---

# Windows Desktop

## Features

- Builds a native Windows desktop application using **Tauri** and **WebView2**.
- Small application size without bundling a complete browser engine.
- Native APIs automatically configured through **bini-native**:
  - Filesystem
  - Clipboard
  - Notifications
  - Dialogs
  - OS information
- External URLs automatically open in the user's default browser.
- Supports Windows application signing through Authenticode.

## Commands

| Command | Description |
|---|---|
| \`${pm} run tauri:dev\` | Start the application in development mode |
| \`${pm} run tauri:build\` | Build a distributable Windows application |
| \`${pm} run tauri:icon\` | Generate application icons from \`public/logo.png\` |

## Requirements

- Microsoft C++ Build Tools

Install:

\`\`\`
Desktop development with C++
\`\`\`

- Microsoft Edge WebView2 Runtime

Verify installation:

\`\`\`bash
cl
\`\`\`

---

# macOS Desktop

## Features

- Builds a native macOS application using **Tauri** and **WKWebView**.
- Native API integration automatically configured by **bini-native**.
- Supports:
  - Filesystem access
  - Clipboard access
  - Notifications
  - Dialogs
- External URLs open in the user's default browser.
- Supports:
  - Ad-hoc signing for local testing
  - Developer ID signing
  - Application notarization

## Commands

| Command | Description |
|---|---|
| \`${pm} run tauri:dev\` | Start the application in development mode |
| \`${pm} run tauri:build\` | Build a distributable macOS application |
| \`${pm} run tauri:icon\` | Generate application icons from \`public/logo.png\` |

## Requirements

- macOS
- Xcode Command Line Tools

\`\`\`bash
xcode-select --install
\`\`\`

- Homebrew

- Tauri dependencies:

\`\`\`bash
brew install gtk+3 webkit2gtk pkg-config
\`\`\`

- Xcode (required for iOS development)

---

# Linux Desktop

## Features

- Builds native Linux applications using **Tauri** and **WebKitGTK**.
- Automatic native API integration through **bini-native**.
- Supports:
  - Filesystem
  - Clipboard
  - Notifications
  - Dialogs
- External links open using the system browser.
- Supports AppImage distribution.

## Commands

| Command | Description |
|---|---|
| \`${pm} run tauri:dev\` | Start the application in development mode |
| \`${pm} run tauri:build\` | Build Linux binaries/AppImage |
| \`${pm} run tauri:icon\` | Generate application icons from \`public/logo.png\` |

## Requirements

### Debian / Ubuntu

\`\`\`bash
sudo apt update

sudo apt install -y \\
libwebkit2gtk-4.0-dev \\
build-essential \\
libssl-dev \\
libgtk-3-dev \\
libayatana-appindicator3-dev \\
librsvg2-dev \\
libxdo-dev \\
pkg-config
\`\`\`

### Fedora

\`\`\`bash
sudo dnf groupinstall "C Development Tools and Libraries"

sudo dnf install \\
webkit2gtk4.0-devel \\
openssl-devel \\
gtk3-devel \\
libappindicator-gtk3-devel \\
librsvg2-devel \\
libxdo-devel \\
pkg-config
\`\`\`

### Arch

\`\`\`bash
sudo pacman -S \\
webkit2gtk \\
base-devel \\
openssl \\
gtk3 \\
libappindicator-gtk3 \\
librsvg \\
libxdo \\
pkg-config
\`\`\`

---

# Android

## Features

- Builds a real native Android application using Tauri's Android backend.
- Not a browser wrapper.
- Native capabilities automatically wired by **bini-native**:
  - Camera
  - Filesystem
  - Notifications
  - Geolocation
  - Device APIs
- Android configuration available through:

\`\`\`
src-tauri/gen/android
\`\`\`

- Supports release signing with:
  - Android keystore
  - keystore.properties

## Commands

| Command | Description |
|---|---|
| \`${pm} run android\` | Run on a connected Android emulator or device |
| \`${pm} run android:build\` | Build a release APK/AAB |
| \`${pm} run tauri -- android dev\` | Manual equivalent of \`${pm} run android\` |
| \`${pm} run tauri -- android build\` | Manual equivalent of \`${pm} run android:build\` |

## Requirements

- Java JDK 17
- Android Studio
- Android SDK
- Android Build Tools
- Android NDK

Environment variables:

\`\`\`
JAVA_HOME
ANDROID_HOME
\`\`\`

Rust targets:

\`\`\`bash
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android
\`\`\`

---

# iOS

## Features

- Builds a native iOS application using Tauri's iOS backend.
- Uses Apple's WKWebView runtime.
- Native plugin integration automatically managed by **bini-native**.
- Supports:
  - Automatic Xcode signing
  - Manual certificates
  - CI signing workflows

iOS builds require macOS.

Windows and Linux cannot generate iOS applications.

## Commands

| Command | Description |
|---|---|
| \`${pm} run ios\` | Run on the iOS Simulator or a connected device |
| \`${pm} run ios:build\` | Build the iOS application |
| \`${pm} run tauri -- ios dev\` | Manual equivalent of \`${pm} run ios\` |
| \`${pm} run tauri -- ios build\` | Manual equivalent of \`${pm} run ios:build\` |

## Requirements

(macOS only)

- Xcode
- Xcode Command Line Tools

\`\`\`bash
xcode-select --install
\`\`\`

- CocoaPods

\`\`\`bash
sudo gem install cocoapods
\`\`\`

Rust targets:

\`\`\`bash
rustup target add aarch64-apple-ios
rustup target add x86_64-apple-ios
rustup target add aarch64-apple-ios-sim
\`\`\`

---

# Native Integration

## bini-native

bini-native automatically manages Tauri native configuration during development and builds.

Handled automatically:

- Tauri plugin registration
- Rust dependencies
- Capability permissions
- Android configuration
- iOS configuration
- macOS configuration

No manual native wiring required.

---

# Code Signing

Signing configuration is stored in git-ignored files.

Desktop signing:

\`\`\`
.env.signing
\`\`\`

Supported platforms:

- Windows
- macOS
- Linux

Android signing:

\`\`\`
src-tauri/gen/android/keystore.properties
\`\`\`

---

# Built With

The Bini.js ecosystem:

- **Vite** — modern build pipeline with Rolldown-powered builds
- **Hono** — lightweight API framework
- **bini-router** — filesystem routing and API middleware
- **bini-export** — static SPA export
- **bini-server** — zero-dependency production server
- **bini-native** — automatic Tauri integration
- **bini-env** — environment configuration
- **bini-overlay** — development tooling
- **Oxlint** — fast Rust-based linting
- **Oxfmt** — Prettier-compatible formatter
${useTypeScript ? '\n- **TypeScript** — static type safety' : ''}

---

# Documentation

https://bini.js.org

---

Built with **Bini.js v${BINIJS_VERSION}**`;
}

async function generateTsConfig(projectPath: string): Promise<void> {
  await writeFile(
    path.join(projectPath, "tsconfig.json"),
    JSON.stringify({
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
        types: ["vite/client"],
      },
      include: ["src"],
      exclude: ["node_modules", "dist"],
    }, null, 2)
  );
}

async function generateLintAndFormatConfigs(projectPath: string): Promise<void> {
  await writeFile(
    path.join(projectPath, ".oxlintrc.json"),
    JSON.stringify({
      $schema: "./node_modules/oxlint/configuration_schema.json",
      plugins: ["react"],
      env: { browser: true, es2022: true },
      ignorePatterns: ["dist", "node_modules"],
    }, null, 2)
  );

  await writeFile(
    path.join(projectPath, ".oxfmtrc.json"),
    JSON.stringify({
      semi: false,
      singleQuote: true,
      tabWidth: 2,
      printWidth: 100,
      trailingComma: "es5",
      sortImports: true,
      sortTailwindcssClasses: true,
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

netlify/edge-functions/api.${apiExt}
`;
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
    log.warn(`Removing existing directory: ${colors.dim}${projectPath}${colors.reset}`);
    safeRm(projectPath);
  }

  log.info(`Creating project in ${colors.cyan}${projectPath}${colors.reset}`);
  checkDiskSpace(100);

  const useTypeScript = resolveTypeScript(flags, answers);
  const ext = getExtensions(useTypeScript);

  robustMkdirSync(path.join(projectPath, "src/app/api"));
  robustMkdirSync(publicPath);

  log.info("Scaffolding project files");

  const isTauri = answers.platform !== "web";
  const tauriPlatform = isTauri ? answers.platform as TauriPlatform : null;

  const basePkg = generatePackageJson(projectName, useTypeScript, answers.styling, answers.platform);

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
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${ext.main}"></script>
  </body>
</html>
`
    ),
    generateAppFiles(projectPath, ext.main, useTypeScript, answers.styling, isTauri),
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
      JSON.stringify(basePkg, null, 2)
    ),
    generateViteConfig(projectPath, useTypeScript, ext.config, answers.styling, isTauri),
    useTypeScript ? generateTsConfig(projectPath) : Promise.resolve(),
    generateLintAndFormatConfigs(projectPath),
  ]);

  log.success(
    `Generated ${colors.green}${useTypeScript ? "TypeScript" : "JavaScript"}${colors.reset}` +
    ` project with ${colors.green}${answers.styling}${colors.reset} styling`
  );

  const { pm: detectedPm, failed: pmFailed } = resolvePackageManager(flags.packageManager);
  if (!pmFailed) {
    log.info(
      flags.packageManager
        ? `Package manager: ${colors.cyan}${detectedPm}${colors.reset} (forced via --${detectedPm})`
        : `Package manager: ${colors.cyan}${detectedPm}${colors.reset}`
    );
  }

  if (isTauri && tauriPlatform) {
    await setupTauri(
      projectPath,
      tauriPlatform,
      userOS,
      detectedPm,
      projectName,
      answers.appName,
      flags.sign
    );
  }

  let shouldInstall = false;
  if (flags.install === true) { shouldInstall = true; }
  else if (flags.install === false) { shouldInstall = false; }
  else if (isInteractive()) {
    shouldInstall = await confirm({
      message: "Install dependencies now?",
      default: true,
    });
  }

  let installedDependencies = false;
  if (!pmFailed) {
    installedDependencies = await installDependencies(projectPath, detectedPm, shouldInstall);
  }

  await writeFile(
    path.join(projectPath, "README.md"),
    generateReadme(
      projectName,
      useTypeScript,
      ext,
      detectedPm,
      isTauri,
      tauriPlatform
    )
  );

  log.plain(
    `\n${colors.green}${colors.bold}OK${colors.reset} ${colors.bold}Project created!${colors.reset}` +
    ` ${colors.cyan}${projectName}${colors.reset}` +
    ` at ${colors.dim}${projectPath}${colors.reset}\n`
  );

  if (pmFailed) log.warn(`README uses "npm" as placeholder — update manually if needed.\n`);

  log.success("Get started:");
  log.plain(`\n  ${colors.green}cd ${projectName}${colors.reset}`);
  if (!installedDependencies && !pmFailed) {
    log.plain(`  ${colors.green}${detectedPm} install${colors.reset}`);
  }

  if (isTauri && tauriPlatform) {
    if (tauriPlatform === "android") {
      log.plain(`\n${colors.bold}${colors.cyan}Android Commands:${colors.reset}`);
      log.plain(`  ${colors.green}${pmRun(detectedPm, "android")}${colors.reset}          # Run on Android emulator/device`);
      log.plain(`  ${colors.green}${pmRun(detectedPm, "android:build")}${colors.reset}    # Build APK`);
    } else if (tauriPlatform === "ios") {
      log.plain(`  ${colors.green}${pmRun(detectedPm, "ios")}${colors.reset}  # Run on iOS (macOS only)`);
      log.plain(`  ${colors.green}${pmRun(detectedPm, "ios:build")}${colors.reset}  # Build iOS app`);
    } else {
      log.plain(`  ${colors.green}${pmRun(detectedPm, "tauri:dev")}${colors.reset}  # Launches ${tauriPlatform} desktop app`);
    }
  } else {
    log.plain(`  ${colors.green}${pmRun(detectedPm, "dev")}${colors.reset}`);
  }
  log.plain(`\n${colors.green}Happy coding!${colors.reset}`);
}

async function main(): Promise<void> {
  checkNodeVersion();

  const { projectName: argName, flags } = parseArguments();
  const userOS = detectUserOS();

  log.plain(LOGO);
  log.info(`Detected OS: ${userOS}`);

  let projectName = argName;

  if (!projectName) {
    if (!isInteractive()) {
      log.error("Project name required in non-interactive mode.");
      exit(1);
    }
    projectName = await input({
      message: "Project name?",
      default: "my-bini-app",
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

  const answers = await askQuestions(flags, projectName);
  await generateProject(projectName, answers, flags, userOS);
}

main().catch((err) => {
  log.error(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  exit(1);
});