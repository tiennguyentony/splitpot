import { computeBalances } from '../domain/balances';
import { suggestTransfers, type Transfer } from '../domain/settle';
import type { Clock } from '../lib/clock';
import type { BalanceRepo } from '../repositories/balanceRepo';
import type { ExpenseRepo } from '../repositories/expenseRepo';
import type { GroupRepo, MemberRow } from '../repositories/groupRepo';
import type { PaymentRepo } from '../repositories/paymentRepo';

export interface MemberBalanceView {
  member: MemberRow;
  balanceCents: number;
}

// Reads come from the group_balances cache (migration 003). Anything that
// changes a group's money must call recompute() in the same transaction.
export class BalanceService {
  constructor(
    private readonly deps: {
      groups: GroupRepo;
      expenses: ExpenseRepo;
      payments: PaymentRepo;
      balances: BalanceRepo;
      clock: Clock;
    },
  ) {}

  recompute(groupId: string): void {
    const memberIds = this.deps.groups.members(groupId).map((m) => m.user_id);
    const expenses = this.deps.expenses.listByGroup(groupId).map((e) => ({
      paidBy: e.paid_by,
      baseAmountCents: e.base_amount_cents,
      shares: e.shares,
    }));
    const payments = this.deps.payments.listByGroup(groupId).map((p) => ({
      fromUser: p.from_user,
      toUser: p.to_user,
      amountCents: p.amount_cents,
    }));
    const balances = computeBalances(memberIds, expenses, payments);
    this.deps.balances.replaceForGroup(groupId, balances, this.deps.clock.now());
  }

  // Callers check membership first.
  forGroup(groupId: string): MemberBalanceView[] {
    const cached = this.deps.balances.listForGroup(groupId);
    return this.deps.groups.members(groupId).map((member) => ({
      member,
      balanceCents: cached.get(member.user_id) ?? 0,
    }));
  }

  settleUp(groupId: string): Transfer[] {
    return suggestTransfers(
      this.forGroup(groupId).map((b) => ({ memberId: b.member.user_id, balanceCents: b.balanceCents })),
    );
  }
}
