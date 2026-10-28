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

Dependencies are installed automatically when the project is created, unless `--no-install` was used. A git repository is initialized too, unless `--no-git` was used, `git` is missing, or the folder is already inside a repository.

### Package manager

The CLI picks the package manager in this order:

1. An explicit flag: `--npm`, `--pnpm`, `--yarn` or `--bun` (it must be on your `PATH`). Only one may be given.
2. Inside an existing project: the lockfile (`bun.lockb`, `bun.lock`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, checked in that order).
3. The tool that launched the CLI (`npx`, `pnpm dlx`, `yarn dlx`, `bunx`). This is what decides for a brand-new project.
4. npm.

---

## Creating a project

```bash
npx create-bini-app my-app
npx create-bini-app my-app --typescript --tailwind --platform web
npx create-bini-app my-app --yes --typescript --tailwind --platform web,android --org com.acme
```

In a terminal, anything you do not set with a flag is asked interactively (language, styling, platforms, and for native targets the app name and organization). With `--yes`, or when there is no terminal, every unanswered question takes its default, and a project name must be passed as the first argument.

| Option | Description |
| --- | --- |
| `--typescript` / `--javascript` | Language (default: TypeScript). `--no-typescript` is an alias for `--javascript` |
| `--tailwind` / `--css-modules` / `--none` | Styling (default: Tailwind). Only one may be given |
| `--platform <list>` | Comma-separated or repeated: `web`, `desktop`, `android`, `ios` (default: `web`). `ios` is only offered on macOS; on other systems it is skipped with a warning |
| `--app-name [name]` | App name, used as the site title and the Tauri app name and window title. With no value, you are prompted |
| `--org [domain]` | Bundle ID prefix as a reverse domain (default: `com.bini`). With no value, you are prompted |
| `--yes`, `-y` | No prompts: accept every default not set by a flag, and skip every confirmation. Code signing setup is skipped too, because it needs prompts |
| `--no-install` | Skip installing dependencies |
| `--no-git` | Skip `git init` |
| `--force` | Delete an existing project directory and create it again |
| `--sign` / `--nosign` | Auto-confirm the "set up signing?" question, or skip signing setup, for native targets. Credentials are still asked for, so `--sign` has no effect without a terminal |
| `--npm` / `--pnpm` / `--yarn` / `--bun` | Force a package manager |
| `--help`, `-h` / `--version`, `-v` | Show help / show the CLI version |

The app name and organization are only asked for when a native target is selected. The bundle identifier is `<org>.<project name without symbols>`, for example `com.bini.myapp` (a name that starts with a digit gets an `app` prefix). Replace it with your own before publishing to an app store.

An organization is a reverse domain of dot-separated parts, each starting with a lowercase letter and containing only lowercase letters and numbers (for example `com.acme`), up to 80 characters.

Project names use lowercase letters, numbers, hyphens and dots (max 50 characters). They cannot start with `.` or `-`, cannot be `npm` or `node`, and cannot be a reserved Windows device name such as `con` or `nul`. `add`, `sign`, `remove`, `doctor`, `clean` and `upgrade` are reserved.

### Prerequisite checks

Before creating or adding a native platform, the CLI checks your machine and stops if something is missing:

- **All native targets:** Rust (`cargo`).
- **Desktop:** WebView2 on Windows, `webkit2gtk-4.1` on Linux, Xcode command line tools on macOS.
- **iOS (macOS only):** Xcode command line tools.
- **Android:** a JDK (17), `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) and `NDK_HOME`.

See the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

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
| `{{PM}} run sign` | Set up or redo code signing (`npx create-bini-app sign`). Native projects only |
| `{{PM}} run doctor` | Check the machine for Tauri (`tauri info`). Native projects only |
| `{{PM}} run clean` | Delete build output (see below); keeps `node_modules` |
| `{{PM}} run upgrade` | Update dependencies and copy the latest template files |
| `{{PM}} run deploy` | Deploy to GitHub (generates the GitHub Actions workflows) |

`doctor`, `clean` and `upgrade` are also available as `npx create-bini-app doctor`, `npx create-bini-app clean` and `npx create-bini-app upgrade`.

When the first native platform is added, these scripts are added to `package.json`: `dev:native` (plain `vite`, which Tauri runs before `tauri dev`), `tauri`, `tauri:dev`, `tauri:build`, `tauri:icon`, `android`, `android:build`, `ios`, `ios:build`, `sign` and `doctor`. Existing scripts with the same name are not overwritten. The desktop, Android and iOS scripts only work after that platform exists.

**`clean`** removes `dist/` and `dist-ssr/`, the Android build output (`src-tauri/gen/android/app/build`, `src-tauri/gen/android/build`, `src-tauri/gen/android/.gradle`), the iOS build output (`src-tauri/gen/apple/build`, `src-tauri/gen/apple/Externals`), and the Rust build cache (`cargo clean`, falling back to deleting `src-tauri/target`).

**`doctor`** runs `tauri info`. It does nothing if the project has no native platform, and exits with `2` if `tauri info` fails.

**`upgrade`** moves every registry dependency in `package.json` to its latest version (your package manager records what it resolved to) and runs `cargo update` if `src-tauri/Cargo.toml` exists. Dependencies that are not plain registry versions (`file:`, `link:`, `workspace:`, `portal:`, `patch:`, `git`, `github:`, URL and `npm:` specs) are left alone. It then copies the latest template files over the project root, skipping `src/`, `package.json` and `vite.config.*`, so other template files you edited (including this README) are overwritten. If `bundle.iOS.developmentTeam` is set in `tauri.conf.json`, it is moved to the git-ignored `tauri.ios.conf.json`. Commit first so you can review the diff; the CLI warns when the git working tree is dirty.

---

## Platforms

Run these from inside the project (or a subfolder up to 5 levels below its root). A project is recognized by `bini-router` in its `package.json`. With no targets, `add` and `remove` **prompt** you to pick platforms from a list, and running `npx create-bini-app` with no arguments inside a project offers to add a platform.

| Command | Description |
| --- | --- |
| `npx create-bini-app add` | Add a platform (pick from a list) |
| `npx create-bini-app add <target>` | Add `desktop`, `android` or `ios` (comma- or space-separate for several, e.g. `android,ios`) |
| `npx create-bini-app add desktop --nosign` | Add desktop and skip signing prompts |
| `npx create-bini-app --platform <list>` | Same as `add <list>` |
| `npx create-bini-app remove` | Remove a platform (pick from a list) |
| `npx create-bini-app remove <target>` | Remove `desktop`, `android` or `ios` |
| `npx create-bini-app remove desktop android ios --yes` | Remove every native target without confirmation |
| `npx create-bini-app --app-name` | Change the native app name (prompts) |
| `npx create-bini-app --org` | Change the bundle ID prefix (prompts) |
| `npx create-bini-app --app-name "My App" --org com.acme` | Change both without prompts |

**Adding.** The first native platform adds the native scripts and dependencies (`@tauri-apps/api`, `@tauri-apps/cli`, `cross-env`, `bini-native`) to `package.json`, installs them (unless `--no-install`), and creates `src-tauri/` with your app name, bundle identifier and icons generated from `public/logo.png`. Your `vite.config` and the files in `src/` are not modified. Platforms that are already configured are skipped (with `--sign`, only their signing step runs; an added desktop target whose signing for your OS is not configured yet is offered signing again). Each added platform then offers to set up code signing, unless `--nosign` is given. iOS can only be added on macOS; on other systems, run `{{PM}} run deploy` and choose iOS to build it with GitHub Actions. Android setup also adds the Rust Android targets with `rustup`. Language and styling flags (`--typescript`, `--tailwind`, ...) are ignored when adding.

**Removing.** Removing Android or iOS deletes `src-tauri/gen/android` or `src-tauri/gen/apple` (for Android this includes the keystore copy and `keystore.properties` inside it), and the matching scripts in `package.json` if you have not changed them. A `keystore.jks` in the project root is kept in this case. `desktop` shares `src-tauri/` with the mobile targets, so it can only be removed together with them. Removing everything native:

- deletes all of `src-tauri/` (including any Rust code you wrote);
- removes the native scripts (if unchanged) and every `@tauri-apps/*` package and `cross-env` from `package.json`, and runs your package manager's uninstall for them (`bini-native` is left in place);
- replaces `src/main.{{MAIN_EXT}}` with the latest template, which has no Tauri imports;
- deletes `.env.signing`, `keystore.jks`, and any `*.p12`, `*.pfx`, `*.p8`, `*.mobileprovision`, `*.jks` or `*.keystore` file in the project root.

`vite.config` and `.gitignore` are left unchanged. Removing asks for confirmation unless you pass `--yes` (which is required when there is no terminal).

**Renaming.** The native name and bundle identifier live in `src-tauri/tauri.conf.json`. The title in `src/app/layout.{{MAIN_EXT}}` is web-only and is never changed by the CLI. Changing the bundle ID makes app stores treat the app as a different one, so the CLI asks first (unless `--yes`; without a terminal, `--yes` is required). Renaming also updates the app name in a generated Android project (`strings.xml`). The generated Android and iOS projects keep the old bundle ID, and iOS keeps its old display name, until you rename them manually or remove and re-add the platform, so commit first. Renaming does nothing if the project has no native platform yet.

`--app-name` and `--org` passed to `add` only take effect when Tauri is first set up.

---

## Code signing

Self-signed certificates are not supported: real credentials are required for distribution. Unsigned builds work, with platform warnings (SmartScreen, Gatekeeper, iOS simulator only). Credentials are saved in `.env.signing` (git-ignored, mode `600`) and uploaded as GitHub secrets by `{{PM}} run deploy`. Local builds mostly do not read `.env.signing`: they are signed from your local config, keychain and Xcode. The exceptions are Linux GPG signing and macOS notarization, where you load the file into your shell first (`set -a; source .env.signing; set +a`) before running `{{PM}} run tauri:build`.

| Target | What you need |
| --- | --- |
| Windows | A `.pfx` file and its password, a certificate thumbprint already in your Windows store, or a cloud/hardware signing command containing `%1` (for example `artifact-signing-cli`) |
| macOS | A Developer ID `.p12` with its password and signing identity; notarization via an App Store Connect API key or an Apple ID. `--adhoc` for local testing |
| Linux | Your own GPG key (`gpg --full-gen-key`); `gpg` must be installed |
| iOS | An Apple Distribution `.p12` with a provisioning profile and Team ID, or just a Team ID for Xcode automatic signing |
| Android | A keystore (`.jks`, `.keystore`, `.p12` or `.pfx`) with its alias and passwords |

### Choosing a target

| Command | Description |
| --- | --- |
| `npx create-bini-app sign` | Prompts for everything that applies on this machine (needs a terminal) |
| `npx create-bini-app sign desktop` | Sign for the OS you are on |
| `npx create-bini-app sign android` | Android release signing |
| `npx create-bini-app sign ios` | iOS signing (macOS only) |
| `npx create-bini-app sign windows,linux --ci-only` | Save credentials for GitHub Actions only |

`windows`, `macos` and `linux` by name only work with `--ci-only`, which saves the credentials for GitHub Actions and changes nothing on this machine. To sign for the OS you are on, use `desktop`. On a non-Mac, iOS credentials can only be saved with `sign ios --ci-only`. With `--ci-only` and no target list, every platform in the project is used. Without `--ci-only`, the target must already be added to the project. `--nosign` cannot be used with `sign`, and `--yes` needs credentials passed as arguments.

### Without prompts

Give a file and its password and nothing is asked. The file is saved as base64, with its password, in `.env.signing`.

```bash
# Windows PC: a .pfx (also sets up local signing), or a certificate already in your Windows store
npx create-bini-app sign desktop ./cert.pfx "password"
npx create-bini-app sign desktop --thumbprint <sha1>
npx create-bini-app sign desktop --sign-command "<cloud signing command containing %1>"
# Any OS: save a .pfx for GitHub Actions only
npx create-bini-app sign windows ./cert.pfx "password" --ci-only

# macOS: Developer ID .p12 (--identity is required), with optional notarization
npx create-bini-app sign desktop ./dev-id.p12 "password" --identity "Developer ID Application: Name (TEAMID)" --api-issuer ID --api-key KEY --api-key-file ./AuthKey.p8
npx create-bini-app sign macos ./dev-id.p12 "password" --identity "Developer ID Application: Name (TEAMID)" --api-issuer ID --api-key KEY --api-key-file ./AuthKey.p8 --ci-only
npx create-bini-app sign desktop --adhoc            # on a Mac: local testing, no Apple account

# iOS: certificate + provisioning profile + Team ID
npx create-bini-app sign ios ./dist.p12 "password" --profile ./app.mobileprovision --team ABCDE12345
npx create-bini-app sign ios --team ABCDE12345      # on a Mac: Xcode automatic signing

# Android
npx create-bini-app sign android ./keystore.jks "password" --alias upload
```

`sign desktop` means the OS you are on, so a `.pfx` only goes to Windows signing on Windows (use `sign windows ... --ci-only` elsewhere), and `--thumbprint`, `--sign-command`, `--adhoc` and `sign ios --team` configure this machine, so they cannot be combined with `--ci-only`. A credential file belongs to one target, so run `sign` once per target. Passwords can also come from environment variables (see below). If a password is not given and there is a terminal, you are asked for it.

Linux signing has no credential file, so it can only be set up with prompts: `npx create-bini-app sign desktop` on Linux, or `sign linux --ci-only` anywhere. It exports your secret key from your local GPG keyring and saves it for CI. Android signing without prompts needs a keystore file.

### What each target does

- **Windows:** a `.pfx` is saved for CI (`WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`). On a Windows PC it is also imported into your user certificate store and the thumbprint is written to `src-tauri/tauri.windows.conf.json` (SHA-256, DigiCert timestamp server). `--thumbprint` writes only that local config. `--sign-command` writes `src-tauri/tauri.cloud-sign.conf.json`.
- **macOS:** the `.p12`, its password, the identity and any notarization values are saved for CI. On a Mac the certificate is also imported into your login keychain and the identity is written to `src-tauri/tauri.macos.conf.json`. `--adhoc` writes the identity `-`.
- **iOS:** certificate, password and profile are saved for CI (`IOS_CERTIFICATE`, `IOS_CERTIFICATE_PASSWORD`, `IOS_MOBILE_PROVISION`, `APPLE_DEVELOPMENT_TEAM`). On a Mac the Team ID is saved to `src-tauri/tauri.ios.conf.json`, and local builds use Xcode automatic signing (sign in with your Apple ID in Xcode > Settings > Accounts). With `--team` alone, an App Store Connect API key (`--api-issuer`, `--api-key`, `--api-key-file`) can be saved for CI automatic signing.
- **Android:** the keystore is copied to `src-tauri/gen/android/keystore.<ext>`, a git-ignored `keystore.properties` is written next to it, and the release `signingConfig` is wired into `app/build.gradle.kts` (if the file cannot be patched safely, the CLI prints the block to add by hand). The keystore, alias and passwords are also saved for CI. A `.p12`/`.pfx` keystore uses one password for the store and the key.
- **Linux:** the key is saved as `GPG_PRIVATE_KEY` (base64, for the AppImage) and `TAURI_SIGNING_RPM_KEY` (raw ASCII-armored text, for RPM), plus `SIGN`, `SIGN_KEY`, `APPIMAGETOOL_FORCE_SIGN` and, if the key has a passphrase, the passphrase values.

### Options

| Option | Description |
| --- | --- |
| `--ci-only` | Only save the values for GitHub Actions; skip the local keychain, certificate store and Gradle setup |
| `--alias <name>` / `--key-password <pw>` | Android key alias (default `upload`) and key password when it differs from the keystore password |
| `--thumbprint <sha1>` | Windows certificate already in the certificate store (40 hex characters) |
| `--sign-command "<cmd>"` | Windows cloud or hardware signing; the command must contain `%1` |
| `--identity "<name>"` | macOS signing identity, for example `"Developer ID Application: Name (TEAMID)"`. Required when passing a `.p12` |
| `--adhoc` | macOS ad-hoc signing for local testing |
| `--api-issuer`, `--api-key`, `--api-key-file` | App Store Connect API key (macOS notarization, and iOS CI automatic signing). All three are required together |
| `--apple-id`, `--team`, `--apple-password` | macOS notarization with an Apple ID and app-specific password. The password can come from `BINI_APPLE_PASSWORD` instead. Cannot be combined with the API key options |
| `--profile <file>` | iOS provisioning profile (`.mobileprovision`); needs the certificate file too |
| `--team <TEAMID>` | Apple Team ID (10 letters and numbers) |

These options only work with the `sign` command.

Prefer environment variables for passwords, which keeps them out of shell history and process lists (and is required for a password that starts with `-`): `BINI_SIGN_PASSWORD` (certificate or keystore password), `BINI_KEY_PASSWORD` (Android key password), `BINI_APPLE_PASSWORD` (Apple ID app-specific password).

### Where things are saved

- `.env.signing`: GitHub Actions values. Git-ignored, never commit it.
- `src-tauri/tauri.windows.conf.json`, `src-tauri/tauri.macos.conf.json` and `src-tauri/tauri.ios.conf.json`: local Windows, macOS and iOS signing settings (the iOS file holds the Team ID). Tauri merges them automatically on that OS, and they are git-ignored, so the committed `tauri.conf.json` never points at a certificate or team that only exists on your machine.
- `src-tauri/tauri.cloud-sign.conf.json`: the cloud signing command. Use it with `{{PM}} run tauri:build --config src-tauri/tauri.cloud-sign.conf.json` (with npm: `npm run tauri:build -- --config ...`). GitHub Actions installs the matching signing CLI when it recognises the command.
- `src-tauri/gen/android/keystore.jks` (or `.keystore` / `.p12`) and `src-tauri/gen/android/keystore.properties`: Android signing. The Gradle release `signingConfig` is wired automatically, and secrets stay in the git-ignored properties file.

Signing files (`*.jks`, `*.keystore`, `*.p12`, `*.pfx`, `*.p8`, `*.mobileprovision`, `*.key`, `keystore.properties`) are added to `.gitignore` as well.

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

Native targets add `src-tauri/` and the scripts above. Tauri scripts set `TAURI=true` so the dev server binds to `0.0.0.0:3000` (or `TAURI_DEV_HOST`) and does not open a browser. Tauri starts the dev server with `{{PM}} run dev:native` and loads `http://localhost:3000`. Release builds run `{{PM}} run build` first, so the native app ships the same prerendered HTML as the web (`dist/`).

See the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/), and run `{{PM}} run doctor` to check your machine.

- **Desktop**: build on the OS you target; regenerate icons with `{{PM}} run tauri:icon`.
- **Android**: commit `src-tauri/gen/android`; keep secrets out of git.
- **iOS**: requires macOS with Xcode.

### Building in GitHub Actions

`{{PM}} run deploy` can generate GitHub Actions workflows for native targets (`.github/workflows/desktop.yml`, `android.yml`, `ios.yml`), so you can build for any OS without owning that machine (no Mac needed for iOS). Run a workflow from the Actions tab, or push a tag such as `v1.0.0`, and download the builds from the run's **Artifacts**.

Saved signing values from `.env.signing` are uploaded as GitHub secrets. Targets with no signing values build unsigned (macOS signs ad-hoc, and iOS builds for the simulator only).

---

**Docs:** [bini.js.org](https://bini.js.org)  
**Built with** Bini.js v{{BINIJS_VERSION}}
