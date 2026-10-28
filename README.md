<!-- markdownlint-disable MD033 MD041 -->
<div align="center">

<img src="https://skills.syvixor.com/api/icons?i=binijs" alt="Bini.js" width="120" height="120" />

<h1>Bini.js</h1>

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

That's it - `http://localhost:3000` opens automatically. Dependencies are installed during scaffolding (pass `--no-install` to skip that and run `npm install` yourself), and a git repository is initialized unless you pass `--no-git`, `git` is not installed, or the folder is already inside a repository.

---

## Why Bini.js

Most React starters give you a bundler and call it a day. Bini.js gives you a framework: file-based routing, a backend, environment handling, a native app story, and a deployment CLI, wired together and configured correctly from the first commit.

- **One codebase, every target.** The same routes, API handlers, and components compile to a web app, a desktop binary, or a mobile app. Nothing is emulated or wrapped - desktop and mobile builds are real Tauri apps.
- **Convention over configuration.** Drop a file in `src/app/`, get a route. Drop a file in `src/app/api/`, get an endpoint. No router config, no manual code splitting, no boilerplate.
- **Fast by default.** Vite + Rolldown for bundling, Oxlint + Oxfmt for linting and formatting - all Rust-based, all pre-configured.

---

## Features

### Framework

- File-based routing with nested layouts, dynamic segments, and per-route metadata
- `.mdx` and `.md` content routes work out of the box alongside `.tsx`/`.jsx` - no extra setup
- Folder-scoped `loading.tsx`, `not-found.tsx`, and `error.tsx` - the nearest one up the folder tree wins, same mental model as layouts
- Automatic code splitting - every route is lazy-loaded with no `React.lazy()` boilerplate
- Auto-imports for common React, React Router, and env hooks - zero import statements needed

### Backend

