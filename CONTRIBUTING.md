# Contributing to Bini.js

<p>
  <a href="https://github.com/Binidu01/bini-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-00cfff?labelColor=040a16" alt="MIT license" /></a>
  <a href="https://github.com/Binidu01/bini-cli/issues"><img src="https://img.shields.io/github/issues/Binidu01/create-bini-app?color=0077ff&labelColor=040a16" alt="Open issues" /></a>
  <a href="https://github.com/Binidu01/bini-cli/pulls"><img src="https://img.shields.io/badge/PRs-welcome-34d399?labelColor=040a16" alt="PRs welcome" /></a>
  <a href="https://github.com/Binidu01/bini-cli/discussions"><img src="https://img.shields.io/github/discussions/Binidu01/create-bini-app?color=00cfff&labelColor=040a16" alt="Discussions" /></a>
  <a href="https://github.com/Binidu01/bini-cli/graphs/contributors"><img src="https://img.shields.io/github/contributors/Binidu01/create-bini-app?color=0077ff&labelColor=040a16" alt="Contributors" /></a>
</p>

Thanks for taking the time to contribute! Bini.js is a small ecosystem of focused packages, and contributions of any size — a typo fix, a bug report, a new feature — are welcome.

This guide covers how the project is organized, how to get a package running locally, and what we look for in a pull request.

---

## Code of Conduct

This project follows a [Code of Conduct](./CODE_OF_CONDUCT.md), adapted from the Contributor Covenant. By participating, you're expected to uphold it — the short version is: be respectful, be constructive, and disagreements should be about the code, not the person.

---

## Ways to Contribute

You don't need to write code to help:

