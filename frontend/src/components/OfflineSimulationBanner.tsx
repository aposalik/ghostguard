interface OfflineSimulationBannerProps {
  isSimulationActive: boolean
  isBackendOnline: boolean | null
  onToggleSimulation: () => void
  onCheckBackend: () => void
}

export function OfflineSimulationBanner({
  isSimulationActive,
  isBackendOnline,
  onToggleSimulation,
  onCheckBackend,
}: OfflineSimulationBannerProps) {
  // Only render banner if simulation mode is active or backend is detected offline
  if (!isSimulationActive && isBackendOnline !== false) {
    return null
  }

  return (
    <div className="simulation-banner" role="status" aria-live="polite">
      <div className="simulation-banner-inner">
        <div className="simulation-banner-left">
          <span className="simulation-pulse-dot" aria-hidden="true" />
          <span className="simulation-title">
            Demo Simulation Mode Active {isBackendOnline === false ? '(Backend offline)' : '(Judge Presets Ready)'}
          </span>
          <span className="simulation-detail">
            Serving predetermined realistic fixtures for DemoToken & DemoEventOnly contracts.
          </span>
        </div>

        <div className="simulation-banner-actions">
          <button
            type="button"
            className="simulation-action-btn"
            onClick={onCheckBackend}
            title="Probe GET /health on backend"
          >
            <span>Check Backend</span>
          </button>
          <button
            type="button"
            className={`simulation-toggle-btn ${isSimulationActive ? 'is-active' : ''}`}
            onClick={onToggleSimulation}
            title={isSimulationActive ? 'Switch to live network queries' : 'Force offline fixture mode'}
          >
            <span>{isSimulationActive ? 'Simulation: ON' : 'Simulation: OFF'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
