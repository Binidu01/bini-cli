import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';

const noopSubscribe = () => () => {};

function ClientOnly({ children }: { children: React.ReactNode }) {
  const hasMounted = React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  if (import.meta.env.DEV && !hasMounted) {
    return null;
  }

  return <>{children}</>;
}

if (typeof window !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const isShell = (window as unknown as { __BINI_SHELL__?: boolean }).__BINI_SHELL__ === true;

    if (isShell) {
      createRoot(rootElement).render(<App />);
    } else if (import.meta.env.DEV) {
      hydrateRoot(
        rootElement,
        <ClientOnly>
          <App />
        </ClientOnly>
      );
    } else {
      hydrateRoot(rootElement, <App />);
    }
  }
}

export { App };

export async function render(url: string): Promise<string> {
  const ReactDOMServer = await import('react-dom/server');
  const { createElement } = await import('react');
  const { StaticRouter } = await import('react-router-dom');
  const { AppRoutes, basename: rawBasename } = await import('./App');
  const { Writable } = await import('stream');

  const basename: string = rawBasename;

  const normalizedBase = basename === '/' ? '' : basename.replace(/\/$/, '');

  const routePath = url.startsWith('/') ? url : `/${url}`;

  const fullUrl = normalizedBase && !routePath.startsWith(normalizedBase)
    ? `${normalizedBase}${routePath}`
    : routePath;

  return new Promise<string>((resolve, reject) => {
    let html = '';
    const writable = new Writable({
      write(chunk, _enc, callback) {
        html += chunk.toString();
        callback();
      },
    });

    const { pipe } = ReactDOMServer.renderToPipeableStream(
      createElement(
        StaticRouter,
        { location: fullUrl, basename },
        createElement(AppRoutes)
      ),
      {
        onAllReady() {
          pipe(writable);
          writable.on('finish', () => resolve(html));
        },
        onError: (err: unknown) => {
          reject(err);
        },
      }
    );
  });
}
