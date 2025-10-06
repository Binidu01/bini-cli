#!/usr/bin/env node

const inquirer = require("inquirer").default;
const fs = require("fs"); 
const path = require("path");
const os = require("os");
const { execSync } = require('child_process');

const BINIJS_VERSION = "5.0.2";
// --- NEW: Cache Configuration ---
const CACHE_DIR = path.join(os.homedir(), '.bini-cache');
const MODULES_CACHE_PATH = path.join(CACHE_DIR, 'node_modules_base');
const CACHE_LOCK_FILE = path.join(CACHE_DIR, 'cache.lock');
// --------------------------------

const LOGO = `
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██   ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝

             Developed By Binidu
`;

function mkdirRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// --- NEW: Cache Management Functions ---

/**
 * Checks if the prebuilt node_modules cache exists.
 * @returns {boolean} True if the cache directory exists and is not locked.
 */
function isCacheAvailable() {
  return fs.existsSync(MODULES_CACHE_PATH) && !fs.existsSync(CACHE_LOCK_FILE);
}

/**
 * Builds the base node_modules cache if it doesn't exist.
 * This runs a minimal npm install once globally.
 */
function buildCache(tempProjectPath) {
  console.log('\n📦 Initializing Bini.js global module cache (first run, may take a moment)...');
  
  // Create cache and lock file
  mkdirRecursive(CACHE_DIR);
  fs.writeFileSync(CACHE_LOCK_FILE, 'locked');

  try {
    // 1. Install dependencies into a temporary directory
    console.log('   - Installing base dependencies...');
    execSync('npm install --prefix .', { 
      cwd: tempProjectPath, 
      stdio: 'inherit' 
    });

    // 2. Move node_modules to the cache location
    const tempNodeModules = path.join(tempProjectPath, 'node_modules');
    if (fs.existsSync(tempNodeModules)) {
      console.log(`   - Caching modules to ${MODULES_CACHE_PATH}...`);
      fs.renameSync(tempNodeModules, MODULES_CACHE_PATH);
    } else {
      throw new Error('npm install failed to create node_modules.');
    }

    console.log('✅ Module cache built successfully!');
  } catch (error) {
    console.error('\n❌ Error building cache. Deleting cache files for clean retry.');
    // Clean up failed cache attempt
    if (fs.existsSync(MODULES_CACHE_PATH)) {
        fs.rmSync(MODULES_CACHE_PATH, { recursive: true, force: true });
    }
    throw error; // Re-throw to stop project generation
  } finally {
    // 3. Remove lock file
    if (fs.existsSync(CACHE_LOCK_FILE)) {
      fs.unlinkSync(CACHE_LOCK_FILE);
    }
  }
}

