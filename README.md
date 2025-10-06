# 🌀 Bini.js

A **Vite-powered React framework** for building fast, modern web applications.

![npm](https://img.shields.io/npm/v/create-bini-app?style=for-the-badge&logo=npm&color=CB3837)
![npm](https://img.shields.io/npm/dm/create-bini-app?style=for-the-badge&logo=npm&label=downloads)
![JavaScript](https://img.shields.io/badge/JavaScript-f1e05a?style=for-the-badge&logo=javascript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

```
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██   ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝

             Developed By Binidu
```


## ✨ Features

* ⚡ **Lightning-fast Vite** compilation with native ES modules
* 🔄 **Client-side routing** with React Router DOM
* 🎨 **Multiple styling options** - Tailwind, CSS Modules, or None
* 💉 **Runtime code injection** system for dynamic updates
* 🔥 **Hot Module Replacement (HMR)** for instant updates
* 📘 **TypeScript support** (optional)
* 🖥️ **SSR-ready** configuration
* 📱 **Mobile-optimized** responsive design

## 🚀 Quick Start

Create a new Bini.js app interactively:

```bash
npx create-bini-app@latest my-bini-app
cd my-bini-app
npm install
```

## 🚀 Running the Development Server

Start the development server:

```bash
npm run dev
```

This starts the Vite development server with Bini.js at http://localhost:3000

## 📦 Project Structure

```
my-bini-app/
├── src/
│   ├── pages/         # Page components (Home, About, etc.)
│   ├── components/    # Reusable React components
│   ├── styles/        # Global styles and CSS
│   ├── injection/     # Runtime code injection system
│   ├── App.jsx/tsx    # Main app component with routing
│   └── main.jsx/tsx   # Application entry point
├── index.html         # Vite HTML template
├── vite.config.js     # Vite configuration
├── startDev.js        # Custom development script with Bini.js branding
└── package.json
```

## 💉 Code Injection System

### Bini.js includes a powerful runtime code injection system:

```bash

// Inject custom scripts at runtime
window.biniInjector.injectCode({
  id: 'custom-analytics',
  code: 'console.log("Analytics loaded!")',
  type: 'script'
});

// Inject custom styles
window.biniInjector.injectCode({
  id: 'custom-theme',
  code: 'body { background: #f0f0f0; }',
  type: 'style'
});

// Remove injections when needed
window.biniInjector.removeInjection('custom-analytics');
```

## 🎨 Styling Options

### Bini.js supports multiple styling approaches:

#### Tailwind CSS (Recommended) - Utility-first CSS framework

#### CSS Modules - Scoped CSS with modular imports

#### None - Bring your own styling solution

## 📝 Available Scripts

### npm run dev - Start development server with Bini.js branding

### npm run build - Build for production

### npm run preview - Preview production build

### npm run dev:vite - Start Vite directly (without Bini.js branding)

## ⚡ Performance Features

### Fast cold starts with global module caching

### Optimized builds with Vite's Rollup configuration

### Tree shaking for minimal bundle sizes

### Pre-bundled dependencies for faster installs

## 🔧 Configuration

### TypeScript

#### Opt-in TypeScript support with strict type checking and modern TSX.

### SSR Ready

#### Pre-configured for Server-Side Rendering when needed.

### Customizable

#### Modify vite.config.js to add plugins, configure aliases, or adjust build options.

## 🚀 Production Deployment

```bash
npm run build
```

### The built application will be in the dist/ folder, ready for deployment to any static hosting service.

## 🤝 Contributing

### We welcome contributions! Please feel free to submit issues and pull requests.

## 📄 License

### This project is licensed under the MIT License.

## Built with ❤️ using Bini.js v6.0.0
