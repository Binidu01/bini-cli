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

function generateAPIRoutes(projectPath, answers) {
  // ALWAYS use .js for API files to avoid import issues
  const ext = 'js';
  const apiPath = path.join(projectPath, 'src/api');
  const postsApiPath = path.join(apiPath, 'posts');
  
  mkdirRecursive(postsApiPath);

  // Hello API - Simple and ready for extension
  fs.writeFileSync(path.join(apiPath, `hello.${ext}`), `export default function handler(req, res) {
  return {
    message: 'Hello from Bini.js API!',
    timestamp: new Date().toISOString(),
    method: req.method,
    environment: process.env.NODE_ENV || 'development'
  }
}`);

  // Users API - Ready for database integration
  fs.writeFileSync(path.join(apiPath, `users.${ext}`), `// Users API - Ready for Firebase/MongoDB integration
// Add your database logic here when needed

let users = [
  { id: 1, name: 'John Doe', email: 'john@bini.js' },
  { id: 2, name: 'Jane Smith', email: 'jane@bini.js' }
]

export default function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return {
        users,
        total: users.length,
        timestamp: new Date().toISOString()
      }
    
    case 'POST':
      const newUser = {
        id: users.length + 1,
        ...req.body,
        createdAt: new Date().toISOString()
      }
      users.push(newUser)
      return {
        user: newUser,
        message: 'User created successfully'
      }
    
    case 'PUT':
      // Add your update logic here
      return res.status(501).json({ error: 'Update not implemented - add your database logic' })
    
    case 'DELETE':
      // Add your delete logic here
      return res.status(501).json({ error: 'Delete not implemented - add your database logic' })
    
    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}`);

  // Posts API - Ready for extension
  fs.writeFileSync(path.join(postsApiPath, `index.${ext}`), `// Posts API - Add Firebase/MongoDB when needed

let posts = [
  { id: 1, title: 'First Post', content: 'Hello world!' },
  { id: 2, title: 'Second Post', content: 'API routes are awesome!' }
]

export default function handler(req, res) {
  if (req.method === 'GET') {
    return { 
      posts,
      note: 'Add database integration for production use'
    }
  }
  
  if (req.method === 'POST') {
    // Add database creation logic here
    return res.status(501).json({ error: 'Add database integration for POST operations' })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}`);

  // Dynamic post route
  fs.writeFileSync(path.join(postsApiPath, `[id].${ext}`), `// Dynamic post route - Ready for database integration

let posts = [
  { id: 1, title: 'First Post', content: 'Hello world!' },
  { id: 2, title: 'Second Post', content: 'API routes are awesome!' }
]

export default function handler(req, res) {
  const postId = parseInt(req.query.id)
  const post = posts.find(p => p.id === postId)
  
  if (!post) {
    return res.status(404).json({ error: 'Post not found' })
  }
  
  if (req.method === 'GET') {
    return { post }
  }
  
  if (req.method === 'PUT') {
    // Add database update logic here
    return res.status(501).json({ error: 'Add database integration for update operations' })
  }
  
  if (req.method === 'DELETE') {
    // Add database delete logic here
    return res.status(501).json({ error: 'Add database integration for delete operations' })
  }
  
  return res.status(405).json({ error: 'Method not allowed' })
}`);

  // Database integration example
  fs.writeFileSync(path.join(apiPath, `database-example.${ext}`), `// Example: How to add Firebase to your API routes
// Remove this file or use it as a reference

/*
// 1. Install Firebase: npm install firebase
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'

// 2. Add your Firebase config to .env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// 4. Use in your API handlers
export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        const snapshot = await getDocs(collection(db, 'users'))
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        return res.json({ users })
      
      case 'POST':
        const newUser = { ...req.body, createdAt: new Date().toISOString() }
        const docRef = await addDoc(collection(db, 'users'), newUser)
        return res.json({ id: docRef.id, ...newUser })
      
      case 'PUT':
        const { id, ...updateData } = req.body
        await updateDoc(doc(db, 'users', id), updateData)
        return res.json({ message: 'User updated' })
      
      case 'DELETE':
        await deleteDoc(doc(db, 'users', req.body.id))
        return res.json({ message: 'User deleted' })
      
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Database error:', error)
    return res.status(500).json({ error: 'Database operation failed' })
  }
}
*/

// Current implementation (in-memory)
let items = [{ id: 1, name: 'Example item' }]

export default function handler(req, res) {
  // Replace this with Firebase/MongoDB when ready
  return res.json({ 
    items,
    message: 'Replace with real database for production'
  })
}`);
}