- **Report a bug** — open an [issue](https://github.com/Binidu01/bini-cli/issues) with a minimal reproduction.
- **Request a feature** — open an issue describing the problem you're trying to solve, not just the solution you have in mind.
- **Improve the docs** — typos, unclear wording, missing examples, and outdated snippets are all fair game.
- **Answer questions** — help other users in [Discussions](https://github.com/Binidu01/bini-cli/discussions).
- **Submit a pull request** — bug fixes, new features, or refactors.

For anything beyond a small fix, **please open an issue first** to discuss the change before writing code. This avoids duplicated effort and makes sure the feature fits the direction of the project.

---

## Repository Layout

Bini.js is split across several repositories under [github.com/Binidu01](https://github.com/Binidu01), one per package. Pick the one that matches what you're changing:

| Repository | Package | What it does |
|---|---|---|
| [`create-bini-app`](https://github.com/Binidu01/bini-cli) | `create-bini-app` | Project scaffold CLI |
| [`bini-router`](https://github.com/Binidu01/bini-router) | `bini-router` | File-based routing, layouts, MDX, API routes |
| [`bini-deploy`](https://github.com/Binidu01/bini-deploy) | `bini-deploy` | Hosting config generation + GitHub push |
| [`bini-native`](https://github.com/Binidu01/bini-native) | `bini-native` | Tauri plugin wiring for desktop/mobile |
| [`bini-server`](https://github.com/Binidu01/bini-server) | `bini-server` | Production Node.js server |
| [`bini-export`](https://github.com/Binidu01/bini-export) | `bini-export` | Static SPA export |
| [`bini-env`](https://github.com/Binidu01/bini-env) | `bini-env` | Environment variable system |
| [`bini-overlay`](https://github.com/Binidu01/bini-overlay) | `bini-overlay` | Dev error overlay + loading badge |

If you're not sure which repo a bug belongs to, open the issue on `create-bini-app` and we'll redirect it.

---

## Development Setup

### Requirements

- **Node.js** ≥ 20.19.0
- **git**
- A package manager — npm, pnpm, yarn, or bun all work; examples below use `pnpm`

### Getting started

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/<package-name>.git
cd <package-name>

# 2. Install dependencies
pnpm install

# 3. Build the package
pnpm build
```

### Testing your changes against a real project

Most of these packages are Vite plugins or CLIs, so the fastest way to verify a change is against a real scaffolded app:

```bash
# Scaffold a throwaway test app somewhere outside the package repo
npx create-bini-app@latest test-app
cd test-app

# Link your local package build into it
npm link ../path/to/bini-router   # or pnpm link --global, or yarn link

npm run dev
```

For `create-bini-app` itself, run the CLI directly against a scratch directory:

```bash
node ./bin/create-bini-app.js my-test-app --typescript --tailwind
```

---

## Making Changes

### Branching

Branch off `main`:

```bash
git checkout -b fix/short-description
# or
git checkout -b feat/short-description
```

### Commit messages

We loosely follow [Conventional Commits](https://www.conventionalcommits.org/):

```
fix: correct ETag header on 304 responses
feat: add catch-all route support to bini-export
docs: fix biniroute() spread example in README
chore: bump hono to 4.x
```

This isn't strictly enforced, but it makes the changelog and `git log` much more useful — please try to follow it.

### Code style

Bini.js projects use **Oxlint** and **Oxfmt** (Rust-based, much faster than ESLint/Prettier) instead of the usual JS tooling. Before opening a PR:

```bash
pnpm lint      # Oxlint
pnpm format    # Oxfmt
pnpm check     # both + type-check — this is what CI runs
```

General guidelines:

- **TypeScript** for all new code. Avoid `any` unless you're bridging a genuinely untyped boundary (and leave a comment explaining why).
- Match the existing formatting rather than introducing a new style — `pnpm format` should make this automatic.
- Keep pull requests focused. A PR that fixes a bug *and* refactors an unrelated module is harder to review and harder to revert if something goes wrong.
- Zero-dependency packages (`bini-server`, `bini-native`) should stay that way — think twice before adding a new runtime dependency, and explain the tradeoff in your PR description if you do.

### Tests

If the package has a test suite, run it before submitting:

```bash
pnpm test
```

New features and bug fixes should come with a test that would have caught the bug, where practical. If a change is hard to unit test (e.g. Vite plugin wiring, file-watcher behavior), a clear manual reproduction/verification checklist in the PR description is an acceptable substitute — say so explicitly so reviewers know what was and wasn't automated.

---

## Submitting a Pull Request

1. Make sure `pnpm check` passes locally.
2. Push your branch and open a PR against `main` on the relevant repo.
3. Fill in the PR template (if present) or describe:
   - **What** the change does
   - **Why** it's needed (link the issue if one exists)
   - **How** you tested it
4. Link related issues with `Closes #123` in the PR description so they close automatically on merge.
5. Be responsive to review feedback — most PRs go through at least one round of revisions.

Small, incremental PRs are much easier to review than one large PR touching many files. If a change is genuinely large, consider breaking it into a series of smaller PRs where possible.

---

## Reporting Bugs

A good bug report saves everyone time. Please include:

- **Package + version** (e.g. `bini-router@1.0.42`)
- **Node.js version** and OS
- **A minimal reproduction** — ideally a link to a small repo or a `create-bini-app` scaffold with the minimum changes needed to trigger the bug. A wall of your entire production app is much harder to debug than five lines that reproduce the issue.
- **Expected vs. actual behavior**
- Any relevant terminal output or stack trace

Security issues should **not** be filed as public issues — see [Security](#security) below.

---

## Security

If you find a security vulnerability, please do not open a public issue. Instead, reach out directly via GitHub to [@Binidu01](https://github.com/Binidu01) so it can be addressed before public disclosure.

---

## Questions?

- General questions and ideas → [GitHub Discussions](https://github.com/Binidu01/bini-cli/discussions)
- Bugs → [GitHub Issues](https://github.com/Binidu01/bini-cli/issues) on the relevant package repo
- Documentation → [bini.js.org/docs](https://bini.js.org/docs)

---

Thanks again for contributing — Bini.js is better because of people who take the time to report bugs, suggest improvements, and send patches. 🙏

MIT © [Binidu Ranasinghe](https://github.com/Binidu01)
