import { confirm, select, input } from "@inquirer/prompts";
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
const __dirname = path.dirname(__filename);

const CLI_PACKAGE_PATH = path.join(__dirname, "..", "package.json");
const cliPackageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_PATH, "utf-8")) as { version: string };
const BINIJS_VERSION: string = cliPackageJson.version;

// Pre-baked assets bundled with the CLI — copied at scaffold time, no sharp needed
const ASSETS_DIR = path.join(__dirname, "..", "assets");

const LOGO = `
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██╗  ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝
             Developed By Binidu
`;

// Vite 8 requires Node.js 20.19+ or 22.12+
const REQUIRED_NODE = "v20.19.0";

// ─── Hoisted constants ────────────────────────────────────────────────────────

// Combined pattern for better performance
const INVALID_NAME_PATTERN = /^(\.|\.\.|npm|node)|[<>:"|?*\\]|[^a-z0-9\-.]/i;

// ─── Utility functions ────────────────────────────────────────────────────────

function isInteractive(): boolean {
  return isatty(process.stdin.fd) && isatty(process.stdout.fd);
}

// ─── System checks ────────────────────────────────────────────────────────────

function checkNodeVersion(): void {
  const versionParts = process.version.slice(1).split(".").map(Number);
  const major = versionParts[0];
  const minor = versionParts[1];
  const reqParts = REQUIRED_NODE.slice(1).split(".").map(Number);
  const reqMajor = reqParts[0];
  const reqMinor = reqParts[1];

  if (!major || !reqMajor) {
    console.error("Unable to parse Node.js version");
    process.exit(1);
  }

  if (major < reqMajor || (major === reqMajor && minor && minor < reqMinor)) {
    console.error(`Node.js ${REQUIRED_NODE} or higher required. Current: ${process.version}`);
    console.error("Please update Node.js from https://nodejs.org");
    process.exit(1);
  }
}

function checkDiskSpace(requiredMB = 100): void {
  try {
    // Use statfsSync which is available in Node.js
    if (fs.statfsSync) {
      const stats = fs.statfsSync(process.cwd());
      const freeBytes = stats.bavail * stats.bsize;
      if (freeBytes < requiredMB * 1024 * 1024) {
        throw new Error(`Insufficient disk space. Required: ${requiredMB}MB`);
      }
    } else {
      // Fallback for older Node.js versions - skip check
      console.warn("Disk space check not available, skipping...");
    }
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Could not check disk space:", error.message);
    }
  }
}

function checkNetworkConnectivity(): void {
  // Skip in non-interactive mode to prevent hanging
  if (!isInteractive()) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  fetch("https://registry.npmjs.org", { signal: controller.signal })
    .then((res) => {
      clearTimeout(timeout);
      if (!res.ok) {
        console.warn("  ⚠  npm registry returned an unexpected response. Install may fail.");
      }
    })
    .catch(() => {
      clearTimeout(timeout);
      console.warn("  ⚠  No internet connection detected. Dependency install may fail.");
    })
    .finally(() => {
      clearTimeout(timeout);
    });
}

// ─── Argument parsing ─────────────────────────────────────────────────────────

