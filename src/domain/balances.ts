// A member's balance is what the group owes them:
//   + what they paid for expenses
//   - their share of every expense
//   + payments they sent (they paid off some of their debt)
//   - payments they received
// Positive = they should get money back. Negative = they owe.

export interface ExpenseForBalance {
  paidBy: string;
  baseAmountCents: number;
  shares: { memberId: string; cents: number }[];
}

export interface PaymentForBalance {
  fromUser: string;
  toUser: string;
  amountCents: number;
}

export function computeBalances(
  memberIds: string[],
  expenses: ExpenseForBalance[],
  payments: PaymentForBalance[],
): Map<string, number> {
  const balances = new Map(memberIds.map((id) => [id, 0]));
  const add = (id: string, cents: number) => balances.set(id, (balances.get(id) ?? 0) + cents);

  for (const expense of expenses) {
    add(expense.paidBy, expense.baseAmountCents);
    for (const share of expense.shares) add(share.memberId, -share.cents);
  }
  for (const payment of payments) {
    add(payment.fromUser, payment.amountCents);
    add(payment.toUser, -payment.amountCents);
  }
  return balances;
}