// --- NEW: Code Injection System ---
function setupCodeInjection(projectPath, answers) {
  const injectionDir = path.join(projectPath, 'src', 'injection');
  mkdirRecursive(injectionDir);
  
  // Create injection hook
  const injectionHook = `// Code Injection Hook for Bini.js
// This file allows you to inject custom code at runtime

export class CodeInjector {
  constructor() {
    this.injections = new Map();
    this.setupInjectionSystem();
  }

  setupInjectionSystem() {
    // Listen for custom injection events
    if (typeof window !== 'undefined') {
      window.addEventListener('bini-inject-code', (event) => {
        this.injectCode(event.detail);
      });
    }
  }

  injectCode({ id, code, type = 'script' }) {
    try {
      switch (type) {
        case 'script':
          this.injectScript(code, id);
          break;
        case 'style':
          this.injectStyle(code, id);
          break;
        case 'component':
          this.injectComponent(code, id);
          break;
        default:
          console.warn('Unknown injection type:', type);
      }
    } catch (error) {
      console.error('Code injection failed:', error);
    }
  }

  injectScript(code, id) {
    if (this.injections.has(id)) {
      console.warn('Injection with ID already exists:', id);
      return;
    }

    const script = document.createElement('script');
    script.textContent = code;
    script.setAttribute('data-injection-id', id);
    document.head.appendChild(script);
    
    this.injections.set(id, script);
    console.log('Script injected:', id);
  }

  injectStyle(code, id) {
    if (this.injections.has(id)) {
      console.warn('Injection with ID already exists:', id);
      return;
    }

    const style = document.createElement('style');
    style.textContent = code;
    style.setAttribute('data-injection-id', id);
    document.head.appendChild(style);
    
    this.injections.set(id, style);
    console.log('Style injected:', id);
  }

  injectComponent(code, id) {
    // Component injection would be handled by React
    // This is a placeholder for component-level injection
    console.log('Component injection requested:', id, code);
  }

  removeInjection(id) {
    const injection = this.injections.get(id);
    if (injection && injection.parentNode) {
      injection.parentNode.removeChild(injection);
      this.injections.delete(id);
      console.log('Injection removed:', id);
    }
  }

  listInjections() {
    return Array.from(this.injections.keys());
  }
}

// Global instance
export const codeInjector = new CodeInjector();

// Development helper
if (import.meta.env.DEV) {
  window.biniInjector = codeInjector;
  console.log('🔄 Bini.js Code Injector ready for development');
}
`;

  fs.writeFileSync(path.join(injectionDir, 'injector.js'), injectionHook);

  // Update main entry point to include injection system
  const ext = answers.typescript ? 'tsx' : 'jsx';
  const mainEntryPath = path.join(projectPath, 'src', `main.${ext}`);
  
  const mainEntryContent = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { codeInjector } from './injection/injector';

// Initialize code injection system
console.log('🚀 Bini.js with Vite - Code Injection Enabled');

// Development mode injection examples
if (import.meta.env.DEV) {
  // Example: Inject development helper script
  setTimeout(() => {
    codeInjector.injectCode({
      id: 'dev-helper',
      code: \`
        console.log('🔧 Bini.js Development Mode Active');
        console.log('💉 Use window.biniInjector to manage code injections');
      \`,
      type: 'script'
    });
  }, 1000);
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

// Hot Module Replacement (HMR) for Vite
if (import.meta.env.DEV) {
  import.meta.hot?.accept();
}
`;

  fs.writeFileSync(mainEntryPath, mainEntryContent);
}
// ------------------------------------------

async function askQuestions() {
  return inquirer.prompt([
    {
      type: "confirm",
      name: "typescript",
      message: "Would you like to use TypeScript?",
      default: true,
    },
    {
      type: "list",
      name: "styling",
      message: "What styling would you like to use?",
      choices: ["Tailwind", "CSS Modules", "None"],
      default: "Tailwind",
    },
    {
      type: "confirm",
      name: "ssr",
      message: "Enable Server-Side Rendering (SSR)?",
      default: false,
    },
    {
      type: "list",
      name: "features",
      message: "Additional features?",
      choices: ["Static Generation", "None"],
      default: "Static Generation",
    },
  ]);
}

function generateProject(projectName, answers) {
  const projectPath = path.join(process.cwd(), projectName);
  mkdirRecursive(projectPath);
  
  const srcPath = path.join(projectPath, "src");
  mkdirRecursive(srcPath);
  mkdirRecursive(path.join(srcPath, "pages"));
  mkdirRecursive(path.join(srcPath, "components"));
  mkdirRecursive(path.join(srcPath, "styles"));
  
  // Create injection directory (always enabled for framework)
  mkdirRecursive(path.join(srcPath, "injection"));

  const ext = answers.typescript ? "tsx" : "jsx";
  const isTS = answers.typescript;

  // Create HTML template for Vite
  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bini.js App</title>
    <style>
      body { margin: 0; padding: 0; }
      #root { min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${ext}"></script>
  </body>
</html>`;
  fs.writeFileSync(path.join(projectPath, "index.html"), htmlTemplate);

  // Generate pages and components
  const indexPage = `${isTS
    ? "import React from 'react';\nimport { Link } from 'react-router-dom';\n"
    : "import React from 'react';\nimport { Link } from 'react-router-dom';\n"}
export default function Home() {
  return (
    <div className="max-w-4xl mx-auto p-10 mt-12 space-y-8 bg-white rounded-2xl shadow-lg">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-indigo-700 drop-shadow-sm">
          Welcome to Bini.js! 🚀
        </h1>
        <p className="text-lg text-gray-500">
          The Vite-powered React framework, built for speed and simplicity.
        </p>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-6 pt-4">
        {/* Feature 1 */}
        <div className="border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-all duration-200 p-6 rounded-xl shadow-sm">
          <h3 className="text-xl font-semibold text-indigo-700 mb-2">
            ⚡ Lightning Fast
          </h3>
          <p className="text-gray-600">
            Powered by <span className="font-medium">Vite</span> for blazing fast builds and refreshes.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-all duration-200 p-6 rounded-xl shadow-sm">
          <h3 className="text-xl font-semibold text-indigo-700 mb-2">
            🔄 File-based Routing
          </h3>
          <p className="text-gray-600">
            Automatically creates routes based on your <code className="bg-gray-100 px-1 rounded">pages/</code> structure.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-all duration-200 p-6 rounded-xl shadow-sm">
          <h3 className="text-xl font-semibold text-indigo-700 mb-2">
            💉 Code Injection
          </h3>
          <p className="text-gray-600">
            Runtime code injection system for dynamic updates.
          </p>
        </div>
      </div>

      {/* Link Section */}
      <div className="pt-6 text-center">
        <Link
          to="/about"
          className="link"
        >
          About Page →
        </Link>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 pt-6 border-t border-gray-100">
        <p>
          © ${new Date().getFullYear()} <span className="font-semibold">Bini.js</span> — Built for Developers ❤️
        </p>
      </div>
    </div>
  );
}`;

  fs.writeFileSync(path.join(srcPath, "pages", `Home.${ext}`), indexPage);

  const aboutPage = `import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="max-w-3xl mx-auto p-10 mt-12 space-y-8 bg-white rounded-2xl shadow-lg">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-indigo-700 drop-shadow-sm">
          About Bini.js
        </h1>
        <p className="text-lg text-gray-500">
          A modern React framework powered by Vite and built for developers.
        </p>
      </div>

      {/* Info Section */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-gray-700 leading-relaxed">
        <p>
          Bini.js combines the speed of Vite with the simplicity of React and
          Tailwind, giving developers a Next.js-like experience with even faster builds.
        </p>
        <p className="mt-3">
          From file-based routing to built-in styling support and code injection, 
          Bini.js is designed to make app development effortless and modern.
        </p>
      </div>

      {/* Styling Info Card */}
      <div className="text-center border-t border-gray-100 pt-6">
        <h3 className="text-xl font-semibold text-indigo-600 mb-2">
          ⚙️ Current Styling Mode
        </h3>
        <p className="text-gray-700 bg-gray-50 inline-block px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
          ${answers.styling}
        </p>
      </div>

      {/* Navigation Link */}
      <div className="pt-6 text-center">
        <Link
          to="/"
          className="link"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-400 pt-6 border-t border-gray-100">
        <p>
          © ${new Date().getFullYear()} <span className="font-semibold">Bini.js</span> — Fast, Elegant, Developer-Friendly
        </p>
      </div>
    </div>
  );
}`;

  fs.writeFileSync(path.join(srcPath, "pages", `About.${ext}`), aboutPage);

  // Generate App component with routing
  const appFile = `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/globals.css';
import { codeInjector } from './injection/injector';
import Home from './pages/Home';
import About from './pages/About';

export default function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Router>
      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        background: '#111',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 9999
      }}>
        ▲ Bini.js v${BINIJS_VERSION}
      </div>
    </>
  );
}`;

  fs.writeFileSync(path.join(srcPath, `App.${ext}`), appFile);

  // Generate global styles
  const globalStyles = answers.styling === "Tailwind" 
    ? `@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
  min-height: 100vh;
  padding: 2rem;
}