- API routes powered by [Hono](https://hono.dev) - plain functions or full Hono apps, colocated in `src/app/api/`
- One handler, every runtime: Vite dev middleware, `bini-server`, or a `bini-deploy`-generated edge function - no code changes required between them
- Environment variable loading with startup banners, across Node.js, Bun, Deno, and edge runtimes

### Native

- Desktop (Windows, macOS, Linux), Android, and iOS builds via Tauri from the same project (all require a local Rust toolchain, since Tauri compiles a native Rust binary)
- Add or remove a desktop or mobile target on an existing project at any time with `create-bini-app add` and `create-bini-app remove`
- Native plugin wiring generated automatically from the web APIs you actually call
- A preflight check of your toolchain (Rust, WebView2 / webkit2gtk / Xcode, JDK, Android SDK and NDK) before any native target is created or added
- Bundle identifier, app name, and app icons set up at scaffold time; code signing for Windows, macOS, Linux, Android, and iOS set up then or later with `create-bini-app sign`, interactively or (everywhere except Linux) with a single command and no prompts, either on this machine or only for GitHub Actions (`--ci-only`)
- Build every native target on GitHub Actions with `npm run deploy`, from any OS (no Mac needed for iOS)

### Developer tooling

- Animated dev overlay with Shiki-highlighted error panels and clickable stack frames
- TypeScript or JavaScript, Tailwind CSS v4, CSS Modules, or no styling - your choice at scaffold time
- Oxlint + Oxfmt - 50-100x faster than ESLint and Prettier, pre-configured out of the box
- GitHub Codespaces support in the generated `vite.config` (binds to `0.0.0.0`, uses polling, and routes HMR over port 443)
- `@/` import alias pointing at `src/`
- Built-in maintenance commands: `doctor`, `clean`, and `upgrade`
- Every prompt can be skipped with a flag, and `--yes` accepts every default

### Shipping

- `bini-deploy` - a bundled CLI (`npm run deploy`) that generates hosting config for web targets, or GitHub Actions build workflows for desktop and mobile targets, and pushes the project to GitHub
- Static Site Generation via `bini-ssg` - every route, static or dynamic, is pre-rendered to static HTML at build time (see [Build & Static Site Generation](#build--static-site-generation))
- Hosting config generation for Netlify Edge Functions, Vercel, Cloudflare Workers, Node.js, and Deno

---

## Requirements

| Requirement | Details |
| --- | --- |
| Node.js | `>= 20.19.0` (required by Vite 8; the CLI checks this on startup and exits if it is older) |

---

## CLI

```bash
npx create-bini-app@latest              # interactive
npx create-bini-app@latest my-app       # skip the name prompt
npx create-bini-app@latest my-app --typescript --tailwind --platform web,desktop
npx create-bini-app@latest my-app --yes --typescript --tailwind --platform web,android --org com.acme   # no prompts at all
```

| Command | Description |
| --- | --- |
| `create-bini-app [name]` | Create a new project. Run with no arguments **inside** an existing Bini project, it offers to add a platform instead |
| `create-bini-app add [targets]` | Add desktop and/or mobile targets to an existing project. With no targets, pick from a list |
| `create-bini-app remove [targets]` | Remove desktop and/or mobile targets from the project. With no targets, pick from a list |
| `create-bini-app sign [targets]` | Set up or redo code signing (prompts) |
| `create-bini-app sign <target> <file> <password>` | Set up code signing without prompts (see [Code Signing](#code-signing)) |
| `create-bini-app --app-name [name]` | Inside a project: change the native app name. Prompts when no value is given |
| `create-bini-app --org [domain]` | Inside a project: change the bundle ID prefix. Prompts when no value is given |
| `create-bini-app doctor` | Check your machine for Tauri (runs `tauri info`) |
| `create-bini-app clean` | Delete build output (Vite and Tauri), keeps `node_modules` |
| `create-bini-app upgrade` | Update dependencies to the latest versions and copy the latest template files |

`add`, `remove`, `sign`, `doctor`, `clean`, and `upgrade` must be run inside a Bini.js project. The CLI looks for a `package.json` with `bini-router` in `dependencies` or `devDependencies`, in the current folder or up to five parent folders. `--platform <targets>` is accepted as an alias for listing targets after `add`, `remove`, and `sign`; inside a project, `create-bini-app --platform android` on its own is the same as `create-bini-app add android`. `create-bini-app desktop sign` is shorthand for `create-bini-app sign desktop` (it works for any sign target, or a comma-separated list of them).

Project names may contain lowercase letters, numbers, hyphens, and dots (max 50 characters). They cannot start with `.` or `-`, cannot be `npm` or `node`, and cannot be a Windows reserved name such as `CON`, `NUL`, or `COM1`. The command names above (`add`, `sign`, `remove`, `doctor`, `clean`, `upgrade`) are reserved.

| Flag | Description |
| --- | --- |
| `--typescript` | Use TypeScript (create) |
| `--javascript` / `--no-typescript` | Use JavaScript (create) |
| `--tailwind` / `--css-modules` / `--none` | Styling (create). Only one may be used |
| `--platform <targets>` | `web` (default) · `desktop` · `android` · `ios`. Comma-separated or repeated to pick several, e.g. `web,desktop,android`. `desktop` covers Windows, macOS, and Linux |
| `--app-name [name]` | App name (default: the project name in title case; repeated whitespace is collapsed). It becomes the initial site `title` in `src/app/layout.tsx` and, for native targets, the Tauri `productName` and window title. **With no value, you are prompted for it.** Inside an existing project it renames the native app (see [Changing the app name or bundle ID](#changing-the-app-name-or-bundle-id)) |
| `--org [domain]` | Bundle ID prefix as a reverse domain, e.g. `com.acme` (default `com.bini`). Lowercase letters and numbers in dot-separated parts, at least two parts, each part starting with a letter, max 80 characters. **With no value, you are prompted for it.** Inside an existing project it changes the bundle identifier |
| `--sign` / `--nosign` | Auto-confirm (you are still prompted for details) or skip code-signing setup. With `--sign` on an already configured target, only the signing step runs. The two cannot be combined, and `--nosign` is rejected by the `sign` command |
| `--npm` / `--pnpm` / `--yarn` / `--bun` | Force a package manager instead of auto-detecting. Only one may be used, and it must be on your `PATH` |
| `--no-install` | Skip installing dependencies (they install automatically by default) |
| `--no-git` | Skip `git init` (create) |
| `--force` | Create: delete and overwrite an existing directory of the same name |
| `--yes`, `-y` | No prompts: accept the default for every question not answered by a flag, and skip every confirmation (create, add, remove, bundle ID change). Signing questions are skipped too - use `sign <target> <file> <password>` for those. `sign --yes` on its own is rejected |
| `--version`, `-v` / `--help`, `-h` | Print version / show help |

The `sign` command has its own options (`--alias`, `--profile`, `--team`, `--ci-only`, and others). They are listed under [Code Signing](#code-signing) and are rejected by every other command.

`--typescript`/`--javascript`/`--tailwind`/`--css-modules`/`--none` are ignored (with a warning) in `add` mode, since an existing project keeps its settings.

### Interactive prompts

When run in a terminal, and when the matching flag is not given, create mode asks for: the project name, TypeScript or JavaScript, the styling solution, and the platforms to include. When a desktop or mobile target is picked it also asks for the app name and the organization used for the bundle identifier (each is skipped when you pass `--app-name "X"` or `--org com.acme`). iOS is only offered on macOS; if you pass `--platform ios` on another system it is dropped and the CLI explains how to build iOS with `npm run deploy` instead.

`--app-name` and `--org` can also be given **without a value** to force their prompt. For example `create-bini-app my-app --platform android --app-name` asks for the app name while creating the project, and `add android --org` asks for the organization while adding. A bare flag is one that comes last, or is followed by another flag or a command name (`--app-name add android` works; `--app-name my-app` treats `my-app` as the value). Without a terminal, a bare flag falls back to the default with a warning. For web-only projects the two prompts are skipped because there is no native app to name. A notice is printed only if you passed a bare `--app-name` or `--org`.

In non-interactive environments (CI, no TTY) and with `--yes`, prompts are skipped and defaults apply: TypeScript, Tailwind, `web` platform, `com.bini` as the organization, and no code signing. Flags always override the defaults. A project name is required in non-interactive mode.

### Package manager detection

The package manager is picked in this order:

1. Your flag (`--npm`, `--pnpm`, `--yarn` or `--bun`). It must be on your `PATH`.
2. For commands run inside an existing project (`add`, `remove`, `sign`, `doctor`, `upgrade`, and the rename commands), the project's lockfile: `bun.lockb` or `bun.lock`, then `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`.
3. The tool that launched the CLI (`npx`, `pnpm dlx`, `yarn dlx`, `bunx`). Creating a new project has no lockfile yet, so this is what decides there.
4. npm.

The CLI does not probe your `PATH` for installed package managers. If you run it directly (for example from a global install) to create a project and want something other than npm, pass the flag.

### Exit codes

Commands exit with `0` on success and `1` on a fatal error. Cancelling with Ctrl+C or a prompt exits with `130`, and `SIGTERM` exits with `143`.

`add`, `sign`, `remove`, `upgrade`, `doctor`, and the rename commands exit with `2` when they finished but something needs your attention: a manual follow-up (for example a toolchain that must be fixed before `tauri android init` can run), signing that is still missing, a failed update step, or `tauri info` failing. `add` and the rename commands list the follow-ups at the end of their output. Creating a project does not use exit code `2`: warnings and failed setup steps (a failed Tauri init, for example) are printed as they happen, and the command still exits with `0`.

### Adding a platform later

Every project works as a web app. Desktop or mobile targets can be added at any time from inside an existing project with the `add` command. Nothing is recreated, and `vite.config`, `src/main.tsx`, and `src/app/*` are never touched.

```bash
npx create-bini-app@latest add android             # one target
npx create-bini-app@latest add desktop android     # several at once (comma-separated also works)
npx create-bini-app@latest add android --sign      # set up code signing right away
```

The first native target adds `src-tauri/`, the native scripts, and the `@tauri-apps/api`, `@tauri-apps/cli`, `cross-env`, and `bini-native` packages. Existing scripts and versions in your `package.json` are never overwritten. Dependencies are installed afterwards unless you pass `--no-install`. All desktop operating systems share one `src-tauri/`, so adding `desktop` again only offers code signing. It is skipped entirely when signing for your OS is already configured, unless you pass `--sign`. Re-running a command is safe: anything already configured is skipped.

Run `add` with no targets inside a project to pick from a list. Platforms that are already added are left out of the picker, and iOS is only offered on macOS; on Windows and Linux, `add ios` prints how to build it with `npm run deploy` instead.

Your toolchain is checked before anything is changed (see [Preflight checks](#preflight-checks)). When Tauri is set up for the first time, `add` asks for the app name and the organization in a terminal (defaults: the project name in title case, and `com.bini`). Pass `--app-name "X"` and/or `--org com.acme` to skip those prompts; with `--yes` or without a terminal, the flags or the defaults are used. `src/app/layout.tsx` is not read. If a native target already exists, `--app-name` and `--org` are not applied by `add`; use the commands in [Changing the app name or bundle ID](#changing-the-app-name-or-bundle-id) instead.

When it finishes, `add` prints a summary of what was added or skipped, the signing status per target, any manual follow-ups, and the commands that apply.

Commit before you run it so you can review the diff with `git diff`; the CLI warns if your working tree is dirty.

Your project's `README.md` is written when the project is created, and it documents every platform. `add` and `remove` never edit it, but `upgrade` does overwrite it (see [Maintenance commands](#maintenance-commands)).

### Removing a platform

```bash
npx create-bini-app@latest remove android
npx create-bini-app@latest remove desktop android ios --yes   # remove everything native
```

`remove` lists what it will delete and asks for confirmation (skip with `--yes`; without a terminal, `--yes` is required). `web` cannot be removed.

- **Android / iOS** delete their generated folders (`src-tauri/gen/android`, `src-tauri/gen/apple`), and the scripts for that platform (`android`, `android:build`, `ios`, `ios:build`) are removed from `package.json` if you haven't changed them. A `keystore.jks` you keep in the project root is not touched, but the keystore copy that `sign` places inside `src-tauri/gen/android` is deleted along with that folder, so keep your own backup of the original.
- **Desktop** shares `src-tauri/` with the mobile targets, so it can only be removed together with all of them; asking for `desktop` while a mobile target would remain prints a warning and skips it. The command exits with `2` only when nothing else is left to remove.
- **Removing everything native** deletes all of `src-tauri/` (including any Rust code you added), every native script from `package.json` (the `tauri:*`, `android*`, `ios*`, `dev:native`, `tauri`, `sign`, and `doctor` scripts, if unchanged), and the `@tauri-apps/*` packages and `cross-env` from `package.json`, then prunes them from `node_modules`. `bini-native` is not removed from `package.json`. It also replaces `src/main.tsx` (or `.jsx`) with the latest template version, so it no longer contains the native polyfill block, and **deletes `.env.signing`, `keystore.jks`, and any `.p12`, `.pfx`, `.p8`, `.mobileprovision`, `.jks`, or `.keystore` file in the project root**. `vite.config.*` and `.gitignore` are left unchanged.

### Changing the app name or bundle ID

The native app name and bundle identifier are set once, when Tauri is first set up, and live in `src-tauri/tauri.conf.json`. The `title` in `src/app/layout.tsx` is web-only and never changes them. To change them later, run from inside the project (with no subcommand and no `--platform`):

```bash
npx create-bini-app@latest --app-name                       # prompt for a new app name
npx create-bini-app@latest --org                            # prompt for a new bundle ID prefix
npx create-bini-app@latest --app-name "My App" --org com.acme   # apply directly, no prompts
```

- **`--app-name`** updates `productName` and the first window's `title`. For Android it also updates `app_name` in `strings.xml` when it can be found. The prompt's default is the current name.
- **`--org`** rebuilds the identifier as `<org>.<project>` (project name reduced to lowercase letters and numbers, for example `com.acme.myapp`). The prompt's default is the org parsed from the current identifier. The CLI warns that stores treat a new identifier as a different app and asks for confirmation (skip with `--yes`; without a terminal, `--yes` is required).
- The generated `src-tauri/gen/android` and `src-tauri/gen/apple` projects keep their old values (the iOS display name, and the bundle identifier on both). The CLI lists these as follow-ups; remove and re-add the platform to regenerate it (commit first), or edit it by hand.
- Prompts need an interactive terminal; in CI pass a value instead. The command does nothing if the project has no desktop or mobile target, and exits with code `2` when follow-ups remain.

### Maintenance commands

These also exist as scripts in every project (`npm run clean`, `npm run upgrade`), and `sign` and `doctor` as well once a native target is added. None of them asks for confirmation.

- **`clean`** deletes `dist/`, `dist-ssr/`, and the generated Android and iOS build folders (`src-tauri/gen/android/app/build`, `src-tauri/gen/android/build`, `src-tauri/gen/android/.gradle`, `src-tauri/gen/apple/build`, `src-tauri/gen/apple/Externals`). If `src-tauri/target` exists, it also clears the Rust build cache with `cargo clean` (or deletes the folder if `cargo` is unavailable), so the next native build is slow. `node_modules` is kept.
- **`upgrade`** moves every registry dependency in `package.json` to its latest version with your package manager (`file:`, `link:`, `workspace:`, `portal:`, `patch:`, git, URL, and `npm:` specs are left alone), runs `cargo update` if `src-tauri/Cargo.toml` exists, then copies the latest template files into the project. `src/`, `package.json`, and `vite.config.*` are never overwritten by the template step, but every other file that comes from the template (for example `README.md`, `index.html`, and the lint and format configs) is replaced with the template version, so keep your own changes to those files in git. It also moves an iOS `developmentTeam` left in `tauri.conf.json` by older versions into the git-ignored `src-tauri/tauri.ios.conf.json`. Commit first; the CLI warns if your working tree is dirty.
- **`doctor`** runs `tauri info` to check Rust, the platform toolchains, and versions. In a project without a native target it just tells you how to add one.

---

## Project Structure

```text
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
| --- | --- |
| `dev` | Start the Vite dev server with HMR and open the browser (`vite --host --open`) |
| `build` | Type-check (TypeScript), build the client and SSR bundles, then pre-render every route to static HTML |
| `start` | Serve the production build via `bini-server` |
| `preview` | Preview the production build |
| `type-check` | `tsc --noEmit` (JavaScript projects print a notice instead) |
| `lint` / `format` / `check` | Oxlint / Oxfmt / both + type-check (`check` skips `tsc` in JavaScript projects) |
| `clean` | Delete build output and caches (see [Maintenance commands](#maintenance-commands)) |
| `upgrade` | Update every dependency to its latest version and refresh the template files |
| `deploy` | Run `bini-deploy` - generate hosting config (web) or GitHub Actions build workflows (native), and push to GitHub |
| `tauri:dev` / `tauri:build` / `tauri:icon` *(desktop)* | Run the desktop app, build it, or regenerate all icons from `public/logo.png` |
| `android` / `android:build` *(Android)* | Run or build the Android app |
| `ios` / `ios:build` *(iOS, macOS only)* | Run or build the iOS app |
| `sign` / `doctor` *(any native target)* | Set up code signing (`npx create-bini-app sign`) / check your machine for Tauri (`npx create-bini-app doctor`) |
| `tauri` *(any native target)* | Pass-through to the Tauri CLI, e.g. `npm run tauri -- icon public/logo.png` |
| `dev:native` *(any native target)* | Plain `vite`, used by Tauri's `beforeDevCommand` so no browser tab opens |

The native scripts (`dev:native`, `tauri`, `tauri:*`, `sign`, `doctor`, `android*`, `ios*`) are added together when the first native target is added, whichever target that is, and existing scripts with the same name are kept. The desktop, Android, and iOS scripts only work once that platform exists. `deploy` is present in every scaffold, regardless of platform - see [Deployment](#deployment) for what it does. See [Platforms](#platforms) for the command and requirement breakdown per target.

---

## Routing

`bini-router` maps files in `src/app/` to URLs. No router config, no manual `React.lazy()` - every route is code-split automatically.

```text
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

One codebase, four targets: **web**, **desktop** (Windows, macOS, and Linux from one `src-tauri/`), **Android**, and **iOS**. `--platform` picks which ones you scaffold, and `add` brings in more later. The first native target adds the shared native setup (`src-tauri/`, the Tauri packages, and all native scripts); Android and iOS then also generate their own project under `src-tauri/gen/`. Every target also gets a `deploy` script for `bini-deploy` - see [Deployment](#deployment).

```bash
npx create-bini-app@latest my-app --platform desktop
npx create-bini-app@latest my-app --platform web,android --app-name "My App" --nosign
npx create-bini-app@latest add desktop            # later, inside the project
```

When you add a native target, the CLI runs `tauri init` (frontend dist `../dist`, dev URL `http://localhost:3000`, before-dev command `npm run dev:native`, before-build command `npm run build`, with your package manager's equivalents), then sets the product name, window title, and bundle identifier in `src-tauri/tauri.conf.json`. The identifier is `<org>.<project>` with the project name reduced to lowercase letters and numbers, for example `my-app` with `--org com.acme` becomes `com.acme.myapp` (a name starting with a digit gets an `app` prefix). Replace it with your own reverse-DNS id before publishing to an app store; `create-bini-app --org` does this for you. Icons are then generated from `public/logo.png`; if that file is missing, Tauri's default icons are kept.

The `tauri:dev`, `tauri:build`, `android`, `android:build`, `ios`, and `ios:build` scripts set `TAURI=true`. That makes the dev server bind to `TAURI_DEV_HOST` (or `0.0.0.0`) on port 3000, matching Tauri's `devUrl`, and it fails instead of switching to another port. `bini-native` is loaded by `vite.config` only when `TAURI=true` (and not for the SSR build); it serves `/api/*` in-process, opens external links in the system browser, and wires Cargo, capabilities, and manifests for the web APIs you use. Run `npm run doctor` to check your machine, and see the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

### Preflight checks

Before it creates or adds a native target, the CLI checks your toolchain and **stops with exit code `1`** if something is missing:

| Target | Checked |
| --- | --- |
| Any native target | `cargo` on `PATH` |
| Desktop on Windows | WebView2 Runtime (looks for the `EdgeWebView` folder under Program Files) |
| Desktop on Linux | `webkit2gtk-4.1` (via `pkg-config`) |
| Desktop on macOS, iOS on macOS | `xcodebuild` (Xcode command line tools) |
| Android | `java` on `PATH`, `ANDROID_HOME` (or `ANDROID_SDK_ROOT`), and `NDK_HOME` |

It also verifies that the locally installed Tauri CLI can actually run. If its native binding is missing (a known npm bug with platform-specific optional dependencies, [npm/cli#4828](https://github.com/npm/cli/issues/4828)), it stops and tells you to run `rm -rf node_modules package-lock.json && npm install`.

### Web

#### Web overview

The default target. A standard Vite + React app with file-based routing, pre-rendered pages, and a Hono API layer.

#### Web features

- Zero-dependency production server (`bini-server`)
- `bini-deploy` generates hosting config for Netlify Edge, Vercel, Cloudflare Workers, Node.js, or Deno and pushes to GitHub

#### Web commands

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm start` | Serve the production build |
| `npm run build` | Type-check, build, and pre-render every route (static & dynamic) via SSG |
| `npm run preview` | Preview the production build |
| `npm run deploy` | Generate hosting config for your chosen platform and push to GitHub |

#### Web requirements

Node.js `>= 20.19.0`. Nothing else.

---

### Desktop (Windows, macOS, Linux)

#### Desktop overview

A native desktop binary. It runs inside WebView2 on Windows, WKWebView on macOS, and WebKitGTK on Linux. Bundles are not cross-compiled: build Windows bundles on Windows, macOS bundles on macOS, and Linux bundles on Linux. `npm run deploy` generates one GitHub Actions workflow that builds all three on their own runners (see [Deployment](#deployment)).

#### Desktop features

- Filesystem, clipboard, notifications, and dialogs via `@tauri-apps/api`, auto-wired by `bini-native`
- Code signing for Windows and macOS, and optional GPG signing of the Linux AppImage and RPM (see [Code Signing](#code-signing))

#### Desktop commands

| Command | Description |
| --- | --- |
| `npm run tauri:dev` | Run in development mode |
| `npm run tauri:build` | Build a distributable for the OS you are on |
| `npm run tauri:icon` | Regenerate icons from `public/logo.png` |
| `npm run deploy` | Generate the desktop GitHub Actions workflow and push the project to GitHub via `bini-deploy` |

`deploy` does not build the app on your machine. It writes `.github/workflows/desktop.yml` and pushes, and GitHub then builds Windows, macOS, and Linux bundles when you run the workflow or push a `v*` tag. To build locally instead, run `tauri:build` on the OS you want.

#### Desktop requirements

##### Windows

- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain via `rustup`, MSVC toolchain as default) - Tauri compiles a native Rust binary under the hood
- Microsoft C++ Build Tools ([download](https://visualstudio.microsoft.com/visual-cpp-build-tools/)) - install with "Desktop development with C++"
- Microsoft Edge WebView2 Runtime ([download](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)) - the CLI checks for it and stops if it is not found

##### macOS

- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain via `rustup`)
- Xcode Command Line Tools - `xcode-select --install`
- No Homebrew packages are needed for desktop builds, since macOS ships WKWebView
- Full Xcode (Mac App Store) if you also plan to build for iOS

##### Linux

- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain via `rustup`)
- `pkg-config` and one of the following system dependency sets (the CLI checks for `webkit2gtk-4.1`):

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

- `gpg` (GnuPG) only if you want to sign the AppImage or RPM

---

### Android

#### Android overview

A real native APK/AAB via Tauri's Android backend, not a WebView wrapper.

#### Android features

- Camera, filesystem, notifications, and geolocation auto-wired by `bini-native`
- Back button, status bar, and splash screen configurable in `src-tauri/gen/android`
- Release signing (keystore + `keystore.properties`), configurable at scaffold time or later
- The Rust Android targets are added for you when `rustup` is installed

#### Android commands

| Command | Description |
| --- | --- |
| `npm run android` | Run on an emulator or connected device |
| `npm run android:build` | Build a release APK/AAB |
| `npm run deploy` | Generate the Android GitHub Actions workflow and push the project to GitHub via `bini-deploy` |

`deploy` does not build on your machine. It writes `.github/workflows/android.yml` and pushes, and GitHub builds the APK/AAB (signed when signing values are saved, otherwise unsigned) and attaches it to the run as an artifact. Store submission is manual. Commit the generated `src-tauri/gen/android` folder; only `keystore.properties`, `local.properties`, `.gradle/`, and build output are git-ignored.

#### Android requirements

- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain via `rustup`) - Tauri compiles a native Rust binary under the hood
- Java JDK 17 (`java` on `PATH`, `JAVA_HOME` set) - [download](https://adoptium.net/temurin/releases/)
- Android Studio, with SDK/Build Tools/NDK (`ANDROID_HOME` or `ANDROID_SDK_ROOT`, and `NDK_HOME`, set) - [download](https://developer.android.com/studio)
- Rust targets: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android` (done automatically by the CLI if `rustup` is on your PATH)

If Android initialization fails, the CLI prints the exact `npm run tauri -- android init` command to run once the toolchain is fixed (with your package manager's equivalent if you don't use npm).

---

### iOS

#### iOS overview

A real native app via Tauri's iOS backend, running inside WKWebView. macOS + Xcode required.

#### iOS features

- Same native plugin wiring story as Android
- Xcode-managed automatic signing for local runs; manual certificate/profile signing for CI

#### iOS commands

| Command | Description |
| --- | --- |
| `npm run ios` | Run on the Simulator or a connected device (macOS only) |
| `npm run ios:build` | Build the app (macOS only) |
| `npm run deploy` | Generate the iOS GitHub Actions workflow and push the project to GitHub via `bini-deploy` |

#### iOS requirements

- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain via `rustup`) - Tauri compiles a native Rust binary under the hood
- Xcode (Mac App Store) + Command Line Tools - `xcode-select --install`
- CocoaPods - `brew install cocoapods` (or `sudo gem install cocoapods`)
- Rust targets: `rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim`

**Not on a Mac?** iOS is left out when you scaffold or `add` it on Windows or Linux, and the CLI says so. Develop on web or Android, add `desktop` if the project has no `src-tauri/` yet (the iOS project itself is generated in CI), then run `npm run deploy` and choose iOS: it writes `.github/workflows/ios.yml` and pushes, and GitHub builds the app on a macOS runner. With Apple credentials saved the build is a signed `.ipa`; without them it builds for the simulator only. Store submission remains a separate, manual step.

**Notes** - every native project has a bare `"tauri": "tauri"` script in `package.json`. Xcode's build phase calls it directly (`npm run tauri -- ios xcode-script ...`), bypassing the commands above - builds triggered from inside Xcode fail with `Missing script: "tauri"` without it. Don't rename or remove it.

---

## Code Signing

Signing is offered when you add a native target, and you can set it up or redo it any time, either with prompts or with a single command:

```bash
npx create-bini-app@latest sign                                  # prompts, everything that applies on this machine
npx create-bini-app@latest sign android                          # prompts, one target
npx create-bini-app@latest sign desktop ./cert.pfx "pw"          # no prompts: Windows (.pfx) or macOS (.p12), picked from this OS
npx create-bini-app@latest sign windows ./cert.pfx "pw" --ci-only
npx create-bini-app@latest sign macos ./dev-id.p12 "pw" --identity "Developer ID Application: Name (TEAMID)" \
  --api-issuer ID --api-key KEY --api-key-file ./AuthKey.p8 --ci-only
npx create-bini-app@latest sign ios ./dist.p12 "pw" --profile ./app.mobileprovision --team ABCDE12345
npx create-bini-app@latest sign ios --team ABCDE12345            # Xcode automatic signing, no files
npx create-bini-app@latest sign android ./keystore.jks "pw" --alias upload
npx create-bini-app@latest sign desktop --thumbprint <sha1>      # Windows: certificate already in your store
npx create-bini-app@latest sign desktop --sign-command "artifact-signing-cli -e <endpoint> -a <account> -c <profile> %1"   # Windows: cloud signing
npx create-bini-app@latest sign desktop --adhoc                  # macOS ad-hoc signing for local testing
```

**Targets:** `desktop` (the OS you are running on), `windows`, `macos`, `linux`, `android`, `ios`. `create-bini-app desktop sign` is shorthand for `create-bini-app sign desktop`.

**Real credentials only.** Self-signed certificates are not supported: bring a real certificate, keystore, or GPG key. The CLI creates none of them for you; the only thing it generates itself is a macOS ad-hoc signature for local testing. For Android, supply an existing keystore (`.jks`, `.keystore`, or `.p12`) together with its alias and passwords.

**This machine or GitHub Actions only.**

- `desktop`, `android`, and `ios` (on a Mac) set up signing on this machine. When you give a certificate or keystore, the values are also saved for GitHub Actions.
- `windows`, `macos`, and `linux` can only be named together with `--ci-only`. They then only save the values for GitHub Actions and change nothing on this machine. Use `desktop` to sign for the OS you are on.
- `ios` on Windows or Linux also needs `--ci-only`.
- `--ci-only` works from any OS. With no target, it covers every platform in the project (Windows, macOS, and Linux for the desktop target, plus Android and iOS when added).
- Without `--ci-only`, prompt mode skips a target that has not been added to the project, with a warning and exit code `2`; run `create-bini-app add <target>` first. Argument mode does not check this: with no matching native project yet, it saves only the GitHub Actions values where it can. The exception is Android, which needs `src-tauri/gen/android` to exist unless you pass `--ci-only`.

**Two modes.** Give a certificate or keystore file and its password (or a mode flag such as `--thumbprint`, `--sign-command`, `--adhoc`, or `--team` for iOS) and nothing is asked. This argument mode takes exactly one target per command; only the prompt mode accepts a list such as `sign windows,linux --ci-only`. Otherwise `sign` prompts, which needs an interactive terminal and cannot be combined with `--nosign`. `--yes` does not make prompt mode non-interactive: `sign --yes` without credentials is rejected. Without `--ci-only` and with no target, the prompts cover everything that applies here: desktop for the OS you run on (if the project has a native target), Android once it has been added, and iOS only on macOS. At scaffold time, signing is skipped with no prompts when you pass `--nosign` or `--yes`, or when the terminal is non-interactive. Targets that are not yet signed make the command exit with code `2`; invalid arguments exit with `1`.

| Target | What is set up | Where it lives |
| --- | --- | --- |
| Windows | A `.pfx` file (imported into your `CurrentUser\My` certificate store with PowerShell when you are on Windows, and saved for CI), the thumbprint of a certificate already in your store (`--thumbprint`), or a cloud or hardware key through a custom sign command (`--sign-command`, must contain `%1`). SHA-256 digest and the DigiCert timestamp URL are configured for store-based signing | `certificateThumbprint`, `digestAlgorithm`, and `timestampUrl` in the git-ignored `src-tauri/tauri.windows.conf.json`, which Tauri merges automatically on Windows only (so the committed `tauri.conf.json` never points at a certificate that only exists on your machine). A sign command is written to `src-tauri/tauri.cloud-sign.conf.json` so normal local builds never call the signing service; sign with `npm run tauri:build -- --config src-tauri/tauri.cloud-sign.conf.json`. CI values for a `.pfx`: `WINDOWS_CERTIFICATE` (base64) and `WINDOWS_CERTIFICATE_PASSWORD`. A sign command is not uploaded; `bini-deploy` installs the matching CLI in CI when it recognises the command |
| macOS | A Developer ID Application `.p12` and its signing identity (imported into your login keychain on a Mac when given as arguments), optional notarization (App Store Connect API key, or Apple ID + app-specific password), or ad-hoc signing (`--adhoc`) for local testing | `signingIdentity` in the git-ignored `src-tauri/tauri.macos.conf.json`, which Tauri merges automatically on macOS only. CI values: `APPLE_CERTIFICATE` (base64), `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `KEYCHAIN_PASSWORD` (a random password for the temporary keychain the workflow creates), plus `APPLE_API_ISSUER` / `APPLE_API_KEY` / `APPLE_API_KEY_P8` (the `.p8` contents, base64) or `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` for notarization |
| Linux | GPG signing of the AppImage and the RPM with a key you already have (create one with `gpg --full-gen-key`, RSA 4096). Prompts only (no credential file or flags); needs `gpg` (or `gpg2`). The secret key is exported with the passphrase you enter. Optional, and skipped if you choose to | CI values: `GPG_PRIVATE_KEY` (base64), `SIGN=1`, `SIGN_KEY`, `APPIMAGETOOL_FORCE_SIGN=1` (so a signing failure aborts the build instead of producing an unsigned AppImage), and `TAURI_SIGNING_RPM_KEY` (raw ASCII-armored text) for the RPM. `APPIMAGETOOL_SIGN_PASSPHRASE` and `TAURI_SIGNING_RPM_KEY_PASSPHRASE` are added only when the key has a passphrase. Local builds only pick these up if you load `.env.signing` into your shell first (see below) |
| Android | A keystore you already have (`.jks`, `.keystore`, or `.p12`/`.pfx`), its alias, and its passwords (the keystore password must be at least 6 characters in the prompts). Unless you pass `--ci-only`, the keystore is copied into `src-tauri/gen/android` as `keystore.jks`, `keystore.keystore`, or `keystore.p12` (matching its type) and a `keystore.properties` file is written next to it. The Gradle `signingConfigs` block is patched into `app/build.gradle.kts` for you, guarded so unsigned and debug builds keep working | `src-tauri/gen/android/keystore.properties` and the keystore copy beside it (both need the Android project to exist; with `--ci-only` only the CI values are saved). CI values: `ANDROID_KEY_BASE64`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEYSTORE_PASSWORD` |
| iOS | Automatic Xcode signing with your Team ID (nothing to import), or a manual Apple Distribution `.p12` + provisioning profile (`.mobileprovision`) for CI, stored base64-encoded | The Team ID is saved as `developmentTeam` in the git-ignored `src-tauri/tauri.ios.conf.json`, which Tauri merges automatically on iOS builds, so local builds need no environment variables and CI does not try to sign with it. CI values: `IOS_CERTIFICATE`, `IOS_CERTIFICATE_PASSWORD`, `IOS_MOBILE_PROVISION`, `APPLE_DEVELOPMENT_TEAM`. For CI automatic signing with `--team`, an App Store Connect API key is saved instead: `APPLE_API_ISSUER`, `APPLE_API_KEY`, `APPLE_API_KEY_P8` |

In the prompts, Windows signing lists "a `.pfx` file I already have" and "cloud or hardware key: custom sign command" (new OV/EV certificates are usually issued on hardware or a cloud HSM and cannot be exported as a `.pfx`). On macOS the prompts offer ad-hoc signing or an Apple Developer identity and then ask for the `.p12`, with optional notarization credentials.

### `sign` options

| Option | Used with | Description |
| --- | --- | --- |
| `--alias <name>` | android | Key alias (default `upload`) |
| `--key-password <pw>` | android | Key password, when it differs from the keystore password. Ignored for `.p12`/`.pfx` keystores, which use one password for both |
| `--thumbprint <sha1>` | windows | Use a certificate already in the Windows store (40 hex characters; spaces and colons are ignored) |
| `--sign-command "<cmd>"` | windows | Cloud or hardware signing command containing `%1` |
| `--identity "<name>"` | macos | Signing identity, e.g. `"Developer ID Application: Name (TEAMID)"`. Required when signing with a certificate file in argument mode |
| `--adhoc` | macos | Ad-hoc signing for local testing |
| `--api-issuer`, `--api-key`, `--api-key-file` | macos, ios | App Store Connect API key (all three are required together): notarization on macOS, CI automatic signing on iOS |
| `--apple-id`, `--apple-password`, `--team` | macos | Notarization with an Apple ID and an app-specific password (all required together). Cannot be combined with the API key options |
| `--profile <file>` | ios | Provisioning profile for a manual certificate (the certificate file is required too) |
| `--team <TEAMID>` | ios, macos | Apple Team ID (10 letters and numbers). Required for iOS, both for automatic signing and together with a certificate and `--profile` |
| `--ci-only` | all | Only save the CI values; skip the local keychain, certificate store, and Gradle setup. Required to name `windows`, `macos`, or `linux`. Cannot be combined with `--sign-command`, `--thumbprint`, `--adhoc`, or `--team` (the CLI rejects `--team` together with `--ci-only` in every case) |

To keep passwords out of shell history and process lists, they can come from the environment instead of the command line: `BINI_SIGN_PASSWORD` (certificate or keystore password), `BINI_KEY_PASSWORD` (Android key password), and `BINI_APPLE_PASSWORD` (Apple ID app-specific password). Use the environment for a password that starts with `-`, since it would be read as a flag.

### Where secrets live

- `.env.signing` - created with owner-only permissions (`0600`). It holds the values GitHub Actions needs, and `npm run deploy` uploads them as GitHub secrets. Never commit it. Local builds do not need it: they sign from your local `tauri.windows.conf.json` / `tauri.macos.conf.json` / `tauri.ios.conf.json`, your keychain, and Xcode. Each platform only updates its own keys, so platforms can be set up at different times. To notarize a local macOS build, or to sign a local Linux AppImage or RPM, load it first with `set -a; source .env.signing; set +a`.
- `src-tauri/gen/android/keystore.properties` and the keystore copy next to it - the Gradle signing config is committed and only activates when `keystore.properties` exists, so fresh clones and debug builds keep working. Back up your original keystore and its password: every Play Store update must be signed with the same key, and the copy inside `src-tauri/gen/android` is deleted if you remove the Android target.
- Keep `.env.signing`, `keystore.jks`, `keystore.properties`, the keystore copy in `src-tauri/gen/android`, `tauri.windows.conf.json`, `tauri.macos.conf.json`, `tauri.ios.conf.json`, and any `.p12`, `.pfx`, `.p8`, `.mobileprovision`, `.jks`, or `.keystore` files out of git.

Desktop signing without `--ci-only` covers only the OS you ran `sign` on. Sign the other systems in CI on their own runners (`sign windows,macos,linux --ci-only`). Use a certificate from a trusted authority for public releases. Tauri's own guides: [macOS](https://v2.tauri.app/distribute/sign/macos/), [Windows](https://v2.tauri.app/distribute/sign/windows/), [Linux](https://v2.tauri.app/distribute/sign/linux/), [iOS](https://v2.tauri.app/distribute/sign/ios/), [Android](https://v2.tauri.app/distribute/sign/android/).

---

## Developer Experience

**Dev overlay.** An animated status badge in the corner reflects loading/idle/error state live. On error, it expands into a Shiki-highlighted code frame with a clickable file link and filtered call stack. Disable with `DISABLE_BINI_OVERLAY=true npm run dev`.

**Auto-imports.** These are available in every file under `src/app/` (including `.mdx`/`.md`) with no import statement:

| From | Symbols |
| --- | --- |
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

`bini-deploy` is bundled into every scaffold and exposed as `npm run deploy`. A project is either a **web** deploy or a **native** deploy; the two cannot be combined in one run (run it once for each). What it does depends on which:

- **Web** - prompts for a hosting target (`node`, `netlify`, `vercel`, `cloudflare`, or `deno`), generates that platform's entry file and any hosting config (`netlify.toml`, `vercel.json`, `wrangler.toml`) directly in your project, removes files left over from other hosting targets, then commits and pushes everything to the GitHub repository you specify.
- **Desktop / Android / iOS** - removes web hosting files and generates GitHub Actions workflows that build the app on GitHub, then commits and pushes. Builds run on GitHub's runners, so this works from any OS (no Mac needed for iOS). It does **not** submit anything to an app store - that remains a separate, manual step.

```bash
npm run deploy                                              # interactive
npx bini-deploy --platform web --hosting vercel --repo https://github.com/you/app --yes   # non-interactive
npx bini-deploy --platform desktop,android,ios --repo https://github.com/you/app -y       # native, non-interactive
```

| Option | Description |
| --- | --- |
| `--platform <targets>` | `web`, or any of `desktop`, `android`, `ios` (comma-separated). `web` cannot be combined with the others |
| `--hosting <name>` | Web only: `node` (default with `--yes`), `netlify`, `vercel`, `cloudflare`, `deno` |
| `--repo <url>` | GitHub repository URL |
| `--generate-entry <host>` | Generate only the production API entry file (`netlify`, `vercel`, `cloudflare`, `deno`) |
| `--nosign` | Native only: skip the signing setup and the secrets upload |
| `--yes`, `-y` | No prompts; `--platform` and `--repo` are required |

### Web hosting files

| Platform | Files generated |
| --- | --- |
| `netlify` | `netlify/edge-functions/api.ts`, `netlify/edge-functions/spa-fallback.ts`, and `netlify.toml` |
| `vercel` | `api/index.ts`, `vercel.json`, and (TypeScript projects) `api/tsconfig.json` |
| `cloudflare` | `worker.ts` and `wrangler.toml` |
| `deno` | `server/index.ts` |
| `node` | *(none - `bini-server` reads `src/app/api/` directly)* |

JavaScript projects get `.js` instead of `.ts`. The entry file is only generated when `src/app/api/` has routes.

**Netlify example**, generated automatically by `bini-deploy` when you choose it:

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[edge_functions]]
  path = "/api/*"
  function = "api"
```

Netlify redirects cannot exclude paths with a file extension, so the single-page-app fallback is a second edge function (`spa-fallback`) that serves `index.html` only for 404s on extensionless paths. Missing files such as `robots.txt` stay a real 404.

> Edge Functions run on Deno, not Node - packages depending on Node built-ins (`fs`, `nodemailer`) won't work there.

**Node.js** (Railway, Render, Fly.io, a VPS): `npm run build && npm start`. `bini-server` reads handlers directly from `src/app/api/`, so deploy the whole project - not just `dist/`. Use [pm2](https://pm2.keymetrics.io/) on a bare VPS.

**GitHub Pages / subpaths** - set `base: '/my-repo/'` in `vite.config.ts`, then `npm run build` for a fully pre-rendered, subpath-aware `dist/`.

### Native builds on GitHub Actions

For native targets, `bini-deploy` writes one workflow per kind of runner into `.github/workflows/`:

| Workflow | Builds | Runner |
| --- | --- | --- |
| `desktop.yml` | Windows, macOS, and Linux (one matrix job) | Windows, macOS, and Ubuntu |
| `android.yml` | Android APK/AAB | Ubuntu |
| `ios.yml` | iOS app | macOS |

The workflows use your project's own scripts (`tauri:build`, `android:build`, `ios:build`) and your package manager (npm, pnpm, yarn, or bun, detected from the project's lockfile), and are regenerated every time you run deploy. Deploy checks first that `src-tauri/tauri.conf.json` and the matching build scripts exist; if not, it tells you to run `create-bini-app add <target>` (on Windows or Linux, `add desktop` creates the shared `src-tauri/`, and the iOS project itself is generated in CI).

Run a workflow from the **Actions** tab, or push a tag such as `v1.0.0`. The finished builds are attached to the run as **Artifacts**.

**Signing in CI.** For each platform, the workflow uses the credentials saved as GitHub secrets (from `create-bini-app sign`). Without them the build is unsigned: macOS falls back to an ad-hoc signature, and iOS builds for the simulator only. During deploy you are offered the signing prompts for each platform you are deploying (skip them with `--nosign`), then the saved values from `.env.signing` are uploaded to GitHub as secrets with the GitHub CLI (`gh`). Install it and run `gh auth login` first, otherwise deploy prints the secret names to add by hand at `https://github.com/<you>/<repo>/settings/secrets/actions`.

**Pushing to GitHub.** Deploy initializes git if needed, sets `origin` (an existing remote is never changed), commits, and pushes to `main`. It asks for a git name and email if none are set (stored for this repository only), and for a GitHub username and Personal Access Token if the push is rejected (add the `workflow` scope so GitHub accepts the Actions files). If the remote has commits you don't have locally, it merges them in with `-X ours`: for any file that exists on both sides your local version wins, and files that only exist on the remote are kept.

---

## Packages

| Package | Role |
| --- | --- |
| [`bini-router`](https://npmjs.com/package/bini-router) | File-based routing, layouts, MDX/Markdown pages, folder-scoped loading/not-found/error, metadata, auto-imports, dev/preview API routing |
| [`bini-ssg`](https://npmjs.com/package/bini-ssg) | Pre-renders every route - static and dynamic - to static HTML as part of `npm run build` |
| [`bini-deploy`](https://npmjs.com/package/bini-deploy) | Generates hosting config for web targets and GitHub Actions build workflows for native targets, and pushes the project to GitHub |
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
