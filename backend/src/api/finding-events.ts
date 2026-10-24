import type { AccountActivity, SecurityFinding } from '@ghostguard/shared'

export type FindingListener = (finding: SecurityFinding) => void
export type AccountActivityListener = (activity: AccountActivity) => void

export interface FindingEventSource {
  subscribe(listener: FindingListener): () => void
  subscribeActivity?(listener: AccountActivityListener): () => void
}

export class FindingEventBroker implements FindingEventSource {
  private readonly listeners = new Set<FindingListener>()
  private readonly activityListeners = new Set<AccountActivityListener>()

  publish(finding: SecurityFinding): void {
    for (const listener of this.listeners) listener(finding)
  }

  subscribe(listener: FindingListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  publishActivity(activity: AccountActivity): void {
    for (const listener of this.activityListeners) listener(activity)
  }

  subscribeActivity(listener: AccountActivityListener): () => void {
    this.activityListeners.add(listener)
    return () => this.activityListeners.delete(listener)
  }
}
