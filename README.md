# ß Bini.js CLI – Complete Documentation

<div align="center">

```
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██╗  ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝
```

### Build lightning-fast, source-protected React apps — powered by Vite

<p>
  <a href="https://www.npmjs.com/package/create-bini-app"><img src="https://img.shields.io/npm/v/create-bini-app?color=00CFFF&label=npm&style=for-the-badge" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/create-bini-app"><img src="https://img.shields.io/npm/dt/create-bini-app?color=764ba2&style=for-the-badge&label=downloads" alt="total downloads" /></a>
  <a href="https://github.com/Binidu01/bini-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="license" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=for-the-badge" alt="node version" /></a>
</p>

<p>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/vite-6.0.5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="vite" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/react-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="react" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/typescript-5.7.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/tailwind-3.4.17-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="tailwind" /></a>
  <a href="https://www.npmjs.com/package/create-bini-app"><img src="https://img.shields.io/npm/v/create-bini-app?label=bini.js&color=00CFFF&style=for-the-badge" alt="bini.js" /></a>
</p>

</div>

---

## What's New: Rebranded Logo

The Bini.js logo has been completely rebranded! The new ß (German capital eszett) icon represents the framework's precision and elegance. Auto-generated across multiple formats:

- **SVG favicon** for crisp display on all devices
- **PNG variants** (16×16, 32×32, 64×64, 180×180, 512×512) for different contexts
- **Open Graph image** (1200×630) for social media sharing
- **Apple Touch Icon** (180×180) for iOS home screens
- **Web manifest** integration for PWA support

