#!/usr/bin/env node

const inquirer = require("inquirer");
const fs = require("fs"); // <<< THE FIX IS HERE (removed '= require')
const path = require("path");
const os = require("os");
const { execSync } = require('child_process');

const BINIJS_VERSION = "1.0.3";

const LOGO = `
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██   ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝

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
  const indexPage = `${isTS ? "import React from 'react';\nimport Link from '../components/Link';\n" : "import React from 'react';\nimport Link from '../components/Link';\n"}
export default function Home() {
  return (
    <div className="container">
      <h1>Welcome to Bini.js! 🚀</h1>
      <p>The SWC-powered React framework</p>
      
      <div className="features">
        <div className="feature-card">
          <h3>⚡ Lightning Fast</h3>
          <p>SWC compilation</p>
        </div>
        <div className="feature-card">
          <h3>🔄 File-based Routing</h3>
          <p>Automatic routing from your pages directory</p>
        </div>
        <div className="feature-card">
          <h3>🎨 Styled by Default</h3>
          <p>${answers.styling} support built-in</p>
        </div>
      </div>

      <div className="links">
        <Link href="/about">About Page →</Link>
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
    <div className="container">
      <h1>About Bini.js</h1>
      <p>A modern React framework</p>
      <Link href="/">← Back to Home</Link>
      <div style={{marginTop: '2rem', padding: '1rem', border: '1px solid #ccc'}}>
        Current styling mode: ${answers.styling}
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
  // NOTE: Indentation is now strictly controlled using standard spaces to avoid PostCSS error.
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
    : `/* Global Styles */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; padding: 2rem; }
.container { max-width: 900px; margin: 0 auto; }
h1 { font-size: 2.5rem; margin-bottom: 1rem; }
.link { color: #0070f3; text-decoration: none; }`;

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
          'css-loader'
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
  console.log(\`  Local:    http://localhost:\${PORT}\`);
  console.log(\`  Network:  http://\${localIp}:\${PORT}\`);
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

1.  **Install dependencies:**
    \`\`\`bash
    npm install
    \`\`\`

2.  **Run the development server:**
    
    \`\`\`bash
    npm run dev
    \`\`\`
    This starts webpack-dev-server with hot reload and the custom CLI banner at [http://localhost:3000](http://localhost:3000)

## 📦 Project Structure

\`\`\`
${projectName}/
├── src/
│   ├── pages/         # Page components (File-based routing)
│   ├── components/    # Reusable React components
│   ├── styles/        # Global styles
│   ├── index.${ext}      # Client-side router & entry point
│   └── _app.${ext}       # Main app shell
├── public/            # Static assets
│   └── index.html     # HTML template
├── startDev.js        # Custom script to run webpack and display CLI output
├── webpack.config.js  # Webpack configuration
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
  console.log(`   - Webpack Dev Server with HMR`);
  console.log(`   - Client-side routing`);
  console.log(`   - SWC for fast compilation`);
  if (answers.ssr) console.log(`   - Server-Side Rendering (Conceptual)`);
  if (answers.features !== "None") console.log(`   - ${answers.features}`);
  console.log(`   - ${answers.styling} styling`);
  console.log(`\n🚀 Next steps:`);
  console.log(`   cd ${projectName}`);
  console.log(`   npm install`);
  console.log(`   npm run dev`);
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