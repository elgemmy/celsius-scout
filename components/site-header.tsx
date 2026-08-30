export function SiteHeader({ status }: { status: string }) {
  void status;
  return (
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="Celsius Scout home">
        <span className="wordmark-mark" aria-hidden="true"><i /><i /><i /></span>
        <span>CELSIUS<strong>SCOUT</strong></span>
      </a>
      <div className="header-status">
        <span className="status-dot" aria-hidden="true" />
        PHOENIX COMBINE · 100 m
      </div>
      <a href="#how-it-works" className="text-link">
        <span className="text-link-label">How ratings work</span>{" "}
        <span aria-hidden="true">↗</span>
      </a>
    </header>
  );
}
