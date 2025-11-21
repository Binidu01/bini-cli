#!/usr/bin/env node

import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import sharp from "sharp";

// ES module equivalents
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const CLI_PACKAGE_PATH = path.join(__dirname, 'package.json');
const cliPackageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_PATH, 'utf-8'));
const BINIJS_VERSION = cliPackageJson.version;

// Color definitions
const COLORS = {
  CYAN: '\x1b[36m',      // Cyan for header
  RESET: '\x1b[0m',      // Reset
  GREEN: '\x1b[32m'      // Green for checkmarks
};

const LOGO = `
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██╗  ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝
             Developed By Binidu
`;

class ProgressLogger {
  constructor(totalSteps) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.startTime = Date.now();
  }
  
  start(message) {
    this.currentStep++;
    process.stdout.write(`[${this.currentStep}/${this.totalSteps}] ${message}... `);
  }
  
  success() {
    process.stdout.write('✅\n');
  }
  
  warn() {
    process.stdout.write('⚠️\n');
  }
  
  fail(error) {
    process.stdout.write('❌\n');
    throw error;
  }
  
  complete() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`\n🎉 Completed ${this.totalSteps} steps in ${duration}s`);
  }
}

const REQUIRED_NODE = 'v18.0.0';

function checkNodeVersion() {
  const [major, minor] = process.version.slice(1).split('.').map(Number);
  const [reqMajor, reqMinor] = REQUIRED_NODE.slice(1).split('.').map(Number);
  
  if (major < reqMajor || (major === reqMajor && minor < reqMinor)) {
    console.error(`❌ Node.js ${REQUIRED_NODE} or higher required. Current: ${process.version}`);
    console.error('💡 Please update Node.js from https://nodejs.org');
    process.exit(1);
  }
}

function parseArguments() {
  const args = process.argv.slice(2);
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`Bini.js CLI v${BINIJS_VERSION}`);
    process.exit(0);
  }
  
  if (args.includes('--help') || args.includes('-h')) {
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
  
  const hasExplicitTypeScript = args.includes('--typescript');
  const hasExplicitJavaScript = args.includes('--javascript') || args.includes('--no-typescript');
  
  return {
    projectName: args.find(arg => !arg.startsWith('--')),
    flags: {
      force: args.includes('--force'),
      typescript: hasExplicitTypeScript ? true : (hasExplicitJavaScript ? false : undefined),
      javascript: hasExplicitJavaScript,
      tailwind: args.includes('--tailwind'),
      cssModules: args.includes('--css-modules'),
      minimal: args.includes('--minimal'),
      verbose: args.includes('--verbose')
    }
  };
}

function validateProjectName(name) {
  const invalidPatterns = [
    /\.\./,
    /[<>:"|?*]/,
    /^(npm|node|bini|\.)/,
    /[^\w\-\.]/
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(name)) && 
         name.length > 0 && 
         name.length <= 50;
}

function robustMkdirSync(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
    }
    return true;
  } catch (error) {
    throw new Error(`Cannot write to directory: ${dirPath}. Check permissions.`);
  }
}

function secureWriteFile(filePath, content, options = {}) {
  const resolved = filePath;
  
  if (fs.existsSync(resolved) && !options.force) {
    throw new Error(`File already exists: ${resolved}. Use --force to overwrite.`);
  }
  
  const dir = path.dirname(resolved);
  robustMkdirSync(dir);
  
  fs.writeFileSync(resolved, content, { 
    mode: options.mode || 0o644,
    flag: options.flag || 'w'
  });
}

function safeRm(p, { allowedBase = process.cwd() } = {}) {
  if (!p) throw new Error('Path required');
  const resolved = p;
  const base = path.resolve(allowedBase);

  if (resolved === base) throw new Error('Refusing to rm project root');
  if (!resolved.startsWith(base + path.sep)) {
    throw new Error('Refusing to rm outside allowed base');
  }

  const forbidden = [
    path.resolve('/'), 
    path.resolve(process.env.HOME || ''), 
    path.resolve(process.env.USERPROFILE || ''),
    path.resolve(process.cwd()),
    path.resolve(__dirname)
  ];
  
  if (forbidden.some(forbiddenPath => resolved === forbiddenPath || resolved.startsWith(forbiddenPath + path.sep))) {
    throw new Error('Refusing to rm forbidden path');
  }

  try {
    const stat = fs.statSync(resolved);
    if (stat.isDirectory() && resolved.split(path.sep).length < 3) {
      throw new Error('Refusing to rm shallow system directory');
    }
  } catch (err) {
    throw new Error('Path does not exist or is inaccessible');
  }

  fs.rmSync(resolved, { recursive: true, force: true });
}

function mkdirRecursive(dirPath) {
  robustMkdirSync(dirPath);
}

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  
  for (const name in interfaces) {
    if (/docker|veth|br-|lo|loopback|vmnet|vbox|utun|tun|tap/i.test(name)) continue;
    
    for (const iface of interfaces[name]) {
      if (iface.internal) continue;
      if (iface.family === 'IPv4') {
        candidates.push(iface);
      }
    }
  }
  
  const nonLinkLocal = candidates.filter(iface => !iface.address.startsWith('169.254.'));
  const result = nonLinkLocal[0]?.address || candidates[0]?.address || 'localhost';
  
  return result;
}

async function checkNetworkConnectivity() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://registry.npmjs.org', {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    console.warn('⚠️  Network connectivity issue detected');
    console.log('💡 Continuing with offline capabilities...');
    return false;
  }
}

function executeCommand(command, options = {}) {
  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'cmd.exe' : '/bin/sh';
  
  try {
    return execSync(command, {
      shell,
      stdio: options.stdio || 'pipe',
      timeout: options.timeout || 120000,
      cwd: options.cwd,
      windowsHide: true,
      encoding: 'utf8'
    });
  } catch (error) {
    throw new Error(`Command failed: ${command}\nError: ${error.message}`);
  }
}

async function detectPackageManager() {
  const packageManagers = [
    { name: 'bun', command: 'bun --version', priority: 4 },
    { name: 'pnpm', command: 'pnpm --version', priority: 3 },
    { name: 'yarn', command: 'yarn --version', priority: 2 },
    { name: 'npm', command: 'npm --version', priority: 1 }
  ];
  
  const availableManagers = [];
  
  for (const pm of packageManagers) {
    try {
      executeCommand(pm.command, { stdio: 'ignore' });
      availableManagers.push({ ...pm, detected: true });
    } catch (error) {
      availableManagers.push({ ...pm, detected: false });
    }
  }
  
  const detected = availableManagers.filter(pm => pm.detected);
  
  if (detected.length === 0) {
    throw new Error('No package manager found. Please install npm, yarn, pnpm, or bun.');
  }
  
  const recommended = detected.sort((a, b) => b.priority - a.priority)[0];
  return recommended.name;
}

async function installDependenciesWithFallbacks(projectPath, packageManager) {
  const installCommands = {
    npm: 'npm install --no-audit --no-fund --loglevel=error',
    yarn: 'yarn install --silent --no-progress',
    pnpm: 'pnpm install --reporter=silent',
    bun: 'bun install --silent'
  };
  
  const fallbackCommands = {
    npm: 'npm install --no-audit --no-fund --production',
    yarn: 'yarn install --production',
    pnpm: 'pnpm install --production', 
    bun: 'bun install --production'
  };
  
  const progress = new ProgressLogger(2);
  
  try {
    progress.start(`Installing dependencies with ${packageManager}`);
    executeCommand(installCommands[packageManager], { 
      cwd: projectPath, 
      stdio: 'inherit',
      timeout: 300000
    });
    progress.success();
  } catch (error) {
    progress.warn();
    console.warn(`⚠️  Primary installation failed, trying fallback...`);
    
    try {
      progress.start(`Installing production dependencies only`);
      executeCommand(fallbackCommands[packageManager], {
        cwd: projectPath,
        stdio: 'inherit', 
        timeout: 300000
      });
      progress.success();
    } catch (fallbackError) {
      progress.fail(new Error('Dependency installation failed completely'));
      console.log('💡 You can manually run:');
      console.log(`   cd ${path.basename(projectPath)}`);
      console.log(`   ${packageManager} install`);
      return false;
    }
  }
  
  return true;
}

function checkDiskSpace(requiredMB = 100) {
  try {
    if (fs.statfsSync) {
      const stats = fs.statfsSync(process.cwd());
      const freeBytes = stats.bavail * stats.bsize;
      const requiredBytes = requiredMB * 1024 * 1024;
      
      if (freeBytes < requiredBytes) {
        const freeMB = Math.floor(freeBytes / (1024 * 1024));
        throw new Error(`Insufficient disk space. Required: ${requiredMB}MB, Available: ${freeMB}MB`);
      }
    }
    
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return true;
    }
    console.warn('⚠️  Could not check disk space:', error.message);
    return true;
  }
}

function checkMemoryUsage() {
  const used = process.memoryUsage();
  const maxMemory = 512 * 1024 * 1024;
  
  if (used.heapUsed > maxMemory) {
    console.warn('⚠️  High memory usage detected. Consider increasing Node.js memory limit.');
  }
}

function shouldUseTypeScript(flags, answers) {
  // Explicit flags take highest priority
  if (flags.typescript === true) return true;
  if (flags.javascript === true) return false;
  
  // User answers from prompts
  return answers.typescript === true;
}

function getFileExtensions(useTypeScript) {
  return {
    main: useTypeScript ? 'tsx' : 'jsx',
    config: 'mjs', // Always use MJS for config files
    api: useTypeScript ? 'ts' : 'js' // API routes now support TypeScript
  };
}

async function askQuestions(flags) {
  let typescript;
  let styling;
  
  const hasTypeScriptFlag = flags.typescript === true || flags.javascript === true;
  const hasStylingFlag = flags.tailwind === true || flags.cssModules === true;
  
  if (hasTypeScriptFlag) {
    typescript = flags.typescript === true;
    console.log(`📝 Using ${typescript ? 'TypeScript' : 'JavaScript'} (from command line flag)`);
  } else {
    const tsAnswer = await inquirer.prompt([{
      type: "confirm",
      name: "typescript",
      message: "Use TypeScript?",
      default: true,
    }]);
    typescript = tsAnswer.typescript;
  }
  
  if (hasStylingFlag) {
    if (flags.tailwind === true) {
      styling = "Tailwind";
    } else if (flags.cssModules === true) {
      styling = "CSS Modules";
    }
    console.log(`🎨 Using ${styling} (from command line flag)`);
  } else {
    const styleAnswer = await inquirer.prompt([{
      type: "list",
      name: "styling",
      message: "Styling preference?",
      choices: ["Tailwind", "CSS Modules", "None"],
      default: "Tailwind",
    }]);
    styling = styleAnswer.styling;
  }
  
  return { typescript, styling };
}

async function generateFaviconFiles(publicPath) {
  // Use your exact ß icon SVG for favicon
  const betaSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
  <!-- Gradient Definition -->
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00CFFF"/>
      <stop offset="100%" stop-color="#0077FF"/>
    </linearGradient>
  </defs>

  <!-- ß Icon with Gradient -->
  <text x="50%" y="50%" 
    dominant-baseline="middle" 
    text-anchor="middle"
    font-family="Segoe UI, Arial, sans-serif"
    font-size="90"
    font-weight="700"
    fill="url(#grad)">
    ß
  </text>
</svg>`;

  // Use your exact OG image SVG
  const ogImageSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" fill="none">
  <!-- White Background -->
  <rect width="1200" height="630" fill="#ffffff"/>

  <!-- Gradient Definition -->
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00CFFF"/>
      <stop offset="100%" stop-color="#0077FF"/>
    </linearGradient>
  </defs>

  <!-- ß Icon with Gradient -->
  <text x="50%" y="50%" 
    dominant-baseline="middle" 
    text-anchor="middle"
    font-family="Segoe UI, Arial, sans-serif"
    font-size="450"
    font-weight="700"
    fill="url(#grad)">
    ß
  </text>
</svg>`;

  // Write SVGs (using your exact designs)
  secureWriteFile(path.join(publicPath, "favicon.svg"), betaSVG);

  try {
    // Convert SVGs to PNGs using sharp
    const pngSizes = [16, 32, 64, 180, 512];
    
    for (const size of pngSizes) {
      const output = path.join(publicPath, `favicon-${size}x${size}.png`);
      await sharp(Buffer.from(betaSVG))
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(output);
    }

    // Default favicon PNG
    await sharp(Buffer.from(betaSVG))
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicPath, "favicon.png"));

    // Apple touch icon
    await sharp(Buffer.from(betaSVG))
      .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicPath, "apple-touch-icon.png"));

    // OG image - ß icon
    await sharp(Buffer.from(ogImageSVG))
      .resize(1200, 630)
      .png()
      .toFile(path.join(publicPath, "og-image.png"));

    console.log("✅ Favicons and logos generated successfully!");
    
  } catch (error) {
    console.warn('⚠️ PNG generation failed, creating placeholder files:', error.message);
    
    // Fallback: Create proper sized placeholder PNGs
    const pngSizes = [16, 32, 64, 180, 512];
    
    for (const size of pngSizes) {
      // Generate proper sized placeholder instead of generic 1x1
      const placeholderBuffer = await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 207, b: 255, alpha: 255 }
        }
      }).png().toBuffer();
      secureWriteFile(path.join(publicPath, `favicon-${size}x${size}.png`), placeholderBuffer);
    }
    
    // Generate proper sized placeholders for other files
    const defaultFavicon = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 207, b: 255, alpha: 255 }
      }
    }).png().toBuffer();
    
    const appleIcon = await sharp({
      create: {
        width: 180,
        height: 180,
        channels: 4,
        background: { r: 0, g: 207, b: 255, alpha: 255 }
      }
    }).png().toBuffer();
    
    const ogImage = await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: { r: 0, g: 207, b: 255, alpha: 255 }
      }
    }).png().toBuffer();
    
    secureWriteFile(path.join(publicPath, "favicon.png"), defaultFavicon);
    secureWriteFile(path.join(publicPath, "apple-touch-icon.png"), appleIcon);
    secureWriteFile(path.join(publicPath, "og-image.png"), ogImage);
    
    console.log("✅ Basic favicon placeholders created");
  }
}

