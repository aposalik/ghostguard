import type { CSSProperties } from 'react'
import type { AccountActivity, HexAddress } from '@ghostguard/shared'
import type { StreamStatus } from '../hooks/useLiveEvents'
import { buildEvidenceGraph } from '../utils/evidence-graph'
import { formatTimeAgo, shortenHex } from '../utils/format'

interface EvidenceGraphPanelProps {
  address: HexAddress | null
  activities: AccountActivity[]
  selectedActivityId: string | null
  agentEnabled: boolean
  streamStatus: StreamStatus
  onSelectActivity: (activity: AccountActivity) => void
}

export function EvidenceGraphPanel({
  address,
  activities,
  selectedActivityId,
  agentEnabled,
  streamStatus,
  onSelectActivity,
}: EvidenceGraphPanelProps) {
  const graph = address ? buildEvidenceGraph(address, activities) : null
  const nodeMap = new Map(graph?.nodes.map((node) => [node.id, node]) ?? [])
  const selected = activities.find((activity) => activity.id === selectedActivityId) ?? null
  const incoming = activities.filter((activity) => activity.direction === 'INCOMING').length
  const outgoing = activities.filter((activity) => activity.direction === 'OUTGOING').length
  const suspicious = activities.filter((activity) => activity.verdict === 'SUSPICIOUS').length

  return (
    <section className="evidence-graph-panel" aria-labelledby="evidence-graph-title">
      <header className="evidence-graph-header">
        <div>
          <p className="graph-eyebrow">Evidence Inspector</p>
          <h3 id="evidence-graph-title">ACCOUNT ACTIVITY GRAPH</h3>
        </div>
        <div className={`graph-live-state ${agentEnabled ? 'is-enabled' : ''}`}>
          <i aria-hidden="true" />
          {agentEnabled ? streamStatus : 'paused'}
        </div>
      </header>

      <div className="graph-stat-strip" aria-label="Stored activity summary">
        <span><strong>{activities.length}</strong> stored</span>
        <span className="graph-stat-incoming"><strong>{incoming}</strong> incoming</span>
        <span className="graph-stat-outgoing"><strong>{outgoing}</strong> outgoing</span>
        <span className="graph-stat-suspicious"><strong>{suspicious}</strong> suspicious</span>
      </div>

      <div className="evidence-graph-canvas">
        {!address || !graph ? (
          <div className="graph-empty-state">
            <span className="graph-empty-orbit" aria-hidden="true"><i /></span>
            <strong>Choose an account to begin</strong>
            <p>Agent Mode will draw durable incoming, outgoing, and suspicious evidence here.</p>
          </div>
        ) : (
          <svg
            viewBox="0 0 760 470"
            role="img"
            aria-label={`Activity graph for ${address}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {(['incoming', 'outgoing', 'suspicious', 'review', 'reverted'] as const).map((tone) => (
                <marker
                  key={tone}
                  id={`arrow-${tone}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className={`graph-marker graph-marker-${tone}`} />
                </marker>
              ))}
            </defs>

            <g className="graph-grid-lines" aria-hidden="true">
              {Array.from({ length: 10 }, (_, index) => (
                <line key={`v-${index}`} x1={index * 84} y1="0" x2={index * 84} y2="470" />
              ))}
              {Array.from({ length: 7 }, (_, index) => (
                <line key={`h-${index}`} x1="0" y1={index * 78} x2="760" y2={index * 78} />
              ))}
            </g>

            <g className="graph-edges">
              {graph.edges.map((edge, index) => {
                const source = nodeMap.get(edge.sourceNodeId)
                const target = nodeMap.get(edge.targetNodeId)
                if (!source || !target) return null
                const path = edgePath(source.x, source.y, target.x, target.y, edge.direction === 'SELF')
                const isSelected = edge.id === selectedActivityId
                return (
                  <g
                    key={edge.id}
                    className={`graph-edge graph-edge-${edge.tone} ${isSelected ? 'is-selected' : ''}`}
                    style={{ '--edge-delay': `${Math.min(index, 8) * 90}ms` } as CSSProperties}
                  >
                    <path className="graph-edge-visible" d={path} markerEnd={`url(#arrow-${edge.tone})`} />
                    <path
                      className="graph-edge-hit"
                      d={path}
                      onClick={() => onSelectActivity(edge.activity)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectActivity(edge.activity)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${edge.activity.direction.toLowerCase()} ${edge.activity.kind.toLowerCase()} transaction`}
                    />
                    {index < 8 && <circle className="graph-edge-pulse" cx={target.x} cy={target.y} r="5" />}
                  </g>
                )
              })}
            </g>

            <g className="graph-nodes">
              {graph.nodes.map((node) => (
                <g
                  key={node.id}
                  className={`graph-node ${node.isCenter ? 'is-center' : ''}`}
                  transform={`translate(${node.x} ${node.y})`}
                >
                  {node.isCenter && <circle className="graph-node-radar" r="43" />}
                  <circle className="graph-node-core" r={node.isCenter ? 27 : 15} />
                  <circle className="graph-node-ring" r={node.isCenter ? 34 : 21} />
                  <text className="graph-node-title" textAnchor="middle" y={node.isCenter ? 54 : 38}>
                    {node.isCenter ? 'YOU' : shortenHex(node.address ?? 'contract', 4)}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        )}
      </div>

      <div className="graph-legend" aria-label="Graph color legend">
        <span><i className="legend-incoming" /> Incoming</span>
        <span><i className="legend-outgoing" /> Outgoing</span>
        <span><i className="legend-suspicious" /> Suspicious evidence</span>
        <span><i className="legend-review" /> Needs review</span>
      </div>

      {selected && (
        <div className={`graph-selection graph-selection-${selected.verdict.toLowerCase()}`}>
          <div>
            <span className="graph-selection-label">Selected evidence</span>
            <strong>{activityTitle(selected)}</strong>
          </div>
          <dl>
            <div><dt>Transaction</dt><dd>{shortenHex(selected.transactionHash, 8)}</dd></div>
            <div><dt>Counterparty</dt><dd>{shortenHex(selected.counterpartyAddress ?? 'contract creation', 6)}</dd></div>
            <div><dt>Block</dt><dd>#{selected.blockNumber}</dd></div>
            <div><dt>Observed</dt><dd>{formatTimeAgo(selected.observedAt)}</dd></div>
          </dl>
        </div>
      )}
    </section>
  )
}

function edgePath(sourceX: number, sourceY: number, targetX: number, targetY: number, self: boolean): string {
  if (self) {
    return `M ${sourceX - 8} ${sourceY - 20} C ${sourceX - 65} ${sourceY - 80}, ${sourceX + 65} ${sourceY - 80}, ${sourceX + 8} ${sourceY - 20}`
  }
  const curve = Math.max(-42, Math.min(42, (targetX - sourceX) * 0.08))
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2 + curve
  return `M ${sourceX} ${sourceY} Q ${midX} ${midY} ${targetX} ${targetY}`
}

function activityTitle(activity: AccountActivity): string {
  if (activity.verdict === 'SUSPICIOUS') return 'Suspicious transfer claim'
  if (activity.verdict === 'REVERTED') return 'Reverted transaction'
  if (activity.verdict === 'NEEDS_REVIEW') return 'Activity needs review'
  if (activity.direction === 'INCOMING') return 'Verified incoming activity'
  if (activity.direction === 'OUTGOING') return 'Verified outgoing activity'
  return 'Verified self activity'
}
