import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { FindingsPage, SecurityFinding } from '@ghostguard/shared'

interface FindingsCursor {
  analyzedAt: string
  id: string
}

export class InvalidFindingsCursorError extends Error {
  constructor() {
    super('The findings cursor is invalid.')
    this.name = 'InvalidFindingsCursorError'
  }
}

export interface FindingStore {
  getCheckpoint(chainId: number, streamKey: string): bigint | null
  saveCheckpoint(chainId: number, streamKey: string, blockNumber: bigint): void
  saveFinding(finding: SecurityFinding): boolean
  listFindings(limit: number, cursor?: string): FindingsPage
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

  listFindings(limit: number, cursor?: string): FindingsPage {
    const decoded = cursor ? decodeCursor(cursor) : undefined
    const rows = decoded
      ? this.database.prepare(`
          SELECT id, payload_json AS payload, analyzed_at AS analyzedAt
          FROM findings
          WHERE analyzed_at < ? OR (analyzed_at = ? AND id < ?)
          ORDER BY analyzed_at DESC, id DESC
          LIMIT ?
        `).all(decoded.analyzedAt, decoded.analyzedAt, decoded.id, limit + 1)
      : this.database.prepare(`
          SELECT id, payload_json AS payload, analyzed_at AS analyzedAt
          FROM findings
          ORDER BY analyzed_at DESC, id DESC
          LIMIT ?
        `).all(limit + 1)

    const typedRows = rows as Array<{ id: string; payload: string; analyzedAt: string }>
    const hasNextPage = typedRows.length > limit
    const pageRows = typedRows.slice(0, limit)
    const last = pageRows.at(-1)

    return {
      items: pageRows.map((row) => JSON.parse(row.payload) as SecurityFinding),
      nextCursor: hasNextPage && last
        ? encodeCursor({ analyzedAt: last.analyzedAt, id: last.id })
        : null,
    }
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

function encodeCursor(cursor: FindingsCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function decodeCursor(cursor: string): FindingsCursor {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown
    if (!isRecord(parsed) || typeof parsed.analyzedAt !== 'string' || typeof parsed.id !== 'string') {
      throw new InvalidFindingsCursorError()
    }
    return { analyzedAt: parsed.analyzedAt, id: parsed.id }
  } catch (error) {
    if (error instanceof InvalidFindingsCursorError) throw error
    throw new InvalidFindingsCursorError()
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
