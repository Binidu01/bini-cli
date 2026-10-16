export default function Home() {
  return (
    <div className="home">
      <main className="home-main">
        <img
          src="/bini.svg"
          alt="Bini.js"
          width="120"
          height="32"
          className="home-logo"
        />

        <div className="home-text">
          <h1 className="home-title">
            To get started, edit the{" "}
            <code className="home-code">
              src/app/page.{{MAIN_EXT}}
            </code>{" "}
            file.
          </h1>

          <p className="home-desc">
            Looking for a starting point or more instructions? Head over to{" "}
            <a href="https://bini.js.org/showcase" className="home-link">
              Templates
            </a>{" "}
            or the{" "}
            <a href="https://bini.js.org" className="home-link">
              Learning
            </a>{" "}
            center.
          </p>
        </div>

        <div className="home-actions">
          <a
            href="https://bini.js.org/showcase"
            target="_blank"
            rel="noopener noreferrer"
            className="home-btn home-btn-primary"
          >
            Showcase
          </a>
          <a
            href="https://bini.js.org"
            target="_blank"
            rel="noopener noreferrer"
            className="home-btn home-btn-secondary"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
