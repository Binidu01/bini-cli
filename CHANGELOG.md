<div align="center">

```
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██╗  ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝
```

# Changelog

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
  <a href="https://bini.js.org"><img src="https://img.shields.io/badge/bini.js-9.0.3-00CFFF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cG9seWdvbiBwb2ludHM9IjEyLDIgMjIsMjIgMiwyMiIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==&logoColor=white" alt="bini.js" /></a>
</p>

### ▲ Build lightning-fast, source-protected React apps — powered by Vite

</div>

---

# Changelog

All notable changes to Bini.js will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [9.0.3] - 2025-01-XX

### 🎯 Added
- **Automatic File-Based Routing** - True Next.js-like routing with zero configuration
- **Real-Time Route Updates** - Routes regenerate automatically when files are added/removed
- **Empty Page Handling** - Graceful empty page display with helpful instructions
- **Error Boundaries** - Page-level error isolation prevents app crashes
- **Live Route Watching** - File system watcher for instant route updates
- **Route Change Feedback** - Clear console messages for all route operations

### ⚡ Improved
- **Hot Reload Enhancement** - Instant component updates when adding code to empty pages
- **Debounced Regeneration** - Optimized route generation with 300ms debounce
- **Better Import Detection** - Checks for `export default` in page files
- **Enhanced Console Logging** - Detailed feedback for route additions/deletions
- **Router Plugin Performance** - Only regenerates when routes actually change

### 🔧 Fixed
- Empty pages no longer break the entire application
- Routes update without requiring server restart
- Home page remains functional when other pages have errors
- Fixed race conditions in route regeneration

### 🛡️ Security
- Added validation for page file contents
- Skip importing invalid or empty page files
- Error boundary wrapper for all routes

---

## [9.0.2] - 2025-01-XX

### 🔧 Fixed
- **Router Plugin** - Now properly handles nested routes (e.g., `/about`)
- **Route Detection** - Correctly scans all directories in `src/app/`
- **Path Resolution** - Fixed relative path imports for page components

### ⚡ Improved
- **HMR Enhancement** - Pages refresh automatically when errors are fixed
- **CLI Output** - Better progress indicators during project generation
- **Route Scanning** - Automatically detects all page files on startup
- **Error Recovery** - More resilient to file system errors

### 📦 Enhanced
- **Dependency Installation** - Multiple fallback strategies for reliability
- **Package Manager Detection** - Better support for npm, yarn, pnpm, and bun
- **Network Handling** - Improved proxy and offline support

---

## [9.0.1] - 2025-01-XX

### 🔧 Fixed
- **Command-Line Flags** - Fixed TypeScript and styling flag detection
- **Interactive Prompts** - Now correctly asks for missing options
- **Flag Parsing** - Only uses flags when explicitly set to `true`

### 🎨 Improved
- **CLI Output Formatting** - Cleaner, more professional output
- **Installation Instructions** - Conditional display based on auto-install
- **Success Messages** - Better formatting with visual separators
- **Error Messages** - More helpful error descriptions

### 🚀 Enhanced
- **Dependency Installation** - Smarter package manager detection
- **Auto-Install Flow** - Improved confirmation and feedback
- **TypeScript Detection** - More reliable TS/JS selection

---

## [9.0.0] - 2025-01-XX

### 🎉 Initial Release

#### 🚀 Core Features
- **Vite-Powered Framework** - Lightning-fast dev server and builds
- **Source Code Protection** - Hidden build output in `.bini/` directory
- **Head-Only SSR** - Perfect SEO without exposing source code
- **File-Based Routing** - Next.js-inspired directory structure
- **API Routes** - Built-in backend endpoints with rate limiting

#### 🎨 Developer Experience
- **TypeScript Support** - First-class TypeScript integration
- **Multiple Styling Options** - Tailwind CSS, CSS Modules, or plain CSS
- **Hot Module Replacement** - Instant updates during development
- **Interactive CLI** - Easy project scaffolding with prompts
- **Command-Line Flags** - Quick setup with CLI arguments

