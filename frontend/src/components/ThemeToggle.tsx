import type { Theme } from '../hooks/useTheme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={onToggle}
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
    >
      <span className="theme-toggle-indicator" aria-hidden="true">
        {isLight ? '☀️' : '🌙'}
      </span>
      <span className="theme-toggle-text">
        {isLight ? 'Light Mode' : 'Dark Mode'}
      </span>
    </button>
  )
}
