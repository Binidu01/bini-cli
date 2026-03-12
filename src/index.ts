import { confirm, select, input } from "@inquirer/prompts";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import sharp from "sharp";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CliFlags {
  force: boolean;
  typescript: boolean | undefined;
  javascript: boolean;
  tailwind: boolean;
  cssModules: boolean;
  minimal: boolean;
  verbose: boolean;
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
  start: string;
  preview: string;
  "type-check": string;
  lint: string;
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

interface SafeRmOptions {
  allowedBase?: string;
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_PACKAGE_PATH = path.join(__dirname, "..", "package.json");
const cliPackageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_PATH, "utf-8")) as { version: string };
const BINIJS_VERSION: string = cliPackageJson.version;

const LOGO = `
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██╗  ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝
             Developed By Binidu
`;

const REQUIRED_NODE = "v18.0.0";

// ─── System checks ────────────────────────────────────────────────────────────

function checkNodeVersion(): void {
  const [major, minor] = process.version.slice(1).split(".").map(Number);
  const [reqMajor, reqMinor] = REQUIRED_NODE.slice(1).split(".").map(Number);
  if (major < reqMajor || (major === reqMajor && minor < reqMinor)) {
    console.error(`Node.js ${REQUIRED_NODE} or higher required. Current: ${process.version}`);
    console.error("Please update Node.js from https://nodejs.org");
    process.exit(1);
  }
}

function checkDiskSpace(requiredMB = 100): void {
  try {
    if (fs.statfsSync) {
      const stats = fs.statfsSync(process.cwd());
      const freeBytes = stats.bavail * stats.bsize;
      if (freeBytes < requiredMB * 1024 * 1024) {
        throw new Error(`Insufficient disk space. Required: ${requiredMB}MB`);
      }
    }
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn("Could not check disk space:", error.message);
    }
  }
}

async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch("https://registry.npmjs.org", { signal: controller.signal });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
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
  --minimal        Minimal setup with fewer files
  --verbose        Show detailed logs

Examples:
  create-bini-app my-app
  create-bini-app my-app --typescript --tailwind
  create-bini-app my-app --javascript --force
  create-bini-app my-app --minimal
    `);
    process.exit(0);
  }

  const hasExplicitTypeScript = args.includes("--typescript");
  const hasExplicitJavaScript =
    args.includes("--javascript") || args.includes("--no-typescript");

  return {
    projectName: args.find((arg) => !arg.startsWith("--")),
    flags: {
      force     : args.includes("--force"),
      typescript: hasExplicitTypeScript ? true : hasExplicitJavaScript ? false : undefined,
      javascript: hasExplicitJavaScript,
      tailwind  : args.includes("--tailwind"),
      cssModules: args.includes("--css-modules"),
      minimal   : args.includes("--minimal"),
      verbose   : args.includes("--verbose"),
    },
  };
}

function validateProjectName(name: string): boolean {
  const invalidPatterns = [/\.\./, /[<>:"|?*]/, /^(npm|node|bini|\.)/, /[^\w\-.]/];
  return (
    !invalidPatterns.some((p) => p.test(name)) &&
    name.length > 0 &&
    name.length <= 50
  );
}

// ─── File system helpers ──────────────────────────────────────────────────────

function robustMkdirSync(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
    }
  } catch {
    throw new Error(`Cannot write to directory: ${dirPath}. Check permissions.`);
  }
}

function secureWriteFile(
  filePath: string,
  content: string | Buffer,
  options: WriteFileOptions = {}
): void {
  if (fs.existsSync(filePath) && !options.force) {
    throw new Error(`File already exists: ${filePath}. Use --force to overwrite.`);
  }
  robustMkdirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, content, {
    mode: options.mode ?? 0o644,
    flag: options.flag ?? "w",
  });
}

function safeRm(targetPath: string, options: SafeRmOptions = {}): void {
  const allowedBase = options.allowedBase ?? process.cwd();
  if (!targetPath) throw new Error("Path required");

  const resolved = path.resolve(targetPath);
  const base = path.resolve(allowedBase);

  if (resolved === base) throw new Error("Refusing to rm project root");
  if (!resolved.startsWith(base + path.sep))
    throw new Error("Refusing to rm outside allowed base");

  const forbidden: string[] = [
    path.resolve("/"),
    path.resolve(process.env["HOME"] ?? ""),
    path.resolve(process.env["USERPROFILE"] ?? ""),
    path.resolve(process.cwd()),
    path.resolve(__dirname),
  ].filter(Boolean);

  if (forbidden.some((f) => resolved === f || resolved.startsWith(f + path.sep))) {
    throw new Error("Refusing to rm forbidden path");
  }

  try {
    const stat = fs.statSync(resolved);
    if (stat.isDirectory() && resolved.split(path.sep).length < 3) {
      throw new Error("Refusing to rm shallow system directory");
    }
  } catch {
    throw new Error("Path does not exist or is inaccessible");
  }

  fs.rmSync(resolved, { recursive: true, force: true });
}

// ─── Command execution ────────────────────────────────────────────────────────

function executeCommand(command: string, options: ExecuteCommandOptions = {}): string {
  const isWindows = process.platform === "win32";
  try {
    const result = execSync(command, {
      shell      : isWindows ? "cmd.exe" : "/bin/sh",
      stdio      : options.stdio ?? "pipe",
      timeout    : options.timeout ?? 120_000,
      cwd        : options.cwd,
      windowsHide: true,
      encoding   : "utf8",
    });
    return typeof result === "string" ? result : "";
  } catch (error) {
    throw new Error(
      `Command failed: ${command}\nError: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ─── Package manager ──────────────────────────────────────────────────────────