#### 🔐 Security Features
- **Source Protection** - Code hidden from browser inspection
- **No Source Maps** - Production builds exclude debugging info
- **Environment Isolation** - Secure env variable handling
- **API Rate Limiting** - Built-in request throttling
- **Path Traversal Protection** - Secure file access
- **Input Validation** - Sanitized request inputs
- **Request Timeouts** - Prevents hanging requests

#### 📦 Package Manager Support
- npm (>=9.0.0)
- Yarn (>=1.22.0)
- pnpm (>=8.0.0)
- Bun (>=1.0.0)

#### 🎯 Project Generation
- Interactive setup wizard
- Command-line flag support
- Automatic dependency installation
- Multiple package manager detection
- Force overwrite option
- Cross-platform support (Windows, macOS, Linux)

#### 📄 Generated Project Structure
- `src/app/` - Application pages and layouts
- `src/api/` - API route handlers
- `public/` - Static assets
- `.bini/` - Build output and internals
- Auto-generated configuration files
- Comprehensive README

#### 🧩 Framework Plugins
- **Router Plugin** - Automatic route generation
- **SSR Plugin** - Meta tag server-side rendering
- **Badge Plugin** - Development mode indicator
- **API Plugin** - Backend route handling

#### ⚙️ Configuration
- `bini.config.ts` - Framework settings
- `vite.config.js` - Build configuration
- `tsconfig.json` - TypeScript options
- `tailwind.config.js` - Tailwind setup (optional)

#### 📚 Documentation
- Comprehensive README
- Example pages and API routes
- Configuration guides
- Troubleshooting section

---

## Release Notes

### Version Numbering
Bini.js follows [Semantic Versioning](https://semver.org/):
- **Major** (X.0.0) - Breaking changes
- **Minor** (0.X.0) - New features, backwards compatible
- **Patch** (0.0.X) - Bug fixes, backwards compatible

### Upgrade Guide

#### From 9.0.2 to 9.0.3
No breaking changes. Routes now update automatically without server restart.

#### From 9.0.1 to 9.0.2
No breaking changes. Improved route detection and HMR.

#### From 9.0.0 to 9.0.1
No breaking changes. Better CLI experience and flag parsing.

---

## Roadmap

### 🚧 In Progress
- [ ] Plugin system for extensibility
- [ ] Edge runtime support
- [ ] Image optimization
- [ ] Internationalization (i18n)

### 🔮 Planned
- [ ] Serverless deployment adapters
- [ ] Database integrations (Prisma, Drizzle)
- [ ] Authentication helpers (NextAuth, Clerk)
- [ ] CMS integrations (Sanity, Contentful)
- [ ] Mobile app support (React Native)
- [ ] Static site generation (SSG)
- [ ] Incremental static regeneration (ISR)
- [ ] Middleware support
- [ ] Advanced caching strategies

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Reporting Issues
- [GitHub Issues](https://github.com/Binidu01/bini-cli/issues)
- Include version number
- Provide reproduction steps
- Share error messages

### Feature Requests
- [GitHub Discussions](https://github.com/Binidu01/bini-cli/discussions)
- Describe the use case
- Explain the benefit
- Suggest implementation

---

## Links

- **Website**: https://bini.js.org
- **Documentation**: https://bini.js.org/docs
- **GitHub**: https://github.com/Binidu01/bini-cli
- **NPM**: https://www.npmjs.com/package/create-bini-app
- **Discord**: https://discord.gg/binijs
- **Twitter**: https://twitter.com/binijs

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

**Built with ❤️ by [Binidu](https://github.com/Binidu01)**

[9.0.3]: https://github.com/Binidu01/bini-cli/compare/v9.0.2...v9.0.3
[9.0.2]: https://github.com/Binidu01/bini-cli/compare/v9.0.1...v9.0.2
[9.0.1]: https://github.com/Binidu01/bini-cli/compare/v9.0.0...v9.0.1
[9.0.0]: https://github.com/Binidu01/bini-cli/releases/tag/v9.0.0
