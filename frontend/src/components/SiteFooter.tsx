export function SiteFooter() {
  return (
    <footer className="portfolio-footer">
      <div className="footer-sigil" aria-hidden="true">
        <span className="pixel-ghost-eye" />
        <span className="pixel-ghost-eye" />
      </div>
      <div className="footer-wordmark">GHOSTGUARD</div>
      <div className="footer-bottom-row">
        <span>Built on evidence, not assumptions.</span>
        <div className="footer-links">
          <a href="https://github.com/aposalik/ghostguard" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
          <a href="https://testnet.monadscan.com" target="_blank" rel="noopener noreferrer">Monad Explorer ↗</a>
        </div>
        <span>Monad Testnet · 10143</span>
      </div>
    </footer>
  )
}
