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
      XXXXXXXXX          YXXXXXXXXXXX      
      XXXXXXXXX           XXXXXXXXXz       
      XXXXXXXXX  Xn     YXXXXXXXXXX        
      XXXXXXXXX  XXXXXXXXXXXXXXXXXX        
      XXXXXXXXX  XXXXXXXXXXXXXXXX          
      XXXXXXXXX  XXXXXXXXXXXXX             
```

**Build full-stack React apps for web, desktop, and mobile from one codebase.**

[![npm version](https://img.shields.io/npm/v/create-bini-app?color=00CFFF&label=npm&style=for-the-badge)](https://www.npmjs.com/package/create-bini-app)
[![total downloads](https://img.shields.io/npm/dt/create-bini-app?color=764ba2&style=for-the-badge&label=downloads)](https://www.npmjs.com/package/create-bini-app)
[![license](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](https://github.com/Binidu01/bini-cli/blob/main/LICENSE)
[![node version](https://img.shields.io/badge/node-%3E%3D20.19.0-brightgreen?style=for-the-badge)](https://nodejs.org)

[![reddit](https://img.shields.io/badge/reddit-r%2Fbinijs-FF4500?style=for-the-badge&logo=reddit&logoColor=white)](https://www.reddit.com/r/binijs/)
[![discord](https://img.shields.io/badge/discord-join%20us-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/invite/BVRMCxHQpw)
[![linkedin](https://img.shields.io/badge/linkedin-bini.js-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/showcase/bini-js/)

[![vite](https://img.shields.io/badge/vite-^8.0.8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![react](https://img.shields.io/badge/react-^19.2.5-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![typescript](https://img.shields.io/badge/typescript-^7.0.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
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
npm run dev
```

That's it - `http://localhost:3000` opens automatically. Dependencies are installed during scaffolding (pass `--no-install` to skip that and run `npm install` yourself), and a git repository is initialized unless you pass `--no-git` or the folder is already inside one.

---

## Why Bini.js

Most React starters give you a bundler and call it a day. Bini.js gives you a framework: file-based routing, a backend, environment handling, a native app story, and a deployment CLI, wired together and configured correctly from the first commit.

- **One codebase, every target.** The same routes, API handlers, and components compile to a web app, a desktop binary, or a mobile app. Nothing is emulated or wrapped - desktop and mobile builds are real Tauri apps.
- **Convention over configuration.** Drop a file in `src/app/`, get a route. Drop a file in `src/app/api/`, get an endpoint. No router config, no manual code splitting, no boilerplate.
- **Fast by default.** Vite + Rolldown for bundling, Oxlint + Oxfmt for linting and formatting - all Rust-based, all pre-configured.

---

## Features

**Framework**
- File-based routing with nested layouts, dynamic segments, and per-route metadata
- `.mdx` and `.md` content routes work out of the box alongside `.tsx`/`.jsx` - no extra setup
- Folder-scoped `loading.tsx`, `not-found.tsx`, and `error.tsx` - the nearest one up the folder tree wins, same mental model as layouts
- Automatic code splitting - every route is lazy-loaded with no `React.lazy()` boilerplate
- Auto-imports for common React, React Router, and env hooks - zero import statements needed

