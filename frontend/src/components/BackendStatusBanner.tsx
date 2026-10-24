interface BackendStatusBannerProps {
  isBackendOnline: boolean | null
  onCheckBackend: () => void
}

export function BackendStatusBanner({ isBackendOnline, onCheckBackend }: BackendStatusBannerProps) {
  if (isBackendOnline !== false) return null

  return (
    <div className="backend-status-banner" role="alert">
      <span>Live backend unavailable. GhostGuard will not invent or replay results.</span>
      <button type="button" onClick={onCheckBackend}>Retry connection</button>
    </div>
  )
}
