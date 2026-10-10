import type { DatabaseSync } from 'node:sqlite';
import type { Share } from '../domain/split';

export interface ExpenseRow {
  id: string;
  group_id: string;
  paid_by: string;
  description: string;
  amount_cents: number;
  currency: string;
  base_amount_cents: number;
  rate: string;
  split_type: string;
  spent_at: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface ExpenseWithShares extends ExpenseRow {
  shares: Share[];
}

export class ExpenseRepo {
  constructor(private readonly db: DatabaseSync) {}

  insert(expense: Omit<ExpenseRow, 'deleted_at'>, shares: Share[]): void {
    this.db
      .prepare(
        `INSERT INTO expenses (id, group_id, paid_by, description, amount_cents, currency,
           base_amount_cents, rate, split_type, spent_at, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        expense.id,
        expense.group_id,
        expense.paid_by,
        expense.description,
        expense.amount_cents,
        expense.currency,
        expense.base_amount_cents,
        expense.rate,
        expense.split_type,
        expense.spent_at,
        expense.created_by,
        expense.created_at,
      );
    const insertShare = this.db.prepare(
      'INSERT INTO expense_shares (expense_id, group_id, member_id, share_cents) VALUES (?, ?, ?, ?)',
    );
    for (const share of shares) insertShare.run(expense.id, expense.group_id, share.memberId, share.cents);
  }

  findById(id: string): ExpenseWithShares | undefined {
    const row = this.db.prepare('SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL').get(id) as
      | ExpenseRow
      | undefined;
    return row && { ...row, shares: this.sharesFor([row.id]).get(row.id) ?? [] };
  }

  // Live expenses of a group, newest first. `from` is inclusive, `to` exclusive.
  listByGroup(groupId: string, range: { from?: Date; to?: Date } = {}): ExpenseWithShares[] {
    const from = range.from?.toISOString() ?? null;
    const to = range.to?.toISOString() ?? null;
    const rows = this.db
      .prepare(
        `SELECT * FROM expenses
         WHERE group_id = ? AND deleted_at IS NULL
           AND (? IS NULL OR spent_at >= ?)
           AND (? IS NULL OR spent_at < ?)
         ORDER BY spent_at DESC, id`,
      )
      .all(groupId, from, from, to, to) as unknown as ExpenseRow[];
    const shares = this.sharesFor(rows.map((r) => r.id));
    return rows.map((row) => ({ ...row, shares: shares.get(row.id) ?? [] }));
  }

  softDelete(id: string, now: Date): void {
    this.db.prepare('UPDATE expenses SET deleted_at = ? WHERE id = ?').run(now.toISOString(), id);
  }

  private sharesFor(expenseIds: string[]): Map<string, Share[]> {
    const result = new Map<string, Share[]>();
    if (expenseIds.length === 0) return result;
    const placeholders = expenseIds.map(() => '?').join(', ');
    const rows = this.db
      .prepare(
        `SELECT s.expense_id, s.member_id, s.share_cents FROM expense_shares s
         JOIN group_members m ON m.group_id = s.group_id AND m.user_id = s.member_id
         WHERE s.expense_id IN (${placeholders})
         ORDER BY s.expense_id, m.joined_at, s.member_id`,
      )
      .all(...expenseIds) as { expense_id: string; member_id: string; share_cents: number }[];
    for (const row of rows) {
      const list = result.get(row.expense_id) ?? [];
      list.push({ memberId: row.member_id, cents: row.share_cents });
      result.set(row.expense_id, list);
    }
    return result;
  }
}
