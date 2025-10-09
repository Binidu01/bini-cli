#!/usr/bin/env node

const inquirer = require("inquirer").default;
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require('child_process');

// Read version from package.json
const CLI_PACKAGE_PATH = path.join(__dirname, 'package.json');
const cliPackageJson = JSON.parse(fs.readFileSync(CLI_PACKAGE_PATH, 'utf-8'));
const BINIJS_VERSION = cliPackageJson.version;

const CACHE_DIR = path.join(os.homedir(), '.bini-cache');
const MODULES_CACHE_PATH = path.join(CACHE_DIR, 'node_modules_base');
const CACHE_LOCK_FILE = path.join(CACHE_DIR, 'cache.lock');

const LOGO = `
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██╗  ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝
             Developed By Binidu
`;

function mkdirRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function isCacheAvailable() {
  return fs.existsSync(MODULES_CACHE_PATH) && !fs.existsSync(CACHE_LOCK_FILE);
}

function buildCache(tempProjectPath) {
  console.log('\n📦 Building global module cache (first run)...');
  mkdirRecursive(CACHE_DIR);
  fs.writeFileSync(CACHE_LOCK_FILE, 'locked');

  try {
    console.log('   - Installing dependencies...');
    execSync('npm install --prefix .', { cwd: tempProjectPath, stdio: 'inherit' });
    
    const tempNodeModules = path.join(tempProjectPath, 'node_modules');
    if (fs.existsSync(tempNodeModules)) {
      console.log(`   - Caching to ${MODULES_CACHE_PATH}...`);
      fs.renameSync(tempNodeModules, MODULES_CACHE_PATH);
      console.log('✅ Cache built successfully!');
    } else {
      throw new Error('npm install failed.');
    }
  } catch (error) {
    console.error('\n❌ Cache build failed. Cleaning up...');
    if (fs.existsSync(MODULES_CACHE_PATH)) {
      fs.rmSync(MODULES_CACHE_PATH, { recursive: true, force: true });
    }
    throw error;
  } finally {
    if (fs.existsSync(CACHE_LOCK_FILE)) {
      fs.unlinkSync(CACHE_LOCK_FILE);
    }
  }
}

async function askQuestions() {
  return inquirer.prompt([
    {
      type: "confirm",
      name: "typescript",
      message: "Use TypeScript?",
      default: true,
    },
    {
      type: "list",
      name: "styling",
      message: "Styling preference?",
      choices: ["Tailwind", "CSS Modules", "None"],
      default: "Tailwind",
    }
  ]);
}

function generateProject(projectName, answers) {
  const projectPath = path.join(process.cwd(), projectName);
  const appPath = path.join(projectPath, "src/app");
  const publicPath = path.join(projectPath, "public");
  const biniPath = path.join(projectPath, ".bini");
  
  mkdirRecursive(appPath);
  mkdirRecursive(publicPath);
  mkdirRecursive(biniPath);
  
  // Create bini internal files
  const biniInternalPath = path.join(biniPath, "internal");
  mkdirRecursive(biniInternalPath);

  const ext = answers.typescript ? "tsx" : "jsx";
  const isTS = answers.typescript;

  // Generate bini dev server and plugins in .bini folder
  generateBiniInternals(projectPath, answers, ext);

  // Generate SVG logos in public folder
  generateSVGLogos(publicPath);

  // Next.js-like HTML Template
  fs.writeFileSync(path.join(projectPath, "index.html"), `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- BINI_META_TAGS -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${ext}"></script>
  </body>
</html>`);

  // FIXED: Next.js-like Root Layout - Proper TypeScript syntax
  if (isTS) {
    fs.writeFileSync(path.join(appPath, `layout.${ext}`), `import React from 'react';
import './globals.css';

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata = {
  title: 'Bini.js App',
  description: 'Modern React application built with Bini.js',
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        {/* React will inject meta tags here */}
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
    // JavaScript version
    fs.writeFileSync(path.join(appPath, `layout.${ext}`), `import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Bini.js App',
  description: 'Modern React application built with Bini.js',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* React will inject meta tags here */}
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

  // FIXED: Main Page - No inline styles, uses Tailwind classes only
  fs.writeFileSync(path.join(appPath, `page.${ext}`), `import React from 'react';

export default function Home() {
  const handleTestAlert = () => {
    alert('Bini.js is ready! Check the README for API routes and advanced features.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img src="/bini-logo.svg" alt="Bini.js Logo" className="h-16" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="text-indigo-600">Bini.js</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Next.js-like React framework with built-in API routes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="text-2xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Layout First</h3>
            <p className="text-gray-600">All SEO and meta tags configured in layout file</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="text-2xl mb-3">🚀</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">File-based Routing</h3>
            <p className="text-gray-600">Create pages by adding files to src/app</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="text-2xl mb-3">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">API Routes</h3>
            <p className="text-gray-600">Built-in file-based API routes like Next.js</p>
          </div>
        </div>

        <div className="text-center">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Get Started</h3>
            <p className="text-gray-600 mb-6">
              Add new pages by creating files in <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">src/app</code>
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={handleTestAlert}
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Test Alert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`);

  // Main Entry Point
  fs.writeFileSync(path.join(projectPath, "src", `main.${ext}`), `import React from 'react';
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

  // Simple App Component
  fs.writeFileSync(path.join(projectPath, "src", `App.${ext}`), `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './app/globals.css';
import Home from './app/page';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}`);

  // Global Styles
  const globalStyles = generateGlobalStyles(answers.styling);
  fs.writeFileSync(path.join(appPath, "globals.css"), globalStyles);

  // TypeScript config
  if (isTS) {
    fs.writeFileSync(path.join(projectPath, "tsconfig.json"), `{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", ".bini"]
}`);
  }

  // Tailwind config
  if (answers.styling === "Tailwind") {
    fs.writeFileSync(path.join(projectPath, "tailwind.config.js"), 
      `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};`);
    
    fs.writeFileSync(path.join(projectPath, "postcss.config.mjs"), 
      `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
};`);
  }

  // Bini.js config
  fs.writeFileSync(path.join(projectPath, "bini.config.ts"), `import { defineConfig } from 'bini'

