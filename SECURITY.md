# Security Policy

Bini.js is used to build apps that run in browsers, on servers, and as native desktop/mobile binaries — so a vulnerability in any one package can have real impact on the apps built with it. We take reports seriously and appreciate the effort that goes into finding and responsibly disclosing them.

---

## Supported Versions

Only the **latest published version** of each package on npm is actively supported with security fixes. We don't currently maintain long-term-support branches for older major versions.

| Package | Supported |
|---|---|
| `create-bini-app` | ✅ latest |
| `bini-router` | ✅ latest |
| `bini-deploy` | ✅ latest |
| `bini-native` | ✅ latest |
| `bini-server` | ✅ latest |
| `bini-export` | ✅ latest |
| `bini-env` | ✅ latest |
| `bini-overlay` | ✅ latest |

If you're on an older version, please upgrade before reporting — we'll ask you to confirm the issue reproduces on latest before investigating further.

---

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.** Public issues are indexed and searchable, which can put users at risk before a fix ships.

Instead, report privately using one of the following:

1. **GitHub Private Security Advisory** (preferred) — open one directly on the affected package's repository:
   `https://github.com/Binidu01/<package-name>/security/advisories/new`
   This keeps the discussion private between you and the maintainer until a fix is ready, and GitHub handles coordinated disclosure and CVE assignment for you.

2. **Direct contact** — message [@Binidu01](https://github.com/Binidu01) on GitHub if you're unsure which repo the issue belongs to, or if a private advisory isn't practical for your situation.

When reporting, please include:

- The affected package and version (e.g. `bini-server@1.0.10`)
- A clear description of the vulnerability and its potential impact
- Steps to reproduce, or a minimal proof-of-concept
- Whether the issue is remotely exploitable, requires local access, or requires a malicious project config/dependency

---

## What to Expect

- **Acknowledgment**: within a few days of your report.
- **Triage**: we'll confirm whether it reproduces and assess severity.
- **Fix timeline**: depends on severity and complexity — critical, remotely exploitable issues are prioritized over lower-severity ones. We'll keep you updated rather than going silent.
- **Credit**: with your permission, we'll credit you in the release notes / advisory once a fix ships. Let us know if you'd prefer to stay anonymous.
- **Disclosure**: we follow coordinated disclosure — please give us a reasonable window to ship a fix before publishing details publicly. If we go quiet or unresponsive for an extended period, you're free to disclose independently.

---

## Scope & Known Risk Areas

Bini.js is split across several packages with different trust boundaries. Some notes on what's most sensitive in each:

- **`bini-server`** — parses and serves live HTTP requests directly, including reading request bodies, resolving static file paths, and dispatching to API handlers. Path traversal, request smuggling, and body-limit/timeout bypasses are all in scope here.
- **`bini-native`** — writes to `Cargo.toml`, `src-tauri/` source files, Android manifests, and iOS Info.plist during `tauri dev`, and spawns package-manager subprocesses to install detected plugin dependencies. Anything that could result in arbitrary file writes outside `src-tauri/`, or command injection via a crafted package name, is in scope.
- **`bini-deploy`** — pushes to git repositories and can merge remote history automatically (`--allow-unrelated-histories -X ours`) in certain recovery scenarios. Anything that could cause it to push to, or read from, a repository the user didn't intend is in scope.
- **`bini-router`** — validates route segment names and dynamic parameter names, and guards against `..`/`//` path traversal in decoded URL parameters at request time. Bypasses of these guards are in scope.
- **`bini-env`** — reads environment variables through the Hono request context and controls which `BINI_*`/`VITE_*` variables are exposed to the client bundle. Any issue that could leak a non-prefixed (server-only) variable to the browser is in scope.

Vulnerabilities in third-party dependencies (e.g. `hono`, `vite`, `@tauri-apps/*`) should generally be reported upstream to those projects, but let us know too if it specifically affects how Bini.js uses them — we may need to pin a version or adjust our integration.

---

## Out of Scope

- Vulnerabilities that require the attacker to already have write access to the project's source code or `.env` files (that's a compromised developer machine, not a Bini.js vulnerability)
- Issues that only reproduce on unsupported/outdated package versions
- Denial-of-service reports based purely on missing rate-limiting in `bini-server`'s **development** mode (production mode has configurable body/handler timeouts and size limits — see the [Production Server docs](https://bini.js.org/docs/production-server))
- Best-practice suggestions without a demonstrated exploit (open these as a normal issue or discussion instead)

---

## Attribution

Thank you to everyone who reports vulnerabilities responsibly — this keeps the projects built on Bini.js safer for everyone.