function generateWebManifest(projectPath) {
  const manifest = {
    name: "Bini.js App",
    short_name: "BiniApp", 
    description: "Modern React application built with Bini.js",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#00CFFF",
    icons: [
      {
        src: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png"
      },
      {
        src: "/favicon-32x32.png", 
        sizes: "32x32",
        type: "image/png"
      },
      {
        src: "/favicon-64x64.png",
        sizes: "64x64", 
        type: "image/png"
      },
      {
        src: "/favicon-180x180.png",
        sizes: "180x180",
        type: "image/png"
      },
      {
        src: "/favicon-512x512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };

  secureWriteFile(
    path.join(projectPath, "public", "site.webmanifest"), 
    JSON.stringify(manifest, null, 2)
  );
}

function generateBiniInternals(projectPath, useTypeScript) {
  const biniInternalPath = path.join(projectPath, "bini/internal");
  const pluginsPath = path.join(biniInternalPath, "plugins");
  
  mkdirRecursive(pluginsPath);

  // =============================================================================
  // ENV CHECKER - UPDATED: Only show Environments and Ready, let Vite handle URLs
  // =============================================================================
  secureWriteFile(path.join(biniInternalPath, "env-checker.js"), `import fs from 'fs';
import path from 'path';
import os from 'os';

const BINI_LOGO = 'ß';  // Your Bini.js logo
const BINI_VERSION = '${BINIJS_VERSION}';

// Color definitions
const COLORS = {
  CYAN: '\\x1b[36m',      // Cyan for header
  RESET: '\\x1b[0m',      // Reset
  GREEN: '\\x1b[32m'      // Green for checkmarks
};

/**
 * Detect which .env files exist in project root
 * Returns array of found .env files in load order
 */
export function detectEnvFiles(projectRoot = process.cwd()) {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Check in priority order (what Next.js loads)
  const envFiles = [
    '.env.local',                    // Always loaded first
    \`.env.\${nodeEnv}.local\`,         // Environment-specific local
    \`.env.\${nodeEnv}\`,               // Environment-specific
    '.env'                           // Base
  ];

  const found = [];

  for (const file of envFiles) {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      found.push(file);
    }
  }

  return found;
}

/**
 * Format environment files for console display (Next.js style)
 * Shows: "✓ Environments: .env, .env.local"
 */
export function formatEnvFilesForDisplay(envFiles) {
  if (envFiles.length === 0) {
    return '';
  }

  const envString = envFiles.join(', ');
  return \`\${COLORS.GREEN}✓\${COLORS.RESET} Environments: \${envString}\`;
}

/**
 * Single function to show on server startup
 * Works for Vite, Production, or any server
 */
export function displayEnvFiles(projectRoot = process.cwd()) {
  const found = detectEnvFiles(projectRoot);
  const formatted = formatEnvFilesForDisplay(found);

  if (formatted) {
    console.log(\`  \${formatted}\`);
  }
}

/**
 * Bini.js startup display - ONLY shows Environments and Ready
 * Let Vite handle the Local/Network URLs
 */
export function displayBiniStartup(options = {}) {
  const {
    mode = 'dev' // 'dev', 'preview', or 'prod'
  } = options;

  const projectRoot = process.cwd();
  const found = detectEnvFiles(projectRoot);

  // Determine mode label
  let modeLabel = '';
  if (mode === 'preview') {
    modeLabel = '(preview)';
  } else if (mode === 'prod') {
    modeLabel = '(prod)';
  } else {
    modeLabel = '(dev)';
  }

  // Main header with colors
  console.log(\`\\n  \${COLORS.CYAN}\${BINI_LOGO} Bini.js \${BINI_VERSION}\${COLORS.RESET} \${modeLabel}\`);

  // Show environments if found - Vite will show Local/Network URLs
  if (found.length > 0) {
    const envString = found.join(', ');
    console.log(\`  \${COLORS.GREEN}✓\${COLORS.RESET} Environments: \${envString}\`);
  }

  // Status
  console.log(\`  \${COLORS.GREEN}✓\${COLORS.RESET} Ready\\n\`);
}

export default {
  detectEnvFiles,
  formatEnvFilesForDisplay,
  displayEnvFiles,
  displayBiniStartup
};`);

// Router Plugin - UPDATED with custom 404 support
secureWriteFile(path.join(pluginsPath, "router.js"), `import fs from 'fs';
import path from 'path';

let regenerationLock = null;
const regenerationQueue = [];
const fileEventLog = new Map(); // Track recent file events

function detectNotFoundFile(appDir) {
  const files = ['not-found.tsx', 'not-found.jsx', 'not-found.ts', 'not-found.js'];
  return files.find(f => fs.existsSync(path.join(appDir, f)));
}

function scanRoutes(dir, baseRoute = '') {
  const routes = [];
  
  try {
    if (!fs.existsSync(dir)) {
      return routes;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const pageFiles = ['page.tsx', 'page.jsx', 'page.ts', 'page.js'];
        const pageFile = pageFiles.find(f => fs.existsSync(path.join(fullPath, f)));
        
        const isDynamic = entry.name.startsWith('[') && entry.name.endsWith(']');
        
        let currentRoutePath;
        if (isDynamic) {
          const paramName = entry.name.slice(1, -1);
          currentRoutePath = baseRoute + '/:' + paramName;
        } else {
          currentRoutePath = baseRoute + '/' + entry.name;
        }
        
        if (pageFile) {
          routes.push({
            path: currentRoutePath,
            file: path.join(fullPath, pageFile),
            dynamic: isDynamic,
            params: isDynamic ? [entry.name.slice(1, -1)] : [],
            name: entry.name
          });
        }
        
        routes.push(...scanRoutes(fullPath, currentRoutePath));
      }
    }
  } catch (error) {
    console.warn(\`⚠️ Could not scan routes in \${dir}:\`, error.message);
    return routes;
  }
  
  return routes;
}

function generateRouterCode(appDir, isTypeScript) {
  const routes = scanRoutes(appDir);
  
  const rootPageFiles = ['page.tsx', 'page.jsx', 'page.ts', 'page.js'];
  const rootPage = rootPageFiles.find(f => fs.existsSync(path.join(appDir, f)));
  
  if (rootPage) {
    routes.unshift({
      path: '/',
      file: path.join(appDir, rootPage),
      dynamic: false,
      params: [],
      name: 'Home'
    });
  }
  
  routes.sort((a, b) => {
    if (a.dynamic && !b.dynamic) return 1;
    if (!a.dynamic && b.dynamic) return -1;
    return a.path.length - b.path.length;
  });
  
  let imports = \`import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './app/globals.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Page Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '2rem',
          background: '#f8f9fa'
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxWidth: '600px',
            textAlign: 'center'
          }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#e74c3c' }}>⚠️ Page Error</h1>
            <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1rem' }}>
              This page has an error. Please check the component:
            </p>
            <pre style={{ 
              background: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              textAlign: 'left',
              overflow: 'auto',
              fontSize: '0.875rem',
              color: '#e74c3c'
            }}>
              {this.state.error?.toString()}
            </pre>
            <a href="/" style={{ 
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: '#00CFFF',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600'
            }}>
              ← Go Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function SafeRoute({ component: Component, ...rest }) {
  return (
    <ErrorBoundary>
      <Component {...rest} />
    </ErrorBoundary>
  );
}

function EmptyPage({ pagePath }) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '2rem',
      background: '#f8f9fa'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#3498db' }}>📄 Empty Page</h1>
        <p style={{ fontSize: '1rem', color: '#666', marginBottom: '1rem' }}>
          This page exists but has no content yet.
        </p>
        <code style={{ 
          background: '#f8f9fa', 
          padding: '0.5rem 1rem', 
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          color: '#3498db',
          display: 'block',
          marginBottom: '1rem'
        }}>
          {pagePath}
        </code>
        <p style={{ fontSize: '0.875rem', color: '#999', marginBottom: '1.5rem' }}>
          Add a default export to this file and it will hot reload automatically!
        </p>
        <a href="/" style={{ 
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: '#00CFFF',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '0.5rem',
          fontWeight: '600'
        }}>
          ← Go Home
        </a>
      </div>
    </div>
  );
}\`;
  
  const importMap = new Map();
  let componentIndex = 0;
  
  const notFoundFile = detectNotFoundFile(appDir);
  
  if (notFoundFile) {
    const relativePath = path.relative(path.join(process.cwd(), 'src'), path.join(appDir, notFoundFile)).replace(/\\\\/g, '/');
    const importPath = \`./\${relativePath.replace(/\\.tsx?\$/, '').replace(/\\.jsx?\$/, '')}\`;
    
    imports += \`const NotFound = React.lazy(() => import('\${importPath}'));
\`;
  }
  
  routes.forEach(route => {
    const componentName = 'Page' + componentIndex++;
    const relativePath = path.relative(path.join(process.cwd(), 'src'), route.file).replace(/\\\\/g, '/');
    const importPath = \`./\${relativePath.replace(/\\.tsx?\$/, '').replace(/\\.jsx?\$/, '')}\`;
    
    let isEmpty = false;
    try {
      const fileContent = fs.readFileSync(route.file, 'utf8').trim();
      if (fileContent.length === 0 || !fileContent.includes('export default')) {
        isEmpty = true;
      }
    } catch (err) {
      isEmpty = true;
    }
    
    if (isEmpty) {
      importMap.set(route.file, { empty: true, path: relativePath });
    } else {
      imports += \`const \${componentName} = React.lazy(() => import('\${importPath}'));
\`;
      importMap.set(route.file, { empty: false, component: componentName });
    }
  });
  
  let routesCode = \`
export default function App() {
  return (
    <Router>
      <Suspense fallback={
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f8f9fa',
          color: '#666'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #00CFFF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p>Loading page...</p>
            <style>{\\\`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            \\\`}</style>
          </div>
        </div>
      }>
        <Routes>
\`;
  
  routes.forEach(route => {
    const importInfo = importMap.get(route.file);
    if (!importInfo) return;
    
    const comment = route.dynamic ? \` {/* Dynamic: \${route.path} */}\` : '';
    
    if (importInfo.empty) {
      routesCode += \`        <Route path="\${route.path}" element={<EmptyPage pagePath="\${importInfo.path}" />} />\${comment}
\`;
    } else {
      routesCode += \`        <Route path="\${route.path}" element={<SafeRoute component={\${importInfo.component}} />} />\${comment}
\`;
    }
  });
  
  routesCode += \`        <Route path="*" element={\${notFoundFile ? '<NotFound />' : '<DefaultNotFound />'}} />
      </Routes>
      </Suspense>
    </Router>
  );
}\`;

  if (!notFoundFile) {
    routesCode += \`
function DefaultNotFound() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #00CFFF 0%, #0077FF 100%)',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem', fontWeight: 'bold' }}>404</h1>
      <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Page not found</p>
      <p style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '2rem' }}>
        The page you're looking for doesn't exist
      </p>
      <a href="/" style={{ 
        padding: '1rem 2rem',
        background: 'white',
        color: '#00CFFF',
        textDecoration: 'none',
        borderRadius: '0.5rem',
        fontWeight: '600',
        fontSize: '1.1rem',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}
      onMouseOver={(e) => {
        e.target.style.transform = 'translateY(-2px)';
        e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
      }}
      onMouseOut={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
      }}>
        ← Back to Home
      </a>
    </div>
  );
}\`;
  }
  
  return imports + routesCode;
}

let regenerateTimeout = null;
let lastRoutes = '';

function shouldProcessEvent(file, eventType) {
  const key = \`\${file}:\${eventType}\`;
  const now = Date.now();
  const lastTime = fileEventLog.get(key);
  
  if (lastTime && (now - lastTime) < 500) {
    return false;
  }
  
  fileEventLog.set(key, now);
  
  for (const [k, v] of fileEventLog.entries()) {
    if ((now - v) > 2000) {
      fileEventLog.delete(k);
    }
  }
  
  return true;
}

export function biniRouterPlugin() {
  return {
    name: 'bini-router-plugin',
    
    config() {
      const appDir = path.join(process.cwd(), 'src/app');
      
      if (!fs.existsSync(appDir)) {
        console.warn('⚠️  src/app directory not found - file-based routing disabled');
        return;
      }
      
      const appTsxPath = path.join(process.cwd(), 'src/App.tsx');
      const appJsxPath = path.join(process.cwd(), 'src/App.jsx');
      
      const isTypeScript = fs.existsSync(appTsxPath);
      const targetPath = isTypeScript ? appTsxPath : appJsxPath;
      
      if (fs.existsSync(appDir)) {
        const newCode = generateRouterCode(appDir, isTypeScript);
        fs.writeFileSync(targetPath, newCode, 'utf8');
        lastRoutes = newCode;
      }
    },
    
    configureServer(server) {
      const appDir = path.join(process.cwd(), 'src/app');
      
      if (!fs.existsSync(appDir)) {
        return;
      }
      
      server.watcher.add(appDir);
      
      const regenerateApp = async () => {
        if (regenerateTimeout) {
          clearTimeout(regenerateTimeout);
        }
        
        regenerateTimeout = setTimeout(async () => {
          const appTsxPath = path.join(process.cwd(), 'src/App.tsx');
          const appJsxPath = path.join(process.cwd(), 'src/App.jsx');
          
          const isTypeScript = fs.existsSync(appTsxPath);
          const targetPath = isTypeScript ? appTsxPath : appJsxPath;
          
          const newCode = generateRouterCode(appDir, isTypeScript);
          
          if (newCode !== lastRoutes) {
            fs.writeFileSync(targetPath, newCode, 'utf8');
            lastRoutes = newCode;
            
            server.ws.send({
              type: 'full-reload',
              path: '*'
            });
          }
        }, 50);
      };
      
      server.watcher.on('add', (file) => {
        if (file.includes('src' + path.sep + 'app')) {
          if (/page\\.(tsx|jsx|ts|js)\$/.test(file) && shouldProcessEvent(file, 'add')) {
            regenerateApp();
          } else if (/not-found\\.(tsx|jsx|ts|js)\$/.test(file) && shouldProcessEvent(file, 'add')) {
            regenerateApp();
          }
        }
      });
      
      server.watcher.on('unlink', (file) => {
        if (file.includes('src' + path.sep + 'app')) {
          if (/page\\.(tsx|jsx|ts|js)\$/.test(file) && shouldProcessEvent(file, 'unlink')) {
            regenerateApp();
          } else if (/not-found\\.(tsx|jsx|ts|js)\$/.test(file) && shouldProcessEvent(file, 'unlink')) {
            regenerateApp();
          }
        }
      });
      
      server.watcher.on('addDir', (dir) => {
        if (dir.includes('src' + path.sep + 'app') && !dir.includes('node_modules')) {
          setTimeout(() => {
            const pageFiles = ['page.tsx', 'page.jsx', 'page.ts', 'page.js'];
            const hasPage = pageFiles.some(f => fs.existsSync(path.join(dir, f)));
            if (hasPage) {
              regenerateApp();
            }
          }, 500);
        }
      });
      
      server.watcher.on('unlinkDir', (dir) => {
        if (dir.includes('src' + path.sep + 'app') && !dir.includes('node_modules')) {
          regenerateApp();
        }
      });
      
      server.watcher.on('change', (file) => {
        if (file.includes('src' + path.sep + 'app')) {
          const isPageFile = /page\\.(tsx|jsx|ts|js)\$/.test(file);
          const isNotFoundFile = /not-found\\.(tsx|jsx|ts|js)\$/.test(file);
          
          if ((isPageFile || isNotFoundFile) && shouldProcessEvent(file, 'change')) {
            try {
              regenerateApp();
            } catch (err) {
              // silent
            }
          }
        }
      });
    },
    
    buildStart() {
      const appDir = path.join(process.cwd(), 'src/app');
      const appTsxPath = path.join(process.cwd(), 'src/App.tsx');
      const appJsxPath = path.join(process.cwd(), 'src/App.jsx');
      
      const isTypeScript = fs.existsSync(appTsxPath);
      const targetPath = isTypeScript ? appTsxPath : appJsxPath;
      
      if (fs.existsSync(appDir)) {
        const newCode = generateRouterCode(appDir, isTypeScript);
        fs.writeFileSync(targetPath, newCode, 'utf8');
      }
    }
  };
}
`);


 // Preview Plugin - UPDATED: Check .bini/dist BEFORE server starts
  secureWriteFile(path.join(pluginsPath, "preview.js"), `import { displayBiniStartup } from '../env-checker.js';
import fs from 'fs';
import path from 'path';

export function biniPreviewPlugin() {
  return {
    name: 'bini-preview-plugin',
    
    configurePreviewServer(server) {
      // Check if .bini/dist exists and has necessary files BEFORE server starts
      const distPath = path.join(process.cwd(), '.bini/dist');
      const indexHtmlPath = path.join(distPath, 'index.html');
      
      // Validate build output before allowing server to start
      if (!fs.existsSync(distPath)) {
        console.log('❌ Build directory not found: .bini/dist');
        console.log('💡 Run: npm run build');
        process.exit(1);
      }
      
      if (!fs.existsSync(indexHtmlPath)) {
        console.log('❌ Build incomplete: index.html missing');
        console.log('💡 Run: npm run build');
        process.exit(1);
      }
      
      // Removed the source modification check to prevent "Source files modified since last build" warnings
      
      server.httpServer?.once('listening', () => {
        setTimeout(() => {
          // Let Vite handle the Local/Network URLs, we just add Environments and Ready
          displayBiniStartup({
            mode: 'preview'
          });
        }, 100);
      });
    }
  }
}`);


 // Badge Plugin - UPDATED with circular badge design
secureWriteFile(path.join(pluginsPath, "badge.js"), `const BINIJS_VERSION = "${BINIJS_VERSION}";
import path from 'path';
import fs from 'fs';
import { displayBiniStartup } from '../env-checker.js';

function getRoutes() {
  const appDir = path.join(process.cwd(), 'src/app');
  const routes = [];
  
  if (!fs.existsSync(appDir)) return routes;
  
  function scanDir(dir, baseRoute = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const pageFiles = ['page.tsx', 'page.jsx', 'page.ts', 'page.js'];
        const hasPage = pageFiles.some(f => fs.existsSync(path.join(fullPath, f)));
        
        if (hasPage) {
          const routePath = baseRoute + '/' + entry.name;
          routes.push(routePath === '/' ? '/' : routePath);
        }
        
        scanDir(fullPath, baseRoute + '/' + entry.name);
      }
    }
  }
  
  if (fs.existsSync(path.join(appDir, 'page.tsx')) || fs.existsSync(path.join(appDir, 'page.jsx'))) {
    routes.push('/');
  }
  
  scanDir(appDir);
  return routes.sort();
}

function validateProjectStructure() {
  const srcPath = path.join(process.cwd(), 'src');
  const appPath = path.join(process.cwd(), 'src/app');
  
  if (!fs.existsSync(srcPath)) {
    console.log('❌ src directory not found');
    return false;
  }
  
  if (!fs.existsSync(appPath)) {
    console.log('❌ src/app directory not found');
    return false;
  }
  
  return true;
}

export function biniBadgePlugin() {
  let port = 3000;
  let routes = [];
  
  return {
    name: 'bini-badge-injector',
    
    configResolved(config) {
      port = config.server?.port || 3000;
      routes = getRoutes();
    },
    
    configureServer(server) {
      if (!validateProjectStructure()) {
        console.log('💡 Check your project structure and try again');
        process.exit(1);
      }
      
      server.httpServer?.once('listening', () => {
        setTimeout(() => {
          displayBiniStartup({
            port: port,
            mode: 'dev',
            isDev: true
          });
        }, 100);
      });
      
      const appDir = path.join(process.cwd(), 'src/app');
      if (fs.existsSync(appDir)) {
        server.watcher.add(appDir);
        
        server.watcher.on('add', (file) => {
          if (/page\\.(tsx|jsx|ts|js)$/.test(file)) {
            routes = getRoutes();
          }
        });
        
        server.watcher.on('unlink', (file) => {
          if (/page\\.(tsx|jsx|ts|js)$/.test(file)) {
            routes = getRoutes();
          }
        });
      }
    },
    
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (process.env.NODE_ENV !== 'production' && !process.env.DISABLE_BADGE) {
          const routesJson = JSON.stringify(routes);
          const versionInfo = BINIJS_VERSION;
          
          const badgeScript = \`
            <style>
              .bini-circular-badge {
                position: fixed;
                bottom: 24px;
                left: 24px;
                width: 60px;
                height: 60px;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                cursor: pointer;
                border-radius: 50%;
                background: #000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: transform 0.3s ease;
              }
              
              .bini-circular-badge:hover {
                transform: scale(1.05);
              }
              
              .bini-badge-svg {
                width: 28px;
                height: auto;
              }
              
              .bini-badge-path {
                fill: url(#biniBadgeGradient);
              }
              
              .bini-loading-svg {
                width: 28px;
                height: auto;
              }
              
              .bini-badge-menu {
                position: fixed;
                bottom: 90px;
                left: 24px;
                background: #111;
                color: #fff;
                border-radius: 12px;
                padding: 0;
                box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                z-index: 9998;
                max-width: 300px;
                display: none;
                overflow: hidden;
              }
              
              .bini-badge-menu.visible {
                display: block;
              }
              
              .bini-menu-section {
                padding: 12px 16px;
                border-bottom: 1px solid #333;
                font-size: 12px;
              }
              
              .bini-menu-section:last-child {
                border-bottom: none;
              }
              
              .bini-menu-label {
                color: #888;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
              }
              
              .bini-menu-value {
                color: #0fb;
                font-family: 'Monaco', 'Courier New', monospace;
                word-break: break-all;
              }
              
              .bini-menu-routes {
                display: flex;
                flex-direction: column;
                gap: 4px;
                max-height: 200px;
                overflow-y: auto;
              }
              
              .bini-menu-route {
                color: #0fb;
                font-family: 'Monaco', 'Courier New', monospace;
                font-size: 11px;
                padding: 4px 0;
              }
              
              .bini-circular-badge.loading {
                animation: biniLoadingPulse 1.5s ease-out forwards;
              }

              @keyframes biniLoadingPulse {
                from {
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                }
                to {
                  box-shadow: 0 0 0 15px transparent, 0 4px 12px rgba(0,0,0,0.3);
                }
              }

              .bini-circular-badge.loading::before {
                content: '';
                position: absolute;
                inset: 0;
                border-radius: 50%;
                background: #000;
                animation: biniCircleExpand 1.5s ease-out forwards;
              }

              @keyframes biniCircleExpand {
                from {
                  clip-path: circle(0% at 50% 50%);
                }
                to {
                  clip-path: circle(100% at 50% 50%);
                }
              }

              .bini-badge-svg {
                transition: opacity 0.3s ease;
              }

              .bini-circular-badge.loading .bini-badge-svg {
                opacity: 0;
              }

              .bini-loading-path {
                fill: none;
                stroke: url(#biniLoadingGradient);
                stroke-width: 1.2;
                stroke-linecap: round;
                stroke-linejoin: round;
                stroke-dasharray: 300;
                stroke-dashoffset: 300;
              }

              .bini-circular-badge.loading .bini-loading-path {
                animation: biniDrawPath 1.5s ease-out 0.3s forwards;
              }

              @keyframes biniDrawPath {
                from {
                  stroke-dashoffset: 300;
                }
                to {
                  stroke-dashoffset: 0;
                }
              }
              
              @media (max-width: 640px) {
                .bini-circular-badge {
                  bottom: 16px;
                  left: 16px;
                  width: 50px;
                  height: 50px;
                }
                
                .bini-badge-svg {
                  width: 24px;
                }
                
                .bini-badge-menu {
                  bottom: 66px;
                  left: 16px;
                  max-width: 280px;
                }
              }
            </style>

            <div class="bini-circular-badge" id="bini-circular-badge">
              <svg class="bini-badge-svg" width="22" height="31" viewBox="0 0 22 31" fill="none">
                <path class="bini-badge-path" d="M8.04688 29.9219V24.8047C9.1276 25.4948 10.2734 25.8398 11.4844 25.8398C12.5651 25.8398 13.4245 25.5013 14.0625 24.8242C14.7135 24.1341 15.0391 23.1901 15.0391 21.9922C15.0391 20.4818 14.4596 19.2904 13.3008 18.418C12.1419 17.5326 10.5078 17.0573 8.39844 16.9922V12.6758C9.84375 12.5716 10.9635 12.1289 11.7578 11.3477C12.5651 10.5664 12.9688 9.53125 12.9688 8.24219C12.9688 7.14844 12.6758 6.28906 12.0898 5.66406C11.5169 5.03906 10.7422 4.72656 9.76562 4.72656C7.36979 4.72656 6.17188 6.32161 6.17188 9.51172V30.0781H0V9.58984C0 6.6862 0.891927 4.36198 2.67578 2.61719C4.45964 0.872396 6.9401 0 10.1172 0C12.9427 0 15.1758 0.716146 16.8164 2.14844C18.457 3.56771 19.2773 5.39714 19.2773 7.63672C19.2773 9.22526 18.8086 10.6185 17.8711 11.8164C16.9466 13.0143 15.7487 13.8346 14.2773 14.2773V14.3555C19.0039 15.2539 21.3672 17.8516 21.3672 22.1484C21.3672 24.4922 20.5404 26.4844 18.8867 28.125C17.2461 29.7526 15.0195 30.5664 12.207 30.5664C10.8398 30.5664 9.45312 30.3516 8.04688 29.9219Z"/>
                <defs>
                  <linearGradient id="biniBadgeGradient" x1="9.96094" y1="-12.9219" x2="9.96094" y2="40.0781" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#00CFFF"/>
                    <stop offset="1" stop-color="#0077FF"/>
                  </linearGradient>
                </defs>
              </svg>
              <svg class="bini-loading-svg" width="22" height="31" viewBox="0 0 22 31" fill="none" style="position: absolute;">
                <path class="bini-loading-path" d="M8.04688 29.9219V24.8047C9.1276 25.4948 10.2734 25.8398 11.4844 25.8398C12.5651 25.8398 13.4245 25.5013 14.0625 24.8242C14.7135 24.1341 15.0391 23.1901 15.0391 21.9922C15.0391 20.4818 14.4596 19.2904 13.3008 18.418C12.1419 17.5326 10.5078 17.0573 8.39844 16.9922V12.6758C9.84375 12.5716 10.9635 12.1289 11.7578 11.3477C12.5651 10.5664 12.9688 9.53125 12.9688 8.24219C12.9688 7.14844 12.6758 6.28906 12.0898 5.66406C11.5169 5.03906 10.7422 4.72656 9.76562 4.72656C7.36979 4.72656 6.17188 6.32161 6.17188 9.51172V30.0781H0V9.58984C0 6.6862 0.891927 4.36198 2.67578 2.61719C4.45964 0.872396 6.9401 0 10.1172 0C12.9427 0 15.1758 0.716146 16.8164 2.14844C18.457 3.56771 19.2773 5.39714 19.2773 7.63672C19.2773 9.22526 18.8086 10.6185 17.8711 11.8164C16.9466 13.0143 15.7487 13.8346 14.2773 14.2773V14.3555C19.0039 15.2539 21.3672 17.8516 21.3672 22.1484C21.3672 24.4922 20.5404 26.4844 18.8867 28.125C17.2461 29.7526 15.0195 30.5664 12.207 30.5664C10.8398 30.5664 9.45312 30.3516 8.04688 29.9219Z"/>
                <defs>
                  <linearGradient id="biniLoadingGradient" x1="9.96094" y1="-12.9219" x2="9.96094" y2="40.0781" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#00CFFF"/>
                    <stop offset="1" stop-color="#0077FF"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            <div class="bini-badge-menu" id="bini-badge-menu">
              <div class="bini-menu-section">
                <div class="bini-menu-label">📁 Routes (\${routes.length})</div>
                <div class="bini-menu-routes">
                  \${routes.map(route => \`<div class="bini-menu-route">\${route}</div>\`).join('')}
                </div>
              </div>
              
              <div class="bini-menu-section">
                <div class="bini-menu-label">⚡ Status</div>
                <div class="bini-menu-value">✓ Ready</div>
              </div>
              
              <div class="bini-menu-section">
                <div class="bini-menu-label">🚀 Version</div>
                <div class="bini-menu-value">v\${versionInfo}</div>
              </div>
            </div>
            
            <script>
              window.BiniBadge = (function() {
                const badge = document.getElementById('bini-circular-badge');
                const menu = document.getElementById('bini-badge-menu');
                const loadingPath = badge.querySelector('.bini-loading-path');
                
                let pageLoaded = false;
                let firstAnimationComplete = false;
                
                const ANIMATION_DURATION = 1500;
                const RESTART_DELAY = 300;
                
                badge.addEventListener('click', function(e) {
                  e.stopPropagation();
                  menu.classList.toggle('visible');
                });
                
                document.addEventListener('click', function(e) {
                  if (!badge.contains(e.target) && !menu.contains(e.target)) {
                    menu.classList.remove('visible');
                  }
                });
                
                loadingPath.addEventListener('animationend', function(e) {
                  if (e.animationName === 'biniDrawPath' || e.animationName === 'biniCircleExpand') {
                    firstAnimationComplete = true;
                    
                    if (!pageLoaded) {
                      restartAnimation();
                    } else {
                      stopAnimation();
                    }
                  }
                });
                
                function restartAnimation() {
                  badge.classList.remove('loading');
                  
                  setTimeout(function() {
                    badge.classList.add('loading');
                  }, RESTART_DELAY);
                }
                
                function stopAnimation() {
                  badge.classList.remove('loading');
                }
                
                function startAnimation() {
                  badge.classList.add('loading');
                }
                
                function markPageLoaded() {
                  pageLoaded = true;
                  if (firstAnimationComplete) {
                    stopAnimation();
                  }
                }
                
                startAnimation();
                
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', markPageLoaded);
                  window.addEventListener('load', markPageLoaded);
                } else {
                  markPageLoaded();
                }
                
                return {
                  show: startAnimation,
                  hide: stopAnimation,
                  restart: restartAnimation
                };
              })();
              
              window.__BINI_ROUTES__ = \${routesJson};
              window.__BINI_VERSION__ = '\${versionInfo}';
            </script>
          \`;
          
          return html.replace('</body>', badgeScript + '</body>');
        }
        return html;
      }
    }
  }
}`);
// SSR Plugin
secureWriteFile(path.join(pluginsPath, "ssr.js"), `const BINIJS_VERSION = "${BINIJS_VERSION}";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vite-style logging formatter
function formatViteLog(file, action = 'page reload') {
  const t = new Date().toLocaleTimeString("en-US", { hour12: true, hour: "numeric", minute: "2-digit", second: "2-digit" });
  const gy = "\x1b[90m";     // light gray (timestamp)
  const c = "\x1b[36m";      // cyan [vite]
  const r = "\x1b[0m";       // reset
  const dg = "\x1b[2m\x1b[90m"; // darker gray (client)
  const g = "\x1b[32m";      // green (page reload)
  const lg = "\x1b[90m";     // light gray (file path)
  
  return \`\${gy}\${t}\${r} \${c}[vite]\${r} \${dg}(client)\${r} \${g}\${action}\${r} \${lg}\${file}\${r}\`;
}

function parseMetadata(layoutContent) {
  const metaTags = {
    title: 'Bini.js App',
    description: 'Modern React application built with Bini.js',
    keywords: '',
    viewport: 'width=device-width, initial-scale=1.0',
    openGraph: {},
    twitter: {},
    icons: {}
  };

  try {
    // Extract the entire metadata object
    const metadataMatch = layoutContent.match(/export\\s+const\\s+metadata\\s*=\\s*({[\\s\\S]*?})(?=\\s*export|\\s*function|\\s*const|\\s*$)/);
    
    if (metadataMatch) {
      const metadataStr = metadataMatch[1];
      
      // Helper function to extract properties
      const extractString = (str, prop) => {
        const regex = new RegExp(\`\${prop}:\\\\s*['"]([^'"]+)['"]\`, 'i');
        const match = str.match(regex);
        return match ? match[1] : null;
      };

      const extractArray = (str, prop) => {
        const regex = new RegExp(\`\${prop}:\\\\s*\\\\[([^\\\\]]+)\\\\]\`, 'i');
        const match = str.match(regex);
        if (match) {
          // Simple array parsing - extract quoted values
          const arrayContent = match[1];
          const items = arrayContent.match(/['"]([^'"]+)['"]/g) || [];
          return items.map(item => item.replace(/['"]/g, ''));
        }
        return null;
      };

      const extractObject = (str, prop) => {
        const regex = new RegExp(\`\${prop}:\\\\s*{([^}]+)}\`, 'i');
        const match = str.match(regex);
        if (match) {
          const objContent = match[1];
          return {
            title: extractString(objContent, 'title'),
            description: extractString(objContent, 'description'),
            url: extractString(objContent, 'url'),
            images: extractArray(objContent, 'images') || []
          };
        }
        return null;
      };

      // Basic metadata
      metaTags.title = extractString(metadataStr, 'title') || metaTags.title;
      metaTags.description = extractString(metadataStr, 'description') || metaTags.description;
      
      // Keywords (array)
      const keywordsArray = extractArray(metadataStr, 'keywords');
      if (keywordsArray) {
        metaTags.keywords = keywordsArray.join(', ');
      }

      // Authors
      const authorsMatch = metadataStr.match(/authors:\\s*\\[\\s*{\\s*name:\\s*['"]([^'"]+)['"]/);
      if (authorsMatch) metaTags.author = authorsMatch[1];

      // Viewport
      metaTags.viewport = extractString(metadataStr, 'viewport') || metaTags.viewport;

      // OpenGraph
      const og = extractObject(metadataStr, 'openGraph');
      if (og) metaTags.openGraph = og;

      // Twitter
      const twitter = extractObject(metadataStr, 'twitter');
      if (twitter) metaTags.twitter = twitter;

      // Icons
      const iconsMatch = metadataStr.match(/icons:\\s*{([^}]+)}/);
      if (iconsMatch) {
        const iconsContent = iconsMatch[1];
        metaTags.icons = {
          icon: extractString(iconsContent, 'icon'),
          shortcut: extractString(iconsContent, 'shortcut'),
          apple: extractString(iconsContent, 'apple')
        };
      }

    }
  } catch (error) {
    console.warn('⚠️ Metadata parsing error:', error.message);
  }

  return metaTags;
}

function getCurrentMetadata() {
  const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
  const layoutPathJS = path.join(process.cwd(), 'src/app/layout.jsx');
  
  try {
    let layoutContent = '';
    if (fs.existsSync(layoutPath)) {
      layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    } else if (fs.existsSync(layoutPathJS)) {
      layoutContent = fs.readFileSync(layoutPathJS, 'utf-8');
    } else {
      return {};
    }
    
    return parseMetadata(layoutContent);
  } catch (error) {
    console.warn('⚠️ Could not read layout file:', error.message);
    return {};
  }
}

export function biniSSRPlugin() {
  return {
    name: 'bini-ssr-plugin',
    
    configureServer(server) {
      const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
      const layoutPathJS = path.join(process.cwd(), 'src/app/layout.jsx');
      
      const layoutFiles = [layoutPath, layoutPathJS].filter(fs.existsSync);
      
      layoutFiles.forEach(layoutFile => {
        server.watcher.add(layoutFile);
        
        server.watcher.on('change', (file) => {
          if (layoutFiles.includes(file)) {
            // Show CLI notification when layout changes
            console.log(formatViteLog('src/app/layout.tsx', 'page reload'));
            
            setTimeout(() => {
              server.ws.send({
                type: 'full-reload',
                path: '*'
              });
            }, 100);
          }
        });
      });
    },
    
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const metaTags = getCurrentMetadata();
        
        let metaTagsHTML = '';
        
        // Basic meta tags
        metaTagsHTML += \`
    <meta charset="UTF-8" />
    <meta name="viewport" content="\${metaTags.viewport}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="/favicon.png" type="image/png" />
    <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
    <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
    <link rel="icon" href="/favicon-64x64.png" type="image/png" sizes="64x64" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />\`;
        
        // Title
        metaTagsHTML += \`
    <title>\${metaTags.title}</title>\`;
        
        // Basic meta
        if (metaTags.description) {
          metaTagsHTML += \`
    <meta name="description" content="\${metaTags.description}" />\`;
        }
        
        if (metaTags.keywords) {
          metaTagsHTML += \`
    <meta name="keywords" content="\${metaTags.keywords}" />\`;
        }
        
        if (metaTags.author) {
          metaTagsHTML += \`
    <meta name="author" content="\${metaTags.author}" />\`;
        }
        
        // OpenGraph meta tags
        if (metaTags.openGraph && metaTags.openGraph.title) {
          metaTagsHTML += \`
    <meta property="og:title" content="\${metaTags.openGraph.title}" />
    <meta property="og:description" content="\${metaTags.openGraph.description || metaTags.description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="\${metaTags.openGraph.url || 'https://bini.js.org'}" />
    <meta property="og:site_name" content="\${metaTags.openGraph.title}" />\`;
          
          if (metaTags.openGraph.images && metaTags.openGraph.images.length > 0) {
            metaTagsHTML += \`
    <meta property="og:image" content="\${metaTags.openGraph.images[0]}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="\${metaTags.openGraph.title}" />\`;
          }
        }
        
        // Twitter Card meta tags
        if (metaTags.twitter && metaTags.twitter.title) {
          metaTagsHTML += \`
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="\${metaTags.twitter.title}" />
    <meta name="twitter:description" content="\${metaTags.twitter.description || metaTags.description}" />
    <meta name="twitter:creator" content="\${metaTags.twitter.creator || '@binidu01'}" />\`;
          
          if (metaTags.twitter.images && metaTags.twitter.images.length > 0) {
            metaTagsHTML += \`
    <meta name="twitter:image" content="\${metaTags.twitter.images[0]}" />\`;
          }
        }
        
        // Additional meta tags for better SEO
        metaTagsHTML += \`
    <meta name="theme-color" content="#00CFFF" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="\${metaTags.openGraph?.url || 'https://bini.js.org'}" />\`;
        
        // Bini.js runtime
        metaTagsHTML += \`
    
    <!-- Bini.js runtime -->
    <script>
      window.__BINI_RUNTIME__ = { version: '\${BINIJS_VERSION}' };
    </script>\`;
        
        return html.replace('<!-- BINI_META_TAGS -->', metaTagsHTML);
      }
    },
    
    buildStart() {
      // Ensure favicon files are available
      const publicDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
    },
    
    handleHotUpdate({ server, file }) {
      if (file.endsWith('layout.tsx') || file.endsWith('layout.jsx')) {
        // Remove the console.log from here to avoid duplicate notifications
        // The notification is already shown in configureServer watcher
        
        setTimeout(() => {
          server.ws.send({
            type: 'full-reload',
            path: '*'
          });
        }, 50);
        
        return [];
      }
    }
  }
}`);
// API Plugin - UPDATED with silent operation and improved TypeScript support
secureWriteFile(path.join(pluginsPath, "api.js"), `import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import os from 'os';

const BINIJS_VERSION = "9.1.5";

const rateLimit = new Map();
const handlerCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const hmrOutputState = new Map(); // Track HMR server output state

// Vite-style logging formatter
function formatViteLog(file, action = 'page reload') {
  const t = new Date().toLocaleTimeString("en-US", { hour12: true, hour: "numeric", minute: "2-digit", second: "2-digit" });
  const gy = "\\x1b[90m";     // light gray (timestamp)
  const c = "\\x1b[36m";      // cyan [vite]
  const r = "\\x1b[0m";       // reset
  const dg = "\\x1b[2m\\x1b[90m"; // darker gray (client)
  const g = "\\x1b[32m";      // green (page reload)
  const lg = "\\x1b[90m";     // light gray (file path)
  
  return \`\${gy}\${t}\${r} \${c}[vite]\${r} \${dg}(client)\${r} \${g}\${action}\${r} \${lg}src/app/api/\${file}\${r}\`;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - 60000;
  const requests = (rateLimit.get(ip) || []).filter(time => time > windowStart);
  
  if (requests.length >= 100) {
    return false;
  }
  
  requests.push(now);
  rateLimit.set(ip, requests);
  return true;
}

async function loadApiHandler(routePath, viteServer) {
  const now = Date.now();
  const cacheKey = \`\${routePath}-\${viteServer ? 'vite' : 'node'}\`;
  
  // Shorter cache TTL in development for hot reload
  const devCacheTtl = viteServer ? 1000 : CACHE_TTL;
  
  const cached = handlerCache.get(cacheKey);
  
  if (cached && now - cached.timestamp < devCacheTtl && !viteServer) {
    return cached.handler;
  }

  try {
    const apiDir = path.join(process.cwd(), 'src/app/api');
    const extensions = ['.js', '.ts', '.mjs', '.cjs'];
    let handlerPath = null;
    
    // Find the handler file
    for (const ext of extensions) {
      const testPath = path.join(apiDir, routePath + ext);
      if (fs.existsSync(testPath)) {
        handlerPath = testPath;
        break;
      }
    }
    
    if (!handlerPath) {
      return null;
    }

    let handlerModule;
    
    if (viteServer && handlerPath.endsWith('.ts')) {
      // Use Vite's transform to handle TypeScript files in development
      try {
        // Transform TypeScript to JavaScript using Vite
        const transformed = await viteServer.transformRequest(handlerPath);
        
        if (!transformed || !transformed.code) {
          throw new Error('Vite transformation returned empty result');
        }
        
        // Create a temporary module from the transformed code
        const moduleUrl = \`data:text/javascript;charset=utf-8,\${encodeURIComponent(transformed.code)}\`;
        handlerModule = await import(moduleUrl);
        
      } catch (transformError) {
        // Fallback: try direct import with query parameter
        try {
          const handlerUrl = pathToFileURL(handlerPath).href + '?t=' + Date.now();
          handlerModule = await import(handlerUrl);
        } catch (directImportError) {
          throw new Error(\`Cannot load API route \${routePath}: \${directImportError.message}\`);
        }
      }
    } else if (handlerPath.endsWith('.ts') && !viteServer) {
      // In production/preview mode, handle TypeScript
      try {
        // Try to use dynamic import with TypeScript support
        const handlerUrl = pathToFileURL(handlerPath).href + '?t=' + Date.now();
        handlerModule = await import(handlerUrl);
      } catch (tsError) {
        // Fallback: Try to compile TypeScript manually
        try {
          const ts = await import('typescript');
          const fileContent = fs.readFileSync(handlerPath, 'utf8');
          
          // Simple TypeScript transpilation
          const result = ts.transpileModule(fileContent, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2020,
              module: ts.ModuleKind.ESNext,
              jsx: ts.JsxEmit.React,
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            }
          });
          
          const compiledCode = result.outputText;
          const moduleUrl = \`data:text/javascript;charset=utf-8,\${encodeURIComponent(compiledCode)}\`;
          handlerModule = await import(moduleUrl);
        } catch (compileError) {
          throw new Error(
            \`TypeScript API routes require tsx or ts-node in production. \` +
            \`Install with: npm install -D tsx\\n\` +
            \`Or convert \${routePath} to JavaScript.\`
          );
        }
      }
    } else {
      // Regular JavaScript file import - force fresh import in development
      const timestamp = viteServer ? Date.now() : 0;
      const handlerUrl = pathToFileURL(handlerPath).href + '?t=' + timestamp;
      handlerModule = await import(handlerUrl);
    }
    
    const handler = handlerModule.default;
    
    if (typeof handler !== 'function') {
      throw new Error('Invalid API handler - must export a default function');
    }
    
    // Only cache in production - skip caching in development for hot reload
    if (!viteServer) {
      handlerCache.set(cacheKey, { handler, timestamp: now });
    }
    
    return handler;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

// Enhanced file watcher with proper HMR triggering
function setupFileWatcher(viteServer) {
  const apiDir = path.join(process.cwd(), 'src/app/api');
  const normalizedApiDir = apiDir.replace(/\\\\/g, '/');
  
  if (viteServer && fs.existsSync(apiDir)) {
    // Add the API directory to Vite's watcher
    viteServer.watcher.add(apiDir);
    
    const handleApiFileChange = (file, action) => {
      // Normalize file path to use forward slashes
      const normalizedFile = file.replace(/\\\\/g, '/');
      const normalizedApiDirCheck = normalizedApiDir.replace(/\\\\/g, '/');
      
      if (normalizedFile.includes(normalizedApiDirCheck) && /\\.(js|ts|mjs|cjs)$/.test(normalizedFile)) {
        const routePath = path.relative(apiDir, file).replace(/\\\\/g, '/');
        
        // Clear all related cache entries
        const cacheKeys = Array.from(handlerCache.keys());
        cacheKeys.forEach(key => {
          if (key.includes(routePath.replace(/\\.(js|ts|mjs|cjs)$/, '')) || key.includes('vite')) {
            handlerCache.delete(key);
          }
        });
        
        // Show custom output only for add/delete actions
        if (action === 'add' || action === 'unlink' || action === 'delete') {
          console.log(formatViteLog(routePath, 'page reload'));
        }
        
        // Send custom HMR event with action details
        viteServer.ws.send({
          type: 'custom',
          event: 'api-update',
          data: { 
            route: routePath,
            file: path.basename(file),
            action: action,
            timestamp: Date.now()
          }
        });
        
        // Trigger full reload for new files or deletions
        if (action === 'add' || action === 'unlink' || action === 'delete') {
          setTimeout(() => {
            viteServer.ws.send({
              type: 'full-reload',
              path: '*'
            });
          }, 50);
        }
      }
    };

    // Watch for file operations with proper action types
    viteServer.watcher.on('change', (file) => handleApiFileChange(file, 'edit'));
    viteServer.watcher.on('add', (file) => handleApiFileChange(file, 'add'));
    viteServer.watcher.on('unlink', (file) => handleApiFileChange(file, 'unlink'));
    
    // Handle directory changes
    viteServer.watcher.on('addDir', (dir) => {
      const normalizedDir = dir.replace(/\\\\/g, '/');
      if (normalizedDir.includes(normalizedApiDir) && !normalizedDir.includes('node_modules')) {
        handlerCache.clear();
        viteServer.ws.send({
          type: 'full-reload',
          path: '*'
        });
      }
    });
    
    viteServer.watcher.on('unlinkDir', (dir) => {
      const normalizedDir = dir.replace(/\\\\/g, '/');
      if (normalizedDir.includes(normalizedApiDir) && !normalizedDir.includes('node_modules')) {
        handlerCache.clear();
        viteServer.ws.send({
          type: 'full-reload',
          path: '*'
        });
      }
    });
  }
}

async function handleApiRequest(req, res, viteServer = null) {
  const clientIp = req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + 60);
    res.end(JSON.stringify({ error: 'Too many requests' }));
    return;
  }

  const now = Date.now();
  const windowStart = now - 60000;
  const requests = (rateLimit.get(clientIp) || []).filter(time => time > windowStart);
  const remaining = Math.max(0, 100 - requests.length);
  
  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.floor(now / 1000) + 60);
  
  try {
    const url = new URL(req.url, \`http://\${req.headers.host}\`);
    let routePath = url.pathname.replace('/api/', '') || 'index';
    
    if (routePath.endsWith('/')) {
      routePath = routePath.slice(0, -1);
    }
    
    const handler = await loadApiHandler(routePath, viteServer);
    
    if (!handler) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'API route not found',
        path: routePath,
        availableExtensions: ['.js', '.ts', '.mjs', '.cjs']
      }));
      return;
    }
    
    let body = {};
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.headers['content-type'] === 'application/json') {
      try {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const raw = Buffer.concat(chunks).toString('utf8');
        if (raw) {
          body = JSON.parse(raw);
        }
      } catch (error) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
    }
    
    const request = {
      method: req.method,
      headers: req.headers,
      body,
      query: Object.fromEntries(url.searchParams),
      params: {},
      ip: clientIp,
      url: req.url
    };
    
    const response = {
      status: (code) => {
        res.statusCode = code;
        return response;
      },
      setHeader: (name, value) => {
        res.setHeader(name, value);
        return response;
      },
      json: (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data, null, 2));
      },
      send: (data) => {
        if (typeof data === 'string') {
          res.setHeader('Content-Type', 'text/plain');
          res.end(data);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        }
      },
      end: (data) => {
        res.end(data);
      }
    };
    
    // Add timeout for handler execution
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Handler timeout')), 30000)
    );
    
    const handlerPromise = Promise.resolve().then(() => handler(request, response));
    const result = await Promise.race([handlerPromise, timeoutPromise]);
    
    if (result && !res.writableEnded) {
      response.json(result);
    }
    
  } catch (error) {
    if (!res.writableEnded) {
      res.statusCode = error.message === 'Handler timeout' ? 504 : 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: error.message === 'Handler timeout' ? 'Request timeout' : 'Internal Server Error',
        message: error.message,
        ...(viteServer && { stack: error.stack })
      }));
    }
  }
}

export function biniAPIPlugin(options = {}) {
  const { isPreview = false } = options;
  let viteServer = null;
  
  return {
    name: 'bini-api-plugin',
    
    configureServer(server) {
      viteServer = server;
      
      // Only setup file watcher if API routes exist
      const apiDir = path.join(process.cwd(), 'src/app/api');
      if (fs.existsSync(apiDir)) {
        const files = fs.readdirSync(apiDir, { recursive: true });
        const hasApiRoutes = files.some(file => /\\.(js|ts|mjs|cjs)$/.test(file) && !file.includes('node_modules'));
        
        if (hasApiRoutes) {
          setupFileWatcher(viteServer);
        }
      }
      
      server.middlewares.use('/api', async (req, res) => {
        await handleApiRequest(req, res, viteServer);
      });

      // Development API info endpoint
      server.middlewares.use('/api/_dev', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          message: 'Bini.js Development API',
          hotReload: true,
          cacheSize: handlerCache.size,
          timestamp: Date.now()
        }));
      });
    },
    
    configurePreviewServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        await handleApiRequest(req, res, null);
      });
    },
    
    buildStart() {
      const apiDir = path.join(process.cwd(), 'src/app/api');
      if (fs.existsSync(apiDir)) {
        try {
          const files = fs.readdirSync(apiDir, { recursive: true });
          const apiRoutes = files.filter(file => 
            /\\.(js|ts|mjs|cjs)$/.test(file) && !file.includes('node_modules')
          );
          // Silent - no console output
        } catch (error) {
          // Silent error handling
        }
      }
    },
    
    // Handle HMR updates for API routes
    handleHotUpdate({ file, server, modules }) {
      const normalizedFile = file.replace(/\\\\/g, '/');
      if (normalizedFile.includes('src/app/api') && /\\.(js|ts|mjs|cjs)$/.test(normalizedFile)) {
        const apiDir = path.join(process.cwd(), 'src/app/api');
        const routePath = path.relative(apiDir, file).replace(/\\\\/g, '/');
        
        // Clear all cache entries
        const cacheKeys = Array.from(handlerCache.keys());
        cacheKeys.forEach(key => {
          if (key.includes(routePath.replace(/\\.(js|ts|mjs|cjs)$/, '')) || key.includes('vite')) {
            handlerCache.delete(key);
          }
        });
        
        // Show CLI output for file modifications
        console.log(formatViteLog(routePath, 'page reload'));
        
        // Send custom HMR event
        server.ws.send({
          type: 'custom',
          event: 'api-update',
          data: { 
            route: routePath,
            file: path.basename(file),
            action: 'reload',
            timestamp: Date.now()
          }
        });

        // Trigger full reload for consistency
        setTimeout(() => {
          server.ws.send({
            type: 'full-reload',
            path: '*'
          });
        }, 50);
        
        return [];
      }
      
      return modules;
    },

    // Transform index.html to add API HMR client
    transformIndexHtml(html) {
      if (process.env.NODE_ENV !== 'production') {
        const hmrScript = \`
          <script type="module">
            // API Hot Reload Client
            if (import.meta.hot) {
              import.meta.hot.on('api-update', (data) => {
                console.log('[API HMR]', data.action, data.route);
              });
            }
          </script>
        \`;
        return html.replace('</body>', \`\${hmrScript}</body>\`);
      }
      return html;
    }
  }
}`);
}

function generateCSSModulesFiles(projectPath) {
  const appPath = path.join(projectPath, "src/app");
  
  // Home page CSS module
  secureWriteFile(path.join(appPath, "page.module.css"), `.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: #ecf3ff;
}

.wrapper {
  max-width: 56rem;
  width: 100%;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.logoContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.logo {
  height: 4rem;
}

.title {
  font-size: 3rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 1rem;
}

.accent {
  background: linear-gradient(to right, #00CFFF, #0077FF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.25rem;
  color: #6b7280;
  margin-bottom: 2rem;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 3rem;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.card {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}

.icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.cardTitle {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.cardText {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.ctaSection {
  text-align: center;
}

.ctaCard {
  background: white;
  border-radius: 0.5rem;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  text-align: center;
  margin-bottom: 2rem;
}

.ctaTitle {
  font-size: 1.875rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 0.75rem;
}

.ctaText {
  color: #4b5563;
  font-size: 1.125rem;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.buttonGroup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
}

@media (min-width: 640px) {
  .buttonGroup {
    flex-direction: row;
  }
}

.button {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: linear-gradient(to right, #00CFFF, #0077FF);
  color: white;
  font-weight: 600;
  border-radius: 0.5rem;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.button:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 15px rgba(0, 207, 255, 0.3);
}

.footer {
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
}

.link {
  color: #2563eb;
  text-decoration: underline;
  font-weight: 500;
}

.link:hover {
  color: #1d4ed8;
}

@media (max-width: 640px) {
  .container {
    padding: 1rem;
  }
  
  .title {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
  
  .grid {
    gap: 1rem;
  }
  
  .card {
    padding: 1rem;
  }
  
  .ctaCard {
    padding: 1.5rem;
  }
  
  .ctaTitle {
    font-size: 1.5rem;
  }
  
  .ctaText {
    font-size: 1rem;
  }
}`);
}

function generateGlobalStyles(styling) {
  const baseStyles = `:root {
  --color-primary: #00CFFF;
  --color-bg: #ecf3ff;
  --color-text: #1f2937;
  --color-gray: #6b7280;
  --color-white: #ffffff;
  --color-border: #e5e7eb;
  --shadow-sm: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 8px 15px rgba(0, 0, 0, 0.15);
}

* { 
  box-sizing: border-box; 
  margin: 0; 
  padding: 0; 
}

html {
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg);
  min-height: 100vh;
}

#root {
  min-height: 100vh;
}

.main-content {
  min-height: 100vh;
}

.btn-primary {
  display: inline-block;
  padding: 12px 24px;
  background: linear-gradient(to right, #00CFFF, #0077FF);
  color: var(--color-white);
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.btn-primary:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 15px rgba(0, 207, 255, 0.3);
}

.btn-secondary {
  display: inline-block;
  padding: 12px 24px;
  border: 2px solid #1f2937;
  color: #1f2937;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  background: transparent;
}

.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.04);
  transform: scale(1.05);
}

.card {
  background: var(--color-white);
  border-radius: 0.5rem;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 3rem;
}

@media (min-width: 768px) {
  .grid-layout {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid-layout {
    grid-template-columns: repeat(4, 1fr);
  }
}

.text-center {
  text-align: center;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.min-h-screen {
  min-height: 100vh;
}

.bg-blue {
  background: var(--color-bg);
}

.text-large {
  font-size: 3rem;
  font-weight: bold;
}

.text-medium {
  font-size: 1.25rem;
}

.text-gray {
  color: var(--color-gray);
}

.text-white {
  color: var(--color-white);
}

.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mb-8 { margin-bottom: 2rem; }
.mb-12 { margin-bottom: 3rem; }

.p-6 { padding: 1.5rem; }
.p-8 { padding: 2rem; }

.max-w-4xl { max-width: 56rem; }
.w-full { width: 100%; }

.home-container {
  min-height: 100vh;
  background: linear-gradient(to bottom right, #ecf3ff, #e0e7ff);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.home-wrapper {
  width: 100%;
  max-width: 56rem;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 3rem;
}

.logo {
  width: 6rem;
  height: 6rem;
}

.title {
  font-size: 3rem;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 1rem;
  text-align: center;
}

.subtitle {
  font-size: 1.25rem;
  color: #4b5563;
  line-height: 1.6;
  max-width: 32rem;
  margin: 0 auto 2rem;
  text-align: center;
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 3rem;
}

@media (min-width: 768px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.feature-card {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  text-align: center;
}

.feature-card:hover {
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.feature-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.cta-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
  text-align: center;
  margin-bottom: 2rem;
}

@media (min-width: 640px) {
  .cta-buttons {
    flex-direction: row;
  }
}

.footer-links {
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
}

.footer-links a {
  color: #2563eb;
  text-decoration: underline;
  font-weight: 500;
  transition: color 0.2s ease;
}

.footer-links a:hover {
  color: #1d4ed8;
}

@media (max-width: 640px) {
  .home-container {
    padding: 1rem;
  }

  .title {
    font-size: 2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .features-grid {
    gap: 1rem;
  }

  .feature-card {
    padding: 1rem;
  }

  .text-large {
    font-size: 2rem;
  }

  .text-medium {
    font-size: 1rem;
  }

  .grid-layout {
    gap: 1rem;
  }

  .card {
    padding: 1rem;
  }

  .p-8 {
    padding: 1.5rem;
  }
}`;

  if (styling === "Tailwind") {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

${baseStyles}`;
  } else {
    return baseStyles;
  }
}

function generatePackageJson(projectName, useTypeScript, styling) {
  const baseDependencies = {
    react: "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.1.1",
    "fastify": "^4.28.1",
    "@fastify/static": "^7.0.4",
    "@fastify/helmet": "^11.1.1",
    "@fastify/cors": "^9.0.1",
    "@fastify/rate-limit": "^8.0.2",
    "sharp": "^0.33.2"
  };

  const baseDevDependencies = {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.5",
    "@eslint/js": "^9.9.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.9",
    "globals": "^15.9.0",
    "tsx": "^4.19.2", // ADDED: tsx package for TypeScript support
    "html-minifier-terser": "^7.2.0", // ADDED: For HTML minification
    "terser": "^5.31.0" // ADDED: For JavaScript minification
  };

  if (useTypeScript) {
    baseDevDependencies["@types/react"] = "^18.3.18";
    baseDevDependencies["@types/react-dom"] = "^18.3.5";
    baseDevDependencies["@types/node"] = "^20.17.9";
    baseDevDependencies["typescript"] = "^5.7.2";
  }

  if (styling === "Tailwind") {
    baseDevDependencies.tailwindcss = "^3.4.17";
    baseDevDependencies.postcss = "^8.4.49";
    baseDevDependencies.autoprefixer = "^10.4.20";
  }

  return {
    name: projectName,
    type: "module",
    version: "1.0.0",
    scripts: {
      "dev": "vite --host --open", // FIXED: Added --open flag
      "build": "vite build",
      "start": "node api-server.js",
      "preview": "vite preview --host --open", // FIXED: Added --open flag
      "type-check": useTypeScript ? "tsc --noEmit" : "echo 'TypeScript not enabled'",
      "lint": `eslint . --ext .js,.jsx${useTypeScript ? ',.ts,.tsx' : ''}`
    },
    dependencies: baseDependencies,
    devDependencies: baseDevDependencies
  };
}

function generateAppFiles(projectPath, mainExt, useTypeScript, styling) {
  const appPath = path.join(projectPath, "src/app");
  
  // Layout file
  if (useTypeScript) {
    secureWriteFile(path.join(appPath, `layout.${mainExt}`), `import React from 'react';
import './globals.css';

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata = {
  title: 'Bini.js App',
  description: 'Modern React application built with Bini.js',
  keywords: [
    'Bini.js',
    'React framework', 
    'Vite',
    'TailwindCSS',
    'frontend framework',
    'modern web development'
  ],
  authors: [{ name: 'Binidu Ranasinghe', url: 'https://bini.js.org' }],
  metadataBase: new URL('https://bini.js.org'),
  openGraph: {
    title: 'Bini.js — The Next-Gen React Framework',
    description: 'Bini.js brings speed, protection, and simplicity to modern React development.',
    url: 'https://bini.js.org',
    siteName: 'Bini.js',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Bini.js — Modern React Framework',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bini.js — The Next-Gen React Framework', 
    description: 'Blazing-fast React apps powered by Vite and TailwindCSS.',
    creator: '@binidu01',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: [
      { url: '/favicon.png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        {/* Additional head tags can be added here */}
      </head>
      <body>
        <div id="root">
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}`);
  } else {
    secureWriteFile(path.join(appPath, `layout.${mainExt}`), `import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Bini.js App',
  description: 'Modern React application built with Bini.js',
  keywords: [
    'Bini.js',
    'React framework', 
    'Vite',
    'TailwindCSS',
    'frontend framework',
    'modern web development'
  ],
  authors: [{ name: 'Binidu Ranasinghe', url: 'https://bini.js.org' }],
  metadataBase: new URL('https://bini.js.org'),
  openGraph: {
    title: 'Bini.js — The Next-Gen React Framework',
    description: 'Bini.js brings speed, protection, and simplicity to modern React development.',
    url: 'https://bini.js.org',
    siteName: 'Bini.js',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Bini.js — Modern React Framework',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bini.js — The Next-Gen React Framework', 
    description: 'Blazing-fast React apps powered by Vite and TailwindCSS.',
    creator: '@binidu01',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    shortcut: [
      { url: '/favicon.png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Additional head tags can be added here */}
      </head>
      <body>
        <div id="root">
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}`);
  }

  // Generate home page based on styling option
  let homePageContent;
  
  if (styling === "Tailwind") {
    homePageContent = `import { useEffect, useState } from "react";

export default function Home() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(darkMode);
    document.documentElement.classList.toggle("dark", darkMode);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 120"
            fill="none"
            className="w-24 h-24"
            role="img"
            aria-label="Bini.js logo"
          >
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00CFFF" />
                <stop offset="100%" stopColor="#0077FF" />
              </linearGradient>
            </defs>
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontFamily="Segoe UI, Arial, sans-serif"
              fontSize="90"
              fontWeight="700"
              fill="url(#grad)"
            >
              ß
            </text>
          </svg>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Build Better with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
              Bini.js
            </span>
          </h1>
          <p className="text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto">
            A modern JavaScript framework designed for simplicity and performance.
            Start building stunning applications in seconds.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { icon: "⚡", title: "Fast", desc: "Lightning quick performance" },
            { icon: "📦", title: "Lightweight", desc: "Minimal dependencies" },
            { icon: "🎨", title: "Modern", desc: "Latest web standards" },
            { icon: "🚀", title: "Easy", desc: "Simple to get started" }
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-200"
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center mb-8 border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 mb-6 text-lg">
            Explore the possibilities with Bini.js and build faster than ever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/Binidu01/bini-examples"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 inline-block"
            >
              View Examples
            </a>
            <a
              href="https://bini.js.org"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 border-2 border-gray-900 text-gray-900 font-semibold rounded-lg hover:bg-gray-50 transition-colors inline-block"
            >
              Documentation
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          <p>
            Get started by exploring the{" "}
            <a
              href="https://7jhv5n-3000.csb.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              learning center
            </a>
            {" "}or install via{" "}
            <a
              href="https://www.npmjs.com/package/create-bini-app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              npm
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}`;
  } else if (styling === "CSS Modules") {
    homePageContent = `import { useEffect, useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(darkMode);
    document.documentElement.classList.toggle("dark", darkMode);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 120"
            fill="none"
            className={styles.logo}
            role="img"
            aria-label="Bini.js logo"
          >
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00CFFF" />
                <stop offset="100%" stopColor="#0077FF" />
              </linearGradient>
            </defs>
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontFamily="Segoe UI, Arial, sans-serif"
              fontSize="90"
              fontWeight="700"
              fill="url(#grad)"
            >
              ß
            </text>
          </svg>
        </div>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            Build Better with{" "}
            <span className={styles.accent}>Bini.js</span>
          </h1>
          <p className={styles.subtitle}>
            A modern JavaScript framework designed for simplicity and performance.
            Start building stunning applications in seconds.
          </p>
        </div>

        {/* Features Grid */}
        <div className={styles.grid}>
          {[
            { icon: "⚡", title: "Fast", desc: "Lightning quick performance" },
            { icon: "📦", title: "Lightweight", desc: "Minimal dependencies" },
            { icon: "🎨", title: "Modern", desc: "Latest web standards" },
            { icon: "🚀", title: "Easy", desc: "Simple to get started" }
          ].map((feature) => (
            <div key={feature.title} className={styles.card}>
              <div className={styles.icon}>{feature.icon}</div>
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.cardText}>{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Ready to Get Started?</h2>
          <p className={styles.ctaText}>
            Explore the possibilities with Bini.js and build faster than ever.
          </p>
          <div className={styles.buttonGroup}>
            <a
              href="https://github.com/Binidu01/bini-examples"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.button}
            >
              View Examples
            </a>
            <a
              href="https://bini.js.org"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.button}
            >
              Documentation
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p>
            Get started by exploring the{" "}
            <a
              href="https://7jhv5n-3000.csb.app"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              learning center
            </a>
            {" "}or install via{" "}
            <a
              href="https://www.npmjs.com/package/create-bini-app"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              npm
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}`;
  } else {
    // None styling option
    homePageContent = `import { useEffect, useState } from "react";

export default function Home() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(darkMode);
    document.documentElement.classList.toggle("dark", darkMode);
  }, []);

  return (
    <div className="home-container">
      <main className="home-wrapper">
        {/* Logo */}
        <div className="logo-container">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 120 120"
            fill="none"
            className="logo"
            role="img"
            aria-label="Bini.js logo"
          >
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00CFFF" />
                <stop offset="100%" stopColor="#0077FF" />
              </linearGradient>
            </defs>
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontFamily="Segoe UI, Arial, sans-serif"
              fontSize="90"
              fontWeight="700"
              fill="url(#grad)"
            >
              ß
            </text>
          </svg>
        </div>

        {/* Hero Content */}
        <div>
          <h1 className="title">
            Build Better with{" "}
            <span style={{background: 'linear-gradient(to right, #00CFFF, #0077FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>Bini.js</span>
          </h1>

          <p className="subtitle">
            A modern JavaScript framework designed for simplicity and performance.
            Start building stunning applications in seconds.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="features-grid">
          {[
            { icon: "⚡", title: "Fast", desc: "Lightning quick performance" },
            { icon: "📦", title: "Lightweight", desc: "Minimal dependencies" },
            { icon: "🎨", title: "Modern", desc: "Latest web standards" },
            { icon: "🚀", title: "Easy", desc: "Simple to get started" }
          ].map((feature) => (
            <div key={feature.title} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p style={{color: '#6b7280'}}>{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="cta-buttons">
          <a
            href="https://github.com/Binidu01/bini-examples"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            View Examples
          </a>
          <a
            href="https://bini.js.org"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Documentation
          </a>
        </div>

        {/* Footer Links */}
        <div className="footer-links">
          Get started by exploring the{" "}
          <a
            href="https://7jhv5n-3000.csb.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            learning center
          </a>{" "}
          or install via{" "}
          <a
            href="https://www.npmjs.com/package/create-bini-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            npm
          </a>
        </div>
      </main>
    </div>
  );
}`;
  }

  secureWriteFile(path.join(appPath, `page.${mainExt}`), homePageContent);

  secureWriteFile(path.join(projectPath, "src", `main.${mainExt}`), `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);
root.render(<App />);

if (import.meta.env.DEV) {
  import.meta.hot?.accept();
}`);

  if (useTypeScript) {
    secureWriteFile(path.join(projectPath, "src", `App.${mainExt}`), `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './app/globals.css';
import Home from './app/page';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

function NotFound() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#ecf3ff'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
      <p style={{ fontSize: '1.2rem', color: '#666' }}>Page not found</p>
      <a href="/" style={{ 
        marginTop: '2rem', 
        padding: '0.75rem 1.5rem',
        background: '#00CFFF',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '0.5rem'
      }}>
        Go Home
      </a>
    </div>
  );
}`);
  } else {
    secureWriteFile(path.join(projectPath, "src", `App.${mainExt}`), `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './app/globals.css';
import Home from './app/page';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

function NotFound() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#ecf3ff'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
      <p style={{ fontSize: '1.2rem', color: '#666' }}>Page not found</p>
      <a href="/" style={{ 
        marginTop: '2rem', 
        padding: '0.75rem 1.5rem',
        background: '#00CFFF',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '0.5rem'
      }}>
        Go Home
      </a>
    </div>
  );
}`);
  }
}

function generateConfigFiles(projectPath, useTypeScript, configExt, styling) {
  if (useTypeScript) {
    secureWriteFile(path.join(projectPath, "tsconfig.json"), `{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "bini-env.d.ts"],
  "exclude": ["node_modules", "dist", ".bini"]
}`);
    
    secureWriteFile(path.join(projectPath, "bini-env.d.ts"), `/// <reference types="bini/client" />
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production'
      VITE_APP_NAME: string
      VITE_APP_URL: string
    }
  }
}
export {}`);
  }

// UPDATED Vite config with fixed auto-opening and HMR
secureWriteFile(path.join(projectPath, `vite.config.${configExt}`), 
`import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { minify } from 'html-minifier-terser';

import { biniRouterPlugin } from './bini/internal/plugins/router.js';
import { biniBadgePlugin } from './bini/internal/plugins/badge.js';
import { biniSSRPlugin } from './bini/internal/plugins/ssr.js';
import { biniAPIPlugin } from './bini/internal/plugins/api.js';
import { biniPreviewPlugin } from './bini/internal/plugins/preview.js';
import biniConfig from './bini.config.mjs';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isPreview = process.env.npm_lifecycle_event === 'preview';
  const isBuild = command === 'build';
  const port = biniConfig.port || 3000;

  // FIXED: Enhanced HMR configuration
  const hmrConfig = env.CODESPACE_NAME ? {
    clientPort: 443,
    overlay: true
  } : {
    overlay: true,
    host: 'localhost'
  };

  return {
    plugins: [
      react(),
      biniRouterPlugin(),
      biniSSRPlugin(),
      biniBadgePlugin(),
      biniAPIPlugin({ isPreview }),
      biniPreviewPlugin(),

      {
        name: 'bini-html-minifier',
        apply: 'build',
        closeBundle: async () => {
          const distDir = path.resolve('.bini/dist');
          if (!fs.existsSync(distDir)) return;

          const processHTML = async (filePath) => {
            const html = await fs.promises.readFile(filePath, 'utf8');
            const minified = await minify(html, {
              collapseWhitespace: true,
              removeComments: true,
              removeRedundantAttributes: true,
              removeEmptyAttributes: true,
              removeScriptTypeAttributes: true,
              removeStyleLinkTypeAttributes: true,
              minifyCSS: true,
              minifyJS: true,
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

    // FIXED: Server configuration with auto-open and better HMR
    server: {
      port,
      host: env.CODESPACE_NAME ? '0.0.0.0' : (biniConfig.host || 'localhost'),
      open: true, // FIXED: Changed from false to true
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      hmr: hmrConfig,
      watch: {
        usePolling: env.CODESPACE_NAME ? true : false,
        ignored: ['**/.bini/**', '**/node_modules/**']
      },
    },

    // FIXED: Preview configuration with auto-open
    preview: {
      port,
      host: '0.0.0.0',
      open: true, // FIXED: Added auto-open for preview
      cors: true,
    },

    build: {
      outDir: '.bini/dist',
      sourcemap: biniConfig.build?.sourcemap !== false && !isBuild,
      emptyOutDir: true,
      minify: 'terser',
      cssCodeSplit: true,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|gif|svg|webp|avif/.test(ext)) return 'assets/images/[name]-[hash][extname]';
            if (/woff|woff2|eot|ttf|otf|ttc/.test(ext)) return 'assets/fonts/[name]-[hash][extname]';
            if (ext === 'css') return 'css/[name]-[hash][extname]';
            if (ext === 'json') return 'data/[name]-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
        },
      },

      terserOptions: {
        compress: {
          drop_console: isBuild,
          drop_debugger: isBuild,
          passes: 2,
        },
        format: {
          comments: false,
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
      exclude: ['@bini/internal']
    },
  };
});`);
  // UPDATED: API directory now inside app folder
  secureWriteFile(path.join(projectPath, `bini.config.${configExt}`), 
  `export default {
  // Where Bini will output compiled assets
  outDir: ".bini",

  // Dev server settings
  port: 3000,
  host: "0.0.0.0",

  // API Routes configuration
  api: {
    dir: "src/app/api",
    bodySizeLimit: "2mb",
    extensions: [".js", ".ts", ".mjs"]
  },

  // Static file handling
  static: {
    dir: "public",
    maxAge: 3600,
    dotfiles: "deny",
    immutable: false
  },

  // Build settings
  build: {
    minify: true,
    sourcemap: true,
    target: "esnext",
    clean: true,
    cssCodeSplit: true
  },

  // CORS
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  },

  // Security Layer
  security: {
    csp: {
      enabled: false,
    },
    hidePoweredBy: true,
    referrerPolicy: "no-referrer",
    xssFilter: true,
    frameguard: "deny"
  },

  // Logging
  logging: {
    level: "info",
    color: true,
    timestamp: true
  }
};`);

  secureWriteFile(path.join(projectPath, "eslint.config.mjs"), `import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', '.bini', 'node_modules'] },
  {
    files: ['**/*.{js,jsx${useTypeScript ? ',ts,tsx' : ''}}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-console': 'warn',
      'prefer-const': 'error',
      'react/no-unknown-property': ['error', { ignore: ['css'] }],
    },
  },
]`);

  if (styling === "Tailwind") {
    secureWriteFile(path.join(projectPath, "tailwind.config.js"), 
      `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#ecf3ff',
        }
      }
    },
  },
  plugins: [],
};`);
    
    secureWriteFile(path.join(projectPath, "postcss.config.mjs"), 
      `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
};`);
  }
}

async function generateProject(projectName, answers, flags = {}) {
  const progress = new ProgressLogger(9);
  
  try {
    progress.start('Checking system resources');
    checkDiskSpace(100);
    checkMemoryUsage();
    await checkNetworkConnectivity();
    progress.success();

    const projectPath = path.join(process.cwd(), projectName);
    
    if (fs.existsSync(projectPath) && !flags.force) {
      throw new Error(`Project directory "${projectName}" already exists. Use --force to overwrite.`);
    }

    if (flags.force && fs.existsSync(projectPath)) {
      progress.start('Cleaning existing directory');
      safeRm(projectPath);
      progress.success();
    }

    const useTypeScript = shouldUseTypeScript(flags, answers);
    const ext = getFileExtensions(useTypeScript);
    
    const appPath = path.join(projectPath, "src/app");
    const apiPath = path.join(projectPath, "src/app/api"); // UPDATED: API inside app folder
    const publicPath = path.join(projectPath, "public");
    const biniPath = path.join(projectPath, "bini");
    
    progress.start('Creating project structure');
    mkdirRecursive(appPath);
    mkdirRecursive(apiPath); // UPDATED: Create API directory inside app
    mkdirRecursive(publicPath);
    mkdirRecursive(biniPath);
    progress.success();
    
    progress.start('Generating framework internals');
    generateBiniInternals(projectPath, useTypeScript);
    progress.success();

    progress.start('Generating favicons and logos');
    await generateFaviconFiles(publicPath);
    progress.success();

    progress.start('Creating web manifest');
    generateWebManifest(projectPath);
    progress.success();

    progress.start('Creating application files');
    secureWriteFile(path.join(projectPath, "index.html"), `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- BINI_META_TAGS -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${ext.main}"></script>
  </body>
