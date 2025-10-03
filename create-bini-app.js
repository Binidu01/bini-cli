#!/usr/bin/env node

const inquirer = require("inquirer").default;
const fs = require("fs"); 
const path = require("path");
const os = require("os");
const { execSync } = require('child_process');

const BINIJS_VERSION = "1.0.3";

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
      message: "Enable Server-Side Rendering (SSR)? (conceptual)",
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
  mkdirRecursive(path.join(projectPath, "public"));
  mkdirRecursive(path.join(projectPath, "public", "dist"));

  // Create HTML template for webpack-dev-server
  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bini.js App</title>
    <style>
        body { margin: 0; padding: 0; }
        #root { min-height: 100vh; }
    </style>
</head>
<body>
    <div id="root"></div>
    <noscript>You need to enable JavaScript to run this app.</noscript>
</body>
</html>`;
  fs.writeFileSync(path.join(projectPath, "public", "index.html"), htmlTemplate);

  const ext = answers.typescript ? "tsx" : "jsx";
  const isTS = answers.typescript;

  // --- Webpack Entry Point (Client-side router) ---
  const routerFileContent = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './_app';
import Home from './pages/index';
import About from './pages/about';

const components = {
  '/': Home,
  '/about': About,
};

const Router = () => {
  const [route, setRoute] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const PageComponent = components[route] || (() => <div>404 - Page Not Found</div>);

  return <App Component={PageComponent} pageProps={{}} />;
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Router />);
`;
  fs.writeFileSync(path.join(srcPath, `index.${ext}`), routerFileContent);


// Generate index page
const indexPage = `${isTS
  ? "import React from 'react';\nimport Link from '../components/Link';\n"
  : "import React from 'react';\nimport Link from '../components/Link';\n"}
export default function Home() {
  return (
    <div className="max-w-4xl mx-auto p-10 mt-12 space-y-8 bg-white rounded-2xl shadow-lg">
      {/* Header Section */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-indigo-700 drop-shadow-sm">
          Welcome to Bini.js! 🚀
        </h1>
        <p className="text-lg text-gray-500">
          The SWC-powered React framework, built for speed and simplicity.
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
            Powered by <span className="font-medium">SWC</span> for blazing fast builds and refreshes.
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
            🎨 Styled by Default
          </h3>
          <p className="text-gray-600">
            ${answers.styling} fully configured — just start designing.
          </p>
        </div>
      </div>

      {/* Link Section */}
      <div className="pt-6 text-center">
        <Link
          href="/about"> About Page →
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
}

${answers.ssr && isTS ? `
export async function getServerSideProps() {
  // NOTE: This is conceptual. It would require a Node.js or other backend server.
  return {
    props: {
      timestamp: new Date().toISOString(),
    },
  };
}` : ''}`;

fs.writeFileSync(path.join(srcPath, "pages", `index.${ext}`), indexPage);


  // Generate about page
const aboutPage = `import React from 'react';
import Link from '../components/Link';

export default function About() {
  return (
    <div className="max-w-3xl mx-auto p-10 mt-12 space-y-8 bg-white rounded-2xl shadow-lg">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-indigo-700 drop-shadow-sm">
          About Bini.js
        </h1>
        <p className="text-lg text-gray-500">
          A modern React framework powered by SWC and built for developers.
        </p>
      </div>

      {/* Info Section */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-gray-700 leading-relaxed">
        <p>
          Bini.js combines the speed of SWC with the simplicity of React and
          Tailwind, giving developers a Next.js-like experience with even faster builds.
        </p>
        <p className="mt-3">
          From file-based routing to built-in styling support, Bini.js is designed to make
          app development effortless and modern.
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
          href="/"> ← Back to Home
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
fs.writeFileSync(path.join(srcPath, "pages", `about.${ext}`), aboutPage);


  // Generate Link component
  const linkComponent = `import React from 'react';

