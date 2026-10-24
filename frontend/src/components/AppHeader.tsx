import { ThemeToggle } from './ThemeToggle'
import type { Theme } from '../hooks/useTheme'

interface AppHeaderProps {
  theme?: Theme
  onToggleTheme?: () => void
}

export function AppHeader({ theme = 'light', onToggleTheme }: AppHeaderProps) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="/" aria-label="GhostGuard home">
          <span className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2L3 6V12C3 17.5 6.8 22.3 12 23.5C17.2 22.3 21 17.5 21 12V6L12 2Z"
                fill="currentColor"
                fillOpacity="0.2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 7L16 11M16 11L12 15M16 11H8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="brand-title">
            Ghost<span className="brand-accent">Guard</span>
          </span>
          <span className="brand-badge">MONAD HACKATHON</span>
        </a>

        <div className="header-meta">
          {onToggleTheme && <ThemeToggle theme={theme} onToggle={onToggleTheme} />}

          <a
            href="https://testnet.monadscan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="network-pill"
            title="Monad Testnet Block Explorer"
          >
            <span className="status-dot-pulse" aria-hidden="true" />
            <span className="network-name">Monad Testnet</span>
            <span className="chain-id-tag">10143</span>
          </a>
          <a
            className="header-link"
            href="https://github.com/aposalik/ghostguard"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>GitHub</span>
            <span className="ext-icon" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>
  )
}
