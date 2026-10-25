import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App, {
  preloadRoute,
  routerReady,
  resetNavState,
  rootOptions,
  reportBiniError,
} from 'virtual:bini-app'

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    reportBiniError(error, info?.componentStack ?? '', 'uncaught')
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    const message =
      this.state.error instanceof Error
        ? this.state.error.message
        : String(this.state.error)

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Something went wrong
        </h1>
        <p
          style={{
            color: '#71717a',
            maxWidth: '32rem',
            marginBottom: '1.5rem',
          }}
        >
          An unexpected error occurred. You can try again, or reload the page.
        </p>
        {import.meta.env.DEV && (
          <pre
            style={{
              fontSize: '0.75rem',
              maxWidth: '40rem',
              overflow: 'auto',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '0.5rem',
              background: '#f9f9f9',
              textAlign: 'left',
              marginBottom: '1.5rem',
            }}
          >
            {message}
          </pre>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={this.reset}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#06b6d4',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              border: '1px solid #d4d4d8',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}

function Root({ children }) {
  return <RootErrorBoundary>{children}</RootErrorBoundary>
}

if (typeof window !== 'undefined') {
  const ssrFallbackRoot = document.querySelector('[data-bini-ssr-fallback]')
  const rootElement = ssrFallbackRoot ? null : document.getElementById('root')

  if (rootElement) {
    const isShell = window.__BINI_SHELL__ === true
    const bootShell = rootElement.querySelector('[data-bini-boot]') !== null
    const tree = (
      <Root>
        <App />
      </Root>
    )

    if (typeof resetNavState === 'function') resetNavState()

    const ready = Promise.race([
      preloadRoute(location.pathname).then(() => routerReady()),
      new Promise((resolve) => setTimeout(resolve, 10_000)),
    ]).catch((err) => {
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

export async function render(url) {
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

  const basename = rawBasename

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

  return new Promise((resolve, reject) => {
    let html = ''
    const writable = new Writable({
      write(chunk, _enc, callback) {
        html += chunk.toString()
        callback()
      },
    })

    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const fail = (err) => {
      if (settled) return
      settled = true
      reject(err)
    }

    const { pipe } = ReactDOMServer.renderToPipeableStream(
      createElement(
        StaticRouter,
        { location: fullUrl, basename },
        createElement(AppRoutes),
      ),
      {
        onAllReady() {
          writable.on('finish', () => finish(html))
          writable.on('error', fail)
          pipe(writable)
        },
        onShellError: fail,
        onError(_err) {},
      },
    )
  })
}

export async function renderLoading() {
  const app = await import('virtual:bini-app')
  if (typeof app.loadRootLoading !== 'function') return null
  const { renderToStaticMarkup } = await import('react-dom/server')
  const mod = await app.loadRootLoading()
  return renderToStaticMarkup(React.createElement(mod.default))
}