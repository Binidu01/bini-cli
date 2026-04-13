<div align="center">

```
            XXXXXXXXXXXXXXXX               
         XXXXXXXXXXXXXXXXXXXXXz            
       YXXXXXXXXXXXXXXXXXXXXXXXX           
      vXXXXXXXXXXn    YXXXXXXXXXX          
      XXXXXXXXX        XXXXXXXXXX          
      XXXXXXXXX       XXXXXXXXXX           
      XXXXXXXXX  XXXXXXXXXXXXXX            
      XXXXXXXXX  XXXXXXXXXXXYz             
      XXXXXXXXX  XXXXXXXXXXXXXXXXY         
      XXXXXXXXX      YXXXXXXXXXXXXX        
      XXXXXXXXX          YXXXXXXXXX        
      XXXXXXXXX           XXXXXXXXXz       
      XXXXXXXXX  Xn     YXXXXXXXXXX        
      XXXXXXXXX  XXXXXXXXXXXXXXXXXX        
      XXXXXXXXX  XXXXXXXXXXXXXXXX          
      XXXXXXXXX  XXXXXXXXXXXXX             
```

### The Zero-Config React Framework for the Modern Web

[![npm version](https://img.shields.io/npm/v/create-bini-app?color=00CFFF&label=npm&style=for-the-badge)](https://www.npmjs.com/package/create-bini-app)
[![total downloads](https://img.shields.io/npm/dt/create-bini-app?color=764ba2&style=for-the-badge&label=downloads)](https://www.npmjs.com/package/create-bini-app)
[![license](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](https://github.com/Binidu01/bini-cli/blob/main/LICENSE)
[![node version](https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen?style=for-the-badge)](https://nodejs.org)

[![vite](https://img.shields.io/badge/vite-^8.0.8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![react](https://img.shields.io/badge/react-^19.2.5-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![typescript](https://img.shields.io/badge/typescript-^6.0.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![hono](https://img.shields.io/badge/hono-^4.12.12-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev)
[![tailwindcss](https://img.shields.io/badge/tailwindcss-^4.2.2-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![react-router](https://img.shields.io/badge/react--router-^7.14.0-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)](https://reactrouter.com)
</div>

---

## Quick Start

```bash
npx create-bini-app@latest my-app
cd my-app
npm install
npm run dev
```

Opens `http://localhost:3000` automatically.

---

## What You Get

Running `create-bini-app` scaffolds a complete, production-ready project with:

- **File-based routing** via `bini-router` — `page.tsx` files map to URLs, nested layouts, per-route metadata, and automatic code splitting
- **API routes** powered by Hono — plain function handlers or full Hono apps in `src/app/api/`
- **Zero-dependency production server** via `bini-server` — pure Node.js `http`, serves `dist/` with ETag/304 support and proxies `/api/*`
- **Static SPA export** via `bini-export` — pre-renders every static route, generates a smart `404.html`, and strips platform files for GitHub Pages, Netlify static, S3, and more
- **Dev overlay** via `bini-overlay` — animated Bini.js logo badge with stroke-drawing animation, full error panel with Shiki-highlighted code frames and call stacks
- **Environment variable system** via `bini-env` — displays active `.env` files on startup, works across Node.js, Bun, Deno, and edge runtimes
- **Auto-imports** — `useState`, `useEffect`, `Link`, `useNavigate`, `useParams`, `Outlet`, `getEnv`, `requireEnv`, and more available in every page and layout without writing a single import
- **Automatic favicons** — `favicon.ico`, `apple-touch-icon.png`, `og-image.png`, and `site.webmanifest` generated at scaffold time, zero manual setup
- **TypeScript or JavaScript** — your choice at scaffold time, auto-detected by `bini-router`
- **Tailwind CSS v4, CSS Modules, or plain CSS** — your choice at scaffold time
- **Deploy anywhere** — Netlify Edge Functions, Vercel Edge, Cloudflare Workers, Node.js, Deno
- **Oxlint + Oxfmt** — Rust-based linter and formatter, 50–100× faster than ESLint and Prettier
- **GitHub Codespaces support** — HMR polling and `0.0.0.0` host binding configured automatically via `CODESPACE_NAME`

---

## Requirements

- **Node.js** `>= 20.19.0` (Vite 8 requirement)

---

## CLI Usage

```bash
# Interactive — prompts for name and options
npx create-bini-app@latest

# Pass project name directly
npx create-bini-app@latest my-app

# Skip prompts with flags
npx create-bini-app@latest my-app --typescript --tailwind
npx create-bini-app@latest my-app --javascript --css-modules
npx create-bini-app@latest my-app --force         # overwrite existing directory
npx create-bini-app@latest my-app --install        # auto-install dependencies
npx create-bini-app@latest my-app --no-install     # skip dependency installation
```

| Flag | Description |
|---|---|
| `--typescript` | Use TypeScript |
| `--javascript` | Use JavaScript |
| `--tailwind` | Use Tailwind CSS v4 |
| `--css-modules` | Use CSS Modules |
| `--force` | Overwrite an existing directory |
| `--install` | Auto-install dependencies without prompting |
| `--no-install` | Skip dependency installation without prompting |
| `--version`, `-v` | Print CLI version |
| `--help`, `-h` | Show help |

> **Non-interactive mode** — when stdin/stdout is not a TTY (e.g. CI), the CLI skips all prompts and uses defaults: TypeScript and Tailwind CSS. Pass flags to override. Use `--install` or `--no-install` to control dependency installation without a prompt.

---

## Project Structure

```
my-app/
├── src/
│   ├── app/
│   │   ├── api/                    ← API route handlers
│   │   │   └── hello.ts            → /api/hello
│   │   ├── layout.tsx              ← Root layout + global metadata
│   │   ├── page.tsx                ← / (home page)
│   │   ├── not-found.tsx           ← Custom 404 page (optional)
│   │   ├── loading.tsx             ← Custom loading screen (optional)
│   │   └── globals.css
│   ├── main.tsx                    ← React entry point
│   └── App.tsx                     ← Auto-generated by bini-router — do not edit
├── public/
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── og-image.png
│   └── site.webmanifest
├── .oxlintrc.json
├── .oxfmtrc.json
├── vite.config.ts
└── package.json
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR (opens browser automatically) |
| `npm run build` | Type-check then bundle for production into `dist/` |
| `npm run export` | Static SPA export — pre-renders routes, generates `404.html`, strips platform files |
| `npm start` | Serve the production build via `bini-server` |
| `npm run preview` | Preview the production build via Vite |
| `npm run type-check` | TypeScript type check — `tsc --noEmit` (TS projects only) |
| `npm run lint` | Lint with Oxlint |
| `npm run format` | Format with Oxfmt |
| `npm run check` | Lint + format + type-check combined — ideal for CI |

---

## File-Based Routing

`bini-router` maps `page.tsx` (or `page.jsx`) files to URLs — pure SPA, no server required at runtime.

```
src/app/
  page.tsx                 → /
  about.tsx                → /about  (file-based, no folder needed)
  dashboard/
    layout.tsx             → wraps /dashboard and all children
    page.tsx               → /dashboard
    [id]/
      page.tsx             → /dashboard/:id
  blog/
    [slug]/
      page.tsx             → /blog/:slug
  not-found.tsx            → custom 404 (optional)
  loading.tsx              → custom loading screen (optional)
```

Every route is **automatically code-split** — no manual `React.lazy()` needed.

### Pages

```tsx
// No imports needed — useState, useEffect, and more are auto-injected
export default function Dashboard() {
  const [count, setCount] = useState(0);
  return <h1>Dashboard {count}</h1>;
}
```

### Dynamic Routes

```tsx
// src/app/blog/[slug]/page.tsx — useParams is auto-imported
export default function Post() {
  const { slug } = useParams();
  return <h1>Post: {slug}</h1>;
}
```

### Layouts

All layouts — root and nested — use `<Outlet />` from React Router.

```tsx
// src/app/layout.tsx — root layout
export const metadata = {
  title      : 'My App',
  description: 'Built with Bini.js',
}

export default function RootLayout() {
  return <Outlet />
}
```

```tsx
// src/app/dashboard/layout.tsx — nested layout (Outlet is auto-imported)
export default function DashboardLayout() {
  return (
    <div>
      <aside>Sidebar</aside>
      <main><Outlet /></main>
    </div>
  )
}
```

> **Note:** Layouts that contain an `<html>` tag are automatically excluded from the route chain. Layouts without a default export are also excluded.

### Custom Loading Screen

Create `src/app/loading.tsx` with a default export to replace the built-in spinner. Used as the Suspense fallback for every lazy-loaded route.

```tsx
// src/app/loading.tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500" />
    </div>
  );
}
```

If the file is empty or has no default export, the built-in spinner is used automatically.

### Custom 404

```tsx
// src/app/not-found.tsx — Link is auto-imported
export default function NotFound() {
  return (
    <div>
      <h1>404 — Page not found</h1>
      <Link to="/">Go home</Link>
    </div>
  );
}
```

### Metadata

Export `metadata` from any `layout.tsx`. Root layout metadata is injected into `index.html` at build time. Nested layout titles update `document.title` at runtime via an auto-injected `<TitleSetter>`. Metadata is **stripped from the browser bundle** — it never ships to the client.

```tsx
export const metadata = {
  title       : 'Dashboard',
  description : 'Your personal dashboard',
  viewport    : 'width=device-width, initial-scale=1.0',
  themeColor  : '#00CFFF',
  charset     : 'UTF-8',
  robots      : 'index, follow',
  manifest    : '/site.webmanifest',
  keywords    : ['react', 'vite', 'dashboard'],
  authors     : [{ name: 'Your Name', url: 'https://example.com' }],
  metadataBase: new URL('https://myapp.com'),
  openGraph: {
    title      : 'Dashboard',
    description: 'Your personal dashboard',
    url        : 'https://myapp.com/dashboard',
    type       : 'website',
    images     : [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card       : 'summary_large_image',
    title      : 'Dashboard',
    description: 'Your personal dashboard',
    creator    : '@yourhandle',
    images     : ['/og-image.png'],
  },
  icons: {
    icon    : [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: [{ url: '/favicon.png' }],
    apple   : [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}
```

---

## Auto-Imports

`bini-router` automatically injects imports into every page and layout file in `src/app/`. You never need to write import statements for these:

**From `react`:** `useState` `useEffect` `useRef` `useMemo` `useCallback` `useContext` `createContext` `useReducer` `useId` `useTransition` `useDeferredValue`

**From `react-router-dom`:** `Link` `NavLink` `useNavigate` `useParams` `useLocation` `useSearchParams` `Outlet`

**From `bini-env`:** `getEnv` `requireEnv`

If you already import from one of these packages manually, `bini-router` detects it and skips injection — no duplicates ever.

---

## API Routes

Create files in `src/app/api/`. Both **plain function handlers** and **Hono apps** are supported. The same files run in dev (Vite middleware), production (`bini-server`), and on Netlify Edge (auto-generated edge function). `getEnv` and `requireEnv` are auto-imported — no dotenv setup needed.

```
src/app/api/
  hello.ts           → /api/hello
  users.ts           → /api/users
  posts/
    index.ts         → /api/posts
    [id].ts          → /api/posts/:id
  [...catch].ts      → /api/* catch-all
```

### Plain Function Handler

```ts
// src/app/api/hello.ts
export default function handler(req: Request) {
  return Response.json({ message: 'hello', method: req.method });
}
```

### Hono App

```ts
// src/app/api/users.ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/users', (c) => c.json({ users: ['alice', 'bob'] }))

app.post('/users', async (c) => {
  const body = await c.req.json()
  return c.json({ created: body }, 201)
})

export default app
```

### Dynamic API Routes

```ts
// src/app/api/posts/[id].ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/posts/:id', (c) => c.json({ id: c.req.param('id') }))

export default app
```

### Environment Variables in API Routes

```ts
// src/app/api/email.ts — requireEnv and getEnv are auto-imported
import { Hono } from 'hono'
import nodemailer from 'nodemailer'

const app = new Hono()

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: requireEnv('SMTP_USER'), // throws at startup if missing
    pass: requireEnv('SMTP_PASS'),
  },
})

app.post('/email', async (c) => {
  const { to, subject, html } = await c.req.json()
  await transporter.sendMail({ from: requireEnv('FROM_EMAIL'), to, subject, html })
  return c.json({ ok: true })
})

export default app
```

### How API Routing Works

In **dev**, `bini-router` registers a Vite middleware that intercepts `/api/*` requests, scans `src/app/api/`, matches the route, and calls the handler — with hot module replacement on every save.

On **build**, `bini-router` auto-generates `netlify/edge-functions/api.ts`. Hono apps are detected by their import and merged via `app.route()` — a single shared Hono instance, no duplicate module loading. Plain function handlers are wrapped with `app.all()`.

---

## Environment Variables

`bini-env` handles all environment variable loading automatically. On every dev and preview server start, it displays which `.env` files are active:

```
  ß Bini.js (dev)

  ➜  Environments: .env.local, .env
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.10:3000/
```

**File resolution order** (highest priority first):
1. `.env.local`
2. `.env.[mode].local`
3. `.env.[mode]`
4. `.env`

```bash
# .env
BINI_PUBLIC_API_URL=https://api.example.com  # client-side — use import.meta.env.BINI_*
VITE_ANALYTICS_ID=UA-XXXX                    # client-side — use import.meta.env.VITE_*
SMTP_USER=user@smtp.example.com              # server-side — use requireEnv() in API routes
SMTP_PASS=your_password
FROM_EMAIL=App <noreply@example.com>
```

> ⚠️ **Never put secrets in `BINI_*` or `VITE_*` variables.** Anything with those prefixes is exposed to the browser bundle.

**In client code:**
```ts
import.meta.env.BINI_PUBLIC_API_URL
```

**In API routes (server-side only):**
```ts
// getEnv and requireEnv are auto-imported — no import statement needed
const user = requireEnv('SMTP_USER'); // throws if missing
const debug = getEnv('DEBUG_MODE');   // returns undefined if missing
```

---

## Production Server

`bini-server` is a **zero-dependency** production server — pure Node.js `http`, no Express, no Fastify.

```bash
npm run build   # vite build → dist/
npm start       # bini-server
```

**Terminal output:**
```
  ß Bini.js (production)

  ➜  Environments: .env
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.5:3000/
```

**Request flow:**
```
Request
  ├─ /api/*  →  src/app/api/ handlers  (Hono apps or plain functions)
  ├─ /*      →  stream static file from dist/  (ETag + cache headers)
  └─ /*      →  dist/index.html  (SPA fallback)
```

| Feature | `vite preview` | `bini-server` |
|---|---|---|
| Serves `dist/` | ✅ | ✅ |
| API routes | ✅ | ✅ |
| SPA fallback | ✅ | ✅ |
| Auto env loading | ✅ via bini-env | ✅ via bini-env |
| ETag / 304 support | ❌ | ✅ |
| Production use | ❌ not recommended | ✅ |
| Body timeout | ❌ | ✅ 30s |
| Body size limit | ❌ | ✅ 10 MB |
| Handler timeout | ❌ | ✅ 30s |
| Graceful shutdown | ❌ | ✅ |
| Port auto-increment | ❌ | ✅ |
| Zero dependencies | ✅ | ✅ |

**Override port** via environment variable:

```bash
PORT=8080 npm start
```

If the port is busy, `bini-server` automatically increments and warns:
```
  ⚠  Port 3000 is in use, using port 3001 instead.
```

**Override default directories** via env vars:
```bash
BINI_API_DIR=src/api   # default: src/app/api
BINI_DIST_DIR=build    # default: dist
```

---

## Static Export

`bini-export` pre-renders every static route and strips all platform server files, leaving `dist/` ready for any static host.

```bash
npm run export   # vite build --mode export
```

**Build log:**
```
  ß bini-export  static export mode

  ß bini-export  pre-rendering 4 route(s)
  ➜  /about → dist/about/index.html
  ➜  /dashboard → dist/dashboard/index.html
  ➜  /profile → dist/profile/index.html
  ➜  404.html ← redirect template dist/404.html
  ➜  removed netlify/edge-functions/api.ts

  ß bini-export  export complete — 1 file(s) removed
```

Dynamic routes (e.g. `/blog/:slug`) are not pre-rendered — they are handled client-side via the `404.html` redirect fallback.

### 404 Handling

| Situation | What gets generated |
|---|---|
| `src/app/not-found.tsx` exists | `404.html` is a copy of `index.html` — the host boots the SPA and React Router renders your custom page |
| No custom `not-found` | `404.html` uses a redirect script that saves the path to `sessionStorage` and redirects to `/`, where the SPA restores the URL via `history.replaceState` |

### Works on Any Static Host

| Host | Static routes | Dynamic routes |
|---|---|---|
| GitHub Pages | ✅ pre-rendered | ✅ via 404.html redirect |
| Netlify static | ✅ pre-rendered | ✅ via 404.html redirect |
| Vercel static | ✅ pre-rendered | ✅ via 404.html redirect |
| Cloudflare Pages | ✅ pre-rendered | ✅ via 404.html redirect |
| AWS S3 + CloudFront | ✅ pre-rendered | ✅ configure error page to 404.html |
| Firebase Hosting | ✅ pre-rendered | ✅ via 404.html redirect |
| Surge.sh | ✅ pre-rendered | ✅ via 404.html redirect |

---

## Dev Overlay

`bini-overlay` adds an animated Bini.js logo badge to the bottom-left corner during development. It has three states:

| State | Behaviour |
|---|---|
| Loading | Logo draws itself with a stroke animation on every page load and HMR update |
| Idle | Logo sits as a filled gradient icon |
| Error | Badge morphs into a red `1 Issue` / `3 Issues` pill — click to open the error panel |

**Error panel shows:**
- Error type — Runtime Error / Parse Error / Build Error / Type Error / Unhandled Rejection
- File link — detected file path shown as a clickable button that opens in your editor
- Code frame — surrounding lines fetched from disk with Shiki syntax highlighting and the error line highlighted
- Call stack — collapsible, with internal and `node_modules` frames filtered out
- Copy button — copies the full error message, file, code context, and stack to clipboard
- Navigation arrows — when multiple errors are queued

The panel closes automatically when an error is fixed and HMR fires. **Never appears in production builds.**

```bash
# Disable without touching config
DISABLE_BINI_OVERLAY=true npm run dev
```

---

## Linting & Formatting

Every scaffolded project comes pre-configured with **Oxlint** and **Oxfmt** — Rust-based tools that are 50–100× faster than ESLint and Prettier.

```bash
npm run lint     # Oxlint — react plugin enabled
npm run format   # Oxfmt  — Prettier-compatible formatter
npm run check    # lint + format + type-check combined (great for CI)
```

Configuration files are auto-generated at scaffold time:

```json
// .oxlintrc.json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react"],
  "env": { "browser": true, "es2022": true },
  "ignorePatterns": ["dist", "node_modules"]
}
```

```json
// .oxfmtrc.json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "es5",
  "sortImports": true,
  "sortTailwindcssClasses": true
}
```

You never need to restart the dev server when adding or removing routes — `bini-router` picks up new files, folders, and deletions automatically.

---

## Deployment

### Netlify (default)

Every Bini.js project is pre-configured for Netlify. Running `vite build` automatically generates `netlify/edge-functions/api.ts` — no extra setup needed.

```toml
# netlify.toml
[build]
  command = "vite build"
  publish = "dist"

[[edge_functions]]
  path     = "/api/*"
  function = "api"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

> Use `[[edge_functions]]` for the API — not `[[redirects]]`.

> ⚠️ Netlify Edge Functions run on the Deno runtime, not Node.js. Packages that depend on Node.js built-ins (e.g. `nodemailer`, `fs`, `path`) will not work. Use Web API alternatives instead.

### Node.js servers (Railway, Render, Fly.io, VPS)

```bash
npm run build
npm start
```

> ⚠️ `bini-server` runs your API handlers directly from `src/app/api/` — they are **not** compiled into `dist/`. Make sure your server has access to both `dist/` and `src/app/api/`. On Railway and Render this happens automatically. On a VPS, deploy your full project directory, not just `dist/`.

Railway and Render inject `PORT` automatically. Use [pm2](https://pm2.keymetrics.io/) on a VPS:

```bash
npm install -g pm2
pm2 start "npm start" --name my-app
pm2 save && pm2 startup
```

### Cloudflare Workers

```ts
// vite.config.ts
biniroute({ platform: 'cloudflare' })
```

```bash
vite build && npx wrangler deploy
```

### Other Platforms

`bini-router` supports `netlify` · `vercel` · `cloudflare` · `node` · `deno`. Set `platform` in `vite.config.ts` once — `vite build` generates the correct platform entry file automatically.

| Platform | Output file |
|---|---|
| `netlify` | `netlify/edge-functions/api.ts` |
| `vercel` | `api/index.ts` / `api/index.js` |
| `cloudflare` | `worker.ts` / `worker.js` |
| `node` | (none — handled by `bini-server`) |
| `deno` | `server/index.ts` / `server/index.js` |

> ⚠️ **Vercel** reads `api/` before the build step runs. You must commit the generated file before deploying:
> ```bash
> git add api/index.ts && git commit -m "chore: update vercel api entry" && git push
> ```

> ⚠️ **Deno Deploy** reads `server/` before the build step runs. You must commit the generated file before deploying:
> ```bash
> git add server/index.ts && git commit -m "chore: update deno server entry" && git push
> ```
> Deno Deploy does not run Node.js — use Web API or Deno-compatible alternatives in your API routes.

> Add `vercel.json`:
> ```json
> {
>   "rewrites": [
>     { "source": "/api/(.*)", "destination": "/api/index.ts" },
>     { "source": "/(.*)",     "destination": "/index.html" }
>   ]
> }
> ```

### GitHub Pages / Subpath Deployments

`bini-router` sets `basename={import.meta.env.BASE_URL ?? '/'}` on `<BrowserRouter>` automatically.

```ts
// vite.config.ts
export default defineConfig({
  base   : '/my-repo/',
  plugins: [react(), biniEnv(), biniroute()],
})
```

Then run `npm run export` to generate a fully pre-rendered `dist/` ready for GitHub Pages.

---

## Powered By

| Package | Version | Role |
|---|---|---|
| [`bini-router`](https://npmjs.com/package/bini-router) | `latest` | File-based routing, nested layouts, metadata, auto-imports, Hono API routes, HMR watcher, multi-platform deployment |
| [`bini-server`](https://npmjs.com/package/bini-server) | `latest` | Zero-dependency production server — ETag, timeouts, graceful shutdown |
| [`bini-overlay`](https://npmjs.com/package/bini-overlay) | `latest` | Dev animated logo badge + Shiki-highlighted error overlay |
| [`bini-env`](https://npmjs.com/package/bini-env) | `latest` | Environment variable system + dev/preview startup banner |
| [`bini-export`](https://npmjs.com/package/bini-export) | `latest` | Static SPA export — per-route pre-rendering, smart 404.html |
| [`hono`](https://hono.dev) | `latest` | API route handler runtime |
| [`vite`](https://vitejs.dev) | `latest` | Dev server and Rolldown-powered production bundler |
| [`react`](https://react.dev) | `latest` | UI library |
| [`react-router-dom`](https://reactrouter.com) | `latest` | Client-side routing |
| [`oxlint`](https://oxc.rs) | `latest` | Rust-based linter — 50–100× faster than ESLint |
| [`oxfmt`](https://oxc.rs) | `latest` | Rust-based formatter — Prettier-compatible |

---

## Resources

- **Website**: https://bini.js.org
- **GitHub**: https://github.com/Binidu01/bini-cli
- **npm**: https://www.npmjs.com/package/create-bini-app
- **Issues**: https://github.com/Binidu01/bini-cli/issues

---

<div align="center">

MIT © [Binidu Ranasinghe](https://github.com/Binidu01)

</div>