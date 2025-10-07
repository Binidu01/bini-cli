# 🌀 Bini.js

**The World’s Fastest & Most Secure React Framework**

Bini.js is **the first source-code-protected React framework** powered by **Vite**, designed for developers who demand **blazing speed, modern features, and total source-code security**.

![npm](https://img.shields.io/npm/v/create-bini-app?style=for-the-badge\&logo=npm\&color=CB3837)
![npm](https://img.shields.io/npm/dm/create-bini-app?style=for-the-badge\&logo=npm\&label=downloads)
![JavaScript](https://img.shields.io/badge/JavaScript-f1e05a?style=for-the-badge\&logo=javascript\&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge\&logo=react\&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge\&logo=vite\&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge\&logo=tailwind-css\&logoColor=white)

```
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██   ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝

             Developed By Binidu
```

---

## ✨ Features

* ⚡ **Blazing-fast Vite compilation** with native ES modules
* 🔒 **Full source-code protection** – compiled apps never expose source
* 🔄 **Client-side routing** with React Router DOM
* 🎨 **Multiple styling options** – Tailwind CSS, CSS Modules, or None
* 💉 **Runtime code injection system** for dynamic scripts and styles
* 🔥 **Hot Module Replacement (HMR)** for instant updates
* 📘 **TypeScript support** (optional)
* 📱 **Fully responsive** for desktop, tablet, and mobile
* 🗄️ **Built-in API routes** ready for Firebase, MongoDB, or any database

---

## 🚀 Quick Start

Create a new Bini.js app interactively:

```bash
npx create-bini-app@latest my-bini-app
cd my-bini-app
npm install
```

## 🏃 Running the Development Server

Start the development server:

```bash
npm run dev
```

This starts the Vite server with Bini.js branding at **[http://localhost:3000](http://localhost:3000)**

## 📦 Running Production

Build and preview your app:

```bash
npm run build
npm start
```

The `dist/` folder contains your production-ready, source-code-protected application.

---

## 🗂️ Project Structure

```
my-bini-app/
├── src/
│   ├── pages/         # Page components (Home, About, etc.)
│   ├── components/    # Reusable React components
│   ├── styles/        # Global CSS / Tailwind styles
│   ├── api/           # File-based API routes
│   │   ├── hello.js
│   │   ├── users.js
│   │   ├── database-example.js
│   │   └── posts/
│   │       ├── index.js
│   │       └── [id].js
│   ├── App.jsx/tsx    # Main App with routing
│   └── main.jsx/tsx   # Entry point
├── index.html         # Vite HTML template
├── vite.config.js     # Vite config with API plugin
├── package.json
├── tailwind.config.js # If Tailwind selected
└── tsconfig.json      # If TypeScript enabled
```

---

## 🔧 API Routes

Bini.js provides **file-based API routes** just like Next.js.

Example routes:

```
GET /api/hello          -> Returns a hello message
GET /api/users          -> Returns a list of users
POST /api/users         -> Create a new user
GET /api/posts          -> Returns all posts
GET /api/posts/1        -> Returns post with ID 1
```

Add Firebase, MongoDB, or any database by modifying `src/api/database-example.js` and setting environment variables in `.env`.

---

## 💉 Runtime Code Injection

Inject dynamic scripts or styles at runtime:

```js
// Inject custom script
window.biniInjector.injectCode({ id: 'analytics', code: 'console.log("Analytics loaded")', type: 'script' });

// Inject custom style
window.biniInjector.injectCode({ id: 'theme', code: 'body { background: #f0f0f0; }', type: 'style' });

// Remove injection
window.biniInjector.removeInjection('analytics');
```

---

## 🎨 Styling Options

* **Tailwind CSS** (recommended)
* **CSS Modules**
* **None** – bring your own solution

---

## 📝 Available Scripts

* `npm run dev` – Start development server with Bini.js branding
* `npm run build` – Build production app (source-code protected)
* `npm start` – Preview production build
* `npm run preview` – Vite preview server

---

## ⚡ Performance & Security

* Instant HMR and fast development with Vite
* Minimal bundle sizes with tree-shaking
* Pre-bundled dependencies for rapid installs
* Fully source-code-protected: no raw JSX/TSX is served

---

## 🏗️ Use Cases

Perfect for building:

* SaaS dashboards
* Landing pages
* Blogs & content platforms
* E-commerce sites
* Admin panels
* Modern web applications that require **speed and source-code security**

---

## 🤝 Contributing

We welcome contributions! Submit issues and pull requests.

---

## 📄 License

MIT License

---

**Built with ❤️ using Bini.js v${BINIJS_VERSION} | Fast, Secure, Developer-Friendly**
