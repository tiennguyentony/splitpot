import type { DatabaseSync } from 'node:sqlite';

export interface SavedResponse {
  status: number;
  body: unknown;
}

// Keys are scoped per user: two users sending the same key never see each
// other's responses.
export class IdempotencyRepo {
  constructor(private readonly db: DatabaseSync) {}

  find(userId: string, key: string): SavedResponse | undefined {
    const row = this.db
      .prepare('SELECT status, body FROM idempotency_keys WHERE user_id = ? AND key = ?')
      .get(userId, key) as { status: number; body: string } | undefined;
    return row && { status: row.status, body: JSON.parse(row.body) };
  }

  save(userId: string, key: string, response: SavedResponse, now: Date): void {
    this.db
      .prepare('INSERT INTO idempotency_keys (user_id, key, status, body, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, key, response.status, JSON.stringify(response.body), now.toISOString());
  }
}
