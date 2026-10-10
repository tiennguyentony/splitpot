import type { DatabaseSync } from 'node:sqlite';
import { isForeignKeyViolation, transaction } from '../db';
import type { Clock } from '../lib/clock';
import { NotAMember } from '../lib/errors';
import type { IdGenerator } from '../lib/ids';
import { parseCents } from '../lib/money';
import type { PaymentRepo, PaymentRow } from '../repositories/paymentRepo';
import type { BalanceService } from './balanceService';
import type { GroupService } from './groupService';

export interface NewPayment {
  from: string;
  to: string;
  amount: string;
  paidAt?: string;
}

// A payment is money that changed hands outside the app ("Bea sent Alice
// €20"). Amounts are always in the group's base currency.
export class PaymentService {
  constructor(
    private readonly deps: {
      db: DatabaseSync;
      payments: PaymentRepo;
      groupService: GroupService;
      balances: BalanceService;
      clock: Clock;
      ids: IdGenerator;
    },
  ) {}

  record(userId: string, groupId: string, input: NewPayment): PaymentRow {
    this.deps.groupService.requireMember(groupId, userId);
    const now = this.deps.clock.now();
    const payment: PaymentRow = {
      id: this.deps.ids.next('pay'),
      group_id: groupId,
      from_user: input.from,
      to_user: input.to,
      amount_cents: parseCents(input.amount),
      paid_at: input.paidAt ? new Date(input.paidAt).toISOString() : now.toISOString(),
      created_by: userId,
    };
    try {
      transaction(this.deps.db, () => {
        this.deps.payments.insert(payment);
        this.deps.balances.recompute(groupId);
      });
    } catch (err) {
      if (isForeignKeyViolation(err)) throw new NotAMember();
      throw err;
    }
    return payment;
  }

  list(userId: string, groupId: string): PaymentRow[] {
    this.deps.groupService.requireMember(groupId, userId);
    return this.deps.payments.listByGroup(groupId);
  }
}
