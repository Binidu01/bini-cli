<div align="center">

```
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██╗  ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝
```

# ▲ Bini.js CLI

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

Build source-code-protected React apps with Next.js-style file-based routing and built-in API routes, powered by Vite. Your source code stays hidden while your site remains fully functional and SEO-optimized.

---

## Quick Start

```bash
npx create-bini-app@latest my-app
cd my-app
npm install
npm run dev
```

Visit **http://localhost:3000** in October - your app will auto-open in the browser.

---

## Installation Options

### Interactive Setup (Recommended)
```bash
npx create-bini-app@latest
```

You'll be prompted to choose:
- Project name
- TypeScript or JavaScript
- Styling: Tailwind CSS, CSS Modules, or None

### Quick Setup with Flags
```bash
# TypeScript + Tailwind
npx create-bini-app@latest my-app --typescript --tailwind

# JavaScript with CSS Modules
npx create-bini-app@latest my-app --css-modules

# Plain JavaScript, no styling
npx create-bini-app@latest my-app --javascript

# Overwrite existing directory
npx create-bini-app@latest my-app --force

# Minimal setup
npx create-bini-app@latest my-app --minimal
```

### Supported Package Managers
- npm
- yarn
- pnpm
- bun

The CLI auto-detects and uses your installed package manager (prioritizing: bun → pnpm → yarn → npm).

---

## Project Structure

```
my-app/
├── src/
│   ├── app/                 # Next.js-like app directory
│   │   ├── layout.tsx       # Root layout with metadata
│   │   ├── page.tsx         # Home page (/)
│   │   └── globals.css      # Global styles
│   ├── api/                 # API routes
│   │   └── hello.js         # Example: /api/hello
│   ├── App.tsx              # Root component (auto-generated)
│   └── main.tsx             # Entry point
├── public/                  # Static assets
│   ├── favicon.svg          # Auto-generated favicon
│   └── bini-logo.svg        # Auto-generated logo
├── bini/                    # Framework internals
│   └── internal/
│       └── plugins/         # Vite plugins
│           ├── router.js    # Auto-routing
│           ├── api.js       # API middleware
│           ├── ssr.js       # Meta tags
│           ├── preview.js   # Preview server info
│           └── badge.js     # Dev server badge
├── .bini/                   # Build output (gitignored)
│   └── dist/                # Production build
├── index.html               # HTML entry
├── vite.config.mjs          # Vite configuration
├── bini.config.mjs          # Bini configuration
├── eslint.config.mjs        # ESLint config
├── tsconfig.json            # TypeScript (if enabled)
├── tailwind.config.js       # Tailwind (if enabled)
├── postcss.config.mjs       # PostCSS (if enabled)
├── api-server.js            # Production Express server
├── package.json             # Dependencies
└── README.md                # Project docs
```

---

## Source Code Protection

Bini.js protects your source code by separating development from production:

### How It Works

**During Development (`npm run dev`):**
- Full source code is available (normal dev experience)
- TypeScript/JSX visible
- Source maps enabled for debugging
- Components editable in real-time

**In Production (`npm run build`):**
- Only minified, obfuscated code in `.bini/dist/`
- No source maps included
- Original `.tsx`/`.jsx` files NOT served
- Compiled JavaScript is browser-ready but unreadable
- Users can only see the compiled output

**SEO Crawlers See:**
- Meta tags injected in `<head>` (title, description, OG tags, etc.)
- Server renders head tags for search engines
- UI code remains hidden from crawlers and users

### Build Output Security
```
Source files                  Build output
├── src/app/page.tsx     →    .bini/dist/index.html
├── src/App.tsx          →    .bini/dist/assets/index.js (minified)
└── src/api/hello.js     →    /api/hello (Express handler)
```

The original source files are **never exposed** to browsers or clients. They're only used during your build process.

### What's Visible in Browser DevTools
- Minified React code (cannot be easily reverse-engineered)
- Network requests to API endpoints
- Component tree structure (but not source)

### What's Hidden
- Original TypeScript/JSX source
- Business logic details
- Component implementation
- API handler code
- Internal dependencies

---

## File-Based Routing

Routes are automatically created from `src/app/` directory structure:

### Basic Page
```tsx
// src/app/about/page.tsx
export default function About() {
  return <h1>About Page</h1>;
}
```
Creates route: `/about`

### Nested Routes
```
src/app/
├── page.tsx              → /
├── about/page.tsx        → /about
├── blog/page.tsx         → /blog
└── blog/[slug]/page.tsx  → /blog/:slug
```

