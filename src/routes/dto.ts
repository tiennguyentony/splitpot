// Shapes returned by the API. Money goes out as decimal strings ("12.30"),
// the same format it comes in.
import type { Transfer } from '../domain/settle';
import { formatCents } from '../lib/money';
import type { ExpenseWithShares } from '../repositories/expenseRepo';
import type { GroupRow, MemberRow } from '../repositories/groupRepo';
import type { PaymentRow } from '../repositories/paymentRepo';
import type { MemberBalanceView } from '../services/balanceService';

export const toGroupDto = (group: GroupRow, members?: MemberRow[]) => ({
  id: group.id,
  name: group.name,
  baseCurrency: group.base_currency,
  createdAt: group.created_at,
  ...(members && { members: members.map(toMemberDto) }),
});

export const toMemberDto = (member: MemberRow) => ({
  id: member.user_id,
  name: member.name,
  joinedAt: member.joined_at,
});

export const toExpenseDto = (expense: ExpenseWithShares) => ({
  id: expense.id,
  groupId: expense.group_id,
  description: expense.description,
  paidBy: expense.paid_by,
  amount: formatCents(expense.amount_cents),
  currency: expense.currency,
  baseAmount: formatCents(expense.base_amount_cents),
  rate: expense.rate,
  splitType: expense.split_type,
  shares: expense.shares.map((s) => ({ memberId: s.memberId, amount: formatCents(s.cents) })),
  spentAt: expense.spent_at,
  createdBy: expense.created_by,
});

export const toPaymentDto = (payment: PaymentRow) => ({
  id: payment.id,
  groupId: payment.group_id,
  from: payment.from_user,
  to: payment.to_user,
  amount: formatCents(payment.amount_cents),
  paidAt: payment.paid_at,
});

export const toBalanceDto = (view: MemberBalanceView) => ({
  memberId: view.member.user_id,
  name: view.member.name,
  balance: formatCents(view.balanceCents),
});

export const toTransferDto = (transfer: Transfer) => ({
  from: transfer.from,
  to: transfer.to,
  amount: formatCents(transfer.amountCents),
});