async function detectPackageManager(): Promise<PackageManager> {
  const candidates: PackageManagerEntry[] = [
    { name: "bun",  command: "bun --version",  priority: 4 },
    { name: "pnpm", command: "pnpm --version", priority: 3 },
    { name: "yarn", command: "yarn --version", priority: 2 },
    { name: "npm",  command: "npm --version",  priority: 1 },
  ];

  const detected: PackageManagerEntry[] = [];
  for (const pm of candidates) {
    try {
      executeCommand(pm.command, { stdio: "ignore" });
      detected.push(pm);
    } catch {
      // not available
    }
  }

  if (detected.length === 0) throw new Error("No package manager found.");
  return detected.sort((a, b) => b.priority - a.priority)[0]!.name;
}

async function installDependenciesWithFallbacks(
  projectPath: string,
  packageManager: PackageManager
): Promise<boolean> {
  const installCommands: Record<PackageManager, string> = {
    npm : "npm install --no-audit --no-fund --loglevel=error",
    yarn: "yarn install --silent --no-progress",
    pnpm: "pnpm install --reporter=silent",
    bun : "bun install --silent",
  };

  try {
    executeCommand(installCommands[packageManager], {
      cwd    : projectPath,
      stdio  : "inherit",
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
  if (flags.typescript === true)  return true;
  if (flags.javascript === true)  return false;
  return answers.typescript;
}

function getFileExtensions(useTypeScript: boolean): FileExtensions {
  return {
    main  : useTypeScript ? "tsx" : "jsx",
    config: useTypeScript ? "ts" : "js",
    api   : useTypeScript ? "ts" : "js",
  };
}

async function askQuestions(flags: CliFlags): Promise<ProjectAnswers> {
  let typescript: boolean;
  let styling: StylingOption;

  if (flags.typescript === true || flags.javascript === true) {
    typescript = flags.typescript === true;
  } else {
    typescript = await confirm({
      message: "Would you like to use TypeScript?",
      default: true,
    });
  }

  if (flags.tailwind === true || flags.cssModules === true) {
    styling = flags.tailwind ? "Tailwind" : "CSS Modules";
  } else {
    styling = await select<StylingOption>({
      message: "Which styling solution would you like to use?",
      choices: [
        { name: "Tailwind CSS", value: "Tailwind"    },
        { name: "CSS Modules",  value: "CSS Modules" },
        { name: "None",         value: "None"        },
      ],
      default: "Tailwind",
    });
  }

  return { typescript, styling };
}

// ─── Favicon generation ───────────────────────────────────────────────────────

async function generateFaviconFiles(publicPath: string): Promise<void> {
  const betaSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00CFFF"/>
      <stop offset="100%" stop-color="#0077FF"/>
    </linearGradient>
  </defs>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
    font-family="Segoe UI, Arial, sans-serif" font-size="90" font-weight="700" fill="url(#grad)">
    ß
  </text>
</svg>`;

  const ogImageSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" fill="#ffffff"/>
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00CFFF"/>
      <stop offset="100%" stop-color="#0077FF"/>
    </linearGradient>
  </defs>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
    font-family="Segoe UI, Arial, sans-serif" font-size="450" font-weight="700" fill="url(#grad)">
    ß
  </text>
</svg>`;

  secureWriteFile(path.join(publicPath, "favicon.svg"), betaSVG);

  const svgBuffer = Buffer.from(betaSVG);
  const ogBuffer  = Buffer.from(ogImageSVG);
  const sizes: number[] = [16, 32, 64, 180, 512];

  try {
    for (const size of sizes) {
      await sharp(svgBuffer)
        .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path.join(publicPath, `favicon-${size}x${size}.png`));
    }
    await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicPath, "favicon.png"));
    await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicPath, "apple-touch-icon.png"));
    await sharp(ogBuffer).resize(1200, 630).png().toFile(path.join(publicPath, "og-image.png"));
  } catch {
    const fallbackColour = { r: 0, g: 207, b: 255, alpha: 255 } as const;
    for (const size of sizes) {
      const buf = await sharp({
        create: { width: size, height: size, channels: 4, background: fallbackColour },
      })
        .png()
        .toBuffer();
      secureWriteFile(path.join(publicPath, `favicon-${size}x${size}.png`), buf);
    }
    const def   = await sharp({ create: { width: 512,  height: 512,  channels: 4, background: fallbackColour } }).png().toBuffer();
    const apple = await sharp({ create: { width: 180,  height: 180,  channels: 4, background: fallbackColour } }).png().toBuffer();
    const og    = await sharp({ create: { width: 1200, height: 630,  channels: 4, background: fallbackColour } }).png().toBuffer();
    secureWriteFile(path.join(publicPath, "favicon.png"),          def);
    secureWriteFile(path.join(publicPath, "apple-touch-icon.png"), apple);
    secureWriteFile(path.join(publicPath, "og-image.png"),         og);
  }
}