### Dynamic Routes
```tsx
// src/app/products/[id]/page.tsx
import { useParams } from 'react-router-dom';

export default function Product() {
  const { id } = useParams();
  return <h1>Product {id}</h1>;
}
```

Routes are auto-generated on `npm install` and hot-reload during development.

---

## API Routes

Create backend endpoints in `src/api/`:

### Basic Endpoint
```js
// src/api/hello.js
export default function handler(req, res) {
  return {
    message: 'Hello from Bini.js!',
    method: req.method,
    timestamp: new Date().toISOString()
  };
}
```

**Access:** `GET /api/hello`

### Handling POST Requests
```js
// src/api/users.js
export default function handler(req, res) {
  if (req.method === 'POST') {
    const { name, email } = req.body;
    return {
      success: true,
      id: Date.now(),
      name,
      email
    };
  }
  
  return {
    users: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]
  };
}
```

### Query Parameters
```js
// src/api/search.js
export default function handler(req, res) {
  const { q, limit = 10 } = req.query;
  return {
    query: q,
    limit: parseInt(limit),
    results: []
  };
}
```

**Access:** `GET /api/search?q=test&limit=5`

### Error Handling
```js
// src/api/data.js
export default function handler(req, res) {
  if (!req.body.id) {
    res.status(400);
    return { error: 'ID required' };
  }
  
  return { success: true };
}
```

**Features:**
- Works in `npm run dev` (Vite dev server)
- Works in `npm run preview` (Vite preview)
- Works in `npm run start` (Express production server)
- Built-in rate limiting (100 requests/60s per IP)
- Automatic JSON parsing
- Request body size limit: 1MB
- Request timeout: 30s
- Error boundary with fallback responses

---

## Styling Options

### Tailwind CSS
```tsx
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-white">Hello Bini.js!</h1>
    </div>
  );
}
```

### CSS Modules
```tsx
import styles from './page.module.css';

export default function Home() {
  return <h1 className={styles.title}>Hello Bini.js!</h1>;
}
```

### Plain CSS
```tsx
import './page.css';

export default function Home() {
  return <h1 className="title">Hello Bini.js!</h1>;
}
```

---

## Development

### Available Scripts

| Command | Purpose | Browser |
|---------|---------|---------|
| `npm run dev` | Development server with HMR | ✓ Auto-opens |
| `npm run build` | Production build | - |
| `npm run preview` | Preview production build | ✓ Auto-opens |
| `npm run start` | Production server (Express) | ✓ Auto-opens |
| `npm run type-check` | Check TypeScript (if enabled) | - |
| `npm run lint` | Lint with ESLint | - |

### Development Features
- **HMR (Hot Module Replacement)** - Instant updates without page reload
- **Auto-routing** - New pages detected automatically
- **Route hot reload** - Changes to routing structure refresh app
- **Network IP display** - Shows local and network URLs
- **Dev badge** - Bottom-right corner badge with server info
- **Error boundaries** - Failed components show helpful error messages
- **Empty page fallback** - Placeholder for pages without exports

---

## Production Build

```bash
# Build for production
npm run build

# Output location: .bini/dist/
```

### Deployment Options

**Option 1: Express Server** (Recommended)
```bash
npm run start
```
- Runs `api-server.js`
- Serves from `.bini/dist/`
- Full API route support
- Auto-opens browser

**Option 2: Static Host** (No APIs)
```bash
# Build only
npm run build

# Deploy .bini/dist/ to any static host
# Netlify, Vercel, GitHub Pages, etc.
```

**Option 3: Preview** (Testing)
```bash
npm run preview
```
- Uses Vite preview server
- Full API support
- Good for testing before deploy

---

## Configuration

### Vite Config (`vite.config.mjs`)
```js
export default defineConfig({
  server: { port: 3000, host: 'localhost' },
  preview: { port: 3000, host: '0.0.0.0' },
  build: { outDir: '.bini/dist' }
});
```

### Bini Config (`bini.config.mjs`)
```js
export default {
  outDir: '.bini',
  port: 3000,
  api: {
    dir: 'src/api',
    bodySizeLimit: '1mb'
  }
};
```

