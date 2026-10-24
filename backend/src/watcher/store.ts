import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { SecurityFinding } from '@ghostguard/shared'

export interface FindingStore {
  getCheckpoint(chainId: number, streamKey: string): bigint | null
  saveCheckpoint(chainId: number, streamKey: string, blockNumber: bigint): void
  saveFinding(finding: SecurityFinding): boolean
  pendingAlerts(limit?: number): SecurityFinding[]
  markAlerted(id: string, alertedAt: string): void
  close(): void
}

export class SqliteFindingStore implements FindingStore {
  private readonly database: DatabaseSync

  constructor(databaseUrl: string) {
    if (databaseUrl !== ':memory:') mkdirSync(dirname(resolve(databaseUrl)), { recursive: true })
    this.database = new DatabaseSync(databaseUrl)
    this.database.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS watcher_state (
        chain_id INTEGER NOT NULL,
        stream_key TEXT NOT NULL,
        last_finalized_block TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (chain_id, stream_key)
      ) STRICT;

      CREATE TABLE IF NOT EXISTS findings (
        id TEXT PRIMARY KEY,
        chain_id INTEGER NOT NULL,
        transaction_hash TEXT NOT NULL,
        log_index INTEGER NOT NULL,
        block_number TEXT NOT NULL,
        classification TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        analyzed_at TEXT NOT NULL,
        alerted_at TEXT
      ) STRICT;

      CREATE UNIQUE INDEX IF NOT EXISTS findings_event_identity
        ON findings(chain_id, transaction_hash, log_index);
    `)
  }

  getCheckpoint(chainId: number, streamKey: string): bigint | null {
    const row = this.database.prepare(`
      SELECT last_finalized_block AS blockNumber
      FROM watcher_state
      WHERE chain_id = ? AND stream_key = ?
    `).get(chainId, streamKey) as { blockNumber: string } | undefined
    return row ? BigInt(row.blockNumber) : null
  }

  saveCheckpoint(chainId: number, streamKey: string, blockNumber: bigint): void {
    this.database.prepare(`
      INSERT INTO watcher_state (chain_id, stream_key, last_finalized_block, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(chain_id, stream_key) DO UPDATE SET
        last_finalized_block = excluded.last_finalized_block,
        updated_at = excluded.updated_at
    `).run(chainId, streamKey, blockNumber.toString(10), new Date().toISOString())
  }

  saveFinding(finding: SecurityFinding): boolean {
    const result = this.database.prepare(`
      INSERT OR IGNORE INTO findings (
        id, chain_id, transaction_hash, log_index, block_number,
        classification, payload_json, analyzed_at, alerted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `).run(
      finding.id,
      finding.chainId,
      finding.transactionHash,
      finding.logIndex,
      finding.blockNumber,
      finding.classification,
      JSON.stringify(finding),
      finding.analyzedAt,
    )
    return result.changes === 1
  }

  pendingAlerts(limit = 100): SecurityFinding[] {
    const rows = this.database.prepare(`
      SELECT payload_json AS payload
      FROM findings
      WHERE alerted_at IS NULL AND classification IN ('SUSPICIOUS_EVENT', 'NEEDS_REVIEW')
      ORDER BY CAST(block_number AS INTEGER), log_index
      LIMIT ?
    `).all(limit) as Array<{ payload: string }>
    return rows.map((row) => JSON.parse(row.payload) as SecurityFinding)
  }

  markAlerted(id: string, alertedAt: string): void {
    this.database.prepare('UPDATE findings SET alerted_at = ? WHERE id = ?').run(alertedAt, id)
  }

  close(): void {
    this.database.close()
  }
}