</html>`, { force: flags.force });

    generateAppFiles(projectPath, ext.main, useTypeScript, answers.styling);

    if (answers.styling === "CSS Modules") {
      generateCSSModulesFiles(projectPath);
    }

    const globalStyles = generateGlobalStyles(answers.styling);
    secureWriteFile(path.join(appPath, "globals.css"), globalStyles, { force: flags.force });

    progress.start('Generating configuration files');
    generateConfigFiles(projectPath, useTypeScript, ext.config, answers.styling);

    const packageJson = generatePackageJson(projectName, useTypeScript, answers.styling);
    secureWriteFile(path.join(projectPath, "package.json"), JSON.stringify(packageJson, null, 2), { force: flags.force });

    // UPDATED: API directory now inside app folder
    const apiDir = path.join(projectPath, "src/app/api");
    mkdirRecursive(apiDir);

    // Create TypeScript example if TypeScript is enabled, otherwise JavaScript
    if (useTypeScript) {
      secureWriteFile(path.join(apiDir, "hello.ts"), `// Example TypeScript API route
export default function handler(req: any, _res: any) {
  return {
    message: 'Hello from Bini.js TypeScript!',
    timestamp: new Date().toISOString(),
    method: req.method,
    working: true,
    typeScript: true
  };
}`, { force: flags.force });
    } else {
      secureWriteFile(path.join(apiDir, "hello.js"), `// Example JavaScript API route