All logos are generated automatically during project creation with the beautiful gradient blue-to-cyan color scheme (#00CFFF → #0077FF).

---

## Overview

Build source-code-protected React apps with Next.js-style file-based routing and built-in API routes, powered by Vite. Your source code stays hidden while your site remains fully functional and SEO-optimized.

---

## Getting Started

```bash
npx create-bini-app@latest my-app
cd my-app
npm install
npm run dev
```

Your browser opens automatically at `http://localhost:3000`.

---

## Installation

### Interactive Setup
```bash
npx create-bini-app@latest
```

Select your preferences:
- TypeScript or JavaScript
- Styling: Tailwind CSS, CSS Modules, or vanilla CSS
- Additional options via command-line flags

### Command-Line Setup
```bash
# Full-featured with TypeScript and Tailwind
npx create-bini-app@latest my-app --typescript --tailwind

# With CSS Modules
npx create-bini-app@latest my-app --css-modules

# JavaScript only
npx create-bini-app@latest my-app --javascript

# Override existing directory
npx create-bini-app@latest my-app --force
```

### Supported Package Managers
Bini.js automatically detects and uses your preferred package manager (bun → pnpm → yarn → npm).

---

## Project Architecture

```
my-app/
├── src/
│   ├── app/                         # File-based routing
│   │   ├── layout.tsx               # Root layout (metadata, SEO)
│   │   ├── page.tsx                 # Home page (/)
│   │   ├── about/page.tsx           # (/about)
│   │   ├── blog/[slug]/page.tsx     # Dynamic routes (/blog/:slug)
│   │   └── globals.css              # Global stylesheet
│   ├── api/                         # Server-side API routes
│   │   ├── hello.js                 # GET /api/hello
│   │   ├── users.js                 # POST /api/users
│   │   └── data/search.js           # GET /api/data/search
│   ├── App.tsx                      # Root component (auto-generated)
│   └── main.tsx                     # Application entry point
├── public/                          # Static assets & auto-generated favicons
│   ├── favicon.svg                  # NEW: Rebranded ß icon (SVG)
│   ├── favicon.png                  # Main favicon (PNG)
│   ├── favicon-16x16.png            # NEW: 16px resolution
│   ├── favicon-32x32.png            # NEW: 32px resolution
│   ├── favicon-64x64.png            # NEW: 64px resolution
│   ├── favicon-180x180.png          # NEW: 180px resolution
│   ├── favicon-512x512.png          # NEW: 512px resolution
│   ├── apple-touch-icon.png         # NEW: iOS home screen icon
│   ├── og-image.png                 # NEW: Social media preview (1200×630)
│   ├── bini-logo.svg                # NEW: Rebranded application logo
│   └── site.webmanifest             # NEW: PWA manifest
├── bini/internal/plugins/           # Framework runtime
│   ├── router.js                    # File-based routing engine
│   ├── api.js                       # API middleware
│   ├── ssr.js                       # Server-side meta tag rendering
│   ├── badge.js                     # Development console badge
│   └── preview.js                   # Preview server configuration
├── .bini/dist/                      # Production build output
├── index.html                       # HTML template
├── vite.config.mjs                  # Build configuration
├── bini.config.mjs                  # Application configuration
├── api-server.js                    # Fastify production server
├── package.json                     # Dependencies (with Fastify)
├── tsconfig.json                    # TypeScript (if enabled)
├── tailwind.config.js               # Tailwind CSS (if enabled)
└── README.md                        # Project documentation
```

---

## File-Based Routing

Pages are automatically discovered and routed based on file location:

```
src/app/
├── page.tsx              → /
├── about/page.tsx        → /about
├── blog/page.tsx         → /blog
└── blog/[slug]/page.tsx  → /blog/:slug
```

### Creating Routes

**Static Route:**
```tsx
// src/app/about/page.tsx
export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      <p>Company information here.</p>
    </div>
  );
}
```

**Dynamic Route:**
```tsx
// src/app/blog/[slug]/page.tsx
import { useParams } from 'react-router-dom';

export default function BlogPost() {
  const { slug } = useParams();
  
  return (
    <article>
      <h1>Post: {slug}</h1>
    </article>
  );
}
```

Routes are automatically generated at startup and hot-reload during development.

---

## API Routes

### Defining Endpoints

API handlers are functions exported from `src/api/`:

```js
// src/api/hello.js
export default function handler(req, res) {
  return {
    message: 'API working',
    timestamp: new Date().toISOString()
  };
}
```

**Request Methods:**
```js
// src/api/users.js
export default function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return { users: [] };
    
    case 'POST':
      const { name, email } = req.body;
      return { id: Date.now(), name, email };
    
    case 'PUT':
      return { updated: true };
    
    case 'DELETE':
      return { deleted: true };
    
    default:
      res.status(405);
      return { error: 'Method not allowed' };
  }
}
```

**Query Parameters:**
```js
// src/api/search.js
export default function handler(req, res) {
  const { q, limit = 10, offset = 0 } = req.query;
  
  return {
    query: q,
    limit: parseInt(limit),
    offset: parseInt(offset),
    results: []
  };
}
```

### Request/Response API

```js
export default function handler(req, res) {
  // Request Properties
  req.method          // 'GET', 'POST', 'PUT', 'DELETE', etc.
  req.url             // Full request URL
  req.headers         // HTTP headers object
  req.body            // Parsed JSON body (POST/PUT/PATCH/DELETE)
  req.query           // Query parameters object
  req.ip              // Client IP address
  
  // Response Methods
  res.status(code)             // Set HTTP status
  res.setHeader(name, value)   // Set response header
  res.json(data)               // Send JSON response
  res.send(data)               // Send response (auto-detects format)
  res.end(data)                // End response with optional data
  
  return data;  // Alternative: auto-serialized to JSON
}
```

### API Specifications

- Request Body Limit: 1MB
- Request Timeout: 30 seconds
- Rate Limiting: 100 requests per 15 minutes per IP
- Response Format: Automatically JSON-serialized
- Security: Path traversal prevention, prototype pollution checks
- Availability: Works in development, preview, and production

---

## SEO & Metadata

Define all SEO information in your root layout:

```tsx
// src/app/layout.tsx

export const metadata = {
  title: 'My Application',
  description: 'High-performance React application',
  keywords: ['react', 'bini', 'fastify'],
  
  openGraph: {
    title: 'My Application',
    description: 'Experience fast, modern development',
    url: 'https://myapp.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }]
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'My Application',
    images: ['/og-image.png']
  },
  
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>{/* Meta tags auto-injected */}</head>
      <body>{children}</body>
    </html>
  );
}
```

---

## Build & Deploy

### Development
```bash
npm run dev
```
Starts Vite development server with:
- Hot Module Replacement (HMR) with sub-50ms updates
- Automatic file-based routing
- Live API route updates
- Browser auto-opens at http://localhost:3000
- Full source maps for debugging

### Preview Production Build
```bash
npm run preview
```
Preview the production build locally before deployment:
- Runs the optimized production bundle
- Uses Vite preview server
- Full API routes working via Vite
- Browser auto-opens at http://localhost:3000
- Gzip compression enabled
- Source maps disabled (production mode)

Use this to test the production build before deploying to verify performance, styling, and functionality.

### Production Build
```bash
npm run build
```
Creates optimized production bundle in `.bini/dist/`:
- Minified JavaScript (no source maps)
- Code splitting and tree-shaking
- CSS minification
- Asset optimization
- Source code protection enabled
- Ready for deployment

### Production Server
```bash
npm run start
# or
npm start
```
Launches Fastify production server with:
- Static file serving from `.bini/dist/`
- Full API routes working (`/api/*`)
- Helmet security headers
- Rate limiting (100 req/15 min per IP)
- Graceful shutdown handling
- Health checks (`/health`) and metrics (`/metrics`)
- Gzip & Brotli compression
- Auto-opens browser at http://localhost:3000
- Network IP detection and display

**Key Difference:** `npm run start` uses the **Fastify production server** and requires a prior build. `npm run preview` uses Vite's preview server. Both auto-open your browser.

---

## System Requirements

- Node.js 18.0.0 or higher
- 150MB disk space (node_modules + build)
- 512MB RAM minimum

---

## License

MIT – Free for personal and commercial use.

---

**Bini.js** — Built with Vite, React, and Fastify

[GitHub](https://github.com/Binidu01/bini-cli) · [Documentation](https://bini.js.org) · [npm](https://npmjs.com/package/create-bini-app)