export default function Link({ href, children }${isTS ? ': { href: string; children: React.ReactNode }' : ''}) {
  const handleClick = (e${isTS ? ': React.MouseEvent' : ''}) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <a href={href} onClick={handleClick} className="link">
      {children}
    </a>
  );
}`;
  fs.writeFileSync(path.join(srcPath, "components", `Link.${ext}`), linkComponent);

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

.container {
  max-width: 900px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.9);
  padding: 2rem 3rem;
  border-radius: 1rem;
  box-shadow: 0 20px 60px rgba(0,0,0,0.1);
  backdrop-filter: blur(10px);
}

h1 {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 2.5rem 0;
}

.feature-card {
  padding: 1.5rem;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: all 0.2s ease-in-out;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.05);
  border-color: #667eea;
}

.feature-card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.links {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.link {
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
  /* FIX: Cleaned up spacing here to prevent "Unknown word" error */
  font-family: system-ui, sans-serif;
  background: #f0f0f5;
  min-height: 100vh;
}
#root { display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 2rem; }

/* Mimicking Tailwind classes used in components for basic layout */
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
}
`;

  fs.writeFileSync(path.join(srcPath, "styles", "globals.css"), globalStyles);

  // Generate _app file
  const appFile = `import React from 'react';
import './styles/globals.css';

export default function App({ Component, pageProps }${isTS ? ': { Component: React.ElementType, pageProps: any }' : ''}) {
  return (
    <>
      <Component {...pageProps} />
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
  fs.writeFileSync(path.join(srcPath, `_app.${ext}`), appFile);

  // TypeScript config
  if (isTS) {
    const tsConfig = {
      compilerOptions: {
        target: "es5",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        noFallthroughCasesInSwitch: true,
        module: "esnext",
        moduleResolution: "node",
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
      },
      include: ["src"],
      exclude: ["node_modules"],
    };
    fs.writeFileSync(path.join(projectPath, "tsconfig.json"), JSON.stringify(tsConfig, null, 2));
  }

  // Tailwind config
  if (answers.styling === "Tailwind") {
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};`;
    const postcssConfig = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`;
    fs.writeFileSync(path.join(projectPath, "tailwind.config.js"), tailwindConfig);
    fs.writeFileSync(path.join(projectPath, "postcss.config.js"), postcssConfig);
  }

  // --- Webpack CSS Loader Conditional Configuration ---
  const cssLoaderUse = answers.styling === "Tailwind"
    ? `[
          'style-loader', 
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              // Explicitly set config path for Tailwind to work
              postcssOptions: {
                config: __dirname, 
              },
            },
          }
        ]`
    : `[
          'style-loader', 
          {
            loader: 'css-loader',
            options: {
              // FIX: Explicitly set modules to false to allow global class names 
              // (which components rely on) to work when not using Tailwind.
              modules: false, 
            },
          },
        ]`;


  // --- UPDATED: Webpack Config ---
  const webpackConfig = `const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.${ext}',
  output: {
    path: path.resolve(__dirname, 'public/dist'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  mode: 'development',
  devtool: 'source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 3000,
    open: true,
    hot: true,
    historyApiFallback: true,
    compress: true,
    client: {
      logging: 'none',
    },
    devMiddleware: {
      writeToDisk: true,
    },
  },
  module: {
    rules: [
      {
        test: /\\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: ${isTS ? "'typescript'" : "'ecmascript'"},
                jsx: true,
                dynamicImport: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        },
      },
      {
        test: /\\.css$/,
        use: ${cssLoaderUse},
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
      inject: 'body',
    }),
  ],
  stats: 'errors-warnings' 
};`;
  fs.writeFileSync(path.join(projectPath, "webpack.config.js"), webpackConfig);


  // --- UPDATED: Package.json ---
  const packageJson = {
    name: projectName,
    version: "0.1.0",
    scripts: {
      dev: "node startDev.js", 
      build: "webpack --mode production",
      start: "webpack serve --mode production",
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
    },
    devDependencies: {
      ...(isTS && {
        "@types/react": "^18.3.12",
        "@types/react-dom": "^18.3.1",
        typescript: "^5.7.2",
      }),
      webpack: "^5.97.1",
      "webpack-cli": "^5.1.4",
      "webpack-dev-server": "^5.2.0",
      "html-webpack-plugin": "^5.6.3",
      "swc-loader": "^0.2.6",
      "@swc/core": "^1.10.1",
      "style-loader": "^4.0.0",
      "css-loader": "^7.1.2",
      ...(answers.styling === "Tailwind" && {
        tailwindcss: "^3.4.17",
        postcss: "^8.4.49",
        "postcss-loader": "^8.1.1",
        autoprefixer: "^10.4.20",
      }),
    },
  };

  fs.writeFileSync(path.join(projectPath, "package.json"), JSON.stringify(packageJson, null, 2));

  // --- New: startDev.js for Custom CLI Output ---
  const startDevScript = `const { exec } = require('child_process');
