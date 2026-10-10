// "Settle up": a short list of transfers that brings every balance to zero.
//
// Greedy: the member who owes the most pays the member who is owed the most,
// as much as they can, then we move on. This gives at most n - 1 transfers,
// which is what people expect from the button. (A truly minimal list is an
// NP-hard problem and not worth it for groups of friends.)

export interface MemberBalance {
  memberId: string;
  balanceCents: number;
}

export interface Transfer {
  from: string;
  to: string;
  amountCents: number;
}

interface Side {
  memberId: string;
  amount: number;
}

export function suggestTransfers(balances: MemberBalance[]): Transfer[] {
  // Work in major units so the debug output reads like the app.
  const creditors: Side[] = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ memberId: b.memberId, amount: b.balanceCents / 100 }))
    .sort((a, b) => b.amount - a.amount);
  const debtors: Side[] = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ memberId: b.memberId, amount: -b.balanceCents / 100 }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    transfers.push({ from: debtor.memberId, to: creditor.memberId, amountCents: Math.round(amount * 100) });
    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }
  return transfers;
}
