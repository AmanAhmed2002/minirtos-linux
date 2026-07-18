const REPORT_ID = "2abc4f30-bfdf-4628-b5b0-4f1482ccb5e4";
const REPORT_PAGE_ID = "a103F";
const REPORT_URL = `https://datastudio.google.com/reporting/${REPORT_ID}/page/${REPORT_PAGE_ID}`;
const EMBED_URL = `https://datastudio.google.com/embed/reporting/${REPORT_ID}/page/${REPORT_PAGE_ID}`;
const EMBED_SANDBOX = [
  "allow-storage-access-by-user-activation",
  "allow-scripts",
  "allow-same-origin",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
].join(" ");

export function LookerPage() {
  return (
    <div className="looker-page">
      <section className="page-header looker-page__header">
        <div>
          <p className="eyebrow">Looker Studio</p>
          <h1>Explore MiniRTOS telemetry</h1>
          <p className="page-header__subtitle">
            An interactive analytics dashboard built to turn MiniRTOS runtime
            telemetry into clear operational insights, trends, and comparisons.
          </p>
        </div>

        <a
          className="ghost-button compact looker-page__external-link"
          href={REPORT_URL}
          target="_blank"
          rel="noreferrer"
        >
          Open in Looker Studio <span aria-hidden="true">↗</span>
        </a>
      </section>

      <section className="looker-report" aria-labelledby="looker-report-title">
        <div className="looker-report__toolbar">
          <div>
            <p className="eyebrow">Interactive report</p>
            <h2 id="looker-report-title">MiniRTOS analytics dashboard</h2>
          </div>
          <span className="looker-report__status">
            <span aria-hidden="true" /> Live report
          </span>
        </div>

        <div className="looker-report__frame-wrap">
          <iframe
            className="looker-report__frame"
            src={EMBED_URL}
            title="MiniRTOS Looker Studio analytics dashboard"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox={EMBED_SANDBOX}
            allowFullScreen
          />
        </div>

        <p className="looker-report__fallback">
          If the embedded report does not load, check that you are signed into
          an authorized Google account or{" "}
          <a href={REPORT_URL} target="_blank" rel="noreferrer">
            open the dashboard directly
          </a>
          .
        </p>
      </section>
    </div>
  );
}
