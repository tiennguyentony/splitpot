import type { DatabaseSync } from 'node:sqlite';

export interface PaymentRow {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount_cents: number;
  paid_at: string;
  created_by: string;
}

export class PaymentRepo {
  constructor(private readonly db: DatabaseSync) {}

  insert(payment: PaymentRow): void {
    this.db
      .prepare(
        `INSERT INTO payments (id, group_id, from_user, to_user, amount_cents, paid_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        payment.id,
        payment.group_id,
        payment.from_user,
        payment.to_user,
        payment.amount_cents,
        payment.paid_at,
        payment.created_by,
      );
  }

  listByGroup(groupId: string): PaymentRow[] {
    return this.db
      .prepare('SELECT * FROM payments WHERE group_id = ? ORDER BY paid_at DESC, id')
      .all(groupId) as unknown as PaymentRow[];
  }
}
