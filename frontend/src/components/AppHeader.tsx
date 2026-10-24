export function AppHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="GhostGuard home">
        <span className="brand-mark" aria-hidden="true">G</span>
        <span>Ghost<span className="brand-word-light">Guard</span></span>
      </a>

      <div className="header-meta">
        <span className="network-pill">
          <span className="status-dot" aria-hidden="true" />
          Monad Testnet
        </span>
        <a className="header-link" href="https://github.com/aposalik/ghostguard" target="_blank" rel="noreferrer">
          Source ↗
        </a>
      </div>
    </header>
  )
}