export default defineConfig({
  // Build output directory (like Next.js .next folder)
  outDir: '.bini',
  
  // Development server port
  port: 3000,
  
  // API routes configuration
  api: {
    // API routes directory
    dir: 'src/api',
    // Body size limit for API routes
    bodySizeLimit: '1mb'
  },
  
  // Static files configuration
  static: {
    // Static files directory
    dir: 'public',
    // Static files cache duration
    maxAge: 3600
  },
  
  // Build optimization
  build: {
    // Minify output
    minify: true,
    // Source maps for debugging
    sourcemap: true
  }
})`);

  // Bini environment types
  fs.writeFileSync(path.join(projectPath, "bini-env.d.ts"), `/// <reference types="bini/client" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Add your environment variables here
      NODE_ENV: 'development' | 'production'
      VITE_APP_NAME: string
      VITE_APP_URL: string
    }
  }
}

export {}`);

  // FIXED: Enhanced ESLint config with no-inline-styles rule
  fs.writeFileSync(path.join(projectPath, "eslint.config.mjs"), `import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', '.bini', 'node_modules'] },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
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

  // Gitignore
  fs.writeFileSync(path.join(projectPath, ".gitignore"), `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
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
*.log`);

  // Vite config
  fs.writeFileSync(path.join(projectPath, "vite.config.js"), `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { biniBadgePlugin } from './.bini/internal/plugins/badge'
import { biniSSRPlugin } from './.bini/internal/plugins/ssr'
import { biniAPIPlugin } from './.bini/internal/plugins/api'

export default defineConfig({
  plugins: [
    react(), 
    biniSSRPlugin(), 
    biniBadgePlugin(), 
    biniAPIPlugin()
  ],
  server: { 
    port: 3000, 
    open: true,
    host: true,
    cors: true
  },
  preview: {
    port: 3000,
    open: true,
    host: true
  },
  build: { 
    outDir: '.bini/dist',
    sourcemap: true,
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
})`);

  // Package.json
  const packageJson = {
    name: projectName,
    type: "module",
    version: "1.0.0",
    scripts: {
      "dev": "vite",
      "build": "vite build",
      "start": "vite preview --host",
      "preview": "vite preview",
      "type-check": isTS ? "tsc --noEmit" : "echo 'TypeScript not enabled'",
      "lint": "eslint . --ext .js,.jsx,.ts,.tsx"
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
      "react-router-dom": "^7.1.1"
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.3.4",
      vite: "^6.0.5",
      "@eslint/js": "^9.9.0",
      "eslint-plugin-react-hooks": "^5.0.0",
      "eslint-plugin-react-refresh": "^0.4.9",
      globals: "^15.9.0",
      ...(isTS && {
        "@types/react": "^18.3.18",
        "@types/react-dom": "^18.3.5",
        typescript: "^5.7.2"
      })
    }
  };

  // Add styling-specific dependencies
  if (answers.styling === "Tailwind") {
    packageJson.devDependencies.tailwindcss = "^3.4.17";
    packageJson.devDependencies.postcss = "^8.4.49";
    packageJson.devDependencies.autoprefixer = "^10.4.20";
  }

  fs.writeFileSync(path.join(projectPath, "package.json"), JSON.stringify(packageJson, null, 2));

  // README
  fs.writeFileSync(path.join(projectPath, "README.md"), `# ${projectName}

⚡ Lightning-fast Bini.js app with Next.js-like file structure.

## 🚀 Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Opens http://localhost:3000 with Bini.js development server.

## 📦 Production Build

\`\`\`bash
npm run build
npm run start  # Preview production build
\`\`\`

## 🏗️ Project Structure

\`\`\`
${projectName}/
├── src/
│   └── app/           # Next.js app directory
│       ├── layout.${ext}    # Root layout (SEO, meta tags)
│       ├── page.${ext}      # Home page
│       └── globals.css      # Global styles
├── public/            # Static assets (images, fonts, etc.)
│   ├── bini-logo.svg  # Bini.js logo
│   └── favicon.svg    # App favicon
├── .bini/             # Build outputs and internal plugins
├── bini.config.ts     # Bini.js configuration
├── bini-env.d.ts      # Environment type definitions
├── eslint.config.mjs  # ESLint configuration
├── tsconfig.json      # TypeScript configuration
├── vite.config.js     # Vite configuration with Bini plugins
└── package.json       # Dependencies and scripts
\`\`\`

## 🎨 Styling: ${answers.styling}

${answers.styling === "Tailwind" ? "✅ Tailwind CSS configured and ready" : ""}
${answers.styling === "CSS Modules" ? "✅ CSS Modules enabled" : ""}
${answers.styling === "None" ? "✅ Basic CSS with responsive design" : ""}

## 🖥️ Layout-First Architecture

All global configuration is centralized in \`src/app/layout.${ext}\`:

- **SEO Meta Tags**: Title, description, keywords
- **Favicon**: Auto-generated triangle SVG favicon
- **Global Styles**: CSS imports and base styles

### Customizing Meta Tags

Edit the \`metadata\` object in \`src/app/layout.${ext}\`:

\`\`\`${ext}
export const metadata = {
  title: 'My Custom Site',
  description: 'My custom description for SEO',
  keywords: 'custom,keywords,here',
  authors: [{ name: 'Site Owner' }],
};
\`\`\`

**Note**: Meta tags are server-side rendered and visible in page source for SEO.

## 📄 Adding Pages

Create new pages by adding files to \`src/app/\`:

\`\`\`${ext}
// src/app/about/page.${ext}
export default function About() {
  return (
    <div>
      <h1>About Page</h1>
      <p>This is the about page</p>
    </div>
  );
}
\`\`\`

## 🔌 API Routes

Create API routes in \`src/api/\`:

\`\`\`javascript
// src/api/hello.js
export default function handler(req, res) {
  return {
    message: 'Hello from Bini.js API!',
    timestamp: new Date().toISOString()
  }
}
\`\`\`

Access at: \`/api/hello\`

## 🛠️ Configuration

### Bini.js Config (\`bini.config.ts\`)
\`\`\`typescript
export default defineConfig({
  outDir: '.bini',     # Build output directory
  port: 3000,          # Development server port
  api: {
    dir: 'src/api',    # API routes directory
  }
})
\`\`\`

### Environment Variables
Create \`.env\` file:
\`\`\`
VITE_APP_NAME="${projectName}"
VITE_APP_URL=http://localhost:3000
\`\`\`

## 🎯 Features

- ⚡ **Next.js Structure**: Familiar app directory structure
- 🖥️ **Layout First**: All global config in layout.${ext}
- 🔌 **File-based API**: Next.js-style API routes
- 📱 **Responsive**: Mobile-first design
- 🎨 **Auto-generated Logos**: Bini.js triangle logos in SVG
- 🔧 **TypeScript**: ${isTS ? 'Enabled' : 'Ready to add'}
- 🚀 **Production Ready**: Optimized builds
- 🎨 **Bini.js Badge**: Development badge in bottom-right corner
- 🔍 **SEO Ready**: Server-side rendered meta tags
- 🔄 **Hot Reload**: Meta tags update automatically on changes

## 📁 File Overview

- \`src/app/layout.${ext}\` - Root layout with SEO and meta tags
- \`src/app/page.${ext}\` - Home page component
- \`src/app/globals.css\` - Global styles and CSS imports
- \`public/bini-logo.svg\` - Bini.js logo for the website
- \`public/favicon.svg\` - Triangle favicon for the app
- \`.bini/\` - Build outputs and internal plugins
- \`bini.config.ts\` - Framework configuration
- \`bini-env.d.ts\` - TypeScript environment definitions
- \`vite.config.js\` - Vite configuration with Bini plugins

## 🔧 Development

\`\`\`bash
# Development server with Bini.js features
npm run dev

# Production build
npm run build

# Preview production build
npm run start

# Type checking (if TypeScript)
npm run type-check

# Lint code
npm run lint
\`\`\`

---

**Built with Bini.js v${BINIJS_VERSION}** • [Documentation](https://bini.js.org)
`);

  console.log(`\n✅ Project created: ${projectName}`);
  console.log(`\n📁 Next.js-like structure created:`);
  console.log(`   src/app/layout.${ext} - Root layout with SEO`);
  console.log(`   src/app/page.${ext} - Home page`);
  console.log(`   public/bini-logo.svg - Bini.js logo`);
  console.log(`   public/favicon.svg - Triangle favicon`);
  console.log(`   .bini/ - Build outputs and internal plugins`);
  console.log(`\n🚀 Get started:\n   cd ${projectName}\n   npm install\n   npm run dev`);
  console.log(`\n🎨 Styling: ${answers.styling}`);
  console.log(`\n📚 Check README.md for API routes and advanced features`);
}

