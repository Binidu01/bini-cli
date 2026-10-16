export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between px-8 py-24 sm:items-start sm:px-16 sm:py-32">
        <img
          src="/bini.svg"
          alt="Bini.js"
          width="120"
          height="32"
          className="h-7 w-auto sm:h-8 dark:invert"
        />

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-zinc-900">
              src/app/page.{{MAIN_EXT}}
            </code>{" "}
            file.
          </h1>

          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a href="https://bini.js.org/showcase" className="font-medium text-zinc-950 no-underline dark:text-zinc-50">
              Templates
            </a>{" "}
            or the{" "}
            <a href="https://bini.js.org" className="font-medium text-zinc-950 no-underline dark:text-zinc-50">
              Learning
            </a>{" "}
            center.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <a
            href="https://bini.js.org/showcase"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center rounded-full bg-black px-8 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 sm:w-auto"
          >
            Showcase
          </a>
          <a
            href="https://bini.js.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-8 font-medium text-black transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:text-white dark:hover:bg-zinc-900 sm:w-auto"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
