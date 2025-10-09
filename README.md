# ▲ Bini.js

**▲ Build lightning-fast, source-protected React apps — powered by Vite.**

Bini.js is **the first source-code-protected React framework** powered by **Vite**, designed for developers who demand **blazing speed, modern features, full SEO, and total source-code security**.

```
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██   ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝

            Developed By Binidu
```

---

## ✨ Features

* ⚡ **Blazing-fast Vite compilation** with native ES modules
* 🔒 **Full source-code protection** – compiled apps never expose source
* 🏷️ **Head-only SSR for SEO** – all meta tags pre-rendered for search engines
* 🔄 **Client-side routing** with React Router DOM
* 🎨 **Multiple styling options** – Tailwind CSS, CSS Modules, or None
* 💉 **Runtime code injection system** for dynamic scripts and styles
* 🔥 **Hot Module Replacement (HMR)** for instant updates
* 📘 **TypeScript support** (optional)
* 📱 **Fully responsive** for desktop, tablet, and mobile
* 🗄️ **Built-in API routes** ready for Firebase, MongoDB, or any database
* 🧩 **Head-only SEO Rendering** for Google, Bing, and social crawlers
* 🧠 **Metadata-Driven Architecture** to handle SEO logic in one place
* ▲ **Triangle Branding System** with automatic favicon and logo generation

---

## 🚀 Quick Start

Create a new Bini.js app interactively:

```bash
npx create-bini-app@latest my-bini-app
cd my-bini-app
npm install
```

🏃 Running the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app.

📦 Running Production

```bash
npm run build
npm start
```

The `.bini/dist/` folder contains your production-ready, source-code-protected application with SEO-friendly meta tags.

---

## 🗂️ Project Structure

```
my-bini-app/
├── src/
│   └── app/           # App directory
│       ├── layout.jsx/tsx    # Root layout with SEO meta tags
│       ├── page.jsx/tsx      # Home page component
│       └── globals.css       # Global styles
├── public/            # Static assets
│   ├── bini-logo.svg  # Bini.js light-blue triangle logo
│   └── favicon.svg    # Light-blue triangle favicon
├── .bini/             # Build outputs (source-protected)
│   └── internal/      # Runtime plugins and SSR system
├── bini.config.ts     # Bini.js framework configuration
├── bini-env.d.ts      # Environment type definitions
├── vite.config.js     # Vite config with Bini plugins
├── package.json
├── tailwind.config.js # If Tailwind selected
└── tsconfig.json      # If TypeScript enabled
```

---

## 🗺️ Head-Only SSR Diagram

```
[Server] --> Pre-renders <head> with all meta tags --> Sends to client
[Client] --> Hydrates UI dynamically in <body> (source code remains protected)
```

**Result:** Google crawlers see SEO content, users see UI, but raw source code stays hidden.

---

## 🖥️ Layout-First Architecture

All global configuration is centralized in `src/app/layout.jsx/tsx`:

```typescript
export const metadata = {
  title: 'My Custom Site',
  description: 'My custom description for SEO',
  keywords: 'custom,keywords,here',
  authors: [{ name: 'Site Owner' }],
  viewport: 'width=device-width, initial-scale=1.0',
};
```

Only the meta tags you define are rendered - no unnecessary defaults added.

---

## 📄 Adding Pages

```typescript
// src/app/about/page.tsx
export default function About() {
  return (
    <div>
      <h1>About Page</h1>
      <p>This is the about page</p>
    </div>
  );
}
```

---

## 🔌 API Routes

```javascript
// src/api/hello.js
export default function handler(req, res) {
  return {
    message: 'Hello from Bini.js API!',
    timestamp: new Date().toISOString()
  }
}
```

Access at: `/api/hello`

---

## 💉 Runtime Code Injection

```javascript
// Inject custom script
window.biniInjector.injectCode({ id: 'analytics', code: 'console.log("Analytics loaded")', type: 'script' });

// Inject custom style
window.biniInjector.injectCode({ id: 'theme', code: 'body { background: #f0f0f0; }', type: 'style' });

// Remove injection
window.biniInjector.removeInjection('analytics');
```

---

## 🎨 Styling Options

* Tailwind CSS (recommended)
* CSS Modules
* None (bring your own)

---

## 🛠️ Configuration

```typescript
export default defineConfig({
  outDir: '.bini',
  port: 3000,
  api: { dir: 'src/api', bodySizeLimit: '1mb' },
  static: { dir: 'public', maxAge: 3600 },
  build: { minify: true, sourcemap: true }
});
```

---

## 🧩 Environment Variables

```
VITE_APP_NAME="My Bini App"
VITE_APP_URL=http://localhost:3000
```

---

## 📝 Available Scripts

* `npm run dev` – Start development server
* `npm run build` – Build production app
* `npm start` – Preview production build
* `npm run preview` – Vite preview
* `npm run type-check` – TypeScript check
* `npm run lint` – Lint code

---

## ⚡ Performance, Security & SEO

* ⚡ Instant HMR and fast development
* 🔒 Fully source-code-protected
* 🧠 SEO optimized head-only SSR
* 🎨 Auto-generated light-blue triangle SVG logo
* 🧩 Pre-bundled dependencies for faster installs

---

## 🏗️ Use Cases

* SaaS dashboards
* Landing pages
* Blogs & content sites
* E-commerce sites
* Admin panels
* Modern SEO apps

---

## 🤝 Contributing

We welcome contributions! Submit issues and PRs.

---

## 📄 License

MIT License

Built with ❤️ using Bini.js | ▲ Fast • Secure • SEO-Friendly • Developer-Friendly

---

## 🆕 What's New in Bini.js

* ▲ Light-Blue Triangle Branding – Simple, clean, recognizable
* ▲ Source Code Protection – Hide your React components
* ▲ Head-Only SSR – SEO without exposing UI source
* ▲ Runtime Code Injection System
* ▲ Auto SVG Logos for consistent design

Start building **secure, fast, SEO-friendly applications** today! 🚀
