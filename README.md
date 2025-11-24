<div align="center">

```
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████║
██╔══██╗██║██║╚██╗██║██║ ██╗  ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝
```

### Build lightning-fast, source-protected React apps — powered by Vite & Fastify

[![npm version](https://img.shields.io/npm/v/create-bini-app?color=00CFFF&label=npm&style=for-the-badge)](https://www.npmjs.com/package/create-bini-app)
[![total downloads](https://img.shields.io/npm/dt/create-bini-app?color=764ba2&style=for-the-badge&label=downloads)](https://www.npmjs.com/package/create-bini-app)
[![license](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](https://github.com/Binidu01/bini-cli/blob/main/LICENSE)
[![node version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=for-the-badge)](https://nodejs.org)

[![vite](https://img.shields.io/badge/vite-6.0.5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![react](https://img.shields.io/badge/react-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![fastify](https://img.shields.io/badge/fastify-4.28-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://fastify.io)
[![typescript](https://img.shields.io/badge/typescript-5.7.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## 🎯 Bini.js v9.2.3

A production-ready React framework that combines the best of Next.js, Vite, and Fastify. Build modern web applications with file-based routing, built-in API routes, and zero-config deployment to any Node.js server.

**Works everywhere** — Vercel, Netlify, Heroku, Railway, GitHub Codespaces, and traditional VPS servers.

---

## ✨ What's New in v9.2.3

### 📁 Standard Build Output
- ✅ **`dist/` folder** — Industry-standard output (no `.bini/dist`)
- ✅ Works with all CI/CD pipelines
- ✅ Compatible with major hosting platforms

### 🔄 Advanced File-Based Routing
- ✅ **File-based routes** — `admin.tsx` → `/admin`
- ✅ **Folder-based routes** — `admin/page.tsx` → `/admin`
- ✅ **Priority system** — File-based takes precedence
- ✅ **Dynamic routes** — `[id]`, `[...slug]` patterns
- ✅ **Custom 404 pages** — `not-found.tsx`

### 🚀 Universal Deployment
- ✅ **All Node.js servers** — Vercel, Netlify, Heroku, Railway, Render, etc.
- ✅ **Zero config** — Works out of the box
- ✅ **Production ready** — Fastify, security, rate limiting included
- ✅ **Auto-opening browser** — dev, preview, and start commands

⚠️ **Not supported** — GitHub Pages, static hosting (requires Node.js runtime)

### 🔌 API Routes Everywhere
- ✅ TypeScript & JavaScript support
- ✅ Dynamic routes with parameters
- ✅ Full request/response handling
- ✅ Works in development & production

---

## 🚀 Quick Start

```bash
# Create new project
npx create-bini-app@latest my-app

# Install dependencies
cd my-app
npm install

# Start development server (auto-opens browser)
npm run dev
```

Opens http://localhost:3000 automatically.

---

## 📊 Commands

| Command | Purpose | Browser | Server |
|---------|---------|---------|--------|
| `npm run dev` | Development with HMR | ✅ Auto-opens | Vite Dev |
| `npm run build` | Production build | — | — |
| `npm run preview` | Test production build | ✅ Auto-opens | Vite Preview |
| `npm run start` | Production server | ✅ Auto-opens | Fastify |

---

## 🏗️ Project Structure

```
my-app/
├── src/
│   ├── app/                      # App Router (Next.js style)
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # / (home)
│   │   ├── admin.tsx             # /admin (file-based) ⭐
│   │   ├── dashboard.tsx         # /dashboard (file-based) ⭐
│   │   ├── products/
│   │   │   ├── page.tsx          # /products (folder-based)
│   │   │   └── [id]/
│   │   │       └── page.tsx      # /products/:id
│   │   ├── api/
│   │   │   ├── hello.ts          # POST /api/hello ⭐
│   │   │   └── users/[id].ts     # GET /api/users/:id ⭐
│   │   ├── not-found.tsx         # 404 page
│   │   └── globals.css
│   ├── components/
│   ├── App.tsx                   # Auto-generated
│   └── main.tsx
├── public/                       # Static files
├── dist/                         # Build output ⭐ NEW!
├── bini/                         # Framework internals
├── api-server.js                 # Fastify production server
├── bini.config.mjs
├── vite.config.mjs
├── tsconfig.json
└── package.json
```

---

## 🔄 File-Based Routing

### Two Routing Patterns

**File-based** — Simple single-file routes:
```
src/app/
├── admin.tsx          # /admin
├── settings.tsx       # /settings
└── profile.tsx        # /profile
```

**Folder-based** — Traditional Next.js structure:
```
src/app/
├── admin/page.tsx     # /admin
├── settings/page.tsx  # /settings
└── profile/page.tsx   # /profile
```

### Priority System

When both exist, **file-based wins**:

```
src/app/
├── admin.tsx          ✅ WINS → /admin
├── admin/page.tsx     ❌ IGNORED
```

This gives flexibility to use either pattern per route.

---

## 🔌 API Routes

### Create API Endpoints

**TypeScript:**
```typescript
// src/app/api/hello.ts
export default function handler(req: any, res: any) {
  return {
    message: 'Hello from Bini.js!',
    method: req.method,
    timestamp: new Date().toISOString()
  };
}
```

**JavaScript:**
```javascript
// src/app/api/hello.js
export default function handler(req, res) {
  return {
    message: 'Hello from Bini.js!',
    method: req.method,
    timestamp: new Date().toISOString()
  };
}
```

### Dynamic Routes

```typescript
// src/app/api/users/[id].ts
export default function handler(req: any, res: any) {
  const { id } = req.params;

  if (req.method === 'GET') {
    return { id, name: `User ${id}` };
  }

  res.status(405);
  return { error: 'Method not allowed' };
}
```

### Use in Your App

```javascript
const response = await fetch('/api/hello');
const data = await response.json();
console.log(data);
```

---

## 📦 Production Deployment

### Build for Production

```bash
npm run build
npm run start
```

Creates optimized `dist/` folder and starts Fastify server on port 3000.

### Deploy to Vercel

```bash
git push origin main
# Vercel auto-detects and deploys
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

### Deploy to Netlify (Node.js Runtime)

```bash
1. Connect GitHub repo
2. Build command: npm run build
3. Publish directory: dist
4. Enable Node.js runtime
```

### Deploy to Heroku

```bash
heroku create my-bini-app
git push heroku main
```

### Deploy to Railway

```bash
1. Connect GitHub repo
2. Railway auto-detects Node.js
3. Sets PORT automatically
```

### Deploy to VPS (Ubuntu/CentOS)

```bash
# SSH into server
ssh user@your-server.com
git clone your-repo
cd your-app

# Install and build
npm install
npm run build

# Run with PM2
npm install -g pm2
pm2 start api-server.js --name "bini-app"
pm2 save && pm2 startup
```

---

## 🌐 Deployment Compatibility

| Platform | Support | API Routes | Runtime |
|----------|---------|-----------|---------|
| **Vercel** | ✅ Full | ✅ Serverless | Node.js |
| **Netlify** | ✅ Full | ✅ Node.js | Node.js |
| **Heroku** | ✅ Full | ✅ Yes | Node.js |
| **Railway** | ✅ Full | ✅ Yes | Node.js |
| **Render** | ✅ Full | ✅ Yes | Node.js |
| **Fly.io** | ✅ Full | ✅ Yes | Node.js |
| **GitHub Codespaces** | ✅ Full | ✅ Yes | Node.js |
| **CodeSandbox** | ✅ Full | ✅ Yes | Node.js |
| **Traditional VPS** | ✅ Full | ✅ Yes | Node.js |
| **GitHub Pages** | ❌ No | ❌ No | Static |
| **Netlify Static** | ❌ No | ❌ No | Static |
| **AWS S3** | ❌ No | ❌ No | Static |

⚠️ Static hosting requires Node.js server for API routes. Use Vercel or Netlify with Node.js runtime instead.

---

## 🎨 Styling Options

Choose your preferred CSS solution:

- **Tailwind CSS** — Utility-first framework with dark mode
- **CSS Modules** — Scoped styles with `*.module.css`
- **Vanilla CSS** — Plain CSS with CSS variables

All include responsive design and blue theme (#ecf3ff).

---

## 🔒 Security & Performance

### Built-in Security
- ✅ Helmet.js security headers
- ✅ Rate limiting (100 req/15 min)
- ✅ CORS protection
- ✅ XSS prevention
- ✅ Path traversal prevention

### Performance Metrics
- **Bundle size**: 89KB (gzipped)
- **Server speed**: Fastify (2x faster than Express)
- **Build time**: <10 seconds
- **HMR updates**: <100ms

---

## 📝 Environment Variables

Automatically detected and displayed:

```bash
# .env
VITE_API_URL=https://api.example.com

# .env.local (overrides .env)
VITE_SECRET_KEY=secret123

# .env.production
VITE_API_URL=https://prod-api.example.com
```

Displayed on server startup:
```
✓ Environments: .env, .env.local
✓ Ready
```

---

## 🆚 Comparison

| Feature | Bini.js | Next.js | Remix |
|---------|---------|---------|-------|
| **Setup** | <2 min | ~5 min | ~5 min |
| **File-based routing** | ✅ Yes | ✅ Yes | ✅ Yes |
| **API routes** | ✅ Built-in | ✅ Built-in | ✅ Yes |
| **Production server** | Fastify | Vercel | Node.js |
| **Bundle size** | 89KB | 150KB | 120KB |
| **Deployment** | Anywhere | Vercel (best) | Anywhere |
| **Learning curve** | Easy | Medium | Medium |

---

## 📚 Examples

### Admin Dashboard (File-Based)
```typescript
// src/app/admin.tsx
export default function AdminPage() {
  return <h1>Admin Dashboard</h1>;
}
```

Access: `/admin`

### Product Details (Dynamic Route)
```typescript
// src/app/products/[id]/page.tsx
export default function ProductPage({ params }: any) {
  return <h1>Product {params.id}</h1>;
}
```

Access: `/products/123`

### User API (TypeScript)
```typescript
// src/app/api/users/[id].ts
export default async function handler(req: any) {
  const { id } = req.params;
  
  if (req.method === 'GET') {
    return { id, name: `User ${id}` };
  }
  
  return { error: 'Method not allowed' };
}
```

Access: `GET /api/users/123`

---

## 💡 Pro Tips

1. **Use file-based for simple pages** — Less boilerplate
2. **Use folder-based for complex layouts** — More organization
3. **Keep API routes flat** — Easier to maintain
4. **Use TypeScript for APIs** — Better type safety
5. **Test locally** — `npm run preview` before deploying

---

## 🔗 Resources

- **Website**: https://bini.js.org
- **GitHub**: https://github.com/Binidu01/bini-cli
- **NPM**: https://www.npmjs.com/package/create-bini-app
- **Issues**: https://github.com/Binidu01/bini-cli/issues
- **Discussions**: https://github.com/Binidu01/bini-cli/discussions

---

## 📄 License

MIT — Free for personal and commercial use.

---

<div align="center">

**Bini.js v9.2.3** — Built with ❤️ using Vite, React, and Fastify

*Standard dist folder · File-based routing · Works on all Node.js servers · Zero config deployment*

</div>