function generateWebManifest(projectPath: string): void {
  const manifest: WebManifest = {
    name            : "Bini.js App",
    short_name      : "BiniApp",
    description     : "Modern React application built with Bini.js",
    start_url       : "/",
    display         : "standalone",
    background_color: "#ffffff",
    theme_color     : "#00CFFF",
    icons: [16, 32, 64, 180, 512].map((size) => ({
      src  : `/favicon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type : "image/png",
    })),
  };
  secureWriteFile(
    path.join(projectPath, "public", "site.webmanifest"),
    JSON.stringify(manifest, null, 2)
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

function generateCSSModulesFiles(projectPath: string): void {
  const appPath = path.join(projectPath, "src/app");
  secureWriteFile(
    path.join(appPath, "page.module.css"),
    `.root { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }
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
`
  );
}

function generateGlobalStyles(styling: StylingOption): string {
  if (styling === "Tailwind") {
    return `@import "tailwindcss";

* { box-sizing: border-box; }
html { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
body { line-height: 1.5; min-height: 100vh; margin: 0; }
#root { min-height: 100vh; }
`;
  }

  // CSS Modules and None share the same minimal reset — page styles live in page.module.css or globals below
  const reset = `* { box-sizing: border-box; }
html { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
body { line-height: 1.5; min-height: 100vh; margin: 0; }
#root { min-height: 100vh; }
`;

  if (styling === "CSS Modules") return reset;

  // None — full page styles as global classes
  return reset + `
.root { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }
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
}

// ─── package.json ─────────────────────────────────────────────────────────────

function generatePackageJson(
  projectName: string,
  useTypeScript: boolean,
  styling: StylingOption
): PackageJsonShape {
  const dependencies: Record<string, string> = {
    react             : "^19.2.4",
    "react-dom"       : "^19.2.4",
    "react-router-dom": "^7.13.1",
    hono              : "^4.12.7",
    "bini-router"     : "^1.0.23",
    "bini-overlay"    : "^1.0.4",
    "bini-server"     : "^1.0.0",
    sharp             : "^0.34.5",
  };

  const devDependencies: Record<string, string> = {
    "@vitejs/plugin-react"       : "^5.1.4",
    vite                         : "^7.3.1",
    "@eslint/js"                 : "^10.0.1",
    eslint                       : "^10.0.3",
    "eslint-plugin-react-hooks"  : "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    globals                      : "^17.4.0",
    "html-minifier-terser"       : "^7.2.0",
    terser                       : "^5.46.0",
    "bini-env"                   : "^1.0.3",
  };

  if (useTypeScript) {
    devDependencies["@types/react"]      = "^19.2.14";
    devDependencies["@types/react-dom"]  = "^19.2.3";
    devDependencies["@types/node"]       = "^25.4.0";
    devDependencies["typescript"]        = "^5.9.3";
    devDependencies["typescript-eslint"] = "^8.0.0";
  }

  if (styling === "Tailwind") {
    devDependencies["tailwindcss"]       = "^4.2.1";
    devDependencies["@tailwindcss/vite"] = "^4.2.1";
  }

  return {
    name   : projectName,
    type   : "module",
    version: "1.0.0",
    scripts: {
      dev          : "vite --host --open",
      build        : "vite build",
      start        : "bini-server",
      preview      : "vite preview --host --open",
      "type-check" : useTypeScript ? "tsc --noEmit" : "echo 'TypeScript not enabled'",
      lint         : `eslint . --ext .js,.jsx${useTypeScript ? ",.ts,.tsx" : ""}`,
    },
    dependencies,
    devDependencies,
  };
}

// ─── vite.config ──────────────────────────────────────────────────────────────

function generateViteConfig(
  projectPath: string,
  useTypeScript: boolean,
  configExt: ConfigExtension,
  styling: StylingOption
): void {
  const tailwindImport = styling === "Tailwind" ? `import tailwindcss from '@tailwindcss/vite';\n` : "";
  const tailwindPlugin = styling === "Tailwind" ? `tailwindcss(),\n      ` : "";

  let content: string;

  if (useTypeScript) {
    // ── TypeScript vite.config.ts ─────────────────────────────────────────
    content = `import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { minify } from 'html-minifier-terser';
import biniConfig from './bini.config.ts';
import { biniroute } from 'bini-router';
import { biniOverlay } from 'bini-overlay';
import biniEnv from 'bini-env';
${tailwindImport}
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isBuild = command === 'build';
  const port = (biniConfig as { port?: number }).port || 3000;

  const hmrConfig = env['CODESPACE_NAME']
    ? { clientPort: 443, overlay: true }
    : { overlay: true, host: 'localhost' };

  return {
    plugins: [
      ${tailwindPlugin}react(),
      biniroute({ platform: 'netlify' }),
      biniOverlay(),
      biniEnv(),
      {
        name : 'bini-html-minifier',
        apply: 'build' as const,
        closeBundle: async () => {
          const distDir = path.resolve('dist');
          if (!fs.existsSync(distDir)) return;

          const processHTML = async (filePath: string): Promise<void> => {
            const html = await fs.promises.readFile(filePath, 'utf8');
            const minified = await minify(html, {
              collapseWhitespace            : true,
              removeComments                : true,
              removeRedundantAttributes     : true,
              removeEmptyAttributes         : false,
              removeScriptTypeAttributes    : true,
              removeStyleLinkTypeAttributes : false,
              minifyCSS                     : false,
              minifyJS                      : false,
            });
            await fs.promises.writeFile(filePath, minified, 'utf8');
          };

          const walk = async (dir: string): Promise<void> => {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) await walk(fullPath);
              else if (entry.name.endsWith('.html')) await processHTML(fullPath);
            }
          };

          await walk(distDir);
        },
      },
    ],

    server: {
      port,
      host   : env['CODESPACE_NAME'] ? '0.0.0.0' : ((biniConfig as { host?: string }).host || 'localhost'),
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
      sourcemap            : (biniConfig as { build?: { sourcemap?: boolean } }).build?.sourcemap !== false && !isBuild,
      emptyOutDir          : true,
      minify               : 'terser',
      cssCodeSplit         : true,
      reportCompressedSize : true,
      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          chunkFileNames : 'js/[name]-[hash].js',
          entryFileNames : 'js/[name]-[hash].js',
          assetFileNames : (assetInfo) => {
            const name = assetInfo.names?.[0] ?? assetInfo.name ?? '';
            const ext  = name.split('.').pop() ?? '';
            if (/png|jpe?g|gif|svg|webp|avif/.test(ext)) return 'assets/images/[name]-[hash][extname]';
            if (/woff2?|eot|ttf|otf/.test(ext))          return 'assets/fonts/[name]-[hash][extname]';
            if (ext === 'css')  return 'css/[name]-[hash][extname]';
            if (ext === 'json') return 'data/[name]-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
        },
      },

      terserOptions: {
        compress: { drop_console: isBuild, drop_debugger: isBuild, passes: 2 },
        format  : { comments: false },
      },
    },

    resolve: { alias: { '@': '/src' } },
    css    : { modules: { localsConvention: 'camelCase' }, devSourcemap: true },
    optimizeDeps: { include: ['react', 'react-dom', 'react-router-dom'], exclude: ['@bini/internal'] },
  };
});
`;
  } else {
    // ── JavaScript vite.config.js ─────────────────────────────────────────
    content = `import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { minify } from 'html-minifier-terser';
import biniConfig from './bini.config.js';
import { biniroute } from 'bini-router';
import { biniOverlay } from 'bini-overlay';
import biniEnv from 'bini-env';
${tailwindImport}
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isBuild = command === 'build';
  const port = biniConfig?.port || 3000;

  const hmrConfig = env['CODESPACE_NAME']
    ? { clientPort: 443, overlay: true }
    : { overlay: true, host: 'localhost' };

  return {
    plugins: [
      ${tailwindPlugin}react(),
      biniroute({ platform: 'netlify' }),
      biniOverlay(),
      biniEnv(),
      {
        name : 'bini-html-minifier',
        apply: 'build',
        closeBundle: async () => {
          const distDir = path.resolve('dist');
          if (!fs.existsSync(distDir)) return;

          const processHTML = async (filePath) => {
            const html = await fs.promises.readFile(filePath, 'utf8');
            const minified = await minify(html, {
              collapseWhitespace            : true,
              removeComments                : true,
              removeRedundantAttributes     : true,
              removeEmptyAttributes         : false,
              removeScriptTypeAttributes    : true,
              removeStyleLinkTypeAttributes : false,
              minifyCSS                     : false,
              minifyJS                      : false,
            });
            await fs.promises.writeFile(filePath, minified, 'utf8');
          };

          const walk = async (dir) => {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) await walk(fullPath);
              else if (entry.name.endsWith('.html')) await processHTML(fullPath);
            }
          };

          await walk(distDir);
        },
      },
    ],

    server: {
      port,
      host   : env['CODESPACE_NAME'] ? '0.0.0.0' : (biniConfig?.host || 'localhost'),
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
      sourcemap            : biniConfig?.build?.sourcemap !== false && !isBuild,
      emptyOutDir          : true,
      minify               : 'terser',
      cssCodeSplit         : true,
      reportCompressedSize : true,
      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          chunkFileNames : 'js/[name]-[hash].js',
          entryFileNames : 'js/[name]-[hash].js',
          assetFileNames : (assetInfo) => {
            const name = assetInfo.names?.[0] ?? assetInfo.name ?? '';
            const ext  = name.split('.').pop() ?? '';
            if (/png|jpe?g|gif|svg|webp|avif/.test(ext)) return 'assets/images/[name]-[hash][extname]';
            if (/woff2?|eot|ttf|otf/.test(ext))          return 'assets/fonts/[name]-[hash][extname]';
            if (ext === 'css')  return 'css/[name]-[hash][extname]';
            if (ext === 'json') return 'data/[name]-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
        },
      },

      terserOptions: {
        compress: { drop_console: isBuild, drop_debugger: isBuild, passes: 2 },
        format  : { comments: false },
      },
    },

    resolve: { alias: { '@': '/src' } },
    css    : { modules: { localsConvention: 'camelCase' }, devSourcemap: true },
    optimizeDeps: { include: ['react', 'react-dom', 'react-router-dom'], exclude: ['@bini/internal'] },
  };
});
`;
  }

  secureWriteFile(path.join(projectPath, `vite.config.${configExt}`), content);
}

// ─── bini.config ──────────────────────────────────────────────────────────────

function generateBiniConfig(projectPath: string, configExt: ConfigExtension): void {
  secureWriteFile(
    path.join(projectPath, `bini.config.${configExt}`),
    `export default {
  outDir: 'dist',
  port  : 3000,
  host  : '0.0.0.0',

  api: {
    dir          : 'src/app/api',
    bodySizeLimit: '2mb',
    extensions   : ['.js', '.ts', '.mjs'],
  },

  static: {
    dir     : 'public',
    maxAge  : 3600,
    dotfiles: 'deny',
    immutable: false,
  },

  build: {
    minify     : true,
    sourcemap  : true,
    target     : 'esnext',
    clean      : true,
    cssCodeSplit: true,
  },

  cors: {
    origin        : '*',
    methods       : ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  security: {
    csp          : { enabled: false },
    hidePoweredBy: true,
    referrerPolicy: 'no-referrer',
    xssFilter    : true,
    frameguard   : 'deny',
  },

  logging: {
    level    : 'info',
    color    : true,
    timestamp: true,
  },
};
`
  );
}

// ─── App files ────────────────────────────────────────────────────────────────

// Identical page layout for all 3 styling options — only the className strategy differs.
function buildPageContent(fileExt: string, styling: StylingOption): string {

  // ── Tailwind ────────────────────────────────────────────────────────────────
  if (styling === 'Tailwind') {
    return `import React from 'react';

const links = [
  { label: 'Docs',     desc: 'Read the documentation',   href: 'https://bini.js.org'                           },
  { label: 'Examples', desc: 'Browse starter templates', href: 'https://github.com/Binidu01/bini-examples'     },
  { label: 'npm',      desc: 'View on npm registry',     href: 'https://www.npmjs.com/package/create-bini-app' },
  { label: 'GitHub',   desc: 'Star us on GitHub',        href: 'https://github.com/Binidu01'                   },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col">

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-8 py-20 gap-6">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className="w-20 h-20">
          <defs>
            <linearGradient id="hero-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00CFFF" />
              <stop offset="100%" stopColor="#0077FF" />
            </linearGradient>
          </defs>
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
            fontFamily="Segoe UI, Arial, sans-serif" fontSize="90" fontWeight="700" fill="url(#hero-g)">ß</text>
        </svg>
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

      {/* Link grid */}
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

  // ── CSS Modules ─────────────────────────────────────────────────────────────
  if (styling === 'CSS Modules') {
    return `import React from 'react';
import styles from './page.module.css';

const links = [
  { label: 'Docs',     desc: 'Read the documentation',   href: 'https://bini.js.org'                           },
  { label: 'Examples', desc: 'Browse starter templates', href: 'https://github.com/Binidu01/bini-examples'     },
  { label: 'npm',      desc: 'View on npm registry',     href: 'https://www.npmjs.com/package/create-bini-app' },
  { label: 'GitHub',   desc: 'Star us on GitHub',        href: 'https://github.com/Binidu01'                   },
];

export default function Home() {
  return (
    <div className={styles.root}>

      <main className={styles.hero}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className={styles.heroLogo}>
          <defs>
            <linearGradient id="hero-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00CFFF" />
              <stop offset="100%" stopColor="#0077FF" />
            </linearGradient>
          </defs>
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
            fontFamily="Segoe UI, Arial, sans-serif" fontSize="90" fontWeight="700" fill="url(#hero-g)">ß</text>
        </svg>
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

  // ── None (plain CSS) ─────────────────────────────────────────────────────────
  return `import React from 'react';

const links = [
  { label: 'Docs',     desc: 'Read the documentation',   href: 'https://bini.js.org'                           },
  { label: 'Examples', desc: 'Browse starter templates', href: 'https://github.com/Binidu01/bini-examples'     },
  { label: 'npm',      desc: 'View on npm registry',     href: 'https://www.npmjs.com/package/create-bini-app' },
  { label: 'GitHub',   desc: 'Star us on GitHub',        href: 'https://github.com/Binidu01'                   },
];

export default function Home() {
  return (
    <div className="root">

      <main className="hero">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className="hero-logo">
          <defs>
            <linearGradient id="hero-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00CFFF" />
              <stop offset="100%" stopColor="#0077FF" />
            </linearGradient>
          </defs>
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
            fontFamily="Segoe UI, Arial, sans-serif" fontSize="90" fontWeight="700" fill="url(#hero-g)">ß</text>
        </svg>
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

function generateAppFiles(
  projectPath: string,
  mainExt: FileExtension,
  useTypeScript: boolean,
  styling: StylingOption
): void {
  const appPath = path.join(projectPath, 'src/app');

  secureWriteFile(
    path.join(projectPath, 'src', `main.${mainExt}`),
    `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Root container not found');
createRoot(container).render(<App />);
`
  );

  const layoutChildrenArg = useTypeScript
    ? `{ children }: { children: React.ReactNode }`
    : `{ children }`;

  secureWriteFile(
    path.join(appPath, `layout.${mainExt}`),
    `import React from 'react';
import './globals.css';

// metadata is read by bini-router at build time and injected into index.html.
// It is automatically stripped from the browser bundle — it never ships to the client.
export const metadata = {
  title      : 'Bini.js App',
  description: 'Modern React application built with Bini.js',
  keywords   : ['Bini.js', 'React', 'Vite'],
  themeColor : '#00CFFF',
  manifest   : '/site.webmanifest',
  openGraph  : {
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
    icon : [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};

// Root layout — wraps every page.
export default function RootLayout(${layoutChildrenArg}) {
  return <React.Fragment>{children}</React.Fragment>;
}
`
  );

  secureWriteFile(path.join(appPath, `page.${mainExt}`), buildPageContent(mainExt, styling));
}

// ─── Other config files ───────────────────────────────────────────────────────

function generateOtherConfigFiles(
  projectPath: string,
  useTypeScript: boolean,
  _configExt: ConfigExtension,
  _styling: StylingOption
): void {
  if (useTypeScript) {
    secureWriteFile(
      path.join(projectPath, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target                    : "ES2020",
            lib                       : ["ES2020", "DOM", "DOM.Iterable"],
            module                    : "ESNext",
            skipLibCheck              : true,
            moduleResolution          : "bundler",
            allowImportingTsExtensions: true,
            resolveJsonModule         : true,
            isolatedModules           : true,
            noEmit                    : true,
            jsx                       : "react-jsx",
            strict                    : true,
            baseUrl                   : ".",
            paths                     : { "@/*": ["./src/*"] },
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

  const eslintConfig = useTypeScript
    ? `import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
`
    : `import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: { ecmaVersion: 'latest', ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars'   : ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'prefer-const'     : 'error',
      ...globals.node 
    },
  },
]
`;

  secureWriteFile(path.join(projectPath, "eslint.config.mjs"), eslintConfig);
}

// ─── Project generator ────────────────────────────────────────────────────────

async function generateProject(
  projectName: string,
  answers: ProjectAnswers,
  flags: CliFlags
): Promise<void> {
  try {
    checkDiskSpace(100);
    await checkNetworkConnectivity();

    const projectPath = path.join(process.cwd(), projectName);

    if (fs.existsSync(projectPath) && !flags.force) {
      throw new Error(`Directory "${projectName}" already exists. Use --force to overwrite.`);
    }
    if (flags.force && fs.existsSync(projectPath)) {
      safeRm(projectPath);
    }

    const useTypeScript = shouldUseTypeScript(flags, answers);
    const ext = getFileExtensions(useTypeScript);

    robustMkdirSync(path.join(projectPath, "src/app/api"));
    robustMkdirSync(path.join(projectPath, "public"));

    await generateFaviconFiles(path.join(projectPath, "public"));
    generateWebManifest(projectPath);

    secureWriteFile(
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
    );

    generateAppFiles(projectPath, ext.main, useTypeScript, answers.styling);
    if (answers.styling === "CSS Modules") generateCSSModulesFiles(projectPath);
    secureWriteFile(
      path.join(projectPath, "src/app/globals.css"),
      generateGlobalStyles(answers.styling),
      { force: flags.force }
    );

    const apiContent = `import { Hono } from 'hono'

const app = new Hono().basePath('/api')

app.all('/hello', (c) => {
  return c.json({
    message  : 'Hello from Bini.js!',
    timestamp: new Date().toISOString(),
    method   : c.req.method,
  })
})

export default app
`;

    secureWriteFile(
      path.join(projectPath, `src/app/api/hello.${ext.api}`),
      apiContent,
      { force: flags.force }
    );

    secureWriteFile(
      path.join(projectPath, ".gitignore"),
      `node_modules/
dist/
.env
.env.local
.env.*.local
.DS_Store
Thumbs.db
*.log

# bini-router generated production entries — do not edit these files directly
netlify/edge-functions/api.ts
worker.ts
server/index.ts
handler.ts
`
    );

    secureWriteFile(
      path.join(projectPath, "package.json"),
      JSON.stringify(generatePackageJson(projectName, useTypeScript, answers.styling), null, 2),
      { force: flags.force }
    );
    generateViteConfig(projectPath, useTypeScript, ext.config, answers.styling);
    generateBiniConfig(projectPath, ext.config);
    generateOtherConfigFiles(projectPath, useTypeScript, ext.config, answers.styling);

    secureWriteFile(
      path.join(projectPath, "README.md"),
      `# ${projectName}

A Bini.js app — zero-config React framework.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Production

\`\`\`bash
npm run build
npm start        # served by bini-server
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
│   │   ├── api/              <- API routes (Hono)
│   │   ├── layout.${ext.main}       <- root layout + metadata
│   │   ├── page.${ext.main}         <- /
│   │   ├── not-found.${ext.main}    <- custom 404
│   │   └── globals.css
│   └── main.${ext.main}             <- mounts <App /> (auto-generated by bini-router)
├── public/
├── bini.config.${ext.config}
├── vite.config.${ext.config}
└── package.json
\`\`\`

## Layouts

- \`src/app/layout.${ext.main}\` — root layout, uses \`{children}\`, export \`metadata\` here
- Nested layouts (e.g. \`src/app/dashboard/layout.${ext.main}\`) use \`<Outlet />\` from react-router-dom

## Powered by

- **bini-router** — filesystem routing + API middleware
- **bini-overlay** — dev overlay badge
- **bini-env** — environment file display
- **bini-server** — production server (zero dependencies)

---

**Built with Bini.js v${BINIJS_VERSION}** | [Documentation](https://bini.js.org)
`,
      { force: flags.force }
    );

    let installedDependencies = false;
    let detectedPackageManager: PackageManager = "npm";

    try {
      detectedPackageManager = await detectPackageManager();
      const shouldInstall = await confirm({
        message: "Would you like to install dependencies automatically?",
        default: true,
      });
      if (shouldInstall) {
        installedDependencies = await installDependenciesWithFallbacks(
          projectPath,
          detectedPackageManager
        );
      }
    } catch {
      // non-fatal — user can install manually
    }

    const projectAbsPath = path.join(process.cwd(), projectName);

    console.log(`\nSuccess! Created ${projectName} at ${projectAbsPath}\n`);
    console.log(`We suggest that you begin by typing:\n`);
    console.log(`  cd ${projectName}`);
    if (!installedDependencies) {
      console.log(`  ${detectedPackageManager} install`);
    }
    console.log(`  ${detectedPackageManager} run dev\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nAborted! ${message}`);
    const projectPath = path.join(process.cwd(), projectName);
    if (fs.existsSync(projectPath)) {
      try { safeRm(projectPath); } catch { /* best-effort cleanup */ }
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
      projectName = await input({
        message : "What is your project named?",
        default : "my-bini-app",
        validate: (value: string) => {
          if (!value) return "Name required";
          if (!validateProjectName(value))
            return "Use lowercase, numbers, hyphens only. Max 50 chars.";
          return true;
        },
      });
    }

    const answers = await askQuestions(args.flags);
    await generateProject(projectName, answers, args.flags);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\nAborted!", message);
    process.exit(1);
  }
}

process.on("uncaughtException",  (e: Error)   => { console.error("\nAborted!", e.message); process.exit(1); });
process.on("unhandledRejection", (r: unknown) => { console.error("\nAborted!", r);          process.exit(1); });

main().catch(console.error);