.link {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
  font-weight: 500;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.link:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
}`
    : `/* Global Styles Fallback for CSS Modules / None */
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, sans-serif;
  background: #f0f0f5;
  min-height: 100vh;
}
#root { display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 2rem; }

/* Basic layout styles */
.max-w-4xl { max-width: 900px; }
.max-w-3xl { max-width: 700px; }
.mx-auto { margin-left: auto; margin-right: auto; }
.mt-12 { margin-top: 3rem; }
.p-10 { padding: 2.5rem; }
.space-y-8 > :not([hidden]) ~ :not([hidden]) {
  margin-top: 2rem;
  margin-bottom: 0;
}
.space-y-2 > :not([hidden]) ~ :not([hidden]) { 
  margin-top: 0.5rem; 
  margin-bottom: 0; 
}
.bg-white { background-color: #fff; }
.rounded-2xl { border-radius: 1rem; }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }

/* Colors and Typography */
.text-center { text-align: center; }
.text-4xl { font-size: 2.25rem; }
.font-extrabold { font-weight: 800; }
.text-indigo-700 { color: #4338ca; }
.text-lg { font-size: 1.125rem; }
.text-gray-500 { color: #6b7280; }
.text-indigo-600 { color: #4f46e5; }
.text-gray-700 { color: #374151; }
.bg-indigo-50 { background-color: #eef2ff; }
.border-indigo-100 { border-color: #e0e7ff; }
.rounded-xl { border-radius: 0.75rem; }
.p-6 { padding: 1.5rem; }
.border-t { border-top: 1px solid #e5e7eb; }
.pt-6 { padding-top: 1.5rem; }

/* Link Component Styling */
.link { 
  display: inline-block;
  color: white;
  text-decoration: none; 
  background-color: #4f46e5;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: background-color 0.2s;
}
.link:hover {
  background-color: #4338ca;
}`;

  fs.writeFileSync(path.join(srcPath, "styles", "globals.css"), globalStyles);

  // TypeScript config
  if (isTS) {
    const tsConfig = {
      "compilerOptions": {
        "target": "ES2020",
        "useDefineForClassFields": true,
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
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noFallthroughCasesInSwitch": true
      },
      "include": ["src"],
      "references": [{ "path": "./tsconfig.node.json" }]
    };

    const tsConfigNode = {
      "compilerOptions": {
        "composite": true,
        "skipLibCheck": true,
        "module": "ESNext",
        "moduleResolution": "bundler",
        "allowSyntheticDefaultImports": true
      },
      "include": ["vite.config.ts"]
    };

    fs.writeFileSync(path.join(projectPath, "tsconfig.json"), JSON.stringify(tsConfig, null, 2));
    fs.writeFileSync(path.join(projectPath, "tsconfig.node.json"), JSON.stringify(tsConfigNode, null, 2));
  }

  // Tailwind config
  if (answers.styling === "Tailwind") {
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};`;
    
    const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`;
    
    fs.writeFileSync(path.join(projectPath, "tailwind.config.js"), tailwindConfig);
    fs.writeFileSync(path.join(projectPath, "postcss.config.js"), postcssConfig);
  }

  // Vite config
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  ${isTS ? "esbuild: {\n    loader: 'tsx',\n  }," : ""}
})`;

  fs.writeFileSync(path.join(projectPath, "vite.config.js"), viteConfig);

  // Package.json for Vite
  const packageJson = {
    name: projectName,
    type: "module",
    version: "0.1.0",
    scripts: {
      dev: "node startDev.js",  // Use custom script for dev
      build: "vite build",
      preview: "vite preview",
      "dev:vite": "vite"  // Direct Vite access if needed
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
      "react-router-dom": "^6.26.0"
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.3.3",
      vite: "^5.4.8",
      ...(isTS && {
        "@types/react": "^18.3.12",
        "@types/react-dom": "^18.3.1",
        "typescript": "^5.5.3"
      }),
      ...(answers.styling === "Tailwind" && {
        "tailwindcss": "^3.4.17",
        "postcss": "^8.4.49",
        "autoprefixer": "^10.4.20"
      })
    }
  };

  fs.writeFileSync(path.join(projectPath, "package.json"), JSON.stringify(packageJson, null, 2));

  // Setup code injection (always enabled for framework)
  setupCodeInjection(projectPath, answers);

// Updated startDev.js for Vite with custom output processing
const startDevScript = `import { spawn } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BINIJS_VERSION = "5.0.2";
const PORT = 3000;
const MODULES_CACHE_PATH = path.join(os.homedir(), '.bini-cache', 'node_modules_base');

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function ensureDependencies() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    return;
  }

  if (fs.existsSync(MODULES_CACHE_PATH)) {
    console.log('📦 Copying prebuilt modules from cache...');
    
    if (os.platform() === 'win32') {
      execSync('xcopy "' + MODULES_CACHE_PATH + '" "' + nodeModulesPath + '\\\\" /E /H /Y', { stdio: 'inherit' });
    } else {
      execSync('cp -a "' + MODULES_CACHE_PATH + '" "' + nodeModulesPath + '"', { stdio: 'inherit' });
    }
    
    console.log('✅ Modules ready. Starting development server...');
  } else {
    console.log('⚠️ Cache not found. Running npm install...');
    execSync('npm install', { stdio: 'inherit' });
  }
}

function showBiniBanner() {
  const localIp = getNetworkIp();
  
  console.log('\\n▲ Bini.js v' + BINIJS_VERSION);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Local:   http://localhost:' + PORT);
  console.log('  Network: http://' + localIp + ':' + PORT);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n');
}

function startVite() {
  ensureDependencies();
  
  // Show Bini.js banner
  showBiniBanner();

  // Start Vite dev server and intercept its output
  const viteProcess = spawn('npx', ['vite'], { 
    stdio: 'pipe',
    shell: true 
  });

  // Intercept Vite's stdout and modify the messages
  viteProcess.stdout.on('data', (data) => {
    const output = data.toString();
    
    // Replace VITE with Bini.js in the output
    const modifiedOutput = output
      .replace(/VITE v(\\d+\\.\\d+\\.\\d+)/g, 'Bini.js v' + BINIJS_VERSION)
      .replace(/ready in (\\d+ ms)/g, 'ready in $1')
      .replace(/➜/g, '  →') // Clean up the arrow
      .replace(/Local:\\s+http:\\/\\/localhost:\\d+/g, '') // Remove duplicate local URL
      .replace(/Network:\\s+use --host to expose/g, '') // Remove network hint
      .replace(/press h \\+ enter to show help/g, ''); // Remove help text

    // Only print non-empty lines
    const lines = modifiedOutput.split('\\n').filter(line => line.trim() !== '');
    if (lines.length > 0) {
      console.log(lines.join('\\n'));
    }
  });

  // Pass through stderr unchanged
  viteProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  viteProcess.on('error', (error) => {
    console.error('Failed to start Vite:', error);
  });

  viteProcess.on('close', (code) => {
    if (code !== 0) {
      console.log('Vite process exited with code ' + code);
    }
  });
}

startVite();
`;

fs.writeFileSync(path.join(projectPath, "startDev.js"), startDevScript);

  // README
  const readme = `# ${projectName}

A Bini.js application - Vite-powered React framework

## ✨ Features

- ⚡ Lightning-fast Vite compilation
- 🔄 Client-side routing with React Router
${answers.ssr ? '- 🖥️ Server-Side Rendering' : ''}
- 🎨 ${answers.styling} styling
- 🔥 Hot Module Replacement (HMR)
${isTS ? '- 📘 TypeScript support' : ''}
- 💉 Built-in runtime code injection system

## 🚀 Getting Started

1.  **Install dependencies:**
    \`\`\`bash
    npm install
    \`\`\`

2.  **Run the development server:**
    \`\`\`bash
    npm run dev
    \`\`\`
    This will show the Bini.js branded output with your server URLs.

## 📦 Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── pages/         # Page components
│   ├── components/    # Reusable React components
│   ├── styles/        # Global styles
│   ├── injection/     # Code injection system
│   ├── App.${ext}         # Main app component
│   └── main.${ext}        # Application entry point
├── index.html         # HTML template
├── vite.config.js     # Vite configuration
└── package.json
\`\`\`

## 💉 Code Injection

The code injection system allows runtime code updates:

\`\`\`javascript
// Inject custom script
window.biniInjector.injectCode({
  id: 'custom-script',
  code: 'console.log("Hello from injected code!")',
  type: 'script'
});

// Inject custom styles
window.biniInjector.injectCode({
  id: 'custom-styles',
  code: 'body { background: red !important; }',
  type: 'style'
});
\`\`\`

## 📝 Available Scripts

- \`npm run dev\` - Start Vite dev server with Bini.js branding
- \`npm run build\` - Build for production
- \`npm run preview\` - Preview production build
- \`npm run dev:vite\` - Start Vite directly (without Bini.js branding)

## Learn More

Built with ❤️ using Bini.js v${BINIJS_VERSION}
`;

  fs.writeFileSync(path.join(projectPath, "README.md"), readme);

  console.log(`\n✅ Successfully created ${projectName} with Vite!`);
  console.log(`\n📦 Project includes:`);
  console.log(`    - Vite Dev Server with HMR`);
  console.log(`    - React Router for routing`);
  console.log(`    - Vite for fast compilation`);
  console.log(`    - Built-in runtime code injection system`);
  if (answers.ssr) console.log(`    - Server-Side Rendering`);
  if (answers.features !== "None") console.log(`    - ${answers.features}`);
  console.log(`    - ${answers.styling} styling`);
  console.log(`\n🚀 Next steps:`);
  console.log(`    cd ${projectName}`);
  console.log(`    npm install`);
  console.log(`    npm run dev`);
}

async function main() {
  console.log(LOGO);
  
  const { projectName } = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "What is your project named?",
      default: "my-bini-app",
      validate: (input) => {
        if (!input) return "Project name cannot be empty";
        if (!/^[a-z0-9-_]+$/.test(input)) {
          return "Project name can only contain lowercase letters, numbers, hyphens, and underscores";
        }
        return true;
      },
    },
  ]);

  const answers = await askQuestions();
  
  const projectPath = path.join(process.cwd(), projectName);

  // Cache building logic
  if (!isCacheAvailable()) {
    const tempPath = path.join(os.tmpdir(), `bini-cache-temp-${Date.now()}`);
    mkdirRecursive(tempPath);
    
    const minimalPackageJson = {
      dependencies: {
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        "react-router-dom": "^6.26.0"
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.3",
        vite: "^5.4.8",
        tailwindcss: "^3.4.17",
        postcss: "^8.4.49",
        autoprefixer: "^10.4.20",
      },
    };
    fs.writeFileSync(path.join(tempPath, "package.json"), JSON.stringify(minimalPackageJson, null, 2));

    try {
      buildCache(tempPath);
    } catch (e) {
      console.error('Project generation aborted due to cache failure.');
      fs.rmSync(tempPath, { recursive: true, force: true });
      return; 
    } finally {
      fs.rmSync(tempPath, { recursive: true, force: true });
    }
  }

  generateProject(projectName, answers);
}

main();