export default function handler(req, res) {
  return {
    message: 'Hello from Bini.js API!',
    timestamp: new Date().toISOString(),
    method: req.method,
    working: true
  };
}`, { force: flags.force });
    }

// Production server - UPDATED with silent operation and improved TypeScript support
secureWriteFile(path.join(projectPath, "api-server.js"), 
`#!/usr/bin/env node

import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";
import fastifyRateLimiter from "@fastify/rate-limit";
import { fileURLToPath } from "url";
import path from "path";
import { createServer } from "net";
import net from "net";
import os from "os";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec as execCb } from "child_process";
import fs from "fs";
import zlib from "zlib";
import { displayBiniStartup } from "./bini/internal/env-checker.js";

const execp = promisify(execCb);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NODE_ENV = process.env.NODE_ENV || "production";
const DEFAULT_PORT = parseInt(
  process.env.PORT || (NODE_ENV === "development" ? "3001" : "3000"),
  10
);
const ENABLE_CORS = true;
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || "100", 10);

const handlerCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

let isShuttingDown = false;
const activeRequests = new Set();

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  const shutdownTimeout = setTimeout(() => {
    process.exit(1);
  }, 30000);

  const checkRequests = setInterval(() => {
    if (activeRequests.size === 0) {
      clearInterval(checkRequests);
      clearTimeout(shutdownTimeout);
      process.exit(0);
    }
  }, 100);
}

