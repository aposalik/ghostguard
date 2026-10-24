import type {
  AccountActivity,
  AccountActivityDirection,
  HexAddress,
} from '@ghostguard/shared'

export type EvidenceEdgeTone = 'incoming' | 'outgoing' | 'suspicious' | 'review' | 'reverted'

export interface EvidenceGraphNode {
  id: string
  address: HexAddress | null
  label: string
  x: number
  y: number
  isCenter: boolean
}

export interface EvidenceGraphEdge {
  id: string
  sourceNodeId: string
  targetNodeId: string
  direction: AccountActivityDirection
  tone: EvidenceEdgeTone
  activity: AccountActivity
}

export interface EvidenceGraphModel {
  nodes: EvidenceGraphNode[]
  edges: EvidenceGraphEdge[]
}

const CENTER_X = 380
const CENTER_Y = 235
const RADIUS_X = 280
const RADIUS_Y = 165
const MAX_ACTIVITY_EDGES = 32

export function mergeAccountActivities(
  existing: AccountActivity[],
  incoming: AccountActivity,
  limit = 200,
): AccountActivity[] {
  return [incoming, ...existing.filter((activity) => activity.id !== incoming.id)].slice(0, limit)
}

export function buildEvidenceGraph(
  watchedAddress: HexAddress,
  activities: AccountActivity[],
): EvidenceGraphModel {
  const centerId = `account:${watchedAddress.toLowerCase()}`
  const graphActivities = activities.slice(0, MAX_ACTIVITY_EDGES)
  const counterparties = new Map<string, HexAddress | null>()

  for (const activity of graphActivities) {
    const key = counterpartyKey(activity)
    if (!counterparties.has(key)) counterparties.set(key, activity.counterpartyAddress)
  }

  const nodes: EvidenceGraphNode[] = [{
    id: centerId,
    address: watchedAddress,
    label: 'Watched account',
    x: CENTER_X,
    y: CENTER_Y,
    isCenter: true,
  }]
  const entries = [...counterparties.entries()]
  entries.forEach(([key, address], index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(entries.length, 1)
    nodes.push({
      id: key,
      address,
      label: address ? 'Counterparty' : 'Contract creation',
      x: Math.round(CENTER_X + Math.cos(angle) * RADIUS_X),
      y: Math.round(CENTER_Y + Math.sin(angle) * RADIUS_Y),
      isCenter: false,
    })
  })

  const edges = graphActivities.map((activity): EvidenceGraphEdge => {
    const counterpartyId = counterpartyKey(activity)
    const incoming = activity.direction === 'INCOMING'
    return {
      id: activity.id,
      sourceNodeId: incoming ? counterpartyId : centerId,
      targetNodeId: incoming ? centerId : counterpartyId,
      direction: activity.direction,
      tone: edgeTone(activity),
      activity,
    }
  })

  return { nodes, edges }
}

function counterpartyKey(activity: AccountActivity): string {
  return activity.counterpartyAddress
    ? `account:${activity.counterpartyAddress.toLowerCase()}`
    : `contract:${activity.transactionHash.toLowerCase()}`
}

function edgeTone(activity: AccountActivity): EvidenceEdgeTone {
  if (activity.verdict === 'SUSPICIOUS') return 'suspicious'
  if (activity.verdict === 'NEEDS_REVIEW') return 'review'
  if (activity.verdict === 'REVERTED') return 'reverted'
  return activity.direction === 'INCOMING' ? 'incoming' : 'outgoing'
}