const os = require('os');

const BINIJS_VERSION = "${BINIJS_VERSION}";
const PORT = 3000;

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function startWebpack() {
  const localIp = getNetworkIp();
  
  // Custom CLI Output
  console.log(\`\n▲ Bini.js v\${BINIJS_VERSION}\`);
  console.log(\`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\`);
  console.log(\`  Local:    http://localhost:\${PORT}\`);
  console.log(\`  Network:  http://\${localIp}:\${PORT}\`);
  console.log(\`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\`);

  // Execute webpack serve. We use '--stats minimal' to suppress the default server output.
  const webpackProcess = exec('webpack serve --mode development --stats minimal');

  webpackProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  webpackProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  webpackProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(\`\nWebpack process exited with code \${code}\`);
    }
  });
}

startWebpack();
`;
  fs.writeFileSync(path.join(projectPath, "startDev.js"), startDevScript);


  // README - Updated
  const readme = `# ${projectName}

A Bini.js application - SWC-powered React framework

## ✨ Features

- ⚡ Lightning-fast SWC compilation
- 🔄 Client-side routing (file-based concept)
${answers.ssr ? '- 🖥️ Server-Side Rendering (Conceptual)' : ''}
- 🎨 ${answers.styling} styling
- 🔥 Hot Module Replacement (HMR)
${isTS ? '- 📘 TypeScript support' : ''}

## 🚀 Getting Started

1.  **Install dependencies:**
    \`\`\`bash
    npm install
    \`\`\`

2.  **Run the development server:**
    
    \`\`\`bash
    npm run dev
    \`\`\`
    This starts webpack-dev-server with hot reload and the custom CLI banner at [http://localhost:3000](http://localhost:3000)

## 📦 Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── pages/         # Page components (File-based routing)
│   ├── components/    # Reusable React components
│   ├── styles/        # Global styles
│   ├── index.${ext}       # Client-side router & entry point
│   └── _app.${ext}        # Main app shell
├── public/            # Static assets
│   └── index.html     # HTML template
├── startDev.js        # Custom script to run webpack and display CLI output
├── webpack.config.js  # Webpack configuration
└── package.json
\`\`\`

## 📝 Available Scripts

- \`npm run dev\` - Start webpack-dev-server with HMR and custom CLI output
- \`npm run build\` - Build for production
- \`npm start\` - Serve production build with webpack

## Learn More

Built with ❤️ using Bini.js v${BINIJS_VERSION}
`;

  fs.writeFileSync(path.join(projectPath, "README.md"), readme);

  console.log(`\n✅ Successfully created ${projectName}!`);
  console.log(`\n📦 Project includes:`);
  console.log(`    - Webpack Dev Server with HMR`);
  console.log(`    - Client-side routing`);
  console.log(`    - SWC for fast compilation`);
  if (answers.ssr) console.log(`    - Server-Side Rendering (Conceptual)`);
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
  generateProject(projectName, answers);
}

main();