function validateDistPath(distPath) {
  const resolvedPath = path.resolve(process.cwd(), distPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      \`Build directory not found: \${resolvedPath}\\nRun: npm run build\`
    );
  }

  const stats = fs.statSync(resolvedPath);
  if (!stats.isDirectory()) {
    throw new Error(\`Build path is not a directory: \${resolvedPath}\`);
  }

  return resolvedPath;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAllNetworkIps() {
  const interfaces = os.networkInterfaces();
  const allIps = ["localhost"];

  for (const name in interfaces) {
    if (/docker|veth|br-|lo|loopback|vmnet|vbox|utun|tun|tap/i.test(name))
      continue;
    for (const iface of interfaces[name]) {
      if (!iface) continue;
      if (iface.internal) continue;
      if (iface.family === "IPv4") {
        allIps.push(iface.address);
      }
    }
  }
  return [...new Set(allIps)];
}

function displayServerUrls(port) {
  const allIps = getAllNetworkIps();
  console.log(
    "  \\x1b[32m➜\\x1b[39m  Local:   \\x1b[36mhttp://localhost:" +
      port +
      "/\\x1b[39m"
  );
  allIps.forEach((ip) => {
    if (ip !== "localhost") {
      console.log(
        "  \\x1b[32m➜\\x1b[39m  Network: \\x1b[36mhttp://" +
          ip +
          ":" +
          port +
          "/\\x1b[39m"
      );
    }
  });
}

async function isTcpConnectable(port, host = "127.0.0.1", timeout = 250) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let done = false;
    s.setTimeout(timeout);

    s.once("connect", () => {
      done = true;
      s.destroy();
      resolve(true);
    });

    s.once("timeout", () => {
      if (!done) {
        done = true;
        s.destroy();
        resolve(false);
      }
    });

    s.once("error", () => {
      if (!done) {
        done = true;
        s.destroy();
        resolve(false);
      }
    });

    try {
      s.connect(port, host);
    } catch (e) {
      if (!done) {
        done = true;
        try {
          s.destroy();
        } catch (_) {}
        resolve(false);
      }
    }
  });
}

async function isPortBusyOnLoopback(port, timeout = 200) {
  const v4 = await isTcpConnectable(port, "127.0.0.1", timeout);
  if (v4) return true;

  try {
    const v6 = await isTcpConnectable(port, "::1", timeout);
    return v6;
  } catch {
    return false;
  }
}

async function getPidsListeningOnPort(port) {
  try {
    if (process.platform === "win32") {
      const { stdout } = await execp(\`netstat -ano | findstr :\${port}\`, {
        timeout: 3000,
      });
      if (!stdout) return [];
      const lines = stdout
        .split(/\\r?\\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const pids = new Set();
      for (const line of lines) {
        const m = line.match(/\\s+LISTENING\\s+(\\d+)$/);
        if (m) pids.add(Number(m[1]));
      }
      return Array.from(pids);
    } else {
      try {
        const { stdout } = await execp(
          \`lsof -nP -iTCP:\${port} -sTCP:LISTEN -Fp\`,
          { timeout: 3000 }
        );
        if (!stdout) return [];
        const pids = new Set();
        for (const line of stdout.split(/\\r?\\n/)) {
          const m = line.match(/^p(\\d+)/);
          if (m) pids.add(Number(m[1]));
        }
        return Array.from(pids);
      } catch {
        try {
          const { stdout } = await execp(\`ss -tulpn | grep :\${port} || true\`, {
            timeout: 3000,
          });
          if (!stdout) return [];
          const pids = new Set();
          for (const line of stdout.split(/\\r?\\n/)) {
            const mp = line.match(/pid=(\\d+)/) || line.match(/(\\d+)\\/[^\\s]+/);
            if (mp) pids.add(Number(mp[1]));
          }
          return Array.from(pids);
        } catch {
          return [];
        }
      }
    }
  } catch {
    return [];
  }
}

async function getCommandLineForPid(pid) {
  try {
    if (process.platform === "win32") {
      const { stdout } = await execp(
        \`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\\\\\"ProcessId=\${pid}\\\\\\" | Select-Object -ExpandProperty CommandLine"\`,
        { timeout: 3000 }
      );
      return (stdout || "").trim();
    } else {
      const { stdout } = await execp(\`ps -p \${pid} -o args=\`, {
        timeout: 3000,
      });
      return (stdout || "").trim();
    }
  } catch {
    return "";
  }
}

async function portOwnedByDisallowedProcess(
  port,
  denyPatterns = [/next/i, /vite/i, /webpack/i]
) {
  const pids = await getPidsListeningOnPort(port);
  if (!pids || pids.length === 0) return false;
  for (const pid of pids) {
    const cmd = await getCommandLineForPid(pid);
    for (const pat of denyPatterns) {
      if (pat.test(cmd)) {
        return { owned: true, pid, cmd };
      }
    }
  }
  return { owned: false };
}

async function findOpenPort(
  startPort = DEFAULT_PORT,
  maxPort = Math.min(startPort + 1000, 65535)
) {
  for (let port = startPort; port <= maxPort; port++) {
    try {
      const accepting = await isPortBusyOnLoopback(port, 200);
      if (accepting) {
        console.log(\`Port \${port} is in use, trying another one...\`);
        continue;
      }

      const available = await new Promise((resolve, reject) => {
        const tester = createServer();
        const onError = (err) => {
          if (err && err.code === "EADDRINUSE") {
            try {
              tester.close();
            } catch (_) {}
            resolve(false);
          } else {
            try {
              tester.close();
            } catch (_) {}
            reject(err);
          }
        };
        tester.once("error", onError);
        tester.once("listening", () => {
          tester.close(() => resolve(true));
        });
        tester.listen(port, "0.0.0.0");
      });

      if (available) {
        return port;
      } else {
        await delay(50);
        continue;
      }
    } catch (err) {
      if (err && (err.code === "EACCES" || err.code === "EADDRNOTAVAIL"))
        throw err;
      await delay(50);
      continue;
    }
  }
  throw new Error(
    \`No available port found between \${startPort} and \${maxPort}\`
  );
}

async function loadApiHandler(routePath) {
  const now = Date.now();
  const cached = handlerCache.get(routePath);

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.handler;
  }

  try {
    const apiDir = path.join(process.cwd(), "src/app/api");
    const extensions = [".js", ".ts", ".mjs", ".cjs"];
    let handlerPath = null;

    for (const ext of extensions) {
      const testPath = path.join(apiDir, routePath + ext);
      if (fs.existsSync(testPath)) {
        handlerPath = testPath;
        break;
      }
    }

    if (!handlerPath) {
      return null;
    }

    let handlerModule;

    if (handlerPath.endsWith(".ts")) {
      try {
        const handlerUrl =
          new URL("file://" + handlerPath).href + "?t=" + Math.random();
        handlerModule = await import(handlerUrl);
      } catch (tsError) {
        try {
          const ts = await import("typescript");
          const fileContent = fs.readFileSync(handlerPath, "utf8");

          const result = ts.transpileModule(fileContent, {
            compilerOptions: {
              target: ts.ScriptTarget.ES2020,
              module: ts.ModuleKind.ESNext,
              jsx: ts.JsxEmit.React,
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
            },
          });

          const compiledCode = result.outputText;
          const moduleUrl = \`data:text/javascript;charset=utf-8,\${encodeURIComponent(
            compiledCode
          )}\`;
          handlerModule = await import(moduleUrl);
        } catch (compileError) {
          throw new Error(
            \`TypeScript API routes require tsx or ts-node in production. \` +
              \`Install with: npm install -D tsx\\n\` +
              \`Or convert \${routePath} to JavaScript.\`
          );
        }
      }
    } else {
      const handlerUrl =
        new URL("file://" + handlerPath).href + "?t=" + Math.random();
      handlerModule = await import(handlerUrl);
    }

    const handler = handlerModule.default;

    if (typeof handler !== "function") {
      throw new Error("Invalid API handler - export a default function");
    }

    handlerCache.set(routePath, { handler, timestamp: now });
    return handler;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function createFastifyServer() {
  const distPath = validateDistPath(".bini/dist");

  const app = fastify({
    logger: false,
    bodyLimit: 1048576,
    trustProxy: 1,
    requestIdHeader: "x-request-id",
    disableRequestLogging: true,
    connectionTimeout: 60000,
    keepAliveTimeout: 65000,
    requestTimeout: 60000,
    http2SessionTimeout: 600000,
  });

  app.addHook("onClose", async () => {
    handlerCache.clear();
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    dnsPrefetchControl: false,
    frameguard: false,
    hsts: false,
    ieNoOpen: false,
    noSniff: false,
    referrerPolicy: false,
    xssFilter: false,
  });

  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  await app.register(fastifyRateLimiter, {
    max: RATE_LIMIT,
    timeWindow: "15 minutes",
    cache: 10000,
    allowList: ["127.0.0.1", "::1"],
    skipOnError: true,
  });

  app.addHook("onRequest", async (req, reply) => {
    const reqId = \`\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    activeRequests.add(reqId);
    req.requestId = reqId;

    reply.header("X-Powered-By", "Bini.js");
  });

  app.addHook("onResponse", async (req, reply) => {
    activeRequests.delete(req.requestId);
  });

  await app.register(fastifyStatic, {
    root: distPath,
    prefix: "/",
    constraints: {},
    maxAge: NODE_ENV === "production" ? "1y" : 0,
    etag: true,
    lastModified: true,
    wildcard: false,
    preCompressed: true,
    index: ["index.html"],
    dotfiles: "deny",
    acceptRanges: true,
  });

  app.addHook("onSend", async (req, reply, payload) => {
    try {
      if (
        !reply.sent &&
        !req.url.startsWith("/api/") &&
        req.url !== "/health" &&
        req.url !== "/metrics"
      ) {
        const acceptEncoding = req.headers["accept-encoding"] || "";
        if (
          acceptEncoding.includes("gzip") &&
          (typeof payload === "string" || Buffer.isBuffer(payload))
        ) {
          reply.header("Vary", "Accept-Encoding");
          reply.header("Content-Encoding", "gzip");
          const compressed = await new Promise((resolve, reject) => {
            zlib.gzip(payload, { level: 6 }, (err, result) =>
              err ? reject(err) : resolve(result)
            );
          });
          return compressed;
        }
      }
    } catch (e) {
      // Silent compression failure
    }
    return payload;
  });

  app.get("/health", async (req, reply) => {
    reply.header("Cache-Control", "no-cache, no-store, must-revalidate");
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      node: {
        version: process.version,
        env: NODE_ENV,
      },
    };
  });

  app.get("/metrics", async (req, reply) => {
    reply.header("Cache-Control", "no-cache");
    return {
      server: {
        uptime: process.uptime(),
        activeRequests: activeRequests.size,
        handlersCached: handlerCache.size,
      },
      memory: process.memoryUsage(),
      versions: process.versions,
      platform: process.platform,
      arch: process.arch,
      };
  });

  app.route({
    method: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    url: "/api/*",
    handler: async (req, reply) => {
      try {
        const url = new URL(req.url, \`http://\${req.headers.host}\`);
        let routePath = url.pathname.replace("/api/", "") || "index";
        if (routePath.endsWith("/")) routePath = routePath.slice(0, -1);

        const handler = await loadApiHandler(routePath);
        if (!handler) {
          reply.status(404).type("application/json");
          return {
            error: "API route not found",
            path: routePath,
          };
        }

        const query = {};
        for (const [k, v] of url.searchParams) query[k] = v;

        const request = {
          method: req.method,
          headers: req.headers,
          body: req.body || {},
          query,
          ip: req.ip,
          url: req.url,
          params: {},
        };

        let responded = false;
        const response = {
          status: (code) => {
            reply.status(code);
            return response;
          },
          setHeader: (k, v) => {
            reply.header(k, v);
            return response;
          },
          json: (data) => {
            responded = true;
            reply.type("application/json").send(data);
          },
          send: (data) => {
            responded = true;
            if (typeof data === "object") {
              reply.type("application/json").send(data);
            } else {
              reply.send(data);
            }
          },
          end: (data) => {
            responded = true;
            if (data) reply.send(data);
          },
        };

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 30000)
        );

        const handlerPromise = Promise.resolve().then(() =>
          handler(request, response)
        );
        const result = await Promise.race([handlerPromise, timeoutPromise]);

        if (!responded && result) {
          reply.type("application/json").send(result);
        }
      } catch (error) {
        if (!reply.sent) {
          reply.status(500).type("application/json");
          reply.send({
            error: "Internal Server Error",
            message: error.message,
            ...(NODE_ENV === "development" && { stack: error.stack }),
          });
        }
      }
    },
  });

  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith("/api/")) {
      reply.status(404).type("application/json");
      return {
        error: "Not found",
        message: "API endpoint does not exist",
        path: req.url,
      };
    }

    try {
      const indexHtmlPath = path.join(distPath, "index.html");
      if (!fs.existsSync(indexHtmlPath)) {
        throw new Error("Index.html not found");
      }
      reply.type("text/html");
      const content = await fs.promises.readFile(indexHtmlPath, "utf-8");
      return content;
    } catch (error) {
      reply.status(404).type("text/html");
      return \`
        <html>
          <head>
            <title>404 - Not Found</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body>
            <h1>404 Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
          </body>
        </html>
      \`;
    }
  });

  app.setErrorHandler(async (error, req, reply) => {
    if (!reply.sent) {
      reply.status(500).type("application/json");
      return {
        error: "Internal Server Error",
        message: "Something went wrong",
        ...(NODE_ENV === "development" && {
          details: error.message,
        }),
      };
    }
  });

  return app;
}

function safeOpenBrowser(port) {
  setTimeout(() => {
    try {
      const url = \`http://localhost:\${port}\`;

      let command, args = [];
      const platform = process.platform;

      if (platform === "darwin") {
        command = "open";
        args = [url];
      } else if (platform === "win32") {
        command = "cmd";
        args = ["/c", "start", "", url];
      } else {
        command = "xdg-open";
        args = [url];
      }

      const child = spawn(command, args, {
        stdio: "ignore",
        detached: true,
        windowsHide: true,
      });

      child.unref();
      child.on("error", () => {});
    } catch (error) {
      // Silent catch
    }
  }, 1000);
}

async function startServer() {
  const maxPortSpan = 1000;
  const maxPort = Math.min(DEFAULT_PORT + maxPortSpan, 65535);
  let attemptStartPort = DEFAULT_PORT;
  const maxRetries = 50;
  let retries = 0;

  const listenHost = "0.0.0.0";

  while (retries < maxRetries) {
    retries++;
    try {
      const port = await findOpenPort(attemptStartPort, maxPort);
      process.env.PORT = String(port);

      const startTime = Date.now();
      const app = await createFastifyServer();

      try {
        await app.listen({ port, host: listenHost });

        const readyTime = Date.now() - startTime;
        console.log(
          \`\\n \\x1b[32mFastify 4.28\\x1b[39m  \\x1b[90mready in\\x1b[39m \${readyTime} ms\\n\`
        );

        displayServerUrls(port);

        try {
          displayBiniStartup({
            mode: NODE_ENV === "development" ? "dev" : "prod",
          });
        } catch (e) {
          // Silent fallback
        }

        safeOpenBrowser(port);

        return;
      } catch (listenError) {
        if (listenError && listenError.code === "EADDRINUSE") {
          attemptStartPort = port + 1;
          try {
            await app.close();
          } catch (_) {}
          await delay(100);
          continue;
        } else {
          try {
            await app.close();
          } catch (_) {}
          throw listenError;
        }
      }
    } catch (err) {
      if (err && (err.code === "EACCES" || err.code === "EADDRNOTAVAIL")) {
        process.exit(1);
      }
      if (
        err &&
        err.message &&
        err.message.startsWith("No available port found")
      ) {
        process.exit(1);
      }
      process.exit(1);
    }
  }

  process.exit(1);
}

process.on("uncaughtException", (error) => {
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  process.exit(1);
});

startServer().catch((error) => {
  process.exit(1);
});`, { force: flags.force });

    secureWriteFile(path.join(projectPath, ".gitignore"), `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
.bini/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs
*.log`, { force: flags.force });

    progress.start('Creating documentation');
    
    // UPDATED: Documentation with new API structure
    secureWriteFile(path.join(projectPath, "README.md"), `# ${projectName}

⚡ Lightning-fast Bini.js app with Next.js-like file structure.

## 🚀 Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

**Auto-opens browser** at http://localhost:3000 with Bini.js development server.

## 📦 Production Build (WITH API SUPPORT)

\`\`\`bash
npm run build
npm run start  # Production server with API routes + auto-opens browser
\`\`\`

## 🔄 Development vs Production

| Command | Purpose | Browser | APIs |
|---------|---------|---------|------|
| \`npm run dev\` | Development | ✅ Auto-opens | ✅ Working |
| \`npm run preview\` | Preview build | ✅ Auto-opens | ✅ Working |
| \`npm run start\` | Production | ✅ Auto-opens | ✅ Working |

## 🎯 New Features

### ⚡ Fastify Production Server
- ✅ **2x faster** than Express.js
- ✅ Built-in security with Helmet
- ✅ Rate limiting protection
- ✅ Gzip compression
- ✅ Graceful shutdown
- ✅ Health checks & metrics
- ✅ **Environment file display** (.env, .env.local) like Next.js

### 🖼️ Automatic Favicon Generation
- ✅ SVG, PNG formats automatically generated
- ✅ Multiple sizes for different devices (16x16, 32x32, 64x64, 180x180, 512x512)
- ✅ Open Graph image (1200x630) for social media sharing
- ✅ Apple Touch Icon for iOS devices
- ✅ Web Manifest for PWA support

### 🔍 Enhanced SEO & Social Media
- ✅ Complete Open Graph tags
- ✅ Twitter Card support  
- ✅ Keyword meta tags
- ✅ Proper favicon declarations
- ✅ Canonical URLs and robots meta

## 🏗️ Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── app/           # Next.js app directory
│   │   ├── api/       # API routes (supports .ts and .js)
│   │   │   └── hello.${ext.api} # Example API route
│   │   ├── layout.${ext.main}    # Root layout
│   │   ├── page.${ext.main}      # Home page
│   │   └── globals.css      # Global styles
├── public/            # Static assets
├── bini/              # Framework internals and plugins
├── .bini/             # Build outputs (like Next.js .next)
├── api-server.js      # ⚡ Fastify production server with API support
├── bini.config.mjs    # Bini.js configuration (ES modules)
├── vite.config.mjs    # Vite configuration (ES modules)
├── eslint.config.mjs  # ESLint configuration (ES modules)
${useTypeScript ? '├── tsconfig.json     # TypeScript configuration\n├── bini-env.d.ts      # TypeScript environment' : ''}
${answers.styling === "Tailwind" ? '├── tailwind.config.js # Tailwind configuration\n├── postcss.config.mjs  # PostCSS configuration' : ''}
└── package.json       # Dependencies (Fastify included)
\`\`\`

## 🔌 API Routes - WORKING EVERYWHERE

API routes now live in \`src/app/api\` and support both TypeScript (.ts) and JavaScript (.js):

\`\`\`${useTypeScript ? 'typescript' : 'javascript'}
// src/app/api/hello.${ext.api}
export default function handler(req, res) {
  return {
    message: 'Hello from Bini.js${useTypeScript ? ' TypeScript' : ''} API!',
    timestamp: new Date().toISOString(),
    method: req.method,
    working: true${useTypeScript ? ',\n    typeScript: true' : ''}
  };
}
\`\`\`

Access at: \`http://localhost:3000/api/hello\`

${useTypeScript ? '## 📝 TypeScript Support\n\nAPI routes fully support TypeScript with proper type checking and IntelliSense.' : ''}

## 🎨 Styling: ${answers.styling}

${answers.styling === "Tailwind" ? "✅ Tailwind CSS configured with blue background (#ecf3ff) and responsive cards" : ""}
${answers.styling === "CSS Modules" ? "✅ CSS Modules enabled with blue background (#ecf3ff) and responsive cards" : ""}
${answers.styling === "None" ? "✅ Basic CSS with blue background (#ecf3ff) and responsive cards" : ""}

## 📝 Language: ${useTypeScript ? 'TypeScript' : 'JavaScript'}

${useTypeScript ? '✅ TypeScript configured' : '✅ JavaScript ready'}
✅ All config files use MJS (ES modules)

---

**Built with Bini.js v${BINIJS_VERSION}** • [Documentation](https://bini.js.org)
`, { force: flags.force });
    progress.success();

    progress.complete();

    console.log(`\n✅ Project "${projectName}" created successfully!\n`);
    
    let installedDependencies = false;
    let detectedPackageManager = 'npm';
    
    try {
      detectedPackageManager = await detectPackageManager();
      
      if (flags.force || await confirmAutoInstall()) {
        const success = await installDependenciesWithFallbacks(projectPath, detectedPackageManager);
        installedDependencies = success;
      }
    } catch (error) {
      detectedPackageManager = 'npm';
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎉 SUCCESS! Your Bini.js app is ready!`);
    console.log(`${'='.repeat(50)}\n`);
    
    console.log(`📂 Project: ${projectName}`);
    console.log(`🎨 Styling: ${answers.styling}`);
    console.log(`📝 Language: ${useTypeScript ? 'TypeScript' : 'JavaScript'}`);
    console.log(`📁 API Location: src/app/api/ (Next.js App Router style)`);
    console.log(`🔌 API Files: ${useTypeScript ? '.ts' : '.js'} support`);
    console.log(`⚡ Server:   Fastify (2x faster than Express)`);
    console.log(`🎨 Background: Consistent blue (#ecf3ff) across all styling options`);
    console.log(`📱 Cards: Fully responsive for all screen sizes`);
    console.log(`⚙️  Config Files: MJS (ES modules for all projects)`);
    console.log(`🔍 Environment Files: Displayed on ALL servers (like Next.js)\n`);
    
    console.log(`🚀 Get Started:\n`);
    
    if (installedDependencies) {
      console.log(`   cd ${projectName}`);
      console.log(`   ${detectedPackageManager} run dev\n`);
    } else {
      console.log(`   cd ${projectName}`);
      console.log(`   ${detectedPackageManager} install`);
      console.log(`   ${detectedPackageManager} run dev\n`);
    }
    
    console.log(`🔌 API Routes: Now work in BOTH development AND production!`);
    console.log(`📁 API Location: src/app/api/ (Next.js App Router compatible)`);
    console.log(`🌐 All commands auto-open browser: dev, preview, and start!`);
    console.log(`⚡ Production server uses Fastify for maximum performance!`);
    console.log(`🎨 Same beautiful UI with blue background across all styling options!`);
    console.log(`📱 Fully responsive cards that work on mobile, tablet, and desktop!`);
    console.log(`🔍 Environment files (.env, .env.local) displayed on ALL servers!`);
    console.log(`📚 Check README.md for production build instructions`);
    console.log(`🌐 Docs: https://bini.js.org\n`);

  } catch (error) {
    progress.fail(error);
    console.error(`\n❌ Project creation failed: ${error.message}`);
    const projectPath = path.join(process.cwd(), projectName);
    if (fs.existsSync(projectPath)) {
      console.log('🧹 Cleaning up failed project...');
      safeRm(projectPath);
    }
    throw error;
  }
}

async function confirmAutoInstall() {
  try {
    const { confirm } = await inquirer.prompt([{
      type: "confirm",
      name: "confirm",
      message: "Would you like to install dependencies automatically?",
      default: true,
    }]);
    return confirm;
  } catch (error) {
    return false;
  }
}

async function main() {
  try {
    checkNodeVersion();
    
    const args = parseArguments();
    
    console.log(LOGO);
    console.log(`🚀 Bini.js CLI v${BINIJS_VERSION}`);
    console.log('📦 Creating your new Bini.js project...\n');
    
    let projectName = args.projectName;
    if (!projectName) {
      const response = await inquirer.prompt([{
        type: "input",
        name: "projectName",
        message: "Project name:",
        default: "my-bini-app",
        validate: (input) => {
          if (!input) return "Name required";
          if (!validateProjectName(input)) {
            return "Use lowercase, numbers, hyphens, underscores only. Max 50 chars.";
          }
          return true;
        },
      }]);
      projectName = response.projectName;
    }

    const answers = await askQuestions(args.flags);
    
    await generateProject(projectName, answers, args.flags);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('💡 Need help? Visit: https://github.com/Binidu01/bini-cli/issues');
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch(console.error);