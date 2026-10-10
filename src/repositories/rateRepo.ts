import type { DatabaseSync } from 'node:sqlite';
import type { RateLookup } from '../domain/currency';

export interface RateRow {
  base: string;
  quote: string;
  rate: string;
  updated_at: string;
}

export class RateRepo implements RateLookup {
  constructor(private readonly db: DatabaseSync) {}

  find(base: string, quote: string): number | undefined {
    const row = this.db.prepare('SELECT rate FROM exchange_rates WHERE base = ? AND quote = ?').get(base, quote) as
      | { rate: string }
      | undefined;
    return row && Number(row.rate);
  }

  list(): RateRow[] {
    return this.db.prepare('SELECT * FROM exchange_rates ORDER BY base, quote').all() as unknown as RateRow[];
  }

  // One row per pair: saving USD→EUR replaces an existing EUR→USD row.
  save(base: string, quote: string, rate: string, now: Date): void {
    this.db.prepare('DELETE FROM exchange_rates WHERE base = ? AND quote = ?').run(quote, base);
    this.db
      .prepare(
        `INSERT INTO exchange_rates (base, quote, rate, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (base, quote) DO UPDATE SET rate = excluded.rate, updated_at = excluded.updated_at`,
      )
      .run(base, quote, rate, now.toISOString());
  }
}
