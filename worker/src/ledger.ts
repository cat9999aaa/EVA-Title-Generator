import { DurableObject } from 'cloudflare:workers'
import { COVER_SEED } from './schema.ts'

export interface DeliveryRecord {
  source: 'api' | 'web'
  output: 'png' | 'webp'
  locale: string
  formatId: string
  idempotencyHash: string | null
}

export interface DeliveryResult {
  count: number
  duplicate: boolean
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT OR IGNORE INTO meta (key, value) VALUES ('seed', ${COVER_SEED});
INSERT OR IGNORE INTO meta (key, value) VALUES ('count', ${COVER_SEED});
CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  source TEXT NOT NULL,
  output TEXT NOT NULL,
  locale TEXT,
  format_id TEXT,
  idempotency_hash TEXT UNIQUE
);
`

export class CoverLedger extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(SCHEMA)
    })
  }

  async getCount(): Promise<number> {
    const row = this.ctx.storage.sql.exec<{ value: number }>(
      "SELECT value FROM meta WHERE key = 'count'",
    ).one()
    return row.value
  }

  async recordDelivery(record: DeliveryRecord): Promise<DeliveryResult> {
    return this.ctx.storage.transactionSync(() => {
      if (record.idempotencyHash) {
        const existing = this.ctx.storage.sql
          .exec<{ id: number }>(
            'SELECT id FROM deliveries WHERE idempotency_hash = ? LIMIT 1',
            record.idempotencyHash,
          )
          .toArray()
        if (existing.length > 0) {
          const count = this.ctx.storage.sql.exec<{ value: number }>(
            "SELECT value FROM meta WHERE key = 'count'",
          ).one().value
          return { count, duplicate: true }
        }
      }

      this.ctx.storage.sql.exec(
        `INSERT INTO deliveries (created_at, source, output, locale, format_id, idempotency_hash)
         VALUES (?, ?, ?, ?, ?, ?)`,
        Date.now(),
        record.source,
        record.output,
        record.locale,
        record.formatId,
        record.idempotencyHash,
      )
      this.ctx.storage.sql.exec("UPDATE meta SET value = value + 1 WHERE key = 'count'")
      const count = this.ctx.storage.sql.exec<{ value: number }>(
        "SELECT value FROM meta WHERE key = 'count'",
      ).one().value
      return { count, duplicate: false }
    })
  }
}
