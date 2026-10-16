# {{PROJECT_NAME}}

[![Bini.js](https://img.shields.io/badge/Bini.js-{{BINIJS_VERSION}}-00CFFF?style=flat-square)](https://bini.js.org)
[![Node.js](https://img.shields.io/badge/node-%3E%3D{{REQUIRED_NODE}}-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](https://opensource.org/licenses/MIT)

A **Bini.js** application built with **Vite** and **Hono**.

One codebase for web, and optionally desktop (Windows, macOS, Linux), Android, and iOS via Tauri.

Requires **Node.js >= {{REQUIRED_NODE}}**.

---

## Getting started

```bash
{{PM}} install
{{PM}} run dev
```

Dependencies are installed automatically when the project is created, unless `--no-install` was used.

### Package manager

The CLI picks the package manager in this order:

1. An explicit flag: `--npm`, `--pnpm`, `--yarn` or `--bun` (it must be on your `PATH`).
2. Inside an existing project: the lockfile (`bun.lockb`, `bun.lock`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`).
3. The tool that launched the CLI (`npx`, `pnpm dlx`, `yarn dlx`, `bunx`). This is what decides for a brand-new project.
4. npm.

---

## Creating a project

```bash
npx create-bini-app my-app
npx create-bini-app my-app --typescript --tailwind --platform web
npx create-bini-app my-app --yes --typescript --tailwind --platform web,android --org com.acme
```

| Option | Description |
| --- | --- |
| `--typescript` / `--javascript` | Language (default: TypeScript) |
| `--tailwind` / `--css-modules` / `--none` | Styling (default: Tailwind) |
| `--platform <list>` | Comma-separated: `web`, `desktop`, `android`, `ios` (default: `web`). `ios` is only offered on macOS |
| `--app-name [name]` | App name, used as the site title and the Tauri app name and window title. With no value, you are prompted |
| `--org [domain]` | Bundle ID prefix as a reverse domain (default: `com.bini`). With no value, you are prompted |
| `--yes`, `-y` | No prompts: accept every default not set by a flag |
| `--no-install` | Skip installing dependencies |
| `--no-git` | Skip `git init` |
| `--force` | Overwrite an existing directory |
| `--sign` / `--nosign` | Auto-confirm, or skip, code signing setup for native targets |

The app name and organization are only asked for when a native target is selected. The bundle identifier is `<org>.<project name without symbols>`, for example `com.bini.myapp`. Replace it with your own before publishing to an app store.

Project names use lowercase letters, numbers and hyphens (max 50 characters). `add`, `sign`, `remove`, `doctor`, `clean` and `upgrade` are reserved.

---

## Commands

Scripts are run with `{{PM}} run <script>`.

### Web

| Command | Description |
| --- | --- |
| `{{PM}} run dev` | Start the dev server with HMR |
| `{{PM}} run build` | {{BUILD_DESC}} client and SSR, then prerender routes |
| `{{PM}} run start` | Serve the production build with bini-server |
| `{{PM}} run preview` | Preview the production build |

### Desktop

| Command | Description |
| --- | --- |
| `{{PM}} run tauri:dev` | Run the desktop app in development |
| `{{PM}} run tauri:build` | Build a distributable for your OS |
| `{{PM}} run tauri:icon` | Generate icons from `public/logo.png` |
| `{{TAURI_RUN}} <args>` | Pass arguments through to the Tauri CLI |

### Android

| Command | Description |
| --- | --- |
| `{{PM}} run android` | Run on an emulator or device |
| `{{PM}} run android:build` | Build an APK or AAB |

### iOS

| Command | Description |
| --- | --- |
| `{{PM}} run ios` | Run on a simulator or device (macOS only) |
| `{{PM}} run ios:build` | Build the iOS app (macOS only) |

### Signing and tooling

| Command | Description |
| --- | --- |
| `{{PM}} run sign` | Set up or redo code signing |
| `{{PM}} run doctor` | Check the machine for Tauri (`tauri info`) |
| `{{PM}} run clean` | Delete build output (see below); keeps `node_modules` |
| `{{PM}} run upgrade` | Update dependencies and copy the latest template files |
| `{{PM}} run deploy` | Deploy to GitHub (generates the GitHub Actions workflows) |

The desktop, Android, iOS, `sign` and `doctor` scripts are added to `package.json` when the first native platform is added. They only work after that platform exists.

**`clean`** removes `dist/`, `dist-ssr/`, the Android and iOS build folders under `src-tauri/gen/`, and the Rust build cache (`cargo clean`, falling back to deleting `src-tauri/target`).

**`upgrade`** moves every registry dependency to its latest version (`package.json` records what it resolved to), runs `cargo update` if `src-tauri/` exists, and copies the latest template files. It never touches `src/`, `package.json` or `vite.config`. Commit first so you can review the diff.

---

## Platforms

Run these from inside the project. With no targets, `add` and `remove` **prompt** you to pick platforms from a list.

| Command | Description |
| --- | --- |
| `npx create-bini-app add` | Add a platform (pick from a list) |
| `npx create-bini-app add <target>` | Add `desktop`, `android` or `ios` (comma-separate for several, e.g. `android,ios`) |
| `npx create-bini-app add desktop --nosign` | Add desktop and skip signing prompts |
| `npx create-bini-app remove` | Remove a platform (pick from a list) |
| `npx create-bini-app remove <target>` | Remove `desktop`, `android` or `ios` |
| `npx create-bini-app remove desktop android ios --yes` | Remove every native target without confirmation |
| `npx create-bini-app --app-name` | Change the native app name (prompts) |
| `npx create-bini-app --org` | Change the bundle ID prefix (prompts) |
| `npx create-bini-app --app-name "My App" --org com.acme` | Change both without prompts |

**Adding.** The first native platform adds the native scripts and dependencies (`@tauri-apps/api`, `@tauri-apps/cli`, `cross-env`, `bini-native`) to `package.json`, installs them, and creates `src-tauri/`. Your `vite.config` and the files in `src/` are not modified. Platforms that are already configured are skipped. iOS can only be added on macOS; on other systems, run `{{PM}} run deploy` and choose iOS to build it with GitHub Actions. Android setup also adds the Rust Android targets with `rustup` and needs a JDK 17, `ANDROID_HOME` and `NDK_HOME`.

**Removing.** Removing Android or iOS deletes `src-tauri/gen/android` or `src-tauri/gen/apple`. `desktop` shares `src-tauri/` with the mobile targets, so it can only be removed together with them, and doing so deletes all of `src-tauri/` (including any Rust code you wrote) plus the native scripts and packages in `package.json`. `keystore.jks` in the project root is kept. Removing asks for confirmation unless you pass `--yes`.

**Renaming.** The native name and bundle identifier live in `src-tauri/tauri.conf.json`. The title in `src/app/layout.{{MAIN_EXT}}` is web-only and is never changed by the CLI. Changing the bundle ID makes app stores treat the app as a different one, so the CLI asks first. Generated Android and iOS projects keep the old ID (and iOS its display name) until you remove and re-add them, so commit first.

`--app-name` and `--org` passed to `add` only take effect when Tauri is first set up.

---

## Code signing

Unsigned builds work, with platform warnings (SmartScreen, Gatekeeper, iOS simulator only). Credentials are saved in `.env.signing` (git-ignored) and uploaded as GitHub secrets by `{{PM}} run deploy`. Local builds do not read `.env.signing`; they are signed from your local config, keychain and Xcode.

### Choosing a target

| Command | Description |
| --- | --- |
| `npx create-bini-app sign` | Prompts for everything that applies on this machine |
| `npx create-bini-app sign desktop` | Sign for the OS you are on |
| `npx create-bini-app sign android` | Android release signing |
| `npx create-bini-app sign ios` | iOS signing (macOS only) |
| `npx create-bini-app sign windows,linux --ci-only` | Save credentials for GitHub Actions only |

`windows`, `macos` and `linux` by name only work with `--ci-only`, which saves the credentials for GitHub Actions and changes nothing on this machine. To sign for the OS you are on, use `desktop`. On a non-Mac, iOS credentials can only be saved with `sign ios --ci-only`.

### Without prompts

Give a file and its password and nothing is asked. The file is saved as base64, with its password, in `.env.signing`.

```bash
# Windows (a .pfx), or a certificate already in your Windows store
npx create-bini-app sign desktop ./cert.pfx "password"
npx create-bini-app sign desktop --thumbprint <sha1>
npx create-bini-app sign desktop --sign-command "<cloud signing command containing %1>"

# macOS: Developer ID .p12, with optional notarization
npx create-bini-app sign desktop ./dev-id.p12 "password" --api-issuer ID --api-key KEY --api-key-file ./AuthKey.p8
npx create-bini-app sign macos ./dev-id.p12 "password" --api-issuer ID --api-key KEY --api-key-file ./AuthKey.p8 --ci-only
npx create-bini-app sign desktop --adhoc            # local testing, no Apple account

# iOS
npx create-bini-app sign ios ./dist.p12 "password" --profile ./app.mobileprovision
npx create-bini-app sign ios --team ABCDE12345      # Xcode automatic signing

# Android
npx create-bini-app sign android ./keystore.jks "password" --alias upload
npx create-bini-app sign android --generate "password"   # new keystore.jks
```

### Generated keys

Windows, Linux and Android can use a self-signed key instead of real credentials:

```bash
npx create-bini-app sign windows --generate --ci-only
npx create-bini-app sign linux --generate --ci-only
npx create-bini-app sign android --generate "password" --ci-only
```

With `--ci-only`, only a publisher name (and the keystore password for Android) is saved. The workflow creates the certificate, keystore or GPG key on the first build, saves it as a GitHub secret and reuses it afterwards. Add a repository secret `SECRETS_PAT` (a fine-grained token with **Secrets: Read and write**) so the workflow can save the key. Without it, a new key is created on every build.

Without `--ci-only`, `--generate` creates the key on this machine: a self-signed certificate on Windows, a GPG key on Linux (needs `gpg`), or a keystore for Android (needs `keytool`).

- **macOS** and **iOS** cannot be generated. Use `--adhoc` for local macOS testing, or real credentials from Apple.
- **Android** generate always needs a keystore password (at least 6 characters).
- **Linux** generated GPG keys never use a passphrase. The same key signs the AppImage and the RPM.
- **Publisher name** is prompted for (default: the project name). Pass `--publisher "Name"` to skip the prompt.
- Self-signed keys are not trusted on other people's systems. Use real credentials for store releases.
- Generating over saved credentials needs `--force` (or confirmation in the prompts). A key already created in GitHub will no longer match.

### Options

| Option | Description |
| --- | --- |
| `--ci-only` | Only save the values for GitHub Actions; skip the local keychain, certificate store and Gradle setup |
| `--generate` | Create a new key (Windows, Linux, Android) |
| `--publisher <name>` | Publisher name for a generated key |
| `--alias <name>` / `--key-password <pw>` | Android key alias (default `upload`) and key password |
| `--thumbprint <sha1>` | Windows certificate already in the certificate store |
| `--sign-command "<cmd>"` | Windows cloud or hardware signing; the command must contain `%1` |
| `--identity "<name>"` | macOS signing identity (read from the certificate if omitted) |
| `--adhoc` | macOS ad-hoc signing for local testing |
| `--api-issuer`, `--api-key`, `--api-key-file` | App Store Connect API key (notarization, and iOS CI automatic signing) |
| `--apple-id`, `--apple-password`, `--team` | Notarization with an Apple ID and app-specific password |
| `--profile <file>` | iOS provisioning profile (`.mobileprovision`) |
| `--team <TEAMID>` | Apple Team ID (10 letters and numbers) |
| `--force` | Replace saved values when generating with `--ci-only` |

Prefer environment variables for passwords, which keeps them out of shell history and process lists (and is required for a password that starts with `-`): `BINI_SIGN_PASSWORD`, `BINI_KEY_PASSWORD`, `BINI_APPLE_PASSWORD`.

### Where things are saved

- `.env.signing`: GitHub Actions values. Git-ignored, never commit it.
- `src-tauri/tauri.windows.conf.json` and `src-tauri/tauri.macos.conf.json`: local Windows and macOS signing settings. Tauri merges them automatically on that OS, and they are git-ignored, so the committed `tauri.conf.json` never points at a certificate that only exists on your machine.
- `src-tauri/tauri.cloud-sign.conf.json`: the cloud signing command. Use it with `{{PM}} run tauri:build --config src-tauri/tauri.cloud-sign.conf.json` (with npm: `npm run tauri:build -- --config ...`).
- `keystore.jks` (project root) and `src-tauri/gen/android/keystore.properties`: Android signing. The Gradle release `signingConfig` is wired automatically, and secrets stay in the git-ignored properties file.
- `.bini-signing/`: the private key and certificate request if you create an Apple certificate request with the CLI. Back it up.
- `bundle.iOS.developmentTeam` in `tauri.conf.json`: the iOS Team ID, which is safe to commit.

Running `sign` again on a platform that is already configured asks before replacing anything.

Tauri signing guides: [macOS](https://v2.tauri.app/distribute/sign/macos/), [Windows](https://v2.tauri.app/distribute/sign/windows/), [Linux](https://v2.tauri.app/distribute/sign/linux/), [iOS](https://v2.tauri.app/distribute/sign/ios/), [Android](https://v2.tauri.app/distribute/sign/android/).

---

## Features

- File-based routing, layouts, and code splitting (**bini-router**)
- API routes in `src/app/api/` (Vite middleware in dev, **bini-server** in production)
- Static site generation (**bini-ssg**) from `render()` in `src/main.{{MAIN_EXT}}`
- Dev overlay with error highlighting (**bini-overlay**)
- Environment variables (**bini-env**)
- Lint and format with **Oxlint** and **Oxfmt**{{TS_NOTE}}

---

## Desktop and mobile (Tauri v2)

Native targets add `src-tauri/` and the scripts above. Tauri scripts set `TAURI=true` so the dev server binds to `0.0.0.0:3000` (or `TAURI_DEV_HOST`) and does not open a browser. Release builds run `{{PM}} run build` first, so the native app ships the same prerendered HTML as the web (`dist/`).

See the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/), and run `{{PM}} run doctor` to check your machine.

- **Desktop**: build on the OS you target; regenerate icons with `{{PM}} run tauri:icon`.
- **Android**: commit `src-tauri/gen/android`; keep secrets out of git.
- **iOS**: requires macOS with Xcode.

### Building in GitHub Actions

`{{PM}} run deploy` can generate GitHub Actions workflows for native targets (`.github/workflows/desktop.yml`, `android.yml`, `ios.yml`), so you can build for any OS without owning that machine (no Mac needed for iOS). Run a workflow from the Actions tab, or push a tag such as `v1.0.0`, and download the builds from the run's **Artifacts**.

Saved signing values from `.env.signing` are uploaded as GitHub secrets. Targets with no signing values build unsigned (macOS signs ad-hoc, and iOS builds for the simulator only).

---

## Exit codes

The CLI exits with `0` on success, `1` on an error, and `2` when it finished but something still needs manual attention (for example a failed init, or a target whose signing is incomplete). Manual follow-ups are listed at the end of the output.

---

**Docs:** [bini.js.org](https://bini.js.org)  
**Built with** Bini.js v{{BINIJS_VERSION}}