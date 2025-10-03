# Binijs

A Bini.js application - SWC-powered React framework

![JavaScript](https://img.shields.io/badge/JavaScript-f1e05a?style=for-the-badge\&logo=javascript\&logoColor=white) ![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge\&logo=react\&logoColor=white) ![SWC](https://img.shields.io/badge/SWC-FF3E00?style=for-the-badge\&logoColor=white) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge\&logo=tailwind-css\&logoColor=white)

```
██████╗ ██╗███╗   ██╗██╗      ██╗███████╗
██╔══██╗██║████╗  ██║██║      ██║██╔════╝
██████╔╝██║██╔██╗ ██║██║      ██║███████╗
██╔══██╗██║██║╚██╗██║██║ ██   ██║╚════██║
██████╔╝██║██║ ╚████║██║ ╚█████╔╝███████║
╚═════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚════╝ ╚══════╝

             Developed By Binidu
```

## ✨ Features

* ⚡ Lightning-fast SWC compilation
* 🔄 Client-side routing (file-based concept)
* 🖥️ Server-Side Rendering (Conceptual)
* 🎨 Tailwind styling
* 🔥 Hot Module Replacement (HMR)
* 📘 TypeScript support

## 🚀 Installation

You can create a new Bini.js app using `npx`:

```bash
npx create-bini-app my-bini-app
```

Then navigate into your project and install dependencies:

```bash
cd my-bini-app
npm install
```

## 🚀 Running the Development Server

Start the development server:

```bash
npm run dev
```

This starts webpack-dev-server with hot reload and the custom CLI banner at [http://localhost:3000](http://localhost:3000)

## 📦 Project Structure

```
my-bini-app/
├── src/
│   ├── pages/         # Page components (File-based routing)
│   ├── components/    # Reusable React components
│   ├── styles/        # Global styles
│   ├── index.tsx      # Client-side router & entry point
│   └── _app.tsx       # Main app shell
├── public/            # Static assets
│   └── index.html     # HTML template
├── startDev.js        # Custom script to run webpack and display CLI output
├── webpack.config.js  # Webpack configuration
└── package.json
```

## 📝 Available Scripts

* `npm run dev` - Start webpack-dev-server with HMR and custom CLI output
* `npm run build` - Build for production
* `npm start` - Serve production build with webpack

## Learn More

Built with ❤️ using **Bini.js v1.0.3**
