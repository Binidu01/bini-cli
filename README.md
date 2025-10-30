# ß Bini.js CLI – Complete Production-Ready Documentation

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
  <a href="https://fastify.io"><img src="https://img.shields.io/badge/fastify-4.28-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="fastify" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/typescript-5.7.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" /></a>
</p>

</div>

---

## 🚀 What's New: Production-Ready & Bulletproof

### Critical Security Fixes (v9.1.2)

#### ✅ **Race Condition Protection**
- Async lock system prevents simultaneous route regeneration
- Queue-based request handling for concurrent file operations
- Debounced file watcher with 300ms delay
- Eliminates file corruption risks

#### ✅ **Enhanced Input Sanitization**
- Deep object traversal with circular reference detection
- Prototype pollution prevention (`__proto__`, `constructor`, `prototype`)
- Maximum nesting depth: 50 levels
- Maximum string length: 10,000 characters
- Automatic dangerous property filtering

#### ✅ **TTL-based Handler Cache**
- 5-minute cache expiration for API handlers
- Automatic memory cleanup on timeout
- Prevents memory leaks in long-running servers
- Configurable cache invalidation

#### ✅ **Build Validation**
- Mandatory build directory check before production start
- Validates `.bini/dist` existence and accessibility
- Helpful error messages with solution suggestions
- Prevents crashes from missing builds

#### ✅ **Path Safety & Traversal Prevention**
- All file paths validated before access
- Prevents directory traversal attacks
- Forbidden paths blocked (/, home, userprofile, cwd)
- Real path resolution for symlink detection

#### ✅ **Config File Integration**
- `bini.config.mjs` actually imported and used in Vite config
- Production server respects configuration settings
- HMR host/port customizable via environment variables
- Port fallback chain: env → config → default (3000)

---

## Overview

Build source-code-protected React apps with Next.js-style file-based routing and built-in API routes, powered by Vite and Fastify. Your source code stays hidden while your site remains fully functional and SEO-optimized.

**Key Differentiators:**
- 🔒 **Source Code Protection** – Compiled & minified production builds
- ⚡ **Fastify Production Server** – 2x faster than Express
- 🛡️ **Rate Limiting** – Built-in protection (100 req/15min per IP)
- 🔌 **API Routes Everywhere** – Work in dev, preview, AND production
- 🎯 **File-Based Routing** – Like Next.js, powered by Vite
- 📱 **PWA Ready** – Auto-generated favicons, manifests, social meta
- 🔐 **Security Hardened** – Helmet headers, CORS, sanitization, path validation

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
- **TypeScript** or **JavaScript**
- **Styling**: Tailwind CSS, CSS Modules, or vanilla CSS
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

# Skip automatic dependency installation
npx create-bini-app@latest my-app --skip-install

