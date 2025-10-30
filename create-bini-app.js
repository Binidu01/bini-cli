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
    api: 'js' // API routes always use JS for better compatibility
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

  // Use your exact website logo SVG
  const biniLogoSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 150" fill="none">
  <!-- Gradient Definition -->
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00CFFF"/>
      <stop offset="100%" stop-color="#0077FF"/>
    </linearGradient>
  </defs>

  <!-- ß Icon with Gradient -->
  <text x="40" y="105"
    font-family="Segoe UI, Arial, sans-serif"
    font-size="90"
    font-weight="700"
    fill="url(#grad)">
    ß
  </text>

  <!-- Bini.js Text in Black -->
  <text x="100" y="108"
    font-family="Segoe UI, Arial, sans-serif"
    font-size="60"
    font-weight="700"
    fill="#000000">
    Bini.js
  </text>
</svg>`;

  // Write SVGs (using your exact designs)
  secureWriteFile(path.join(publicPath, "bini-logo.svg"), biniLogoSVG);
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

  // Router Plugin - FIXED with race condition protection
  secureWriteFile(path.join(pluginsPath, "router.js"), `import fs from 'fs';
import path from 'path';

let regenerationLock = null;
const regenerationQueue = [];

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
  
  let imports = \`import React from 'react';
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
}\n\`;
  
  const importMap = new Map();
  let componentIndex = 0;
  
  routes.forEach(route => {
    const componentName = 'Page' + componentIndex++;
    const relativePath = path.relative(path.join(process.cwd(), 'src'), route.file).replace(/\\\\/g, '/');
    
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
      imports += \`import \${componentName} from './\${relativePath.replace(/\\.tsx?$/, '').replace(/\\.jsx?$/, '')}';\n\`;
      importMap.set(route.file, { empty: false, component: componentName });
    }
  });
  
  let routesCode = \`\nexport default function App() {
  return (
    <Router>
      <Routes>\n\`;
  
  routes.forEach(route => {
    const importInfo = importMap.get(route.file);
    if (!importInfo) return;
    
    const comment = route.dynamic ? \` {/* Dynamic: \${route.path} */}\` : '';
    
    if (importInfo.empty) {
      routesCode += \`        <Route path="\${route.path}" element={<EmptyPage pagePath="\${importInfo.path}" />} />\${comment}\n\`;
    } else {
      routesCode += \`        <Route path="\${route.path}" element={<SafeRoute component={\${importInfo.component}} />} />\${comment}\n\`;
    }
  });
  
  routesCode += \`        <Route path="*" element={<NotFound />} />
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
  
  return imports + routesCode;
}

let regenerateTimeout = null;
let lastRoutes = '';

async function regenerateRoutesWithLock(routerPlugin, changeType = 'update') {
  // If already regenerating, queue the request
  if (regenerationLock) {
    return new Promise((resolve) => {
      regenerationQueue.push(resolve);
    });
  }

  regenerationLock = true;
  
  try {
    clearTimeout(routerPlugin.regenerateTimeout);
    
    routerPlugin.regenerateTimeout = setTimeout(async () => {
      try {
        await routerPlugin.regenerateRoutes(changeType);
        
        // Process any queued regenerations
        while (regenerationQueue.length > 0) {
          const nextResolve = regenerationQueue.shift();
          await routerPlugin.regenerateRoutes('queued');
          nextResolve();
        }
      } catch (error) {
        console.error('❌ Route regeneration failed:', error);
        // Clear queue on error
        regenerationQueue.length = 0;
      } finally {
        regenerationLock = null;
      }
    }, 100);
  } catch (error) {
    regenerationLock = null;
    throw error;
  }
}

export function biniRouterPlugin() {
  return {
    name: 'bini-router-plugin',
    
    config() {
      const appDir = path.join(process.cwd(), 'src/app');
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
      
      const regenerateApp = async (reason = 'File changed') => {
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
            
            setTimeout(() => {
              server.ws.send({
                type: 'full-reload',
                path: '*'
              });
            }, 100);
          }
        }, 300);
      };
      
      server.watcher.on('add', (file) => {
        if (file.includes('src' + path.sep + 'app') && /page\\.(tsx|jsx|ts|js)$/.test(file)) {
          const pageName = path.basename(path.dirname(file));
          regenerateApp(\`New page: \${pageName}\`);
        }
      });
      
      server.watcher.on('unlink', (file) => {
        if (file.includes('src' + path.sep + 'app') && /page\\.(tsx|jsx|ts|js)$/.test(file)) {
          const pageName = path.basename(path.dirname(file));
          regenerateApp(\`Deleted page: \${pageName}\`);
        }
      });
      
      server.watcher.on('addDir', (dir) => {
        if (dir.includes('src' + path.sep + 'app') && !dir.includes('node_modules')) {
          const dirName = path.basename(dir);
          setTimeout(() => {
            const pageFiles = ['page.tsx', 'page.jsx', 'page.ts', 'page.js'];
            const hasPage = pageFiles.some(f => fs.existsSync(path.join(dir, f)));
            if (hasPage) {
              regenerateApp(\`New directory: \${dirName}\`);
            }
          }, 500);
        }
      });
      
      server.watcher.on('unlinkDir', (dir) => {
        if (dir.includes('src' + path.sep + 'app') && !dir.includes('node_modules')) {
          const dirName = path.basename(dir);
          regenerateApp(\`Deleted directory: \${dirName}\`);
        }
      });
      
      server.watcher.on('change', (file) => {
        if (file.includes('src' + path.sep + 'app') && /page\\.(tsx|jsx|ts|js)$/.test(file)) {
          try {
            const fileContent = fs.readFileSync(file, 'utf8').trim();
            const hasExport = fileContent.length > 0 && fileContent.includes('export default');
            
            const pageName = path.basename(path.dirname(file));
            regenerateApp(\`Content updated: \${pageName}\`);
          } catch (err) {
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
  }
}`);

  // Preview Plugin - Updated with ß icon
  secureWriteFile(path.join(pluginsPath, "preview.js"), `import os from 'os'

const BINIJS_VERSION = "${BINIJS_VERSION}";

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name in interfaces) {
    if (/docker|veth|br-|lo|loopback/i.test(name)) continue;
    for (const iface of interfaces[name]) {
      if (iface.internal) continue;
      if (iface.family === 'IPv4') candidates.push(iface.address);
    }
  }
  const lan = candidates.find(ip => /^10\\.|^192\\.168\\.|^172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(ip));
  return lan || candidates[0] || 'localhost';
}

export function biniPreviewPlugin() {
  return {
    name: 'bini-preview-plugin',
    
    configurePreviewServer(server) {
      const localIp = getNetworkIp();
      const port = server.config.preview.port || 3000;
      
      console.log('');
      console.log('  \x1b[38;2;0;207;255mß\x1b[0m Bini.js Production Preview v' + BINIJS_VERSION);
      console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(\`    → Local:   http://localhost:\${port}\`);
      console.log(\`    → Network: http://\${localIp}:\${port}\`);
      console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('  📦 Serving from: .bini/dist/');
      console.log('  🔌 API routes:   Enabled');
      console.log('  🚀 Auto-opens:   Browser');
      console.log('  ⏹️  Stop:         Ctrl+C');
      console.log('');
    }
  }
}`);

  // Badge Plugin - Enhanced version with ß icon and development mode only
  secureWriteFile(path.join(pluginsPath, "badge.js"), `const BINIJS_VERSION = "${BINIJS_VERSION}";
import os from 'os';
import path from 'path';
import fs from 'fs';

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name in interfaces) {
    if (/docker|veth|br-|lo|loopback/i.test(name)) continue;
    for (const iface of interfaces[name]) {
      if (iface.internal) continue;
      if (iface.family === 'IPv4') candidates.push(iface.address);
    }
  }
  const lan = candidates.find(ip => /^10\\.|^192\\.168\\.|^172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(ip));
  return lan || candidates[0] || 'localhost';
}

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

export function biniBadgePlugin() {
  let localIp = 'localhost';
  let port = 3000;
  let routes = [];
  
  return {
    name: 'bini-badge-injector',
    
    configResolved(config) {
      port = config.server?.port || 3000;
      localIp = getNetworkIp();
      routes = getRoutes();
    },
    
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        console.log('');
        console.log('  \x1b[38;2;0;207;255mß\x1b[0m Bini.js Development Server v' + BINIJS_VERSION);
        console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(\`    → Local:   http://localhost:\${port}\`);
        console.log(\`    → Network: http://\${localIp}:\${port}\`);
        console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');
      });
      
      // Watch for route changes
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
        // Only inject in development mode
        if (process.env.NODE_ENV !== 'production' && !process.env.DISABLE_BADGE) {
          const routesJson = JSON.stringify(routes);
          const routesHtml = routes.map(route => \`<div class="bini-badge-route">\${route}</div>\`).join('');
          const versionInfo = BINIJS_VERSION;
          
          const badgeScript = \`
            <style>
              .bini-dev-badge {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #111;
                color: #fff;
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 9999;
                font-family: system-ui, -apple-system, sans-serif;
                user-select: none;
                pointer-events: auto;
                animation: fadeIn 0.5s ease-in;
                cursor: pointer;
                max-width: 300px;
                transition: all 0.3s ease;
              }
              
              .bini-dev-badge:hover {
                box-shadow: 0 8px 24px rgba(0,0,0,0.5);
              }
              
              .bini-dev-badge.expanded {
                padding: 0;
                border-radius: 12px;
                overflow: hidden;
              }
              
              .bini-badge-header {
                padding: 12px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
              }
              
              .bini-badge-title {
                display: flex;
                align-items: center;
                gap: 6px;
                font-weight: bold;
              }
              
              .bini-badge-content {
                display: none;
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
              }
              
              .bini-dev-badge.expanded .bini-badge-content {
                display: block;
                max-height: 500px;
                border-top: 1px solid #333;
              }
              
              .bini-badge-section {
                padding: 12px 16px;
                border-bottom: 1px solid #333;
                font-size: 12px;
              }
              
              .bini-badge-section:last-child {
                border-bottom: none;
              }
              
              .bini-badge-label {
                color: #888;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
              }
              
              .bini-badge-value {
                color: #0fb;
                font-family: 'Monaco', 'Courier New', monospace;
                word-break: break-all;
              }
              
              .bini-badge-routes {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }
              
              .bini-badge-route {
                color: #0fb;
                font-family: 'Monaco', 'Courier New', monospace;
                font-size: 11px;
                padding: 4px 0;
              }
              
              .bini-badge-toggle {
                color: #888;
                font-size: 12px;
                cursor: pointer;
              }
              
              .bini-icon {
                color: #00CFFF;
                font-weight: bold;
              }
              
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              
              @media (max-width: 640px) {
                .bini-dev-badge {
                  bottom: 12px;
                  right: 12px;
                  padding: 10px 16px;
                  font-size: 12px;
                  max-width: 280px;
                }
                
                .bini-badge-section {
                  padding: 10px 12px;
                  font-size: 11px;
                }
              }
            </style>
            <div class="bini-dev-badge" id="bini-dev-badge">
              <div class="bini-badge-header" onclick="document.getElementById('bini-dev-badge').classList.toggle('expanded')">
                <span class="bini-badge-title">
                  <span class="bini-icon">ß</span> Bini.js <span style="font-size: 12px; color: #888;">v\${versionInfo}</span>
                </span>
                <span class="bini-badge-toggle">⌄</span>
              </div>
              
              <div class="bini-badge-content">
                <div class="bini-badge-section">
                  <div class="bini-badge-label">🔗 Local URL</div>
                  <div class="bini-badge-value">http://localhost:\${port}</div>
                </div>
                
                <div class="bini-badge-section">
                  <div class="bini-badge-label">🌐 Network URL</div>
                  <div class="bini-badge-value">http://\${localIp}:\${port}</div>
                </div>
                
                <div class="bini-badge-section">
                  <div class="bini-badge-label">📊 Memory</div>
                  <div class="bini-badge-value" id="bini-memory">--</div>
                </div>
                
                <div class="bini-badge-section">
                  <div class="bini-badge-label">📁 Routes (\${routes.length})</div>
                  <div class="bini-badge-routes">
                    \${routesHtml}
                  </div>
                </div>
                
                <div class="bini-badge-section">
                  <div class="bini-badge-label">⚡ Status</div>
                  <div class="bini-badge-value">✓ Ready</div>
                </div>
              </div>
            </div>
            
            <script>
              (function() {
                window.addEventListener('DOMContentLoaded', function() {
                  function updateMemory() {
                    if (performance.memory) {
                      const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
                      const limit = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
                      document.getElementById('bini-memory').textContent = used + 'MB / ' + limit + 'MB';
                    }
                  }
                  
                  updateMemory();
                  setInterval(updateMemory, 2000);
                });
                
                window.__BINI_ROUTES__ = \${routesJson};
                window.__BINI_VERSION__ = '\${versionInfo}';
              })();
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

  // API Plugin - UPDATED with enhanced input sanitization and TTL cache
  secureWriteFile(path.join(pluginsPath, "api.js"), `import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import os from 'os'

const BINIJS_VERSION = "${BINIJS_VERSION}";

const rateLimit = new Map();
const handlerCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name in interfaces) {
    if (/docker|veth|br-|lo|loopback/i.test(name)) continue;
    for (const iface of interfaces[name]) {
      if (iface.internal) continue;
      if (iface.family === 'IPv4') candidates.push(iface.address);
    }
  }
  const lan = candidates.find(ip => /^10\\.|^192\\.168\\.|^172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(ip));
  return lan || candidates[0] || 'localhost';
}

