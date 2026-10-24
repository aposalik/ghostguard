export function LiveMonitorPanel() {
  return (
    <section className="panel" aria-labelledby="monitor-title">
      <div className="panel-heading">
        <h2 id="monitor-title">Live monitor</h2>
        <span className="panel-tag">P1</span>
      </div>
      <div className="monitor-body">
        <div className="status-line">
          <span>Backend stream</span>
          <span className="status-value">Not connected</span>
        </div>
        <div className="monitor-empty">
          No event feed is running yet. An always-on monitor requires the hosted backend watcher; this browser does not claim to monitor the chain continuously.
        </div>
      </div>
    </section>
  )
}
