import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.home}>
      <main className={styles.homeMain}>
        <img
          src="/bini.svg"
          alt="Bini.js"
          width="120"
          height="32"
          className={styles.homeLogo}
        />

        <div className={styles.homeText}>
          <h1 className={styles.homeTitle}>
            To get started, edit the{" "}
            <code className={styles.homeCode}>
              src/app/page.{{MAIN_EXT}}
            </code>{" "}
            file.
          </h1>

          <p className={styles.homeDesc}>
            Looking for a starting point or more instructions? Head over to{" "}
            <a href="https://bini.js.org/showcase" className={styles.homeLink}>
              Templates
            </a>{" "}
            or the{" "}
            <a href="https://bini.js.org" className={styles.homeLink}>
              Learning
            </a>{" "}
            center.
          </p>
        </div>

        <div className={styles.homeActions}>
          <a
            href="https://bini.js.org/showcase"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.homeBtn} ${styles.homeBtnPrimary}`}
          >
            Showcase
          </a>
          <a
            href="https://bini.js.org"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.homeBtn} ${styles.homeBtnSecondary}`}
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