function sanitizeApiPath(routePath, apiDir) {
  const safePath = path.normalize(routePath || 'index').replace(/^(.\.\\/)+/, '');
  const resolvedApiDir = path.resolve(apiDir);
  const candidate = path.resolve(path.join(apiDir, safePath + '.js'));
  
  try {
    const realCandidate = fs.realpathSync(candidate);
    const realApiDir = fs.realpathSync(resolvedApiDir);
    
    if (!realCandidate.startsWith(realApiDir + path.sep) && realCandidate !== realApiDir) {
      throw new Error('Invalid API path');
    }
    
    if (!/\\.(js|mjs|cjs)$/i.test(realCandidate)) {
      throw new Error('Invalid file type');
    }
    
    return realCandidate;
  } catch (error) {
    throw new Error('Invalid API path or missing file');
  }
}

function sanitizeObject(obj, depth = 0, path = '') {
  const MAX_DEPTH = 50;
  const MAX_STRING_LENGTH = 10000;
  
  if (depth > MAX_DEPTH) {
    throw new Error(\`Object too deeply nested at path: \${path}\`);
  }

  if (obj === null || typeof obj !== 'object') {
    // Basic type sanitization
    if (typeof obj === 'string' && obj.length > MAX_STRING_LENGTH) {
      throw new Error(\`String too long at path: \${path}\`);
    }
    return obj;
  }

  // Check for circular references
  if (obj.__$visited) {
    throw new Error(\`Circular reference detected at path: \${path}\`);
  }

  try {
    obj.__$visited = true;
    
    const dangerousProps = ['__proto__', 'constructor', 'prototype', '__$visited'];
    const result = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Check for dangerous properties
        if (dangerousProps.includes(key)) {
          throw new Error(\`Dangerous property detected: \${path}.\${key}\`);
        }

        // Validate key itself
        if (typeof key === 'string' && key.length > 256) {
          throw new Error(\`Property name too long at path: \${path}\`);
        }

        const newPath = path ? \`\${path}.\${key}\` : key;
        result[key] = sanitizeObject(obj[key], depth + 1, newPath);
      }
    }

    return result;
  } finally {
    delete obj.__$visited;
  }
}

async function parseJsonBody(req, limit = '1mb') {
  const max = 1024 * 1024;
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > max) {
        req.destroy();
        reject(new Error('Payload too large'));
        return;
      }
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      
      if (raw.length > 0) {
        try {
          const parsed = JSON.parse(raw);
          const sanitized = sanitizeObject(parsed);
          resolve(sanitized);
        } catch (err) {
          reject(new Error('Invalid JSON format'));
        }
      } else {
        resolve({});
      }
    });
    
    req.on('error', reject);
  });
}

async function loadApiHandler(routePath) {
  const now = Date.now();
  const cached = handlerCache.get(routePath);
  
  // Check if cached handler is still valid
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.handler;
  }

  try {
    const apiDir = path.join(process.cwd(), 'src/api');
    const handlerPath = sanitizeApiPath(routePath, apiDir);
    
    if (!fs.existsSync(handlerPath)) {
      return null;
    }
    
    const handlerUrl = pathToFileURL(handlerPath).href;
    const handlerModule = await import(handlerUrl + '?t=' + Date.now());
    const handler = handlerModule.default;
    
    if (typeof handler !== 'function') {
      throw new Error('Invalid API handler - export a default function');
    }
    
    // Cache the handler with timestamp
    handlerCache.set(routePath, { handler, timestamp: now });
    return handler;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function handleApiRequest(req, res, isPreview = false) {
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

  // Add rate limit headers for successful requests
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
    
    const handler = await loadApiHandler(routePath);
    
    if (!handler) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: 'API route not found',
        path: routePath
      }));
      return;
    }
    
    let body = {};
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      try {
        body = await parseJsonBody(req, '1mb');
      } catch (error) {
        if (error.message === 'Payload too large') {
          res.statusCode = 413;
          res.end(JSON.stringify({ error: 'Payload too large' }));
        } else {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Invalid request body' }));
        }
        return;
      }
    }
    
    const request = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
      query: Object.fromEntries(url.searchParams),
      params: {},
      ip: clientIp
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
        if (typeof data === 'object') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } else {
          res.end(data);
        }
      },
      end: (data) => {
        res.end(data);
      }
    };
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 30000)
    );
    
    const handlerPromise = handler(request, response);
    const result = await Promise.race([handlerPromise, timeoutPromise]);
    
    if (result && !res.writableEnded) {
      response.json(result);
    }
    
  } catch (error) {
    console.error('🚨 API Error:', error);
    if (error.message === 'Request timeout') {
      res.statusCode = 504;
      res.end(JSON.stringify({ error: 'Request timeout' }));
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }));
    }
  }
}

export function biniAPIPlugin(options = {}) {
  const { isPreview = false } = options;
  
  return {
    name: 'bini-api-plugin',
    
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        await handleApiRequest(req, res, false);
      });
    },
    
    configurePreviewServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        await handleApiRequest(req, res, true);
      });
    },
    
    buildStart() {
      const apiDir = path.join(process.cwd(), 'src/api');
      if (fs.existsSync(apiDir)) {
      }
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
  color: #00CFFF;
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
    grid-template-columns: repeat(3, 1fr);
  }
}

.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}

.icon {
  font-size: 1.5rem;
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
  line-height: 1.5;
}

.ctaSection {
  text-align: center;
}

.ctaCard {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.ctaTitle {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.ctaText {
  color: #6b7280;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.code {
  background: #f3f4f6;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: monospace;
  display: inline-block;
}

.buttonGroup {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: #00CFFF;
  color: white;
  font-weight: 600;
  border-radius: 0.5rem;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.875rem;
}

.button:hover {
  background: #00b8e6;
}

@media (max-width: 640px) {
  .container {
    padding: 1rem;
  }
  
  .title {
    font-size: 2rem;
  }
  
  .subtitle {
    fontSize: 1rem;
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
}`);
}

function generateGlobalStyles(styling) {
  // Use CSS variables for theming
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
  font-family: system-ui, -apple-system, sans-serif;
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

/* Common component styles that work for all styling approaches */
.btn-primary {
  display: inline-block;
  padding: 12px 24px;
  background: var(--color-primary);
  color: var(--color-white);
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.875rem;
}

.btn-primary:hover {
  background: #00b8e6;
}

.card {
  background: var(--color-white);
  border-radius: 12px;
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
    grid-template-columns: repeat(3, 1fr);
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

/* Responsive design */
@media (max-width: 640px) {
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
    "globals": "^15.9.0"
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
      "dev": "vite --host",
      "build": "vite build",
      "start": "node api-server.js",
      "preview": "vite preview --host",
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

  let homePageContent = `import React from 'react';`;

  if (styling === "CSS Modules") {
    homePageContent += `\nimport styles from './page.module.css';`;
  }

  homePageContent += `

export default function Home() {
  const handleTestAlert = () => {
    alert('Bini.js is ready! Check the README for API routes and advanced features.');
  };

  return (`;

  if (styling === "Tailwind") {
    homePageContent += `
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-8">`;
  } else if (styling === "CSS Modules") {
    homePageContent += `
    <div className={styles.container}>`;
  } else {
    homePageContent += `
    <div className="min-h-screen flex-center p-8 bg-blue">`;
  }

  if (styling === "Tailwind") {
    homePageContent += `
      <div className="max-w-4xl w-full">`;
  } else if (styling === "CSS Modules") {
    homePageContent += `
      <div className={styles.wrapper}>`;
  } else {
    homePageContent += `
      <div className="max-w-4xl w-full">`;
  }

  if (styling === "Tailwind") {
    homePageContent += `
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img src="/bini-logo.svg" alt="Bini.js Logo" className="h-16" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-cyan-500">Bini.js</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Next.js-like React framework with built-in API routes
          </p>
        </div>`;
  } else if (styling === "CSS Modules") {
    homePageContent += `
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <img src="/bini-logo.svg" alt="Bini.js Logo" className={styles.logo} />
          </div>
          <h1 className={styles.title}>
            Welcome to <span className={styles.accent}>Bini.js</span>
          </h1>
          <p className={styles.subtitle}>
            Next.js-like React framework with built-in API routes
          </p>
        </div>`;
  } else {
    homePageContent += `
        <div className="text-center mb-12">
          <div className="flex-center mb-6">
            <img src="/bini-logo.svg" alt="Bini.js Logo" style={{ height: '4rem' }} />
          </div>
          <h1 className="text-large text-gray-900 mb-4">
            Welcome to <span style={{ color: '#00CFFF' }}>Bini.js</span>
          </h1>
          <p className="text-medium text-gray mb-8">
            Next.js-like React framework with built-in API routes
          </p>
        </div>`;
  }

  if (styling === "Tailwind") {
    homePageContent += `
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
            <div className="text-2xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Layout First</h3>
            <p className="text-gray-600">All SEO and meta tags configured in layout file</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
            <div className="text-2xl mb-3">🚀</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">File-based Routing</h3>
            <p className="text-gray-600">Create pages by adding files to src/app</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
            <div className="text-2xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">API Routes</h3>
            <p className="text-gray-600">Built-in file-based API routes like Next.js</p>
          </div>
        </div>`;
  } else if (styling === "CSS Modules") {
    homePageContent += `
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.icon}>⚡</div>
            <h3 className={styles.cardTitle}>Layout First</h3>
            <p className={styles.cardText}>All SEO and meta tags configured in layout file</p>
          </div>
          
          <div className={styles.card}>
            <div className={styles.icon}>🚀</div>
            <h3 className={styles.cardTitle}>File-based Routing</h3>
            <p className={styles.cardText}>Create pages by adding files to src/app</p>
          </div>
          
          <div className={styles.card}>
            <div className={styles.icon}>🔒</div>
            <h3 className={styles.cardTitle}>API Routes</h3>
            <p className={styles.cardText}>Built-in file-based API routes like Next.js</p>
          </div>
        </div>`;
  } else {
    homePageContent += `
        <div className="grid-layout">
          <div className="card">
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>⚡</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>Layout First</h3>
            <p style={{ color: '#6b7280', lineHeight: '1.5' }}>All SEO and meta tags configured in layout file</p>
          </div>
          
          <div className="card">
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>🚀</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>File-based Routing</h3>
            <p style={{ color: '#6b7280', lineHeight: '1.5' }}>Create pages by adding files to src/app</p>
          </div>
          
          <div className="card">
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>🔒</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>API Routes</h3>
            <p style={{ color: '#6b7280', lineHeight: '1.5' }}>Built-in file-based API routes like Next.js</p>
          </div>
        </div>`;
  }

  if (styling === "Tailwind") {
    homePageContent += `
        <div className="text-center">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Get Started</h3>
            <p className="text-gray-600 mb-6">
              Add new pages by creating files in <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">src/app</code>
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={handleTestAlert}
                className="px-6 py-3 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
              >
                Test Alert
              </button>
            </div>
          </div>
        </div>`;
  } else if (styling === "CSS Modules") {
    homePageContent += `
        <div className={styles.ctaSection}>
          <div className={styles.ctaCard}>
            <h3 className={styles.ctaTitle}>Get Started</h3>
            <p className={styles.ctaText}>
              Add new pages by creating files in <code className={styles.code}>src/app</code>
            </p>
            <div className={styles.buttonGroup}>
              <button 
                onClick={handleTestAlert}
                className={styles.button}
              >
                Test Alert
              </button>
            </div>
          </div>
        </div>`;
  } else {
    homePageContent += `
        <div className="text-center">
          <div className="card p-8">
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', marginBottom: '1rem' }}>Get Started</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Add new pages by creating files in <code style={{ background: '#f3f4f6', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'monospace', display: 'inline-block' }}>src/app</code>
            </p>
            <div className="flex-center gap-4">
              <button 
                onClick={handleTestAlert}
                className="btn-primary"
              >
                Test Alert
              </button>
            </div>
          </div>
        </div>`;
  }

  homePageContent += `
      </div>
    </div>
  );
}`;

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

  // Updated Vite config that actually uses the bini.config.mjs and outputs to correct directory
  secureWriteFile(path.join(projectPath, `vite.config.${configExt}`), `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { biniRouterPlugin } from './bini/internal/plugins/router.js'
import { biniBadgePlugin } from './bini/internal/plugins/badge.js'
import { biniSSRPlugin } from './bini/internal/plugins/ssr.js'
import { biniAPIPlugin } from './bini/internal/plugins/api.js'
import { biniPreviewPlugin } from './bini/internal/plugins/preview.js'
import biniConfig from './bini.config.mjs'

const isPreview = process.env.npm_lifecycle_event === 'preview'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    biniRouterPlugin(),
    biniSSRPlugin(),
    biniBadgePlugin(),
    biniAPIPlugin({ isPreview }),
    biniPreviewPlugin()
  ],
  server: { 
    port: biniConfig.port || 3000, 
    open: true,
    host: biniConfig.host || 'localhost',
    cors: true,
    hmr: {
      host: process.env.HMR_HOST || 'localhost',
      port: process.env.HMR_PORT || 3000
    }
  },
  preview: {
    port: biniConfig.port || 3000,
    open: true,
    host: '0.0.0.0',
    cors: true
  },
  build: { 
    outDir: '.bini/dist',  // FIXED: Ensure it goes to .bini/dist
    sourcemap: biniConfig.build?.sourcemap !== false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
    }
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    devSourcemap: true
  }
}))`);

  secureWriteFile(path.join(projectPath, `bini.config.${configExt}`), `export default {
  outDir: '.bini',
  port: 3000,
  host: 'localhost',
  api: {
    dir: 'src/api',
    bodySizeLimit: '1mb'
  },
  static: {
    dir: 'public',
    maxAge: 3600
  },
  build: {
    minify: true,
    sourcemap: true
  }
}`);

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
    const publicPath = path.join(projectPath, "public");
    const biniPath = path.join(projectPath, "bini");
    
    progress.start('Creating project structure');
    mkdirRecursive(appPath);
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

    // Production Server with Fastify - FIXED with proper ES modules and build validation
    secureWriteFile(path.join(projectPath, "api-server.js"),
`#!/usr/bin/env node

import fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyRateLimiter from '@fastify/rate-limit';
import { fileURLToPath } from 'url';
import path from 'path';
import { createServer } from 'net';
import os from 'os';
import { spawn } from 'child_process';
import fs from 'fs';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'production';
const ENABLE_CORS = process.env.CORS_ENABLED === 'true';
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '100');

const handlerCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let isShuttingDown = false;
const activeRequests = new Set();

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(\`\\n⏹️  \${signal} received. Graceful shutdown...\`);
  console.log(\`📊 Active requests: \${activeRequests.size}\`);
  
  const shutdownTimeout = setTimeout(() => {
    console.log('⚠️  Shutdown timeout - force closing');
    process.exit(1);
  }, 30000);
  
  const checkRequests = setInterval(() => {
    if (activeRequests.size === 0) {
      clearInterval(checkRequests);
      clearTimeout(shutdownTimeout);
      console.log('✅ All requests completed. Exiting.');
      process.exit(0);
    }
  }, 100);
}

function validateDistPath(distPath) {
  const resolvedPath = path.resolve(process.cwd(), distPath);
  
  // Check if path exists and is a directory
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(\`Build directory not found: \${resolvedPath}\\nRun: npm run build\`);
  }

  const stats = fs.statSync(resolvedPath);
  if (!stats.isDirectory()) {
    throw new Error(\`Build path is not a directory: \${resolvedPath}\`);
  }

  // Check for essential files
  const essentialFiles = ['index.html'];
  for (const file of essentialFiles) {
    const filePath = path.join(resolvedPath, file);
    if (!fs.existsSync(filePath)) {
      console.warn(\`⚠️  Expected file not found: \${file}\`);
    }
  }

  return resolvedPath;
}

async function getAvailablePort(startPort = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        server.close();
        resolve(getAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    
    server.once('listening', () => {
      server.close(() => {
        resolve(startPort);
      });
    });
    
    server.listen(startPort, '0.0.0.0');
  });
}

function openBrowser(url) {
  try {
    let command, args = [];
    const platform = process.platform;
    
    if (platform === 'darwin') {
      command = 'open';
      args = [url];
    } else if (platform === 'win32') {
      command = 'cmd';
      args = ['/c', 'start', '', url];
    } else {
      command = 'xdg-open';
      args = [url];
    }
    
    const child = spawn(command, args, { 
      stdio: 'ignore', 
      detached: true, 
      windowsHide: true 
    });
    
    child.unref();
    child.on('error', (err) => {
      console.log('⚠️  Could not auto-open browser:', err.message);
    });
    
    console.log('🌐 Auto-opening browser...');
    return true;
  } catch (error) {
    console.log('⚠️  Could not auto-open browser. Please open manually:', url);
    return false;
  }
}

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const name in interfaces) {
    if (/docker|veth|br-|lo|loopback/i.test(name)) continue;
    for (const iface of interfaces[name]) {
      if (iface.internal) continue;
      if (iface.family === 'IPv4') candidates.push(iface.address);
    }
  }
  const lan = candidates.find(ip => /^10\\.|^192\\.168\\.|^172\\.(1[6-9]|2[0-9]|3[0-1])\\./.test(ip));
  return lan || candidates[0] || 'localhost';
}

async function loadApiHandler(routePath) {
  const now = Date.now();
  const cached = handlerCache.get(routePath);
  
  // Check if cached handler is still valid
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.handler;
  }

  try {
    const apiDir = path.join(process.cwd(), 'src/api');
    const handlerPath = path.join(apiDir, routePath + '.js');
    
    // Use fs.existsSync for sync file check
    if (!fs.existsSync(handlerPath)) {
      return null;
    }
    
    const handlerUrl = new URL('file://' + handlerPath).href;
    const handlerModule = await import(handlerUrl + '?t=' + Math.random());
    const handler = handlerModule.default;
    
    if (typeof handler !== 'function') {
      throw new Error('Invalid API handler');
    }
    
    // Cache the handler with timestamp
    handlerCache.set(routePath, { handler, timestamp: now });
    return handler;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function createFastifyServer() {
  // Validate build directory before starting server
  const distPath = validateDistPath('.bini/dist');

  const app = fastify({
    logger: NODE_ENV === 'development' ? {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    } : false,
    bodyLimit: 1048576,
    trustProxy: 1,
    requestIdHeader: 'x-request-id',
    disableRequestLogging: true,
    connectionTimeout: 60000,
    keepAliveTimeout: 65000,
    requestTimeout: 60000,
    http2SessionTimeout: 600000
  });

  app.addHook('onClose', async (instance) => {
    console.log('\\n🛑 Server is shutting down...');
    handlerCache.clear();
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xContentTypeOptions: true,
    xFrameOptions: { action: 'deny' },
    xXssProtection: true
  });

  if (ENABLE_CORS) {
    await app.register(fastifyCors, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['Content-Length', 'X-Request-Id']
    });
  }

  await app.register(fastifyRateLimiter, {
    max: RATE_LIMIT,
    timeWindow: '15 minutes',
    cache: 10000,
    allowList: ['127.0.0.1', '::1'],
    skipOnError: true
  });

  app.addHook('onRequest', async (req, reply) => {
    const reqId = \`\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
    activeRequests.add(reqId);
    req.requestId = reqId;
    
    // Add security headers
    reply.header('X-Powered-By', 'Bini.js');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
  });

  app.addHook('onResponse', async (req, reply) => {
    activeRequests.delete(req.requestId);
  });

  // Register static file serving first
  await app.register(fastifyStatic, {
    root: distPath,
    prefix: '/',
    constraints: {},
    maxAge: NODE_ENV === 'production' ? '1y' : 0,
    etag: true,
    lastModified: true,
    wildcard: false, // Important: set to false to avoid conflict
    preCompressed: true,
    index: ['index.html'], // Allow index.html serving
    dotfiles: 'deny',
    acceptRanges: true
  });

  app.addHook('onSend', async (req, reply, payload) => {
    if (!reply.sent && !req.url.startsWith('/api/') && req.url !== '/health' && req.url !== '/metrics') {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      
      if (acceptEncoding.includes('gzip') && (typeof payload === 'string' || Buffer.isBuffer(payload))) {
        reply.header('Vary', 'Accept-Encoding');
        reply.header('Content-Encoding', 'gzip');
        
        const compressed = await new Promise((resolve, reject) => {
          zlib.gzip(payload, { level: 6 }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
        return compressed;
      }
    }
    return payload;
  });

  app.get('/health', async (req, reply) => {
    reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');
    
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      node: {
        version: process.version,
        env: NODE_ENV
      }
    };
  });

  app.get('/metrics', async (req, reply) => {
    reply.header('Cache-Control', 'no-cache');
    
    return {
      server: {
        uptime: process.uptime(),
        activeRequests: activeRequests.size,
        handlersCached: handlerCache.size
      },
      memory: process.memoryUsage(),
      versions: process.versions,
      platform: process.platform,
      arch: process.arch
    };
  });

  app.route({
    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    url: '/api/*',
    handler: async (req, reply) => {
      try {
        const url = new URL(req.url, \`http://\${req.headers.host}\`);
        let routePath = url.pathname.replace('/api/', '') || 'index';
        
        if (routePath.endsWith('/')) {
          routePath = routePath.slice(0, -1);
        }

        const handler = await loadApiHandler(routePath);
        
        if (!handler) {
          reply.status(404).type('application/json');
          return { 
            error: 'API route not found', 
            path: routePath,
            availableRoutes: Array.from(handlerCache.keys())
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
          params: {}
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
            reply.type('application/json').send(data); 
          },
          send: (data) => { 
            responded = true; 
            if (typeof data === 'object') {
              reply.type('application/json').send(data);
            } else {
              reply.send(data);
            }
          },
          end: (data) => { 
            responded = true; 
            if (data) reply.send(data); 
          }
        };

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API handler timeout')), 10000)
        );

        const handlerPromise = Promise.resolve().then(() => handler(request, response));
        const result = await Promise.race([handlerPromise, timeoutPromise]);
        
        if (!responded && result) {
          reply.type('application/json').send(result);
        }

      } catch (error) {
        console.error('🚨 API Error:', error.message);
        
        if (!reply.sent) {
          if (error.message === 'Request timeout') {
            reply.status(504).type('application/json');
            reply.send({ error: 'Request timeout', message: 'API handler took too long to respond' });
          } else {
            reply.status(500).type('application/json');
            reply.send({ 
              error: 'Internal Server Error', 
              message: error.message,
              ...(NODE_ENV === 'development' && { stack: error.stack })
            });
          }
        }
      }
    }
  });

  // SPA fallback - serve index.html for all non-API routes that don't match static files
  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith('/api/')) {
      reply.status(404).type('application/json');
      return { 
        error: 'Not found', 
        message: 'API endpoint does not exist',
        path: req.url
      };
    }
    
    // For client-side routes, serve index.html
    try {
      const indexHtmlPath = path.join(distPath, 'index.html');
      // Use fs.existsSync for sync check
      if (!fs.existsSync(indexHtmlPath)) {
        throw new Error('Index.html not found');
      }
      reply.type('text/html');
      // Use fs.promises.readFile for async file reading
      const content = await fs.promises.readFile(indexHtmlPath, 'utf-8');
      return content;
    } catch (error) {
      reply.status(404).type('text/html');
      return \`
        <html>
          <body>
            <h1>404 Not Found</h1>
            <p>The page you're looking for doesn't exist.</p>
          </body>
        </html>
      \`;
    }
  });

  app.setErrorHandler(async (error, req, reply) => {
    console.error('🚨 Server Error:', error.message);
    
    reply.status(500).type('application/json');
    return {
      error: 'Internal Server Error',
      message: 'Something went wrong',
      ...(NODE_ENV === 'development' && { 
        details: error.message,
        stack: error.stack 
      })
    };
  });

  return app;
}

async function startServer() {
  try {
    const port = await getAvailablePort(DEFAULT_PORT);
    const localIp = getNetworkIp();
    const localUrl = \`http://localhost:\${port}\`;
    const networkUrl = \`http://\${localIp}:\${port}\`;
    
    console.log('\\n🚀 Starting Bini.js Production Server...');
    
    const app = await createFastifyServer();
    
    const startTime = Date.now();
    await app.listen({ port, host: '0.0.0.0' });
    const bootTime = Date.now() - startTime;

    console.log('');
    console.log('  \\x1b[38;2;0;207;255mß\\x1b[0m Bini.js Production-Ready Fastify Server');
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(\`    → Local:   \${localUrl}\`);
    console.log(\`    → Network: \${networkUrl}\`);
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(\`  ✅ Server:          Fastify (Production)\`);
    console.log(\`  🔒 Security:        \${ENABLE_CORS ? 'CORS + Helmet' : 'Helmet'}\`);
    console.log(\`  🛡️  Rate limiting:   \${RATE_LIMIT} req/15min\`);
    console.log(\`  ⚡ Boot time:       \${bootTime}ms\`);
    console.log(\`  🔄 Graceful:        Enabled\`);
    console.log(\`  📊 Metrics:         \${localUrl}/metrics\`);
    console.log(\`  🏥 Health:          \${localUrl}/health\`);
    console.log(\`  🔌 API Routes:      \${localUrl}/api/*\`);
    console.log(\`  📁 Static files:    .bini/dist/\`);
    console.log(\`  🚀 Client Routing:  Enabled (SPA support)\`);
    console.log('');
    
    setTimeout(() => {
      console.log('🌐 Attempting to auto-open browser...');
      const opened = openBrowser(localUrl);
      if (!opened) {
        console.log(\`📋 Please open manually: \${localUrl}\`);
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    
    if (error.message.includes('Build directory not found')) {
      console.error('💡 Solution: Run npm run build first');
    } else if (error.code === 'EADDRINUSE') {
      console.error(\`💡 Port \${DEFAULT_PORT} is already in use. Try:\`);
      console.error(\`   - Using a different port: PORT=3001 npm start\`);
      console.error(\`   - Finding what's using the port: npx kill-port \${DEFAULT_PORT}\`);
    }
    
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer().catch((error) => {
  console.error('💥 Failed to start:', error);
  process.exit(1);
});`, { force: flags.force });

    const apiDir = path.join(projectPath, "src/api");
    mkdirRecursive(apiDir);
    secureWriteFile(path.join(apiDir, "hello.js"), `// Example API route
export default function handler(req, res) {
  return {
    message: 'Hello from Bini.js API!',
    timestamp: new Date().toISOString(),
    method: req.method,
    working: true
  }
}`, { force: flags.force });

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
│   │   ├── layout.${ext.main}    # Root layout
│   │   ├── page.${ext.main}      # Home page
│   │   └── globals.css      # Global styles
│   └── api/           # API routes directory
│       └── hello.js   # Example API route
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

API routes now work in ALL modes with browser auto-opening:

**Development:** \`npm run dev\`
- ✅ Auto-opens browser
- ✅ Full API support at \`/api/*\`

**Preview:** \`npm run build && npm run preview\`  
- ✅ Auto-opens browser  
- ✅ API routes work via Vite preview

**Production:** \`npm run build && npm run start\`
- ✅ Auto-opens browser
- ✅ API routes work via Fastify server
- ✅ Static files served from .bini/dist

### Test the API:

\`\`\`bash
curl http://localhost:3000/api/hello
\`\`\`

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
    console.log(`⚡ Server:   Fastify (2x faster than Express)`);
    console.log(`🎨 Background: Consistent blue (#ecf3ff) across all styling options`);
    console.log(`📱 Cards: Fully responsive for all screen sizes`);
    console.log(`⚙️  Config Files: MJS (ES modules for all projects)\n`);
    
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
    console.log(`🌐 All commands auto-open browser: dev, preview, and start!`);
    console.log(`⚡ Production server uses Fastify for maximum performance!`);
    console.log(`🎨 Same beautiful UI with blue background across all styling options!`);
    console.log(`📱 Fully responsive cards that work on mobile, tablet, and desktop!`);
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
