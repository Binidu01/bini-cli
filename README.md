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

**Build full-stack React apps for web, desktop, and mobile — from one codebase.**

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
[![tauri](https://img.shields.io/badge/tauri-^2.11.4-FFC131?style=for-the-badge&logo=tauri&logoColor=black)](https://v2.tauri.app)

</div>

---

## Quick Start

```bash
npx create-bini-app@latest my-app
cd my-app
npm install
npm run dev
```

That's it — `http://localhost:3000` opens automatically.

---

## Why Bini.js

Most React starters give you a bundler and call it a day. Bini.js gives you a framework: file-based routing, a backend, environment handling, and a native app story, wired together and configured correctly from the first commit.

- **One codebase, every target.** The same routes, API handlers, and components compile to a web app, a desktop binary, or a mobile app. Nothing is emulated or wrapped — desktop and mobile builds are real Tauri apps.
- **Convention over configuration.** Drop a file in `src/app/`, get a route. Drop a file in `src/app/api/`, get an endpoint. No router config, no manual code splitting, no boilerplate.
- **Fast by default.** Vite + Rolldown for bundling, Oxlint + Oxfmt for linting and formatting — all Rust-based, all pre-configured.

---

## Features

**Framework**
- File-based routing with nested layouts, dynamic segments, and per-route metadata
- Automatic code splitting — every route is lazy-loaded with no `React.lazy()` boilerplate
- Auto-imports for common React, React Router, and env hooks — zero import statements needed

**Backend**
- API routes powered by [Hono](https://hono.dev) — plain functions or full Hono apps, colocated in `src/app/api/`
- One handler, every runtime: dev middleware, `bini-server`, or an edge function, generated automatically per deploy target
- Environment variable loading with startup banners, across Node.js, Bun, Deno, and edge runtimes

**Native**
- Desktop and mobile builds via Tauri — Windows, macOS, Linux, Android, and iOS from the same project
- Native plugin wiring generated automatically from the web APIs you actually call
- Code signing, bundle identifiers, and app icons handled at scaffold time

**Developer Experience**
- Animated dev overlay with Shiki-highlighted error panels and clickable stack frames
- TypeScript or JavaScript, Tailwind CSS v4, CSS Modules, or no styling — your choice at scaffold time
- Oxlint + Oxfmt — 50–100× faster than ESLint and Prettier, pre-configured out of the box

**Deployment**
- Static export with smart `404.html` fallback for any static host
- First-class support for Netlify Edge Functions, Vercel Edge, Cloudflare Workers, Node.js, and Deno

---

## Requirements

| | |
|---|---|
| Node.js | `>= 20.19.0` (required by Vite 8) |

---

## CLI

```bash
npx create-bini-app@latest              # interactive
npx create-bini-app@latest my-app       # skip the name prompt
npx create-bini-app@latest my-app --typescript --tailwind --platform macos
```

| Flag | Description |
|---|---|
| `--typescript` / `--javascript` | Language |
| `--tailwind` / `--css-modules` / `--none` | Styling |
| `--platform <target>` | `web` (default) · `windows` · `macos` · `linux` · `android` · `ios` |
| `--app-name <name>` | Display name — desktop/mobile app name and window title |
| `--sign` / `--nosign` | Auto-confirm or skip code-signing setup |
| `--npm` / `--pnpm` / `--yarn` / `--bun` | Force a package manager instead of auto-detecting |
| `--install` / `--no-install` | Install dependencies without prompting |
| `--force` | Overwrite an existing directory |
| `--version`, `-v` / `--help`, `-h` | Print version / show help |

In non-interactive environments (CI, no TTY), prompts are skipped and defaults apply: TypeScript, Tailwind, `web` platform. Flags always override the defaults.

---

## Project Structure

```
my-app/
├── src/
│   ├── app/
│   │   ├── api/                    ← API route handlers
│   │   │   └── hello.ts            → /api/hello
│   │   ├── layout.tsx              ← Root layout + metadata
│   │   ├── page.tsx                ← /
│   │   ├── not-found.tsx           ← Custom 404 (optional)
│   │   ├── loading.tsx             ← Custom loading screen (optional)
│   │   └── globals.css
│   ├── main.tsx                    ← Entry point
│   └── App.tsx                     ← Generated by bini-router — don't edit
├── public/
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── og-image.png
│   ├── logo.png                    ← Source icon for native app icons
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
| `dev` | Start the Vite dev server with HMR |
| `build` | Type-check, then bundle for production |
| `preview` | Preview the production build |
| `type-check` | `tsc --noEmit` |
| `lint` / `format` / `check` | Oxlint / Oxfmt / both + type-check |
| `export` *(web only)* | Static SPA export |
| `start` *(web only)* | Serve the production build via `bini-server` |
| `tauri:dev` / `tauri:build` *(desktop only)* | Run or build the desktop app |
| `android` / `android:build`, `ios` / `ios:build` *(mobile only)* | Run or build the mobile app |

Scripts are added per platform — a web scaffold never sees `tauri:dev`, and a desktop scaffold never sees `export`. See [Platforms](#platforms) for the full command and requirement breakdown per target.

---

## Routing

`bini-router` maps files in `src/app/` to URLs. No router config, no manual `React.lazy()` — every route is code-split automatically.

```
src/app/
  page.tsx                 → /
  about.tsx                → /about
  dashboard/
    layout.tsx              wraps /dashboard and its children
    page.tsx                → /dashboard
    [id]/page.tsx           → /dashboard/:id
  not-found.tsx             custom 404 (optional)
  loading.tsx                custom loading screen (optional)
```

```tsx
// src/app/dashboard/[id]/page.tsx — useParams is auto-imported, no import needed
export default function Dashboard() {
  const { id } = useParams();
  const [count, setCount] = useState(0);
  return <h1>Dashboard {id}: {count}</h1>;
}
```

Layouts — root and nested — render children through `<Outlet />`:

```tsx
// src/app/dashboard/layout.tsx
export default function DashboardLayout() {
  return (
    <div>
      <aside>Sidebar</aside>
      <main><Outlet /></main>
    </div>
  );
}
```

Export `metadata` from any layout to control `<title>`, Open Graph, Twitter cards, and icons. Root metadata is injected into `index.html` at build time; nested metadata updates `document.title` at runtime. It never ships to the client bundle.

```tsx
export const metadata = {
  title: 'Dashboard',
  description: 'Your personal dashboard',
  openGraph: { images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
};
```

> Layouts with an `<html>` tag, or without a default export, are excluded from the route chain automatically.

---

## API Routes

Files in `src/app/api/` become endpoints. Export a plain function or a Hono app — both work identically in dev, in production, and on every deploy target.

```ts
// src/app/api/hello.ts — plain handler
export default function handler(req: Request) {
  return Response.json({ message: 'hello', method: req.method });
}
```

```ts
// src/app/api/users/[id].ts — Hono app, dynamic segment
import { Hono } from 'hono';

const app = new Hono();
app.get('/users/:id', (c) => c.json({ id: c.req.param('id') }));

export default app;
```

`getEnv` and `requireEnv` are auto-imported for reading environment variables server-side — no `dotenv` setup needed.

**How it routes:** in dev, a Vite middleware matches `/api/*` against `src/app/api/` with HMR on every save. On build, matching Hono apps merge into one instance per deploy target (`netlify/edge-functions/api.ts`, `api/index.ts`, etc.); plain handlers are wrapped with `app.all()`. In packaged desktop/mobile apps, the same Hono instance runs in-memory — no server process, no code changes required.

---

## Environment Variables

`bini-env` loads `.env` files automatically and prints which ones are active on every dev/preview start, in priority order: `.env.local` → `.env.[mode].local` → `.env.[mode]` → `.env`.

```bash
# .env
BINI_PUBLIC_API_URL=https://api.example.com   # client-side: import.meta.env.BINI_*
SMTP_USER=user@smtp.example.com               # server-side: requireEnv() in API routes
```

```ts
import.meta.env.BINI_PUBLIC_API_URL             // client code
const user = requireEnv('SMTP_USER');           // API routes — throws if missing, auto-imported
```

> ⚠️ Never put secrets in `BINI_*` or `VITE_*` variables — both prefixes are exposed to the browser bundle.

---

## Production Server

*Web target only.* `bini-server` is a zero-dependency Node.js server — no Express, no Fastify — that serves `dist/`, proxies `/api/*` to your Hono handlers, and adds what `vite preview` doesn't: ETag/304 caching, graceful shutdown, body/handler timeouts, and automatic port fallback.

```bash
npm run build
npm start                 # PORT=8080 npm start to override the port
```

Override the default directories if needed: `BINI_API_DIR` (default `src/app/api`), `BINI_DIST_DIR` (default `dist`).

---

## Static Export

*Web target only.* `bini-export` pre-renders every static route to its own `index.html` and strips server-only files, producing a `dist/` that works on any static host.

```bash
npm run export             # vite build --mode export
```

Dynamic routes aren't pre-rendered — they resolve client-side via a generated `404.html`: a copy of `index.html` if you have a custom `not-found.tsx`, otherwise a redirect script that preserves the path through `sessionStorage`. Works out of the box on GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3 + CloudFront, Firebase Hosting, and Surge.

---

## Platforms

One codebase, six targets. `--platform` picks which one you scaffold; each gets exactly the dependencies, scripts, and config it needs — nothing more.

```bash
npx create-bini-app@latest my-app --platform macos
npx create-bini-app@latest my-app --platform android --app-name "My App" --nosign
```

### Web

**Overview** — the default target. A standard Vite + React SPA with file-based routing and a Hono API layer.

**Features**
- Zero-dependency production server (`bini-server`) and static export (`bini-export`)
- Deploy to Netlify Edge, Vercel Edge, Cloudflare Workers, Node.js, or Deno

**Commands**

| Command | Description |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm start` | Serve the production build |
| `npm run export` | Static export |

**Requirements** — Node.js `>= 20.19.0`. Nothing else.

---

### Windows

**Overview** — a native desktop binary running inside WebView2.

**Features**
- Filesystem, clipboard, notifications, and dialogs via `@tauri-apps/api`, auto-wired by `bini-native`
- Authenticode code signing, configurable at scaffold time or later

**Commands**

| Command | Description |
|---|---|
| `npm run tauri:dev` | Run in development mode |
| `npm run tauri:build` | Build a distributable binary |
| `npm run tauri:icon` | Regenerate icons from `public/logo.png` |

**Requirements**
- Microsoft C++ Build Tools ([download](https://visualstudio.microsoft.com/visual-cpp-build-tools/)) — install with "Desktop development with C++"
- Microsoft Edge WebView2 Runtime ([download](https://developer.microsoft.com/en-us/microsoft-edge/webview2/))

---

### macOS

**Overview** — a native desktop binary running inside WKWebView.

**Features**
- Same `@tauri-apps/api` access as Windows/Linux, auto-wired by `bini-native`
- Ad-hoc signing for local runs, or Developer ID + notarization for distribution

**Commands**

| Command | Description |
|---|---|
| `npm run tauri:dev` | Run in development mode |
| `npm run tauri:build` | Build a distributable binary |
| `npm run tauri:icon` | Regenerate icons from `public/logo.png` |

**Requirements**
- Xcode Command Line Tools — `xcode-select --install`
- [Homebrew](https://brew.sh), then `brew install gtk+3 webkit2gtk pkg-config`
- Full Xcode (Mac App Store) if you also plan to build for iOS

---

### Linux

**Overview** — a native desktop binary running inside WebKitGTK, distributed as an AppImage.

**Features**
- Same `@tauri-apps/api` access as Windows/macOS, auto-wired by `bini-native`
- GPG-signed AppImage output, configurable at scaffold time or later

**Commands**

| Command | Description |
|---|---|
| `npm run tauri:dev` | Run in development mode |
| `npm run tauri:build` | Build a distributable AppImage |
| `npm run tauri:icon` | Regenerate icons from `public/logo.png` |

**Requirements** — one of:

```bash
# Debian/Ubuntu
sudo apt install -y libwebkit2gtk-4.0-dev build-essential libssl-dev \
  libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev pkg-config

# Fedora
sudo dnf install webkit2gtk4.0-devel openssl-devel gtk3-devel \
  libappindicator-gtk3-devel librsvg2-devel libxdo-devel pkg-config

# Arch
sudo pacman -S webkit2gtk base-devel openssl gtk3 libappindicator-gtk3 librsvg libxdo pkg-config
```

---

### Android

**Overview** — a real native APK/AAB via Tauri's Android backend, not a WebView wrapper.

**Features**
- Camera, filesystem, notifications, and geolocation auto-wired by `bini-native`
- Back button, status bar, and splash screen configurable in `src-tauri/gen/android`
- Release signing (keystore + `keystore.properties`), configurable at scaffold time or later

**Commands**

| Command | Description |
|---|---|
| `npm run android` | Run on an emulator or connected device |
| `npm run android:build` | Build a release APK/AAB |

**Requirements**
- Java JDK 17 (`JAVA_HOME` set) — [download](https://adoptium.net/temurin/releases/)
- Android Studio, with SDK/Build Tools/NDK (`ANDROID_HOME` set) — [download](https://developer.android.com/studio)
- Rust targets: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`

---

### iOS

**Overview** — a real native app via Tauri's iOS backend, running inside WKWebView. macOS + Xcode required.

**Features**
- Same native plugin wiring story as Android
- Xcode-managed automatic signing for local runs; manual certificate/profile signing for CI

**Commands**

| Command | Description |
|---|---|
| `npm run ios` | Run on the Simulator or a connected device |
| `npm run ios:build` | Build the app |

**Requirements**
- Xcode (Mac App Store) + Command Line Tools — `xcode-select --install`
- CocoaPods — `sudo gem install cocoapods`
- Rust targets: `rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim`

**Notes** — iOS projects also get a bare `"tauri": "tauri"` script in `package.json`. Xcode's build phase calls it directly (`npm run tauri -- ios xcode-script ...`), bypassing the commands above — builds triggered from inside Xcode fail with `Missing script: "tauri"` without it. Don't rename or remove it.

---

## Developer Experience

**Dev overlay.** An animated status badge in the corner reflects loading/idle/error state live. On error, it expands into a Shiki-highlighted code frame with a clickable file link and filtered call stack. Disable with `DISABLE_BINI_OVERLAY=true npm run dev`.

**Auto-imports.** These are available in every file under `src/app/` with no import statement:

| From | Symbols |
|---|---|
| `react` | `useState` `useEffect` `useRef` `useMemo` `useCallback` `useContext` `createContext` `useReducer` `useId` `useTransition` `useDeferredValue` |
| `react-router-dom` | `Link` `NavLink` `useNavigate` `useParams` `useLocation` `useSearchParams` `Outlet` |
| `bini-env` | `getEnv` `requireEnv` |

A manual import of any of these is detected and injection is skipped — no duplicates.

**Linting & formatting.** Oxlint and Oxfmt ship pre-configured (`.oxlintrc.json`, `.oxfmtrc.json`) — Rust-based, 50–100× faster than ESLint/Prettier, no setup required.

```bash
npm run lint     # Oxlint
npm run format   # Oxfmt
npm run check    # both + type-check — CI-ready
```

---

## Deployment

**Netlify** is the default target — `vite build` generates `netlify/edge-functions/api.ts` automatically.

```toml
# netlify.toml
[build]
  command = "vite build"
  publish = "dist"

[[edge_functions]]
  path = "/api/*"
  function = "api"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

> Edge Functions run on Deno, not Node — packages depending on Node built-ins (`fs`, `nodemailer`) won't work there.

**Node.js** (Railway, Render, Fly.io, a VPS): `npm run build && npm start`. `bini-server` reads handlers directly from `src/app/api/`, so deploy the whole project — not just `dist/`. Use [pm2](https://pm2.keymetrics.io/) on a bare VPS.

**Other targets** — set `platform` once in `vite.config.ts`, and `vite build` generates the right entry file:

| Platform | Output |
|---|---|
| `netlify` | `netlify/edge-functions/api.ts` |
| `vercel` | `api/index.ts` |
| `cloudflare` | `worker.ts` |
| `deno` | `server/index.ts` |
| `node` | *(none — `bini-server` handles it)* |

> Vercel and Deno Deploy read their entry file **before** running your build — commit the generated file, don't rely on CI to produce it fresh.

**GitHub Pages / subpaths** — set `base: '/my-repo/'` in `vite.config.ts`, then `npm run export` for a fully pre-rendered, subpath-aware `dist/`.

---

## Packages

| Package | Role |
|---|---|
| [`bini-router`](https://npmjs.com/package/bini-router) | File-based routing, layouts, metadata, auto-imports, API routing, multi-platform deploy targets |
| [`bini-native`](https://npmjs.com/package/bini-native) | Automatic Tauri plugin wiring for desktop and mobile |
| [`@tauri-apps/cli`](https://v2.tauri.app) | Compiles the app to a native Windows/macOS/Linux/Android/iOS binary |
| [`bini-server`](https://npmjs.com/package/bini-server) | Zero-dependency production server *(web only)* |
| [`bini-export`](https://npmjs.com/package/bini-export) | Static SPA export *(web only)* |
| [`bini-overlay`](https://npmjs.com/package/bini-overlay) | Dev error overlay |
| [`bini-env`](https://npmjs.com/package/bini-env) | Environment variable loading |
| [`hono`](https://hono.dev) | API route runtime |
| [`vite`](https://vitejs.dev) | Dev server + Rolldown bundler |
| [`react`](https://react.dev) / [`react-router-dom`](https://reactrouter.com) | UI + routing |
| [`oxlint`](https://oxc.rs) / [`oxfmt`](https://oxc.rs) | Linting + formatting |

All packages install at `latest`.

---

## Resources

- [bini.js.org](https://bini.js.org) — documentation
- [GitHub](https://github.com/Binidu01/bini-cli) — source
- [npm](https://www.npmjs.com/package/create-bini-app) — package
- [Issues](https://github.com/Binidu01/bini-cli/issues) — bugs & feature requests

---

<div align="center">

MIT © [Binidu Ranasinghe](https://github.com/Binidu01)

</div>