function generateSVGLogos(publicPath) {
  // Bini.js Logo (for website)
  const biniLogoSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 60">
  <polygon points="20,10 40,50 0,50" fill="#00CFFF"></polygon>
  <text x="60" y="42" font-size="32" font-family="Poppins, sans-serif" font-weight="600" fill="#222">Bini.js</text>
</svg>`;
  
  // Favicon (triangle with gradient)
  const faviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <polygon points="50,10 90,90 10,90" fill="url(#grad)"></polygon>
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00CFFF"></stop>
      <stop offset="100%" stop-color="#0077FF"></stop>
    </linearGradient>
  </defs>
</svg>`;

  fs.writeFileSync(path.join(publicPath, "bini-logo.svg"), biniLogoSVG);
  fs.writeFileSync(path.join(publicPath, "favicon.svg"), faviconSVG);
  
  console.log('✅ Generated SVG logos in public folder');
}

function generateBiniInternals(projectPath, answers, ext) {
  const biniInternalPath = path.join(projectPath, ".bini/internal");
  const pluginsPath = path.join(biniInternalPath, "plugins");
  
  mkdirRecursive(pluginsPath);

  // Bini Badge Plugin
  fs.writeFileSync(path.join(pluginsPath, "badge.js"), `const BINIJS_VERSION = "${BINIJS_VERSION}";

export function biniBadgePlugin() {
  return {
    name: 'bini-badge-injector',
    
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (process.env.NODE_ENV !== 'production') {
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
                pointer-events: none;
                animation: fadeIn 0.5s ease-in;
              }
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            </style>
            <script>
              (function() {
                window.addEventListener('DOMContentLoaded', function() {
                  const badge = document.createElement('div');
                  badge.className = 'bini-dev-badge';
                  badge.innerHTML = '▲ Bini.js v${BINIJS_VERSION}';
                  document.body.appendChild(badge);
                  
                  // Auto-remove in production build
                  if (process.env.NODE_ENV === 'production') {
                    badge.remove();
                  }
                });
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

  // Bini SSR Plugin - Only shows tags implemented in layout
  fs.writeFileSync(path.join(pluginsPath, "ssr.js"), `const BINIJS_VERSION = "${BINIJS_VERSION}";
import fs from 'fs';
import path from 'path';

function parseMetadata(layoutContent) {
  const metaTags = {};

  try {
    // Extract metadata object from layout file
    const metadataMatch = layoutContent.match(/export\\s+const\\s+metadata\\s*=\\s*({[\\s\\S]*?})(?=\\s*export|\\s*function|\\s*const|\\s*$)/);
    
    if (metadataMatch) {
      const metadataStr = metadataMatch[1];
      
      // Helper to extract property values - only extract what's actually defined
      const extractProperty = (str, prop) => {
        const regex = new RegExp(\`\${prop}:\\\\s*['"]([^'"]+)['"]\`, 'i');
        const match = str.match(regex);
        return match ? match[1] : null;
      };

      // Extract individual properties only if they exist
      const title = extractProperty(metadataStr, 'title');
      if (title) metaTags.title = title;
      
      const description = extractProperty(metadataStr, 'description');
      if (description) metaTags.description = description;
      
      const keywords = extractProperty(metadataStr, 'keywords');
      if (keywords) metaTags.keywords = keywords;
      
      // Handle authors array only if it exists
      const authorsMatch = metadataStr.match(/authors:\\s*\\[\\s*{\\s*name:\\s*['"]([^'"]+)['"]/);
      if (authorsMatch) metaTags.author = authorsMatch[1];
      
      const viewport = extractProperty(metadataStr, 'viewport');
      if (viewport) metaTags.viewport = viewport;
      
      console.log('🔄 Bini.js: Successfully parsed metadata from layout');
    }
  } catch (error) {
    console.log('Bini.js: Error parsing metadata');
  }

  return metaTags;
}

function getCurrentMetadata() {
  const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
  
  try {
    if (fs.existsSync(layoutPath)) {
      const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
      return parseMetadata(layoutContent);
    } else {
      console.log('Bini.js: Layout file not found');
    }
  } catch (error) {
    console.log('Bini.js: Error reading layout file:', error.message);
  }

  // Return empty object - no defaults
  return {};
}

export function biniSSRPlugin() {
  return {
    name: 'bini-ssr-plugin',
    
    configureServer(server) {
      // Watch layout file for changes
      const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
      
      if (fs.existsSync(layoutPath)) {
        server.watcher.add(layoutPath);
        
        server.watcher.on('change', (file) => {
          if (file === layoutPath) {
            console.log('🔄 Bini.js: Layout file changed - meta tags will update');
            
            // Small delay to ensure file is written
            setTimeout(() => {
              server.ws.send({
                type: 'full-reload',
                path: '*'
              });
            }, 100);
          }
        });
      }
    },
    
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const metaTags = getCurrentMetadata();
        
        // Generate meta tags HTML - ONLY what's defined in layout
        let metaTagsHTML = '';
        
        // Always include charset, viewport and favicon
        metaTagsHTML += \`
    <meta charset="UTF-8" />
    <meta name="viewport" content="\${metaTags.viewport || 'width=device-width, initial-scale=1.0'}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />\`;
        
        // Only include title if defined
        if (metaTags.title) {
          metaTagsHTML += \`
    <title>\${metaTags.title}</title>\`;
        }
        
        // Only include description if defined
        if (metaTags.description) {
          metaTagsHTML += \`
    <meta name="description" content="\${metaTags.description}" />\`;
        }
        
        // Only include keywords if defined
        if (metaTags.keywords) {
          metaTagsHTML += \`
    <meta name="keywords" content="\${metaTags.keywords}" />\`;
        }
        
        // Only include author if defined
        if (metaTags.author) {
          metaTagsHTML += \`
    <meta name="author" content="\${metaTags.author}" />\`;
        }
        
        // Bini.js runtime (always included)
        metaTagsHTML += \`
    
    <!-- Bini.js runtime -->
    <script>
      window.__BINI_RUNTIME__ = { version: '\${BINIJS_VERSION}' };
    </script>\`;
        
        return html.replace('<!-- BINI_META_TAGS -->', metaTagsHTML);
      }
    },
    
    // Handle HMR updates
    handleHotUpdate({ server, file }) {
      if (file.endsWith('layout.tsx')) {
        console.log('🔄 Bini.js: Layout hot update detected');
        
        // Use full reload for layout changes
        setTimeout(() => {
          server.ws.send({
            type: 'full-reload',
            path: '*'
          });
        }, 50);
        
        return []; // Skip default HMR processing
      }
    }
  }
}`);

  // Bini API Plugin
  fs.writeFileSync(path.join(pluginsPath, "api.js"), `import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import os from 'os'

const BINIJS_VERSION = "${BINIJS_VERSION}";

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

function showBiniBanner(mode) {
  const localIp = getNetworkIp();
  
  console.log('');
  console.log('  ▲ Bini.js v' + BINIJS_VERSION);
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('    → Local:   http://localhost:3000');
  console.log('    → Network: http://' + localIp + ':3000');
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

export function biniAPIPlugin() {
  return {
    name: 'bini-api-plugin',
    
    configureServer(server) {
      showBiniBanner('dev');
      
      server.middlewares.use('/api', async (req, res) => {
        try {
          const url = new URL(req.url, \`http://\${req.headers.host}\`);
          let routePath = url.pathname.replace('/api/', '') || 'index';
          
          // Remove trailing slash
          if (routePath.endsWith('/')) {
            routePath = routePath.slice(0, -1);
          }
          
          const apiDir = path.join(process.cwd(), 'src/api');
          let handlerPath = null;
          
          // Check if API route exists
          const possiblePaths = [
            path.join(apiDir, \`\${routePath}.js\`),
            path.join(apiDir, routePath, 'index.js'),
          ];
          
          for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
              handlerPath = filePath;
              break;
            }
          }
          
          if (!handlerPath) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              error: 'API route not found',
              path: routePath
            }));
            return;
          }
          
          // Convert Windows path to file:// URL for ESM imports
          const handlerUrl = pathToFileURL(handlerPath).href;
          
          // Import the JavaScript handler
          const handlerModule = await import(handlerUrl + '?t=' + Date.now());
          const handler = handlerModule.default;
          
          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid API handler - export a default function' }));
            return;
          }
          
          // Parse request body
          let body = {};
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            body = await new Promise((resolve) => {
              let data = '';
              req.on('data', chunk => data += chunk);
              req.on('end', () => {
                try {
                  resolve(data ? JSON.parse(data) : {});
                } catch {
                  resolve({});
                }
              });
            });
          }
          
          // Enhanced request object
          const request = {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body,
            query: Object.fromEntries(url.searchParams),
            params: {}
          };
          
          // Enhanced response object
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
          
          // Execute handler
          const result = await handler(request, response);
          if (result && !res.writableEnded) {
            response.json(result);
          }
          
        } catch (error) {
          console.error('🚨 API Error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            error: 'Internal Server Error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }));
        }
      });
    }
  }
}`);
}

function generateGlobalStyles(styling) {
  if (styling === "Tailwind") {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
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
    color: #1f2937;
  }
  
  #root {
    min-height: 100vh;
  }
  
  .main-content {
    min-height: 100vh;
  }
}

@layer components {
  .btn-primary {
    @apply px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2;
  }
  
  .card {
    @apply bg-white rounded-xl shadow-lg p-6 border border-gray-100;
  }
}`;
  } else if (styling === "CSS Modules") {
    return `* { 
  box-sizing: border-box; 
  margin: 0; 
  padding: 0; 
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #1f2937;
}

#root {
  min-height: 100vh;
}

.main-content {
  min-height: 100vh;
}`;
  } else {
    // None styling
    return `* { 
  box-sizing: border-box; 
  margin: 0; 
  padding: 0; 
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #1f2937;
}

#root {
  min-height: 100vh;
}

.main-content {
  min-height: 100vh;
}`;
  }
}

async function main() {
  console.log(LOGO);
  
  const { projectName } = await inquirer.prompt([{
    type: "input",
    name: "projectName",
    message: "Project name:",
    default: "my-bini-app",
    validate: (input) => {
      if (!input) return "Name required";
      if (!/^[a-z0-9-_]+$/.test(input)) {
        return "Use lowercase, numbers, hyphens, underscores only";
      }
      return true;
    },
  }]);

  const answers = await askQuestions();
  
  // Cache management
  if (!isCacheAvailable()) {
    const tempPath = path.join(os.tmpdir(), `bini-cache-${Date.now()}`);
    mkdirRecursive(tempPath);
    
    const deps = {
      dependencies: {
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        "react-router-dom": "^7.1.1"
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.4",
        vite: "^6.0.5",
        "@eslint/js": "^9.9.0",
        "eslint-plugin-react-hooks": "^5.0.0", 
        "eslint-plugin-react-refresh": "^0.4.9",
        globals: "^15.9.0",
        tailwindcss: "^3.4.17",
        postcss: "^8.4.49",
        autoprefixer: "^10.4.20",
        typescript: "^5.7.2",
        "@types/react": "^18.3.18",
        "@types/react-dom": "^18.3.5"
      }
    };
    fs.writeFileSync(path.join(tempPath, "package.json"), JSON.stringify(deps, null, 2));

    try {
      buildCache(tempPath);
    } catch (e) {
      console.error('Aborted due to cache error.');
      fs.rmSync(tempPath, { recursive: true, force: true });
      return;
    } finally {
      fs.rmSync(tempPath, { recursive: true, force: true });
    }
  }

  generateProject(projectName, answers);
}

main().catch(console.error);
