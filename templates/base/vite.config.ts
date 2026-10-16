import { defineConfig, loadEnv, type UserConfig, type ServerOptions } from 'vite';
import react from '@vitejs/plugin-react';
import { biniroute } from 'bini-router';
import { biniOverlay } from 'bini-overlay';
import { biniEnv } from 'bini-env';
import { biniSSG } from 'bini-ssg';
{{TAILWIND_IMPORT}}

export default defineConfig(async ({ mode, isSsrBuild }): Promise<UserConfig> => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env['PORT'] ?? '3000', 10);

  const isTauri = env['TAURI'] === 'true' || process.env.TAURI === 'true';
  const tauriDevHost = process.env.TAURI_DEV_HOST;
  const isCodespace = !!env['CODESPACE_NAME'];

  const host = tauriDevHost || (isTauri || isCodespace ? '0.0.0.0' : 'localhost');

  const hmrConfig: ServerOptions['hmr'] = tauriDevHost
    ? { protocol: 'ws', host: tauriDevHost, port: port + 1, overlay: false }
    : isCodespace
      ? { clientPort: 443, overlay: false }
      : { overlay: false, host: 'localhost', protocol: 'ws' };

  const nativePkg = 'bini-native';
  const native = isTauri && !isSsrBuild ? (await import(/* @vite-ignore */ nativePkg)).biniNative() : null;

  return {
    plugins: [{{TAILWIND_PLUGIN}}
      react(),
      biniroute(),
      biniOverlay(),
      biniEnv(),
      biniSSG(),
      native,
    ],

    server: {
      port,
      host,
      open: !isTauri,
      cors: true,
      hmr: hmrConfig,
      watch: {
        usePolling: isCodespace || isTauri,
        ignored: [
          '**/dist/**',
          '**/node_modules/**',
          ...(isTauri ? ['**/src-tauri/**'] : []),
        ],
      },
      strictPort: isTauri,
    },

    preview: {
      port,
      host: '0.0.0.0',
      open: true,
      cors: true,
    },

    build: {
      outDir: 'dist',
      modulePreload: { polyfill: false },
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        output: {
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo: { name?: string; names?: string[] }) => {
            const name = assetInfo.names?.[0] ?? assetInfo.name ?? '';
            const ext = name.split('.').pop()?.toLowerCase() || '';
            if (/png|jpe?g|gif|svg|webp|avif/.test(ext)) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/woff2?|eot|ttf|otf/.test(ext)) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            if (ext === 'css') return 'css/[name]-[hash][extname]';
            if (ext === 'json') return 'data/[name]-[hash][extname]';
            return 'assets/[name]-[hash][extname]';
          },
        },
        onwarn(
          warning: { code?: string; message?: string },
          warn: (warning: any) => void,
        ) {
          const ignoreCodes = [
            'MODULE_EXTERNALIZED',
            'INEFFECTIVE_DYNAMIC_IMPORT',
            'UNRESOLVED_IMPORT',
          ];
          const ignoreMessages = [
            'stream',
            'externalized',
            'dynamic import will not move module',
          ];
          const code = warning.code || '';
          const message = warning.message || '';

          if (ignoreCodes.includes(code)) return;
          if (ignoreMessages.some((msg) => message.includes(msg))) return;
          warn(warning);
        },
      },
    },

    resolve: {
      alias: { '@': '/src' },
    },

    css: {
      modules: { localsConvention: 'camelCase' },
      devSourcemap: true,
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
  };
});