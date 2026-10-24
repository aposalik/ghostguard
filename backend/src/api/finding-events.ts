import type { SecurityFinding } from '@ghostguard/shared'

export type FindingListener = (finding: SecurityFinding) => void

export interface FindingEventSource {
  subscribe(listener: FindingListener): () => void
}

export class FindingEventBroker implements FindingEventSource {
  private readonly listeners = new Set<FindingListener>()

  publish(finding: SecurityFinding): void {
    for (const listener of this.listeners) listener(finding)
  }

  subscribe(listener: FindingListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