function parseArguments(): ParsedArguments {
  const args = process.argv.slice(2);

  if (args.includes("--version") || args.includes("-v")) {
    console.log(`Bini.js CLI v${BINIJS_VERSION}`);
    process.exit(0);
  }

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: create-bini-app [project-name] [options]

Options:
  --version, -v    Show version number
  --help, -h       Show help
  --typescript     Use TypeScript
  --javascript     Use JavaScript (default)
  --tailwind       Use Tailwind CSS
  --css-modules    Use CSS Modules
  --force          Overwrite existing directory

Examples:
  create-bini-app my-app
  create-bini-app my-app --typescript --tailwind
  create-bini-app my-app --javascript --force
    `);
    process.exit(0);
  }

  const hasExplicitTypeScript = args.includes("--typescript");
  const hasExplicitJavaScript = args.includes("--javascript") || args.includes("--no-typescript");

  return {
    projectName: args.find((arg) => !arg.startsWith("--")),
    flags: {
      force: args.includes("--force"),
      typescript: hasExplicitTypeScript ? true : hasExplicitJavaScript ? false : undefined,
      javascript: hasExplicitJavaScript,
      tailwind: args.includes("--tailwind"),
      cssModules: args.includes("--css-modules"),
    },
  };
}

function validateProjectName(name: string): boolean {
  return name.length > 0 && name.length <= 50 && !INVALID_NAME_PATTERN.test(name);
}

// ─── File system helpers ──────────────────────────────────────────────────────

function robustMkdirSync(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o750 });
    }
  } catch {
    throw new Error(`Cannot write to directory: ${dirPath}. Check permissions.`);
  }
}

async function secureWriteFileAsync(
  filePath: string,
  content: string | Buffer,
  options: WriteFileOptions = {}
): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    await fsPromises.mkdir(dir, { recursive: true, mode: 0o750 });
    await fsPromises.writeFile(filePath, content, {
      mode: options.mode ?? 0o640,
      flag: options.flag ?? "w",
    });
  } catch (error) {
    if (!options.force && (error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`File already exists: ${filePath}. Use --force to overwrite.`);
    }
    throw error;
  }
}

function safeRm(targetPath: string, options: SafeRmOptions = {}): void {
  const allowedBase = options.allowedBase ?? process.cwd();
  if (!targetPath) throw new Error("Path required");

  const resolved = path.resolve(targetPath);
  const base = path.resolve(allowedBase);

  // Use relative path to check for traversal attempts
  const relative = path.relative(base, resolved);
  
  // Check for path traversal
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path traversal attempt detected: ${targetPath} is outside ${allowedBase}`);
  }

  // Additional safety: check against system directories
  const systemPaths = [
    path.resolve("/"),
    path.resolve(process.env.HOME || ""),
    path.resolve(process.env.USERPROFILE || ""),
  ].filter(Boolean);

  for (const sysPath of systemPaths) {
    if (sysPath && path.resolve(sysPath) === resolved) {
      throw new Error("Refusing to delete system directory");
    }
  }

  if (!fs.existsSync(resolved)) return;

  // Depth check as additional safety (though relative check should catch most issues)
  const depth = resolved.split(path.sep).filter(Boolean).length;
  if (depth < 2) {
    throw new Error("Refusing to delete shallow directory (safety check)");
  }

  try {
    fs.rmSync(resolved, { recursive: true, force: true });
  } catch (err) {
    console.error(`Failed to delete ${resolved}:`, err);
    throw err;
  }
}

// ─── Command execution ────────────────────────────────────────────────────────

function executeCommand(command: string, options: ExecuteCommandOptions = {}): string {
  const isWindows = process.platform === "win32";
  try {
    const result = execSync(command, {
      shell: isWindows ? "cmd.exe" : "/bin/sh",
      stdio: options.stdio ?? "pipe",
      timeout: options.timeout ?? 120_000,
      cwd: options.cwd,
      windowsHide: true,
      encoding: "utf8",
    });
    return result as string;
  } catch (error) {
    const execError = error as ExecuteCommandError;
    throw new Error(
      `Command failed: ${command}\nError: ${execError.message || String(error)}`
    );
  }
}

// ─── Package manager ──────────────────────────────────────────────────────────

async function detectPackageManager(): Promise<PackageManager> {
  const candidates: PackageManagerEntry[] = [
    { name: "bun", command: "bun --version", priority: 4 },
    { name: "pnpm", command: "pnpm --version", priority: 3 },
    { name: "yarn", command: "yarn --version", priority: 2 },
    { name: "npm", command: "npm --version", priority: 1 },
  ];

  // Run all version checks in parallel with proper error handling
  const results = await Promise.allSettled(
    candidates.map(async (pm) => {
      try {
        executeCommand(pm.command, { stdio: "ignore" });
        return pm;
      } catch (error) {
        throw new Error(`Failed to detect ${pm.name}: ${error}`);
      }
    })
  );

  const detected = results
    .filter((r): r is PromiseFulfilledResult<PackageManagerEntry> => r.status === "fulfilled")
    .map((r) => r.value);

  if (detected.length === 0) {
    throw new Error("No package manager found. Please install npm, yarn, pnpm, or bun.");
  }
  
  return detected.sort((a, b) => b.priority - a.priority)[0].name;
}

