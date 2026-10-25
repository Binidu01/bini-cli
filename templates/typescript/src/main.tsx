import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App, {
  preloadRoute,
  routerReady,
  resetNavState,
  rootOptions,
  reportBiniError,
} from 'virtual:bini-app'

class LastResortBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      if (import.meta.env.DEV) return null
      return React.createElement(
        'div',
        {
          style: {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textAlign: 'center',
          },
        },
        React.createElement(
          'h1',
          { style: { fontSize: '1.5rem', marginBottom: '1rem' } },
          'Something went wrong'
        ),
        React.createElement(
          'pre',
          {
            style: {
              fontSize: '0.75rem',
              maxWidth: '40rem',
              overflow: 'auto',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '0.5rem',
              background: '#f9f9f9',
              textAlign: 'left',
            },
          },
          String(this.state.error.message || this.state.error)
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => this.setState({ error: null }),
            style: {
              marginTop: '1rem',
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#06b6d4',
              color: 'white',
              cursor: 'pointer',
            },
          },
          'Try again'
        )
      )
    }
    return this.props.children
  }
}

function Root({ children }: { children: React.ReactNode }) {
  return <LastResortBoundary>{children}</LastResortBoundary>
}

if (typeof window !== 'undefined') {
  const ssrFallbackRoot = document.querySelector('[data-bini-ssr-fallback]')
  const rootElement = ssrFallbackRoot ? null : document.getElementById('root')

  if (rootElement) {
    const isShell = (window as unknown as { __BINI_SHELL__?: boolean }).__BINI_SHELL__ === true
    const bootShell = rootElement.querySelector('[data-bini-boot]') !== null
    const tree = (
      <Root>
        <App />
      </Root>
    )

    if (typeof resetNavState === 'function') resetNavState()

    const ready = Promise.race([
      preloadRoute(location.pathname).then(() => routerReady()),
      new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
    ]).catch((err: unknown) => {
      reportBiniError(err, '', 'uncaught')
    })

    void ready.then(() => {
      try {
        if (isShell || bootShell || !rootElement.hasChildNodes()) {
          createRoot(rootElement, rootOptions).render(tree)
        } else {
          hydrateRoot(rootElement, tree, rootOptions)
        }
      } catch (err) {
        reportBiniError(err, '', 'uncaught')
      }
    })
  }
}

export { App }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function render(url: string): Promise<string> {
  const ReactDOMServer = await import('react-dom/server')
  const { createElement } = await import('react')
  const { StaticRouter } = await import('react-router-dom')
  const {
    AppRoutes,
    basename: rawBasename,
    preloadRoute: preload,
    resetNavState: reset,
  } = await import('virtual:bini-app')
  const { Writable } = await import('stream')

  if (typeof reset === 'function') reset()

  const basename: string = rawBasename

  const normalizedBase = basename === '/' ? '' : basename.replace(/\/$/, '')

  const routePath = url.startsWith('/') ? url : `/${url}`

  const fullUrl =
    normalizedBase && !routePath.startsWith(normalizedBase)
      ? `${normalizedBase}${routePath}`
      : routePath

  try {
    await preload(routePath)
  } catch {
    /* render anyway */
  }

  const fallbackPage = (error: unknown): string => {
    const message = error instanceof Error ? error.message : String(error)
    return (
      `<!doctype html><html><head><meta charset="utf-8"><title>Server render error</title></head>` +
      `<body>` +
      `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;font-family:system-ui,sans-serif;text-align:center">` +
      `<h1 style="font-size:1.5rem;margin:0 0 1rem">Server render error</h1>` +
      `<pre style="max-width:48rem;font-size:0.75rem;padding:0.75rem;border:1px solid #ddd;border-radius:0.5rem;background:#f9f9f9;overflow:auto;text-align:left">${escapeHtml(message)}</pre>` +
      `</div>` +
      `</body></html>`
    )
  }

  return new Promise<string>((resolve, reject) => {
    let html = ''
    const writable = new Writable({
      write(chunk, _enc, callback) {
        html += chunk.toString()
        callback()
      },
    })

    let settled = false
    const finish = (value: string) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const { pipe } = ReactDOMServer.renderToPipeableStream(
      createElement(StaticRouter, { location: fullUrl, basename }, createElement(AppRoutes)),
      {
        onAllReady() {
          writable.on('finish', () => finish(html))
          writable.on('error', (err: unknown) => {
            if (import.meta.env.DEV) {
              if (settled) return
              settled = true
              reject(err)
              return
            }
            finish(fallbackPage(err))
          })
          pipe(writable)
        },
        onShellError(err: unknown) {
          if (import.meta.env.DEV) {
            if (settled) return
            settled = true
            reject(err)
            return
          }
          finish(fallbackPage(err))
        },
        onError(_err: unknown) {},
      }
    )
  })
}

export async function renderLoading(): Promise<string | null> {
  const app: any = await import('virtual:bini-app')
  if (typeof app.loadRootLoading !== 'function') return null
  const { renderToStaticMarkup } = await import('react-dom/server')
  const mod = await app.loadRootLoading()
  return renderToStaticMarkup(React.createElement(mod.default))
}