# Show detailed logs
npx create-bini-app@latest my-app --verbose
```

### Supported Package Managers
Bini.js automatically detects and uses your preferred package manager in priority order:
1. **bun** – Fastest bundler
2. **pnpm** – Space-efficient
3. **yarn** – Feature-rich
4. **npm** – Most compatible

---

## Project Architecture

```
my-app/
├── src/
│   ├── app/                         # File-based routing (Next.js-like)
│   │   ├── layout.tsx               # Root layout (metadata, SEO)
│   │   ├── page.tsx                 # Home page (/)
│   │   ├── about/page.tsx           # Static route (/about)
│   │   ├── blog/[slug]/page.tsx     # Dynamic route (/blog/:slug)
│   │   ├── api/                     # API routes (MOVED to src/api)
│   │   └── globals.css              # Global stylesheet + CSS variables
│   ├── api/                         # Server-side API routes (NEW location)
│   │   ├── hello.js                 # GET /api/hello
│   │   ├── users.js                 # POST /api/users
│   │   └── search/
│   │       └── query.js             # GET /api/search/query
│   ├── App.tsx                      # Root component (auto-generated)
│   └── main.tsx                     # Application entry point
├── public/                          # Static assets & auto-generated favicons
│   ├── favicon.svg                  # Rebranded ß icon (SVG)
│   ├── favicon.png                  # Main favicon (512×512)
│   ├── favicon-16x16.png            # 16px resolution
│   ├── favicon-32x32.png            # 32px resolution
│   ├── favicon-64x64.png            # 64px resolution
│   ├── favicon-180x180.png          # 180px for iOS
│   ├── favicon-512x512.png          # 512px for Android
│   ├── apple-touch-icon.png         # iOS home screen icon
│   ├── og-image.png                 # Social media preview (1200×630)
│   ├── bini-logo.svg                # Application logo
│   └── site.webmanifest             # PWA manifest
├── bini/
│   ├── internal/plugins/            # Framework runtime (DO NOT EDIT)
│   │   ├── router.js                # File-based routing + race condition fix
│   │   ├── api.js                   # API middleware + sanitization
│   │   ├── ssr.js                   # SSR meta tag injection
│   │   ├── badge.js                 # Dev console badge
│   │   └── preview.js               # Preview server config
│   └── bini.d.ts                    # TypeScript definitions
├── .bini/
│   ├── dist/                        # Production build (read-only)
│   └── cache/                       # Build cache
├── index.html                       # HTML template
├── vite.config.mjs                  # Vite config (imports bini.config.mjs)
├── bini.config.mjs                  # Bini.js configuration
├── api-server.js                    # ⚡ Fastify production server
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript (if enabled)
├── tailwind.config.js               # Tailwind CSS (if enabled)
├── .env.example                     # Environment variables template
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
├── blog/[slug]/page.tsx  → /blog/:slug
└── admin/[...id]/page.tsx → /admin/* (catch-all)
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
      <p>Dynamic content for {slug}</p>
    </article>
  );
}
```

Routes are automatically generated at startup and hot-reload during development. Race conditions are prevented by the async lock system.

---

## API Routes

### Defining Endpoints

API handlers are functions exported from `src/api/`:

```js
// src/api/hello.js
export default function handler(req, res) {
  return {
    message: 'API working',
    timestamp: new Date().toISOString(),
    method: req.method
  };
}
```

### Request Methods

```js
// src/api/users.js
export default function handler(req, res) {
  switch (req.method) {
    case 'GET':
      // Fetch all users
      return { users: [] };
    
    case 'POST':
      // Create new user
      const { name, email } = req.body;
      if (!name || !email) {
        res.status(400);
        return { error: 'Name and email required' };
      }
      return { id: Date.now(), name, email, created: true };
    
    case 'PUT':
      // Update user
      return { updated: true };
    
    case 'DELETE':
      // Delete user
      return { deleted: true };
    
    default:
      res.status(405);
      return { error: 'Method not allowed' };
  }
}
```

### Query Parameters & Sanitization

```js
// src/api/search.js
export default function handler(req, res) {
  try {
    const { q, limit = 10, offset = 0 } = req.query;
    
    // Input sanitized automatically
    // - Circular references detected
    // - Dangerous properties blocked
    // - Size limits enforced
    
    return {
      query: q,
      limit: parseInt(limit),
      offset: parseInt(offset),
      results: []
    };
  } catch (error) {
    res.status(400);
    return { error: 'Invalid input' };
  }
}
```

### Request/Response API

```js
export default function handler(req, res) {
  // Request Properties
  req.method          // 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'
  req.url             // Full request URL
  req.headers         // HTTP headers object
  req.body            // Parsed & sanitized JSON (POST/PUT/PATCH/DELETE)
  req.query           // Query parameters object (sanitized)
  req.ip              // Client IP address
  
  // Response Methods
  res.status(code)             // Set HTTP status code
  res.setHeader(name, value)   // Set response header
  res.json(data)               // Send JSON response
  res.send(data)               // Send response (auto-detects format)
  res.end(data)                // End response with optional data
  
  return data;  // Auto-serialized to JSON (preferred)
}
```

### API Route Specifications

| Feature | Details |
|---------|---------|
| **Request Timeout** | 30 seconds per request |
| **Body Size Limit** | 1MB default (configurable) |
| **Rate Limiting** | 100 requests per 15 minutes per IP |
| **Response Format** | Automatically JSON-serialized |
| **Security** | Path traversal prevention, prototype pollution checks, input sanitization |
| **Caching** | 5-minute TTL for handlers (prevents memory leaks) |
| **Availability** | Works in development, preview, AND production |
| **Performance** | 2x faster with Fastify vs Express |

### Rate Limiting Headers

All API responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1730396400
```

---

## SEO & Metadata

Define all SEO information in your root layout:

```tsx
// src/app/layout.tsx

export const metadata = {
  title: 'My Application',
  description: 'High-performance React application',
  keywords: ['react', 'bini', 'fastify', 'vite'],
  
  openGraph: {
    title: 'My Application',
    description: 'Experience fast, modern development',
    url: 'https://myapp.com',
    images: [{ 
      url: '/og-image.png', 
      width: 1200, 
      height: 630,
      alt: 'My Application Preview'
    }]
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'My Application',
    description: 'Fast React development',
    creator: '@yourhandle',
    images: ['/og-image.png']
  },
  
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }]
  },
  
  manifest: '/site.webmanifest'
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

All metadata is automatically injected into the HTML head with proper OpenGraph, Twitter Card, and favicon tags.

---

## Build & Deploy

### Development
```bash
npm run dev
```

**Features:**
- Hot Module Replacement (HMR) with sub-50ms updates
- Automatic file-based routing with race condition protection
- Live API route updates with handler caching
- Browser auto-opens at `http://localhost:3000`
- Full source maps for debugging
- Development console badge with routes and memory usage
- Network IP detection and display

### Preview Production Build
```bash
npm run preview
```

Preview the production build locally before deployment:
- Runs the optimized production bundle
- Uses Vite preview server
- Full API routes working via Vite middleware
- Browser auto-opens at `http://localhost:3000`
- Gzip compression enabled
- Source maps disabled (production mode)
- Validates build before starting

**Use Case:** Test production-level code before deploying to verify performance, styling, and API functionality.

### Production Build
```bash
npm run build
```

Creates optimized production bundle in `.bini/dist/`:
- ✅ Minified JavaScript (no source maps)
- ✅ Code splitting and tree-shaking
- ✅ CSS minification
- ✅ Asset optimization
- ✅ Source code protection enabled
- ✅ Build validation (validates output directory)
- ✅ Ready for deployment to any static host

### Production Server
```bash
npm run start
# or
npm start
```

Launches **Fastify production server** with:
- ✅ Static file serving from `.bini/dist/` (validated before start)
- ✅ Full API routes working at `/api/*`
- ✅ Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Rate limiting (100 req/15 min per IP with headers)
- ✅ Graceful shutdown handling (30-second timeout)
- ✅ Health checks (`/health`) and metrics (`/metrics` endpoints)
- ✅ Gzip & Brotli compression
- ✅ Auto-opens browser at `http://localhost:3000`
- ✅ Network IP detection and display
- ✅ 2x faster than Express with async/await support

**Key Differences:**
- `npm run preview` = Vite preview server (development-focused)
- `npm run start` = Fastify server (production-grade, requires prior build)

**Environment Variables (Production Server):**
```bash
PORT=3000                    # Server port (default: 3000)
NODE_ENV=production          # Environment mode
CORS_ENABLED=false           # Enable CORS (default: false)
RATE_LIMIT=100               # Requests per 15 min (default: 100)
SKIP_UPDATE_CHECK=true       # Skip CLI update check
```

---

## Configuration

### bini.config.mjs

Configure your application settings:

```javascript
export default {
  outDir: '.bini',           // Build output directory
  port: 3000,                // Development server port
  host: 'localhost',         // HMR host
  api: {
    dir: 'src/api',          // API routes directory
    bodySizeLimit: '1mb'     // Request body size limit
  },
  static: {
    dir: 'public',           // Static files directory
    maxAge: 3600             // Cache max-age in seconds
  },
  build: {
    minify: true,            // Minify output
    sourcemap: true          // Include source maps
  }
};
```

### Environment Variables

Create a `.env.local` file for environment-specific settings:

```env
VITE_APP_NAME=My Application
VITE_APP_URL=http://localhost:3000
VITE_API_BASE=/api

# Production
SKIP_UPDATE_CHECK=true
CORS_ENABLED=true
RATE_LIMIT=1000
NODE_ENV=production
PORT=3000
```

---

## Performance & Security

### Performance Features
- **Vite** – Sub-second module replacement
- **Fastify** – 2x faster than Express
- **Tree Shaking** – Unused code removed
- **Code Splitting** – Vendor code separated
- **Gzip Compression** – 70%+ reduction
- **Caching** – TTL-based handler caching
- **Minification** – All assets minified

### Security Features

| Feature | Details |
|---------|---------|
| **Path Validation** | All file paths validated, traversal attacks prevented |
| **Input Sanitization** | Deep object traversal, circular reference detection |
| **Prototype Pollution** | Dangerous properties blocked (`__proto__`, `constructor`) |
| **Rate Limiting** | 100 req/15min per IP (configurable) |
| **Helmet Headers** | CSP, HSTS, X-Frame-Options, etc. |
| **CORS Protection** | Optional CORS with whitelist support |
| **Graceful Shutdown** | 30-second timeout for active requests |
| **Race Condition Protection** | Async locks prevent simultaneous operations |
| **Memory Leak Prevention** | TTL-based cache with automatic cleanup |

---

## System Requirements

- **Node.js**: 18.0.0 or higher
- **Disk Space**: 150MB (node_modules + build)
- **RAM**: 512MB minimum (1GB recommended)
- **OS**: macOS, Linux, Windows (WSL2 recommended)

---

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Use different port
PORT=3001 npm start

# Kill process using port
npx kill-port 3000
```

### Build Directory Not Found
```bash
# Error: Build directory not found: .bini/dist

# Solution: Run build first
npm run build

# Then start production server
npm start
```

### API Routes Not Working
```bash
# Check API route location: src/api/

# Verify file structure:
# ✅ src/api/hello.js
# ❌ src/hello.js (wrong location)

# Default export required:
export default function handler(req, res) {
  return { message: 'Hello' };
}
```

### Memory Usage High
```bash
# Clear Node module cache
rm -rf node_modules package-lock.json
npm install

# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

## Changelog

### v9.1.2 (Production-Ready Release)
- ✅ **Race Condition Protection** – Async lock system for route generation
- ✅ **Enhanced Sanitization** – Deep object traversal, circular reference detection
- ✅ **TTL Cache System** – 5-minute handler cache with garbage collection
- ✅ **Build Validation** – Mandatory pre-flight checks before production start
- ✅ **Config Integration** – `bini.config.mjs` now used by Vite
- ✅ **Path Safety** – Comprehensive traversal attack prevention
- ✅ **Rate Limit Headers** – X-RateLimit-* headers on all responses
- ✅ **Security Headers** – Helmet + X-Powered-By + additional protections
- ✅ **Error Messages** – Better diagnostics for common issues

---

## License

MIT – Free for personal and commercial use.

---

**Bini.js** — Built with ❤️ using Vite, React, and Fastify

[GitHub](https://github.com/Binidu01/bini-cli) · [Documentation](https://bini.js.org) · [npm](https://npmjs.com/package/create-bini-app)