async function installDependenciesWithFallbacks(
  projectPath: string,
  packageManager: PackageManager,
  skipPrompt = false
): Promise<boolean> {
  const installCommands: Record<PackageManager, string> = {
    npm: "npm install --no-audit --no-fund --loglevel=error",
    yarn: "yarn install --silent --no-progress",
    pnpm: "pnpm install --reporter=silent",
    bun: "bun install --silent",
  };

  let shouldInstall = skipPrompt;
  
  if (!skipPrompt && isInteractive()) {
    try {
      shouldInstall = await confirm({
        message: "Would you like to install dependencies automatically?",
        default: true,
      });
    } catch {
      // Non-interactive or prompt error - assume false
      shouldInstall = false;
    }
  }

  if (!shouldInstall) return false;

  try {
    executeCommand(installCommands[packageManager], {
      cwd: projectPath,
      stdio: "inherit",
      timeout: 300_000,
    });
    return true;
  } catch {
    console.log("\n  To install dependencies manually:");
    console.log(`    cd ${path.basename(projectPath)}`);
    console.log(`    ${packageManager} install`);
    return false;
  }
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

function shouldUseTypeScript(flags: CliFlags, answers: ProjectAnswers): boolean {
  if (flags.typescript === true) return true;
  if (flags.javascript === true) return false;
  return answers.typescript;
}

function getFileExtensions(useTypeScript: boolean): FileExtensions {
  return {
    main: useTypeScript ? "tsx" : "jsx",
    config: useTypeScript ? "ts" : "js",
    api: useTypeScript ? "ts" : "js",
  };
}

async function askQuestions(flags: CliFlags): Promise<ProjectAnswers> {
  let typescript: boolean;
  let styling: StylingOption;

  if (flags.typescript === true || flags.javascript === true) {
    typescript = flags.typescript === true;
  } else if (isInteractive()) {
    typescript = await confirm({ message: "Would you like to use TypeScript?", default: true });
  } else {
    typescript = true; // Default to TypeScript in non-interactive mode
  }

  if (flags.tailwind === true || flags.cssModules === true) {
    styling = flags.tailwind ? "Tailwind" : "CSS Modules";
  } else if (isInteractive()) {
    styling = await select<StylingOption>({
      message: "Which styling solution would you like to use?",
      choices: [
        { name: "Tailwind CSS", value: "Tailwind" },
        { name: "CSS Modules", value: "CSS Modules" },
        { name: "None", value: "None" },
      ],
      default: "Tailwind",
    });
  } else {
    styling = "Tailwind"; // Default to Tailwind in non-interactive mode
  }

  return { typescript, styling };
}

// ─── Asset copying ────────────────────────────────────────────────────────────

async function copyFaviconFiles(publicPath: string): Promise<void> {
  const files = ["favicon.ico", "apple-touch-icon.png", "og-image.png"] as const;

  await Promise.all(
    files.map(async (file) => {
      const src = path.join(ASSETS_DIR, file);
      const dest = path.join(publicPath, file);

      try {
        await fsPromises.access(src);
        await fsPromises.copyFile(src, dest);
      } catch (error) {
        console.warn(`  ⚠  Asset not found or failed to copy: ${src} — skipping ${file}`);
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
  await secureWriteFileAsync(
    path.join(projectPath, "public", "site.webmanifest"),
    JSON.stringify(manifest, null, 2)
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS_RESET = `* { box-sizing: border-box; }
html { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
body { line-height: 1.5; min-height: 100vh; margin: 0; }
#root { min-height: 100vh; }
`;

const CSS_DARK_OVERRIDES = `
@media (prefers-color-scheme: dark) {
  .root { background: #000; }
  .header { border-bottom-color: #111; }
  .header-name { color: #fff; }
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

const CSS_PAGE_STYLES = `.root { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }
.header { display: flex; align-items: center; gap: 0.5rem; padding: 1.25rem 2rem; border-bottom: 1px solid #f5f5f5; }
.header-logo { width: 1.75rem; height: 1.75rem; }
.header-name { font-size: 0.875rem; font-weight: 600; color: #000; }
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
`;

const CSS_MODULE_STYLES = `.root { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }
.header { display: flex; align-items: center; gap: 0.5rem; padding: 1.25rem 2rem; border-bottom: 1px solid #f5f5f5; }
.headerLogo { width: 1.75rem; height: 1.75rem; }
.headerName { font-size: 0.875rem; font-weight: 600; color: #000; }
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
  .header { border-bottom-color: #111; }
  .headerName { color: #fff; }
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

async function generateCSSModulesFiles(projectPath: string): Promise<void> {
  await secureWriteFileAsync(path.join(projectPath, "src/app/page.module.css"), CSS_MODULE_STYLES);
}

function generateGlobalStyles(styling: StylingOption): string {
  if (styling === "Tailwind") return `@import "tailwindcss";\n\n${CSS_RESET}`;
  if (styling === "CSS Modules") return CSS_RESET;
  return CSS_RESET + "\n" + CSS_PAGE_STYLES + CSS_DARK_OVERRIDES;
}

// ─── package.json ─────────────────────────────────────────────────────────────

function generatePackageJson(
  projectName: string,
  useTypeScript: boolean,
  styling: StylingOption
): PackageJsonShape {
  const dependencies: Record<string, string> = {
    react: "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.1",
    hono: "^4.12.9",
    "bini-router": "^1.0.27",
    "bini-overlay": "^1.0.5",
    "bini-server": "^1.0.1",
  };

  const devDependencies: Record<string, string> = {
    "@vitejs/plugin-react": "^6.0.1",
    vite: "^8.0.3",
    oxlint: "latest",
    oxfmt: "latest",
    "bini-env": "^1.0.7",
    "bini-export": "^1.0.1",
  };

  if (useTypeScript) {
    devDependencies["@types/react"] = "^19.2.14";
    devDependencies["@types/react-dom"] = "^19.2.3";
    devDependencies["@types/node"] = "^25.4.0";
    devDependencies["typescript"] = "^5.9.3";
  }

  if (styling === "Tailwind") {
    devDependencies["tailwindcss"] = "^4.2.1";
    devDependencies["@tailwindcss/vite"] = "^4.2.1";
  }

  return {
    name: projectName,
    type: "module",
    version: "1.0.0",
    scripts: {
      dev: "vite --host --open",
      build: "vite build",
      export: "vite build --mode export",
      start: "bini-server",
      preview: "vite preview --host --open",
      "type-check": useTypeScript ? "tsc --noEmit" : "echo 'TypeScript not enabled'",
      lint: "oxlint --plugin react --plugin react-hooks src",
      format: "oxfmt src",
      check: "oxlint --plugin react --plugin react-hooks src && oxfmt --check src",
    },
    dependencies,
    devDependencies,
  };
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
  const tailwindPlugin = styling === "Tailwind" ? `tailwindcss(),\n      ` : "";

  const content = useTypeScript
    ? `import { defineConfig, loadEnv } from 'vite';
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
      biniroute({ platform: 'netlify' }),
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
    optimizeDeps: { include: ['react', 'react-dom', 'react-router-dom'] },
  };
});
`
    : `import { defineConfig, loadEnv } from 'vite';
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
      biniroute({ platform: 'netlify' }),
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
    optimizeDeps: { include: ['react', 'react-dom', 'react-router-dom'] },
  };
});
`;

  await secureWriteFileAsync(path.join(projectPath, `vite.config.${configExt}`), content);
}

// ─── Oxlint + Oxfmt config ────────────────────────────────────────────────────

async function generateLintAndFormatConfigs(
  projectPath: string,
  useTypeScript: boolean
): Promise<void> {
  const oxlintConfig = {
    $schema: "./node_modules/oxlint/configuration_schema.json",
    plugins: ["react", "react-hooks"],
    env: { browser: true, es2022: true, node: true },
    rules: {
      correctness: "error",
      suspicious: "warn",
      "react/jsx-key": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...(useTypeScript
        ? {
            "@typescript-eslint/no-unused-vars": [
              "error",
              { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
          }
        : {}),
    },
    ignorePatterns: ["dist", "node_modules"],
  };

  await secureWriteFileAsync(
    path.join(projectPath, ".oxlintrc.json"),
    JSON.stringify(oxlintConfig, null, 2)
  );

  const oxfmtConfig = {
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    printWidth: 100,
    trailingComma: "es5",
    sortImports: true,
    sortTailwindcssClasses: true,
  };

  await secureWriteFileAsync(
    path.join(projectPath, ".oxfmt.json"),
    JSON.stringify(oxfmtConfig, null, 2)
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

const LOGO_SVG_TAILWIND = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className="w-20 h-20">
          ${LOGO_SVG_INNER}
        </svg>`;

const LOGO_SVG_MODULES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className={styles.heroLogo}>
          ${LOGO_SVG_INNER}
        </svg>`;

const LOGO_SVG_PLAIN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className="hero-logo">
          ${LOGO_SVG_INNER}
        </svg>`;

function buildPageContent(fileExt: string, styling: StylingOption): string {
  if (styling === "Tailwind") {
    return `import React from 'react';

const links = ${PAGE_LINKS};

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center text-center px-8 py-20 gap-6">
        ${LOGO_SVG_TAILWIND}
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
        ${LOGO_SVG_MODULES}
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

  return `import React from 'react';

const links = ${PAGE_LINKS};

export default function Home() {
  return (
    <div className="root">
      <main className="hero">
        ${LOGO_SVG_PLAIN}
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
  const appPath = path.join(projectPath, "src/app");

  await secureWriteFileAsync(
    path.join(projectPath, "src", `main.${mainExt}`),
    `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Root container not found');
createRoot(container).render(<App />);
`
  );

  const childrenProp = useTypeScript
    ? `{ children }: { children: React.ReactNode }`
    : `{ children }`;

  await secureWriteFileAsync(
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
  );

  await secureWriteFileAsync(
    path.join(appPath, `page.${mainExt}`),
    buildPageContent(mainExt, styling)
  );
}

// ─── Other config files ───────────────────────────────────────────────────────

async function generateOtherConfigFiles(
  projectPath: string,
  useTypeScript: boolean
): Promise<void> {
  if (useTypeScript) {
    await secureWriteFileAsync(
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
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: "react-jsx",
            strict: true,
            baseUrl: ".",
            paths: { "@/*": ["./src/*"] },
            forceConsistentCasingInFileNames: true,
          },
          include: ["src"],
          exclude: ["node_modules", "dist"],
        },
        null,
        2
      )
    );
  }

  await generateLintAndFormatConfigs(projectPath, useTypeScript);
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
${pm} run build
${pm} start        # served by bini-server
\`\`\`

## Static Export (GitHub Pages / Netlify Static / S3)

\`\`\`bash
${pm} run export   # vite build --mode export
\`\`\`

Generates a fully pre-rendered \`dist/\` with per-route \`index.html\` files and a smart \`404.html\` — no server required.

## Linting & Formatting

\`\`\`bash
${pm} run lint     # Oxlint — 50-100x faster than ESLint
${pm} run format   # Oxfmt  — Prettier-compatible formatter
${pm} run check    # lint + format check combined (great for CI)
\`\`\`

## API Routes

Create files in \`src/app/api/\`. Export a Hono app:

\`\`\`${useTypeScript ? "typescript" : "javascript"}
// src/app/api/hello.${ext.api}
import { Hono } from 'hono'

const app = new Hono().basePath('/api')

app.get('/hello', (c) => c.json({ message: 'Hello!' }))

export default app
\`\`\`

Access at \`http://localhost:3000/api/hello\`

## File Structure

\`\`\`
${projectName}/
├── src/
│   ├── app/
│   │   ├── api/              ← API routes (Hono)
│   │   ├── layout.${ext.main}       ← root layout + metadata
│   │   ├── page.${ext.main}         ← /
│   │   ├── not-found.${ext.main}    ← custom 404
│   │   └── globals.css
│   └── main.${ext.main}             ← mounts <App /> (auto-generated by bini-router)
├── public/
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── og-image.png
│   └── site.webmanifest
├── .oxlintrc.json
├── .oxfmt.json
├── vite.config.${ext.config}
└── package.json
\`\`\`

## Layouts

- \`src/app/layout.${ext.main}\` — root layout, uses \`{children}\`, export \`metadata\` here
- Nested layouts (e.g. \`src/app/dashboard/layout.${ext.main}\`) use \`<Outlet />\` from react-router-dom

## Powered by

- **Vite 8**       — Rolldown-powered builds, dramatically faster
- **bini-router**  — filesystem routing + API middleware
- **bini-export**  — static SPA export (GitHub Pages, Netlify, S3)
- **bini-overlay** — dev overlay badge
- **bini-env**     — environment file display
- **bini-server**  — production server (zero dependencies)
- **Oxlint**       — fast Rust-based linter (replaces ESLint)
- **Oxfmt**        — fast Prettier-compatible formatter

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
  const publicPath = path.join(projectPath, "public");

  try {
    checkDiskSpace(100);
    checkNetworkConnectivity(); // non-blocking — returns immediately

    if (fs.existsSync(projectPath) && !flags.force) {
      throw new Error(`Directory "${projectName}" already exists. Use --force to overwrite.`);
    }
    if (flags.force && fs.existsSync(projectPath)) safeRm(projectPath);

    const useTypeScript = shouldUseTypeScript(flags, answers);
    const ext = getFileExtensions(useTypeScript);

    robustMkdirSync(path.join(projectPath, "src/app/api"));
    robustMkdirSync(publicPath);

    // Copy assets and generate manifest in parallel
    const assetPromises = Promise.all([
      copyFaviconFiles(publicPath),
      generateWebManifest(projectPath),
    ]);

    // Generate all files in parallel for better performance
    await Promise.all([
      secureWriteFileAsync(
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
`,
        { force: flags.force }
      ),
      generateAppFiles(projectPath, ext.main, useTypeScript, answers.styling),
      answers.styling === "CSS Modules"
        ? generateCSSModulesFiles(projectPath)
        : Promise.resolve(),
      secureWriteFileAsync(
        path.join(projectPath, "src/app/globals.css"),
        generateGlobalStyles(answers.styling),
        { force: flags.force }
      ),
      secureWriteFileAsync(
        path.join(projectPath, `src/app/api/hello.${ext.api}`),
        `import { Hono } from 'hono'

const app = new Hono().basePath('/api')

app.all('/hello', (c) => {
  return c.json({
    message  : 'Hello from Bini.js!',
    timestamp: new Date().toISOString(),
    method   : c.req.method,
  })
})

export default app
`,
        { force: flags.force }
      ),
      secureWriteFileAsync(
        path.join(projectPath, ".gitignore"),
        generateGitignore(ext.api),
        { force: flags.force }
      ),
      secureWriteFileAsync(
        path.join(projectPath, "package.json"),
        JSON.stringify(generatePackageJson(projectName, useTypeScript, answers.styling), null, 2),
        { force: flags.force }
      ),
      generateViteConfig(projectPath, useTypeScript, ext.config, answers.styling),
      generateOtherConfigFiles(projectPath, useTypeScript),
    ]);

    // Wait for asset copying to complete
    await assetPromises;

    let installedDependencies = false;
    let detectedPackageManager: PackageManager = "npm";

    try {
      detectedPackageManager = await detectPackageManager();
      installedDependencies = await installDependenciesWithFallbacks(
        projectPath,
        detectedPackageManager,
        !isInteractive() // Skip prompt in non-interactive mode
      );
    } catch (error) {
      // Non-fatal - user can install manually
      if (isInteractive()) {
        console.warn(`  ⚠  Could not detect package manager: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    await secureWriteFileAsync(
      path.join(projectPath, "README.md"),
      generateReadme(projectName, useTypeScript, ext, detectedPackageManager),
      { force: flags.force }
    );

    console.log(`\nSuccess! Created ${projectName} at ${path.join(process.cwd(), projectName)}\n`);
    console.log(`We suggest that you begin by typing:\n`);
    console.log(`  cd ${projectName}`);
    if (!installedDependencies) console.log(`  ${detectedPackageManager} install`);
    console.log(`  ${detectedPackageManager} run dev\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nAborted! ${message}`);
    if (fs.existsSync(projectPath)) {
      try {
        safeRm(projectPath);
      } catch {
        // best-effort cleanup
      }
    }
    throw error;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    checkNodeVersion();

    const args = parseArguments();

    console.log(LOGO);

    let projectName = args.projectName;
    if (!projectName) {
      if (!isInteractive()) {
        console.error("Project name required in non-interactive mode");
        process.exit(1);
      }
      projectName = await input({
        message: "What is your project named?",
        default: "my-bini-app",
        validate: (value: string) => {
          if (!value) return "Name required";
          if (!validateProjectName(value))
            return "Use lowercase letters, numbers, and hyphens only. Max 50 chars.";
          return true;
        },
      });
    }

    if (!validateProjectName(projectName)) {
      console.error("Invalid project name. Use lowercase letters, numbers, and hyphens only. Max 50 chars.");
      process.exit(1);
    }

    const answers = await askQuestions(args.flags);
    await generateProject(projectName, answers, args.flags);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\nAborted!", message);
    process.exit(1);
  }
}

// Global error handlers
process.on("uncaughtException", (e: Error) => {
  console.error("\nUncaught Exception:", e.message);
  process.exit(1);
});
process.on("unhandledRejection", (r: unknown) => {
  console.error("\nUnhandled Rejection:", r);
  process.exit(1);
});

// Run main with proper error handling
main().catch((error) => {
  console.error("\nFatal Error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});