**Backend**
- API routes powered by [Hono](https://hono.dev) - plain functions or full Hono apps, colocated in `src/app/api/`
- One handler, every runtime: Vite dev middleware, `bini-server`, or a `bini-deploy`-generated edge function - no code changes required between them
- Environment variable loading with startup banners, across Node.js, Bun, Deno, and edge runtimes

**Native**
- Desktop (Windows, macOS, Linux), Android, and iOS builds via Tauri from the same project (all require a local Rust toolchain, since Tauri compiles a native Rust binary)
- Add or remove a desktop or mobile target on an existing project at any time with `create-bini-app add` and `create-bini-app remove`
- Native plugin wiring generated automatically from the web APIs you actually call
- Bundle identifier, app name, and app icons set up at scaffold time; code signing set up then or later with `create-bini-app sign`

**Developer Experience**
- Animated dev overlay with Shiki-highlighted error panels and clickable stack frames
- TypeScript or JavaScript, Tailwind CSS v4, CSS Modules, or no styling - your choice at scaffold time
- Oxlint + Oxfmt - 50-100x faster than ESLint and Prettier, pre-configured out of the box
- GitHub Codespaces support in the generated `vite.config` (binds to `0.0.0.0`, uses polling, and routes HMR over port 443)
- `@/` import alias pointing at `src/`
- Built-in maintenance commands: `doctor`, `clean`, and `upgrade`

**Deployment**
- `bini-deploy` - a bundled CLI (`npm run deploy`) that generates hosting config for your chosen platform and pushes the project to GitHub
- Static Site Generation via `bini-ssg` - every route, static or dynamic, is pre-rendered to static HTML at build time (see [Build & Static Site Generation](#build--static-site-generation))
- Hosting config generation for Netlify Edge Functions, Vercel, Cloudflare Workers, Node.js, and Deno

---

## Requirements

| | |
|---|---|
| Node.js | `>= 20.19.0` (required by Vite 8; the CLI checks this on startup) |

---

## CLI

```bash
npx create-bini-app@latest              # interactive
npx create-bini-app@latest my-app       # skip the name prompt
npx create-bini-app@latest my-app --typescript --tailwind --platform web,desktop
```

| Command | Description |
|---|---|
| `create-bini-app [name]` | Create a new project. Run with no arguments **inside** an existing Bini project, it offers to add a platform instead |
| `create-bini-app add <targets>` | Add desktop and/or mobile targets to an existing project |
| `create-bini-app remove <targets>` | Remove desktop and/or mobile targets from the project |
| `create-bini-app sign [targets]` | Set up or redo code signing |
| `create-bini-app --app-name [name]` | Inside a project: change the native app name. Prompts when no value is given |
| `create-bini-app --org [domain]` | Inside a project: change the bundle ID prefix. Prompts when no value is given |
| `create-bini-app doctor` | Check your machine for Tauri (runs `tauri info`) |
| `create-bini-app clean` | Delete build output (Vite and Tauri), keeps `node_modules` |
| `create-bini-app upgrade` | Update dependencies to the latest versions |

`add`, `remove`, `sign`, `doctor`, `clean`, and `upgrade` must be run inside a Bini.js project. The CLI looks for a `package.json` with `bini-router` in the current folder or up to five parent folders. `--platform <targets>` is accepted as an alias for listing targets after `add`, `remove`, and `sign`.

Project names may contain lowercase letters, numbers, hyphens, and dots (max 50 characters). They cannot start with `.` or `-`, cannot be `npm` or `node`, and cannot be a Windows reserved name such as `CON`, `NUL`, or `COM1`. The command names above are reserved.

| Flag | Description |
|---|---|
| `--typescript` | Use TypeScript (create) |
| `--javascript` / `--no-typescript` | Use JavaScript (create) |
| `--tailwind` / `--css-modules` / `--none` | Styling (create). Only one may be used |
| `--platform <targets>` | `web` (default) · `desktop` · `android` · `ios`. Comma-separated to pick several, e.g. `web,desktop,android`. `desktop` covers Windows, macOS, and Linux |
| `--app-name [name]` | App name (default: the project name in title case). It becomes the initial site `title` in `src/app/layout.tsx` and, for native targets, the Tauri `productName` and window title. **With no value, you are prompted for it.** Inside an existing project it renames the native app (see [Changing the app name or bundle ID](#changing-the-app-name-or-bundle-id)) |
| `--org [domain]` | Bundle ID prefix as a reverse domain, e.g. `com.acme` (default `com.bini`). Lowercase letters and numbers in dot-separated parts. **With no value, you are prompted for it.** Inside an existing project it changes the bundle identifier |
| `--sign` / `--nosign` | Auto-confirm (you are still prompted for details) or skip code-signing setup. With `--sign` on an already configured target, only the signing step runs. The two cannot be combined, and `--nosign` is rejected by the `sign` command |
| `--npm` / `--pnpm` / `--yarn` / `--bun` | Force a package manager instead of auto-detecting. Only one may be used |
| `--no-install` | Skip installing dependencies (they install automatically by default) |
| `--no-git` | Skip `git init` (create) |
| `--force` | Overwrite an existing directory (create) |
| `--yes`, `-y` | Skip the confirmation prompt (remove, and bundle ID changes) |
| `--version`, `-v` / `--help`, `-h` | Print version / show help |

`--typescript`/`--javascript`/`--tailwind`/`--css-modules`/`--none` are ignored (with a warning) in `add` mode, since an existing project keeps its settings.

### Interactive prompts

When run in a terminal, and when the matching flag is not given, create mode asks for: the project name, TypeScript or JavaScript, the styling solution, the platforms to include, and (only when a desktop or mobile target is picked) the organization used for the bundle identifier. iOS is shown as disabled on Windows and Linux.

`--app-name` and `--org` can also be given **without a value** to force their prompt. For example `create-bini-app my-app --platform android --app-name` asks for the app name while creating the project, and `add android --org` asks for the organization while adding. A bare flag is one that comes last, or is followed by another flag or a command name (`--app-name add android` works; `--app-name my-app` treats `my-app` as the value). Without a terminal, a bare flag falls back to the default with a warning.

In non-interactive environments (CI, no TTY), prompts are skipped and defaults apply: TypeScript, Tailwind, `web` platform, `com.bini` as the organization, and no code signing. Flags always override the defaults. A project name is required in non-interactive mode.

### Package manager detection

The package manager is picked in this order: your flag, the project's lockfile (`bun.lock`, `bun.lockb`, `yarn.lock`, `pnpm-lock.yaml`, `package-lock.json`), the tool that launched the CLI (`npx`, `pnpm dlx`, `bunx`), then whichever of bun, yarn, pnpm, npm is installed, in that order.

### Exit codes

Commands exit with `0` on success and `1` on a fatal error. Exit code `2` means the command finished but something needs your attention: a manual follow-up (for example a toolchain that must be fixed before `tauri android init` can run), signing that is still missing, or a failed update step. Cancelling with Ctrl+C exits with `130`.

### Adding a platform later

Every project works as a web app. Desktop or mobile targets can be added at any time from inside an existing project with the `add` command. Nothing is recreated, and `vite.config`, `src/main.tsx`, and `src/app/*` are never touched.

```bash
npx create-bini-app@latest add android             # one target
npx create-bini-app@latest add desktop android     # several at once (comma-separated also works)
npx create-bini-app@latest add android --sign      # set up code signing right away
```

The first native target adds `src-tauri/`, the native scripts, and the `@tauri-apps/api`, `@tauri-apps/cli`, `cross-env`, and `bini-native` packages. Existing scripts and versions in your `package.json` are never overwritten. Dependencies are installed afterwards unless you pass `--no-install`. All desktop operating systems share one `src-tauri/`, so adding `desktop` again only offers code signing. Re-running a command is safe: anything already configured is skipped.

Run `add` with no targets inside a project to pick from a list. Already added platforms are shown as checked and disabled. iOS is only offered on macOS; on Windows and Linux, `add ios` prints how to build it with `npm run deploy` instead. The app name comes from `--app-name` (or its prompt), or the project name in title case if you don't pass it. `src/app/layout.tsx` is not read. If a native target already exists, `--app-name` and `--org` are not applied by `add`; use the commands in [Changing the app name or bundle ID](#changing-the-app-name-or-bundle-id) instead.

When it finishes, `add` prints a summary of what was added or skipped, the signing status per target, any manual follow-ups, and the commands that apply.

Commit before you run it so you can review the diff with `git diff`; the CLI warns if your working tree is dirty.

Your project's `README.md` is written once, when the project is created, and it documents every platform. `add` and `remove` never edit it.

### Removing a platform

```bash
npx create-bini-app@latest remove android
npx create-bini-app@latest remove desktop android ios --yes   # remove everything native
```

`remove` lists what it will delete and asks for confirmation (skip with `--yes`; without a terminal, `--yes` is required). Android and iOS delete their generated folders (`src-tauri/gen/android`, `src-tauri/gen/apple`), and the scripts for that platform are removed from `package.json`. `desktop` shares `src-tauri/` with the mobile targets, so it can only be removed together with all of them. Removing everything deletes all of `src-tauri/` (including any Rust code you added), plus the native scripts and the Tauri packages (`@tauri-apps/api`, `@tauri-apps/cli`, `cross-env`, `bini-native`) from `package.json`. Scripts are removed only if you haven't changed them. `keystore.jks` and `.env.signing` are left in place. `web` cannot be removed.

### Changing the app name or bundle ID

The native app name and bundle identifier are set once, when Tauri is first set up, and live in `src-tauri/tauri.conf.json`. The `title` in `src/app/layout.tsx` is web-only and never changes them. To change them later, run from inside the project (with no subcommand and no `--platform`):

```bash
npx create-bini-app@latest --app-name                       # prompt for a new app name
npx create-bini-app@latest --org                            # prompt for a new bundle ID prefix
npx create-bini-app@latest --app-name "My App" --org com.acme   # apply directly, no prompts
```

- **`--app-name`** updates `productName` and the first window's `title`. For Android it also updates `app_name` in `strings.xml` when it can be found. The prompt's default is the current name.
- **`--org`** rebuilds the identifier as `<org>.<project>` (project name reduced to lowercase letters and numbers, for example `com.acme.myapp`). The prompt's default is the org parsed from the current identifier. The CLI warns that stores treat a new identifier as a different app and asks for confirmation (skip with `--yes`).
- The generated `src-tauri/gen/android` and `src-tauri/gen/apple` projects keep their old values (the iOS display name, and the bundle identifier on both). The CLI lists these as follow-ups; remove and re-add the platform to regenerate it (commit first), or edit it by hand.
- Prompts need an interactive terminal; in CI pass a value instead. The command does nothing if the project has no desktop or mobile target, and exits with code `2` when follow-ups remain.

### Maintenance commands

These also exist as scripts in every project (`npm run clean`, `npm run upgrade`), and `sign` and `doctor` as well once a native target is added.

- **`clean`** deletes `dist/`, `dist-ssr/`, and the generated Android and iOS build folders (`src-tauri/gen/android/app/build`, `src-tauri/gen/android/build`, `src-tauri/gen/android/.gradle`, `src-tauri/gen/apple/build`, `src-tauri/gen/apple/Externals`). If `src-tauri/target` exists, it also clears the Rust build cache with `cargo clean` (or deletes the folder if `cargo` is unavailable), so the next native build is slow. `node_modules` is kept.
- **`upgrade`** moves every registry dependency in `package.json` to its latest version with your package manager (`file:`, `link:`, `workspace:`, `portal:`, `patch:`, git, URL, and `npm:` specs are left alone), then runs `cargo update` if `src-tauri/` exists. It does not ask for confirmation, so commit first; the CLI warns if your working tree is dirty.
- **`doctor`** runs `tauri info` to check Rust, the platform toolchains, and versions. In a project without a native target it just tells you how to add one.

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
│   │   ├── not-found.tsx           ← Custom 404 (optional, folder-scoped)
│   │   ├── loading.tsx             ← Custom loading screen (optional, folder-scoped)
│   │   ├── error.tsx               ← Custom error boundary (optional, folder-scoped)
│   │   └── globals.css
│   ├── main.tsx                    ← Entry point + SSG render() export
│   └── App.tsx                     ← Generated by bini-router - don't edit
├── public/
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── og-image.png
│   ├── logo.png                    ← Source icon for native app icons
│   ├── bini.svg                    ← Logo used by the starter page
│   └── site.webmanifest
├── src-tauri/                      ← Native targets only (desktop / Android / iOS)
├── index.html
├── tsconfig.json                   ← TypeScript projects only
├── .oxlintrc.json
├── .oxfmtrc.json
├── .gitignore
├── README.md                       ← Project README covering every platform
├── vite.config.ts
└── package.json
```

`not-found.tsx`, `loading.tsx`, and `error.tsx` aren't scaffolded by default, but bini-router picks them up anywhere in `src/app/` if you add them - see [Routing](#routing). JavaScript projects use `.jsx`/`.js` and have no `tsconfig.json`. With CSS Modules, the starter page also gets `src/app/page.module.css`. With no styling (`--none`), the starter page styles live in `src/app/globals.css`. If an image in `public/` is missing from the CLI package, it is skipped with a warning.

---

## Scripts

| Command | Description |
|---|---|
| `dev` | Start the Vite dev server with HMR and open the browser (`vite --host --open`) |
| `build` | Type-check (TypeScript), build the client and SSR bundles, then pre-render every route to static HTML |
| `start` | Serve the production build via `bini-server` |
| `preview` | Preview the production build |
| `type-check` | `tsc --noEmit` (JavaScript projects print a notice instead) |
| `lint` / `format` / `check` | Oxlint / Oxfmt / both + type-check (`check` skips `tsc` in JavaScript projects) |
| `clean` | Delete build output and caches (see [Maintenance commands](#maintenance-commands)) |
| `upgrade` | Update every dependency to its latest version |
| `deploy` | Run `bini-deploy` - generate hosting config (web) and push to GitHub |
| `tauri:dev` / `tauri:build` / `tauri:icon` *(desktop)* | Run the desktop app, build it, or regenerate all icons from `public/logo.png` |
| `android` / `android:build` *(Android)* | Run or build the Android app |
| `ios` / `ios:build` *(iOS, macOS only)* | Run or build the iOS app |
| `sign` / `doctor` *(any native target)* | Set up code signing / check your machine for Tauri |
| `tauri` *(any native target)* | Pass-through to the Tauri CLI, e.g. `npm run tauri -- icon public/logo.png` |
| `dev:native` *(any native target)* | Plain `vite`, used by Tauri's `beforeDevCommand` so no browser tab opens |

`deploy` is present in every scaffold, regardless of platform - see [Deployment](#deployment) for what it does. See [Platforms](#platforms) for the command and requirement breakdown per target.

---

## Routing

`bini-router` maps files in `src/app/` to URLs. No router config, no manual `React.lazy()` - every route is code-split automatically.

```
src/app/
  page.tsx                 → /
  about.tsx                → /about
  about.mdx                → /about (MDX also works for pages/content routes)
  dashboard/
    layout.tsx              wraps /dashboard and its children
    page.tsx                → /dashboard
    [id]/page.tsx           → /dashboard/:id
  not-found.tsx             custom 404 (optional, folder-scoped)
  loading.tsx                custom loading screen (optional, folder-scoped)
  error.tsx                  custom error boundary (optional, folder-scoped)
```

```tsx
// src/app/dashboard/[id]/page.tsx - useParams is auto-imported, no import needed
export default function Dashboard() {
  const { id } = useParams();
  const [count, setCount] = useState(0);
  return <h1>Dashboard {id}: {count}</h1>;
}
```

Layouts - root and nested - render children through `<Outlet />`:

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

Export `metadata` from any layout to control `<title>`, Open Graph, Twitter cards, and icons. Root metadata is injected into `index.html` at build time; nested metadata updates `document.title` at runtime. It never ships to the client bundle. The scaffolded root layout sets `title` (plus the Open Graph and Twitter site names) to your app name. This is web-only: the desktop and mobile app name lives in `src-tauri/tauri.conf.json`. The scaffolded layout also adds a JSON-LD `WebSite` script.

```tsx
export const metadata = {
  applicationName: 'Bini.js',
  title: 'Dashboard',
  description: 'Your personal dashboard',
  openGraph: {
    siteName: 'Bini.js',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};
```

> Layouts with an `<html>` tag, or without a default export, are excluded from the route chain automatically. `layout.tsx`, `not-found.tsx`, `loading.tsx`, and `error.tsx` must be `.tsx`/`.jsx`/`.ts`/`.js` - MDX isn't supported for these, since they define app structure rather than content. `page` files and other flat/content routes support `.mdx`/`.md` in addition.

### Folder-scoped boundaries

`loading.tsx`, `not-found.tsx`, and `error.tsx` all use the same "nearest wins" resolution as layouts: a file in a subfolder only affects that subfolder, and shadows (without deleting) the same file in any ancestor folder. A route without a closer match falls through to the nearest ancestor that has one, all the way up to the root, and to a built-in default if nothing exists anywhere.

```tsx
// src/app/dashboard/error.tsx - only catches errors thrown inside /dashboard/*
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something broke in the dashboard</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## API Routes

Files in `src/app/api/` become endpoints. Export a plain function or a Hono app - both work identically in dev and in production. The scaffold includes `src/app/api/hello.ts` (a Hono app that answers any method at `/api/hello` with a message, timestamp, and the request method) as a starting point.

```ts
// src/app/api/hello.ts - plain handler
export default function handler(req: Request) {
  return Response.json({ message: 'hello', method: req.method });
}
```

```ts
// src/app/api/users/[id].ts - Hono app, dynamic segment
import { Hono } from 'hono';

const app = new Hono();
app.get('/users/:id', (c) => c.json({ id: c.req.param('id') }));

export default app;
```

`getEnv` and `requireEnv` are auto-imported for reading environment variables server-side - no `dotenv` setup needed.

**How it routes:** in dev and preview, a Vite middleware matches `/api/*` against `src/app/api/` with HMR on every save. In production on the `node` target, `bini-server` reads the same handlers directly at request time - no build step, no generated entry file. For other hosting targets, running `bini-deploy` (via `npm run deploy`) generates the platform-specific entry file that merges your Hono apps into one instance (`netlify/edge-functions/api.ts`, `api/index.ts`, etc.); plain handlers are wrapped automatically. In packaged desktop/mobile apps, `bini-native` serves `/api/*` in-process inside the app - no server process, no code changes required.

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
const user = requireEnv('SMTP_USER');           // API routes - throws if missing, auto-imported
```

The generated `vite.config` also reads `PORT` (default `3000`) for the dev and preview server port. Tauri's `devUrl` is fixed to `http://localhost:3000`, and native scripts fail instead of switching to another port, so leave `PORT` unset for desktop and mobile development.

> ⚠️ Never put secrets in `BINI_*` or `VITE_*` variables - both prefixes are exposed to the browser bundle.

---

## Production Server

*Web target only.* `bini-server` is a zero-dependency Node.js server - no Express, no Fastify - that serves `dist/`, proxies `/api/*` to your Hono handlers, and adds what `vite preview` doesn't: ETag/304 caching, graceful shutdown, body/handler timeouts, and automatic port fallback.

```bash
npm run build
npm start                 # PORT=8080 npm start to override the port
```

Override the default directories if needed: `BINI_API_DIR` (default `src/app/api`), `BINI_DIST_DIR` (default `dist`).

---

## Build & Static Site Generation

`npm run build` is one script for every target. For TypeScript projects it runs three steps:

```bash
tsc --noEmit && vite build && vite build --ssr src/main.tsx
```

The first `vite build` produces the client bundle, and the second builds the SSR bundle (`src/main.jsx` for JavaScript projects, and no `tsc` step). The `bini-ssg` plugin then pre-renders every route, **static and dynamic alike**, using the `render()` function exported from `src/main.tsx`. That function calls React 19's `renderToPipeableStream` directly against `AppRoutes` (from the generated `src/App.tsx`) with a `StaticRouter`, so the output is real server-rendered markup, not a client-only shell. The client then hydrates it with `hydrateRoot` on load - no extra fallback wiring or client-side redirect scripts required. There's no separate export command.

Build output goes to `dist/`, organized into `js/`, `css/`, `data/`, `assets/images/`, and `assets/fonts/`.

Desktop and mobile builds run the same script first (it is Tauri's `beforeBuildCommand`), so the packaged app ships the same pre-rendered HTML as the web.

---

## Platforms

One codebase, four targets: **web**, **desktop** (Windows, macOS, and Linux from one `src-tauri/`), **Android**, and **iOS**. `--platform` picks which ones you scaffold, and `add` brings in more later; each target gets exactly the dependencies, scripts, and config it needs - nothing more. Every target also gets a `deploy` script for `bini-deploy` - see [Deployment](#deployment).

```bash
npx create-bini-app@latest my-app --platform desktop
npx create-bini-app@latest my-app --platform web,android --app-name "My App" --nosign
npx create-bini-app@latest add desktop            # later, inside the project
```

When you add a native target, the CLI runs `tauri init` (frontend dist `../dist`, dev URL `http://localhost:3000`, before-dev command `dev:native`, before-build command `build`), then sets the product name, window title, and bundle identifier in `src-tauri/tauri.conf.json`. The identifier is `<org>.<project>` with the project name reduced to lowercase letters and numbers, for example `my-app` with `--org com.acme` becomes `com.acme.myapp` (a name starting with a digit gets an `app` prefix). Replace it with your own reverse-DNS id before publishing to an app store; `create-bini-app --org` does this for you. Icons are then generated from `public/logo.png`; if that file is missing, Tauri's default icons are kept.

Every Tauri script sets `TAURI=true`. That makes the dev server bind to `TAURI_DEV_HOST` (or `0.0.0.0`) on port 3000, matching Tauri's `devUrl`, and it fails instead of switching to another port. `bini-native` is loaded by `vite.config` only when `TAURI=true` (and not for the SSR build); it serves `/api/*` in-process, opens external links in the system browser, and wires Cargo, capabilities, and manifests for the web APIs you use. Run `npm run doctor` to check your machine, and see the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

### Web

**Overview** - the default target. A standard Vite + React app with file-based routing, pre-rendered pages, and a Hono API layer.

**Features**
- Zero-dependency production server (`bini-server`)
- `bini-deploy` generates hosting config for Netlify Edge, Vercel, Cloudflare Workers, Node.js, or Deno and pushes to GitHub

**Commands**

| Command | Description |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm start` | Serve the production build |
| `npm run build` | Type-check, build, and pre-render every route (static & dynamic) via SSG |
| `npm run preview` | Preview the production build |
| `npm run deploy` | Generate hosting config for your chosen platform and push to GitHub |

**Requirements** - Node.js `>= 20.19.0`. Nothing else.

---

### Desktop (Windows, macOS, Linux)

**Overview** - a native desktop binary. It runs inside WebView2 on Windows, WKWebView on macOS, and WebKitGTK on Linux (distributed as an AppImage). Bundles are not cross-compiled: build Windows bundles on Windows, macOS bundles on macOS, and Linux bundles on Linux. Use CI with a runner per OS to ship all three.

**Features**
- Filesystem, clipboard, notifications, and dialogs via `@tauri-apps/api`, auto-wired by `bini-native`
- Code signing per OS, set up for the system you run the CLI on (see [Code Signing](#code-signing))

**Commands**

| Command | Description |
|---|---|
| `npm run tauri:dev` | Run in development mode |
| `npm run tauri:build` | Build a distributable for the OS you are on |
| `npm run tauri:icon` | Regenerate icons from `public/logo.png` |
| `npm run deploy` | Push the project to GitHub via `bini-deploy` |

`deploy` does not build, sign, or package the app - run `tauri:build` first (and your notarization step on macOS), then `deploy` to push the source to GitHub.

**Requirements**

*Windows*
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain via `rustup`, MSVC toolchain as default) - Tauri compiles a native Rust binary under the hood
- Microsoft C++ Build Tools ([download](https://visualstudio.microsoft.com/visual-cpp-build-tools/)) - install with "Desktop development with C++"
- Microsoft Edge WebView2 Runtime ([download](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)) - only needed on older PCs; Windows 11 and recent Windows 10 updates ship it pre-installed

*macOS*
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain via `rustup`)
- Xcode Command Line Tools - `xcode-select --install`
- No Homebrew packages are needed for desktop builds, since macOS ships WKWebView
- Full Xcode (Mac App Store) if you also plan to build for iOS

*Linux*
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain via `rustup`)
- One of the following system dependency sets:

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf group install "c-development"
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
  libappindicator-gtk3-devel librsvg2-devel libxdo-devel

# Arch
sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl \
  appmenu-gtk-module libappindicator-gtk3 librsvg xdotool
```

---

### Android

**Overview** - a real native APK/AAB via Tauri's Android backend, not a WebView wrapper.

**Features**
- Camera, filesystem, notifications, and geolocation auto-wired by `bini-native`
- Back button, status bar, and splash screen configurable in `src-tauri/gen/android`
- Release signing (keystore + `keystore.properties`), configurable at scaffold time or later
- The Rust Android targets are added for you when `rustup` is installed

**Commands**

| Command | Description |
|---|---|
| `npm run android` | Run on an emulator or connected device |
| `npm run android:build` | Build a release APK/AAB |
| `npm run deploy` | Push the project to GitHub via `bini-deploy` |

`deploy` does not build a signed APK or submit to the Play Store - run `android:build` first, then `deploy` to push to GitHub. Store submission is manual. Commit the generated `src-tauri/gen/android` folder; only `keystore.properties`, `local.properties`, `.gradle/`, and build output are git-ignored.

**Requirements**
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain via `rustup`) - Tauri compiles a native Rust binary under the hood
- Java JDK 17 (`JAVA_HOME` set) - [download](https://adoptium.net/temurin/releases/)
- Android Studio, with SDK/Build Tools/NDK (`ANDROID_HOME` and `NDK_HOME` set) - [download](https://developer.android.com/studio)
- Rust targets: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android` (done automatically by the CLI if `rustup` is on your PATH)

If Android initialization fails, the CLI prints the exact `npm run tauri -- android init` command to run once the toolchain is fixed.

---

### iOS

**Overview** - a real native app via Tauri's iOS backend, running inside WKWebView. macOS + Xcode required.

**Features**
- Same native plugin wiring story as Android
- Xcode-managed automatic signing for local runs; manual certificate/profile signing for CI

**Commands**

| Command | Description |
|---|---|
| `npm run ios` | Run on the Simulator or a connected device (macOS only) |
| `npm run ios:build` | Build the app (macOS only) |
| `npm run deploy` | Push the project to GitHub via `bini-deploy` |

**Requirements**
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain via `rustup`) - Tauri compiles a native Rust binary under the hood
- Xcode (Mac App Store) + Command Line Tools - `xcode-select --install`
- CocoaPods - `brew install cocoapods` (or `sudo gem install cocoapods`)
- Rust targets: `rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim`

**Not on a Mac?** iOS is left out when you scaffold or `add` it on Windows or Linux, and the CLI says so. Develop on web or Android, then run `npm run deploy` and choose iOS: it sets up the GitHub Action and pushes to GitHub. Store submission remains a separate, manual step.

**Notes** - every native project has a bare `"tauri": "tauri"` script in `package.json`. Xcode's build phase calls it directly (`npm run tauri -- ios xcode-script ...`), bypassing the commands above - builds triggered from inside Xcode fail with `Missing script: "tauri"` without it. Don't rename or remove it.

---

## Code Signing

Signing is offered when you add a native target, and you can set it up or redo it any time:

```bash
npx create-bini-app@latest sign              # everything that applies on this machine
npx create-bini-app@latest sign android      # one target
```

`sign` only prompts for what applies here: desktop signs for the OS you run it on, Android is included once it has been added, and iOS appears only on macOS. It needs an interactive terminal and cannot be combined with `--nosign`. At scaffold time, signing is skipped with no prompts when you pass `--nosign` or when the terminal is non-interactive. Targets that are not yet signed make the command exit with code `2`.

| Target | What is set up | Where it lives |
|---|---|---|
| Windows | A free self-signed certificate (created with PowerShell, valid 3 years) or the thumbprint of one you already have. SHA-256 digest and a DigiCert timestamp URL are configured too | `certificateThumbprint`, `digestAlgorithm`, and `timestampUrl` in `src-tauri/tauri.conf.json` (no secret to protect) |
| macOS | Ad-hoc signing (`-`) for local testing, or an Apple Developer signing identity with optional notarization (App Store Connect API key, or Apple ID + app-specific password) | `signingIdentity` in `src-tauri/tauri.conf.json`; notarization credentials in `.env.signing` |
| Linux | A GPG key (RSA 4096, valid 3 years) for the AppImage, generated for you or one you already have. Requires `gpg` or `gpg2` | `SIGN`, `SIGN_KEY`, and `APPIMAGETOOL_SIGN_PASSPHRASE` in `.env.signing` |
| Android | A `keystore.jks` in the project root (generated with `keytool`, which ships with the JDK) and a `keystore.properties` file. The Gradle `signingConfigs` block is patched into `app/build.gradle.kts` for you | `src-tauri/gen/android/keystore.properties` |
| iOS | Automatic Xcode signing (nothing to configure), or a manual certificate (`.p12`) + provisioning profile (`.mobileprovision`) for CI, stored base64-encoded | `.env.signing` |

Secrets live in git-ignored files:

- `.env.signing` - load it before building with `set -a; source .env.signing; set +a`. Each platform only updates its own keys, so platforms can be set up at different times. The file is created with owner-only permissions.
- `keystore.jks` and `src-tauri/gen/android/keystore.properties` - the CLI adds `keystore.properties`, `*.jks`, and `*.keystore` to `.gitignore` when you set up Android signing. The Gradle signing config is committed and only activates when `keystore.properties` exists, so fresh clones and debug builds keep working. Back up `keystore.jks` and its password: every Play Store update must be signed with the same key.

Desktop signing covers only the OS you ran `sign` on. Sign the other systems in CI on their own runners. A self-signed Windows certificate still shows a SmartScreen warning to other people; use a certificate from a trusted authority for public releases.

---

## Developer Experience

**Dev overlay.** An animated status badge in the corner reflects loading/idle/error state live. On error, it expands into a Shiki-highlighted code frame with a clickable file link and filtered call stack. Disable with `DISABLE_BINI_OVERLAY=true npm run dev`.

**Auto-imports.** These are available in every file under `src/app/` (including `.mdx`/`.md`) with no import statement:

| From | Symbols |
|---|---|
| `react` | `useState` `useEffect` `useRef` `useMemo` `useCallback` `useContext` `createContext` `useReducer` `useId` `useTransition` `useDeferredValue` |
| `react-router-dom` | `Link` `NavLink` `useNavigate` `useParams` `useLocation` `useSearchParams` `Outlet` |
| `bini-env` | `getEnv` `requireEnv` |

A manual import of any of these is detected and injection is skipped - no duplicates.

**Linting & formatting.** Oxlint and Oxfmt ship pre-configured (`.oxlintrc.json`, `.oxfmtrc.json`) - Rust-based, 50-100x faster than ESLint/Prettier, no setup required.

```bash
npm run lint     # Oxlint
npm run format   # Oxfmt
npm run check    # both + type-check - CI-ready
```

---

## Deployment

`bini-deploy` is bundled into every scaffold and exposed as `npm run deploy`. What it does depends on the platform:

- **Web** - prompts for a hosting target (`node`, `netlify`, `vercel`, `cloudflare`, or `deno`), generates that platform's entry file and any hosting config (`netlify.toml`, `vercel.json`, `wrangler.toml`) directly in your project, then commits and pushes everything to the GitHub repository you specify.
- **Desktop / Android / iOS** - generates no hosting config (there's nothing to host). It commits and pushes the project to GitHub, and prints the manual next-step commands for that platform (clone, install, build). It does **not** build, sign, notarize, or submit anything to an app store - those remain separate, manual (or CI) steps. The one extra: choosing iOS from a non-Mac machine sets up the GitHub Action that builds the iOS app.

```bash
npm run deploy                                              # interactive
npx bini-deploy --platform web --hosting vercel --repo https://github.com/you/app --yes   # non-interactive
```

| Platform | File generated |
|---|---|
| `netlify` | `netlify/edge-functions/api.ts` + `netlify.toml` |
| `vercel` | `api/index.ts` + `vercel.json` |
| `cloudflare` | `worker.ts` + `wrangler.toml` |
| `deno` | `server/index.ts` |
| `node` | *(none - `bini-server` reads `src/app/api/` directly)* |

**Netlify example**, generated automatically by `bini-deploy` when you choose it:

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

> Edge Functions run on Deno, not Node - packages depending on Node built-ins (`fs`, `nodemailer`) won't work there.

**Node.js** (Railway, Render, Fly.io, a VPS): `npm run build && npm start`. `bini-server` reads handlers directly from `src/app/api/`, so deploy the whole project - not just `dist/`. Use [pm2](https://pm2.keymetrics.io/) on a bare VPS.

**GitHub Pages / subpaths** - set `base: '/my-repo/'` in `vite.config.ts`, then `npm run build` for a fully pre-rendered, subpath-aware `dist/`.

---

## Packages

| Package | Role |
|---|---|
| [`bini-router`](https://npmjs.com/package/bini-router) | File-based routing, layouts, MDX/Markdown pages, folder-scoped loading/not-found/error, metadata, auto-imports, dev/preview API routing |
| [`bini-ssg`](https://npmjs.com/package/bini-ssg) | Pre-renders every route - static and dynamic - to static HTML as part of `npm run build` |
| [`bini-deploy`](https://npmjs.com/package/bini-deploy) | Generates hosting config for web targets and pushes the project to GitHub, for every platform |
| [`bini-native`](https://npmjs.com/package/bini-native) | Tauri plugin wiring, in-process `/api`, and external-link handling for desktop and mobile |
| [`@tauri-apps/cli`](https://v2.tauri.app) | Compiles the app to a native Windows/macOS/Linux/Android/iOS binary |
| [`bini-server`](https://npmjs.com/package/bini-server) | Zero-dependency production server |
| [`bini-overlay`](https://npmjs.com/package/bini-overlay) | Dev error overlay |
| [`bini-env`](https://npmjs.com/package/bini-env) | Environment variable loading |
| [`hono`](https://hono.dev) | API route runtime |
| [`vite`](https://vitejs.dev) | Dev server + Rolldown bundler |
| [`typescript`](https://www.typescriptlang.org) | Type checking |
| [`react`](https://react.dev) / [`react-router-dom`](https://reactrouter.com) | UI + routing |
| [`oxlint`](https://oxc.rs) / [`oxfmt`](https://oxc.rs) | Linting + formatting |

---

## Community & Resources

- [bini.js.org](https://bini.js.org) - documentation
- [Discord](https://discord.com/invite/BVRMCxHQpw) - chat with the community
- [Reddit](https://www.reddit.com/r/binijs/) - r/binijs
- [LinkedIn](https://www.linkedin.com/showcase/bini-js/) - project updates and showcase
- [GitHub](https://github.com/Binidu01/bini-cli) - source
- [npm](https://www.npmjs.com/package/create-bini-app) - package
- [Issues](https://github.com/Binidu01/bini-cli/issues) - bugs & feature requests

---

<div align="center">

MIT © [Binidu Ranasinghe](https://github.com/Binidu01)

</div>