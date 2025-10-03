# my-bini-app

A Bini.js application - SWC-powered React framework

## ✨ Features

- ⚡ Lightning-fast SWC compilation
- 🔄 Client-side routing (file-based concept)
- 🖥️ Server-Side Rendering (Conceptual)
- 🎨 Tailwind styling
- 🔥 Hot Module Replacement (HMR)
- 📘 TypeScript support

## 🚀 Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the development server:**
    
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

- `npm run dev` - Start webpack-dev-server with HMR and custom CLI output
- `npm run build` - Build for production
- `npm start` - Serve production build with webpack

## Learn More

Built with ❤️ using Bini.js v1.0.3
