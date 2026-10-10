import type { DatabaseSync } from 'node:sqlite';

export class BalanceRepo {
  constructor(private readonly db: DatabaseSync) {}

  replaceForGroup(groupId: string, balances: Map<string, number>, now: Date): void {
    this.db.prepare('DELETE FROM group_balances WHERE group_id = ?').run(groupId);
    const insert = this.db.prepare(
      'INSERT INTO group_balances (group_id, user_id, balance_cents, updated_at) VALUES (?, ?, ?, ?)',
    );
    for (const [userId, cents] of balances) insert.run(groupId, userId, cents, now.toISOString());
  }

  listForGroup(groupId: string): Map<string, number> {
    const rows = this.db
      .prepare('SELECT user_id, balance_cents FROM group_balances WHERE group_id = ?')
      .all(groupId) as { user_id: string; balance_cents: number }[];
    return new Map(rows.map((r) => [r.user_id, r.balance_cents]));
  }
}