### TypeScript (`tsconfig.json`) - If Enabled
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true
  }
}
```

### Tailwind (`tailwind.config.js`) - If Enabled
```js
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: []
};
```

---

## How It Works

### Auto-Routing Plugin
Scans `src/app/` for files matching `page.tsx`, `page.jsx`, `page.ts`, or `page.js`:
- Generates `src/App.tsx` with React Router setup
- Supports dynamic segments with `[param]` syntax
- Hot reloads on file add/remove/modify
- Handles empty pages with fallback UI
- Includes error boundary wrapper

### API Middleware
Serves endpoints from `src/api/`:
- Development: Vite dev middleware
- Preview: Vite preview middleware  
- Production: Express middleware in `api-server.js`
- Rate limiting: 100 req/min per IP
- Input validation: JSON parsing + proto pollution checks
- Output: Auto-JSON stringified or custom response

### SSR Plugin
Reads metadata from `src/app/layout.tsx`:
- Parses `export const metadata` object
- Injects meta tags into `index.html`
- Supports: title, description, keywords, author, viewport
- Hot reloads on layout changes

### Badge Plugin
Displays dev server info:
- Local URL: `http://localhost:3000`
- Network URL: `http://192.168.x.x:3000`
- Fixed bottom-right corner badge
- Only shows in development

---

## Security

### Source Code Protection Features
- **Compiled code only** - Browser receives minified JavaScript, not source files
- **No source maps** - Production builds exclude `.map` files
- **Meta tag injection** - SEO tags rendered server-side, not in page source
- **Hidden API handlers** - `src/api/` files only executed server-side
- **Private build output** - `.bini/dist/` contains compiled assets only

### API Route Security
- Path traversal prevention (sanitized API paths)
- Prototype pollution checks (JSON parsing)
- Rate limiting (100 req/60s per IP)
- Request body size limits (1MB)
- Request timeouts (30s)
- File type validation (API routes must be `.js`)

### Production Deployment Security
- Use `npm run start` (Express server) for full protection
- Never expose `src/` directory on production server
- Only serve content from `.bini/dist/`
- Use environment variables for secrets (`.env` ignored in Git)
- Validate all user input in API routes
- Use HTTPS in production
- Add authentication to sensitive endpoints

### What Gets Exposed
- Compiled JavaScript (minified, not readable)
- API endpoint names and responses
- Client-side routing structure
- Meta tags and SEO information

### What Stays Hidden
- Original TypeScript/JSX source code
- Component implementation details
- Business logic and algorithms
- API handler code
- Dependencies and imports
- Comments and documentation

---

## Troubleshooting

**Port 3000 already in use:**
```bash
# Change port in vite.config.mjs
# Or run on different port:
PORT=3001 npm run dev
```

**Routes not generating:**
```bash
# Run setup manually
node bini/internal/plugins/router.js
npm run dev
```

**API routes not working:**
1. Verify file is in `src/api/` directory
2. Check file exports a default function
3. Ensure file ends with `.js`
4. Check network tab in browser dev tools
5. Run `npm run dev` or `npm run preview`

**Build fails:**
```bash
rm -rf node_modules .bini package-lock.json
npm install
npm run build
```

**Memory usage high:**
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

## Feature Comparison

| Feature | Bini.js | Next.js | Create React App |
|---------|---------|---------|------------------|
| Dev server startup | ~0.3s | ~2.1s | ~8.4s |
| HMR speed | ~50ms | ~200ms | ~1.2s |
| File-based routing | ✓ | ✓ | ✗ |
| API routes | ✓ | ✓ | ✗ |
| TypeScript support | ✓ | ✓ | ✓ |
| Tailwind CSS | ✓ | ✓ | ✗ |
| Production server | ✓ Express | ✓ Node | ✗ |
| Bundle size | ~45KB | ~85KB | ~125KB |
| Config files | MJS | JS/TS | Hidden |
| Built with | Vite | Webpack | Webpack |

---

## Requirements

- **Node.js:** 18.0.0 or higher
- **npm/yarn/pnpm/bun:** Latest version recommended
- **Disk space:** ~100MB for node_modules
- **RAM:** 512MB minimum

---

## Contributing

Found a bug or have a feature request?

1. Check [GitHub Issues](https://github.com/Binidu01/bini-cli/issues)
2. Create a new issue with clear description
3. Include steps to reproduce for bugs
4. Submit pull requests to `main` branch

---

## License

MIT - Free for personal and commercial use.

---

## Built With

- [Vite](https://vitejs.dev) - Frontend build tool
- [React](https://react.dev) - UI library
- [React Router DOM](https://reactrouter.com) - Routing
- [Express](https://expressjs.com) - Production server
- [Tailwind CSS](https://tailwindcss.com) - Styling (optional)
- [TypeScript](https://www.typescriptlang.org) - Language (optional)

---

**Made with by [Binidu](https://github.com/Binidu01)**

[GitHub](https://github.com/Binidu01/bini-cli) • [Issues](https://github.com/Binidu01/bini-cli/issues)