function generateProject(projectName, answers) {
  const projectPath = path.join(process.cwd(), projectName);
  const srcPath = path.join(projectPath, "src");
  
  mkdirRecursive(srcPath);
  ["pages", "components", "styles", "api", "api/posts"].forEach(dir => 
    mkdirRecursive(path.join(srcPath, dir))
  );

  const ext = answers.typescript ? "tsx" : "jsx";
  const isTS = answers.typescript;

  // Generate API routes
  generateAPIRoutes(projectPath, answers);

  // HTML Template
  fs.writeFileSync(path.join(projectPath, "index.html"), `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bini.js App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${ext}"></script>
  </body>
</html>`);

  // Home Page
  fs.writeFileSync(path.join(srcPath, "pages", `Home.${ext}`), `import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  const testApi = async () => {
    try {
      const response = await fetch('/api/hello');
      const data = await response.json();
      alert('API Response: ' + JSON.stringify(data, null, 2));
    } catch (error) {
      alert('API Error: ' + error.message);
    }
  };

  const testUsersApi = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      alert('Users API: ' + JSON.stringify(data, null, 2));
    } catch (error) {
      alert('API Error: ' + error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-12 p-10 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-indigo-700 mb-2">Welcome to Bini.js! 🚀</h1>
        <p className="text-lg text-gray-600">Vite-powered React framework with built-in API routes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <div className="p-6 bg-blue-50 border border-blue-100 rounded-lg transition-all hover:bg-blue-100 hover:-translate-y-1">
          <h3 className="text-xl font-semibold text-indigo-700 mb-2">⚡ Lightning Fast</h3>
          <p className="text-gray-600">Powered by Vite for instant HMR and blazing builds</p>
        </div>
        <div className="p-6 bg-blue-50 border border-blue-100 rounded-lg transition-all hover:bg-blue-100 hover:-translate-y-1">
          <h3 className="text-xl font-semibold text-indigo-700 mb-2">🔌 Built-in API</h3>
          <p className="text-gray-600">File-based API routes like Next.js</p>
        </div>
        <div className="p-6 bg-blue-50 border border-blue-100 rounded-lg transition-all hover:bg-blue-100 hover:-translate-y-1">
          <h3 className="text-xl font-semibold text-indigo-700 mb-2">🎨 Extensible</h3>
          <p className="text-gray-600">Add Firebase, MongoDB, or any database when needed</p>
        </div>
      </div>

      <div className="text-center mt-8 pt-8 border-t border-gray-200 space-x-4">
        <Link 
          to="/about" 
          className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg transition-transform hover:-translate-y-0.5"
        >
          About →
        </Link>
        <button 
          onClick={testApi}
          className="inline-block px-6 py-3 bg-green-500 text-white font-medium rounded-lg transition-transform hover:-translate-y-0.5"
        >
          Test Hello API
        </button>
        <button 
          onClick={testUsersApi}
          className="inline-block px-6 py-3 bg-blue-500 text-white font-medium rounded-lg transition-transform hover:-translate-y-0.5"
        >
          Test Users API
        </button>
      </div>
    </div>
  );
}`);

  // About Page
  fs.writeFileSync(path.join(srcPath, "pages", `About.${ext}`), `import React from 'react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto my-12 p-10 bg-white rounded-xl shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-indigo-700 mb-2">About Bini.js</h1>
        <p className="text-lg text-gray-600">Modern React framework built on Vite with file-based API routes</p>
      </div>
      
      <div className="p-6 bg-blue-50 border border-blue-100 rounded-lg my-8">
        <p className="text-gray-700 mb-4">
          Bini.js combines Vite's speed with React's simplicity, offering a Next.js-like 
          experience with faster builds, built-in API routes, and instant feedback.
        </p>
        <p className="text-gray-700">
          <strong>API Routes:</strong> File-based API routes in <code>src/api/</code> work in both development and production!
        </p>
        <p className="text-gray-700 mt-4">
          <strong>Database Ready:</strong> Easily add Firebase, MongoDB, or any database to your API routes when needed.
        </p>
      </div>

      <div className="text-center mt-8 pt-8 border-t border-gray-200">
        <Link 
          to="/" 
          className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg transition-transform hover:-translate-y-0.5"
        >
          ← Home
        </Link>
      </div>
    </div>
  );
}`);

  // App Component
  fs.writeFileSync(path.join(srcPath, `App.${ext}`), `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/globals.css';
import Home from './pages/Home';
import About from './pages/About';

export default function App() {
  const isDev = import.meta.env.DEV;
  
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Router>
      {isDev && (
        <div className="bini-badge">
          ▲ Bini.js v${BINIJS_VERSION}
        </div>
      )}
    </>
  );
}`);

  // Main Entry
  fs.writeFileSync(path.join(srcPath, `main.${ext}`), `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);

if (import.meta.env.DEV) {
  import.meta.hot?.accept();
}`);

  // Global Styles
  const globalStyles = answers.styling === "Tailwind" 
    ? `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 2rem;
  }
}

@layer components {
  .bini-badge {
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
  }
}`
    : `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 2rem;
}
.bini-badge {
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
}`;

  fs.writeFileSync(path.join(srcPath, "styles", "globals.css"), globalStyles);

  // TypeScript config
  if (isTS) {
    fs.writeFileSync(path.join(projectPath, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true
      },
      include: ["src"]
    }, null, 2));
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
    fs.writeFileSync(path.join(projectPath, "postcss.config.js"), 
      `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
};`);
  }

  // Vite config with Windows fix and console output
  fs.writeFileSync(path.join(projectPath, "vite.config.js"), `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import os from 'os'

const BINIJS_VERSION = "${BINIJS_VERSION}";
const PORT = 3000;

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
  const isDev = mode === 'dev';
  
  console.log('');
  console.log('  ▲ Bini.js v' + BINIJS_VERSION);
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('    → Local:   http://localhost:' + PORT);
  console.log('    → Network: http://' + localIp + ':' + PORT);
  console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

function apiPlugin() {
  let isProduction = false
  
  return {
    name: 'api-plugin',
    
    config(config, { command }) {
      isProduction = command === 'build'
    },
    
    configureServer(server) {
      showBiniBanner('dev');
      
      server.middlewares.use('/api', async (req, res) => {
        try {
          const url = new URL(req.url, \`http://\${req.headers.host}\`)
          const routePath = url.pathname.replace('/api/', '') || 'index'
          
          // Look for API handler - ONLY .js files
          const apiDir = path.join(process.cwd(), 'src/api')
          const possibleFiles = [
            path.join(apiDir, \`\${routePath}.js\`),
            path.join(apiDir, routePath, 'index.js')
          ]
          
          let handlerPath = null
          for (const filePath of possibleFiles) {
            if (fs.existsSync(filePath)) {
              handlerPath = filePath
              break
            }
          }
          
          if (!handlerPath) {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'API route not found' }))
            return
          }
          
          // Convert Windows path to file:// URL for ESM imports
          const handlerUrl = pathToFileURL(handlerPath).href
          
          // Import the JavaScript handler
          const handlerModule = await import(handlerUrl)
          const handler = handlerModule.default
          
          if (typeof handler !== 'function') {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Invalid API handler' }))
            return
          }
          
          // Parse request body
          let body = {}
          if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            body = await new Promise((resolve) => {
              let data = ''
              req.on('data', chunk => data += chunk)
              req.on('end', () => {
                try {
                  resolve(JSON.parse(data || '{}'))
                } catch {
                  resolve({})
                }
              })
            })
          }
          
          // Create request object
          const request = {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body,
            query: Object.fromEntries(url.searchParams)
          }
          
          // Create response object
          const response = {
            status: (code) => {
              res.statusCode = code
              return response
            },
            json: (data) => {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data, null, 2))
            },
            send: (data) => {
              res.end(data)
            }
          }
          
          // Execute handler
          const result = await handler(request, response)
          if (result && !res.writableEnded) {
            response.json(result)
          }
          
        } catch (error) {
          console.error('API Error:', error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Internal Server Error' }))
        }
      })
    },
    
    configurePreviewServer(server) {
      showBiniBanner('preview');
      
      // Same logic for preview mode
      server.middlewares.use('/api', async (req, res) => {
        try {
          const url = new URL(req.url, \`http://\${req.headers.host}\`)
          const routePath = url.pathname.replace('/api/', '') || 'index'
          
          const apiDir = path.join(process.cwd(), 'src/api')
          const possibleFiles = [
            path.join(apiDir, \`\${routePath}.js\`),
            path.join(apiDir, routePath, 'index.js')
          ]
          
          let handlerPath = null
          for (const filePath of possibleFiles) {
            if (fs.existsSync(filePath)) {
              handlerPath = filePath
              break
            }
          }
          
          if (!handlerPath) {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'API route not found' }))
            return
          }
          
          // Convert Windows path to file:// URL
          const handlerUrl = pathToFileURL(handlerPath).href
          
          const handlerModule = await import(handlerUrl)
          const handler = handlerModule.default
          
          if (typeof handler !== 'function') {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Invalid API handler' }))
            return
          }
          
          let body = {}
          if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            body = await new Promise((resolve) => {
              let data = ''
              req.on('data', chunk => data += chunk)
              req.on('end', () => {
                try {
                  resolve(JSON.parse(data || '{}'))
                } catch {
                  resolve({})
                }
              })
            })
          }
          
          const request = {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body,
            query: Object.fromEntries(url.searchParams)
          }
          
          const response = {
            status: (code) => {
              res.statusCode = code
              return response
            },
            json: (data) => {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data, null, 2))
            }
          }
          
          const result = await handler(request, response)
          if (result && !res.writableEnded) {
            response.json(result)
          }
          
        } catch (error) {
          console.error('Preview API Error:', error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Internal Server Error' }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: { 
    port: PORT, 
    open: true,
    host: true
  },
  preview: {
    port: PORT,
    open: true,
    host: true
  },
  build: { 
    outDir: 'dist'
  }
})`);

  // Package.json
  fs.writeFileSync(path.join(projectPath, "package.json"), JSON.stringify({
    name: projectName,
    type: "module",
    version: "1.0.0",
    scripts: {
      "dev": "vite",
      "build": "vite build",
      "start": "vite preview --host",
      "preview": "vite preview"
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
      "react-router-dom": "^7.1.1"
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.3.4",
      vite: "^6.0.5",
      ...(isTS && {
        "@types/react": "^18.3.18",
        "@types/react-dom": "^18.3.5",
        typescript: "^5.7.2"
      }),
      ...(answers.styling === "Tailwind" && {
        tailwindcss: "^3.4.17",
        postcss: "^8.4.49",
        autoprefixer: "^10.4.20"
      })
    }
  }, null, 2));

  // Environment template for databases
  fs.writeFileSync(path.join(projectPath, ".env.example"), `# Add your environment variables here
# For Firebase, MongoDB, or other databases when needed

# Example Firebase config (optional):
# VITE_FIREBASE_API_KEY=your_api_key_here
# VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
# VITE_FIREBASE_PROJECT_ID=your-project-id

# Example database URL (optional):
# VITE_DATABASE_URL=your_database_url_here
`);

  // README with database instructions
  fs.writeFileSync(path.join(projectPath, "README.md"), `# ${projectName}

⚡ Lightning-fast Bini.js app with file-based API routes.

## 🚀 Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## 📦 Production 

\`\`\`bash
npm run build
npm run start  # Opens vite preview (super fast!)
\`\`\`

## 🌐 API Routes

File-based API routes (like Next.js):

\`\`\`
src/api/
├── hello.js       → /api/hello
├── users.js       → /api/users  
├── database-example.js → /api/database-example
└── posts/
    ├── index.js   → /api/posts
    └── [id].js    → /api/posts/123
\`\`\`

## 🗄️ Database Integration

**Ready for Firebase, MongoDB, or any database!**

When you need real database operations:

1. **Install your database package**:
   \`\`\`bash
   npm install firebase  # for Firebase
   # or
   npm install mongodb   # for MongoDB
   \`\`\`

2. **Add environment variables** to \`.env\`:
   \`\`\`env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   \`\`\`

3. **Update your API routes** - see \`src/api/database-example.js\` for reference

## 🎯 Features

- ⚡ Lightning-fast HMR with Vite
- 🔌 File-based API routes (like Next.js)
- 🗄️ Database-ready architecture
- 🎨 ${answers.styling} support
- 📱 Responsive design

**All API routes work in both development and production!**

Built with Bini.js v${BINIJS_VERSION}
`);

  console.log(`\n✅ Project created: ${projectName}`);
  console.log(`\n🚀 Get started:\n   cd ${projectName}\n   npm install\n   npm run dev`);
  console.log(`\n🌐 API routes available:\n   /api/hello\n   /api/users\n   /api/posts\n   /api/posts/1`);
  console.log(`\n🗄️  Database ready: Add Firebase/MongoDB when needed`);
  console.log(`\n⚡ Production preview:\n   npm run build\n   npm run start`);
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
