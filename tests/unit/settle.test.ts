import { describe, expect, it } from 'vitest';
import { suggestTransfers } from '../../src/domain/settle';

const balances = (entries: Record<string, number>) =>
  Object.entries(entries).map(([memberId, balanceCents]) => ({ memberId, balanceCents }));

describe('suggestTransfers', () => {
  it('returns nothing when everyone is square', () => {
    expect(suggestTransfers(balances({ a: 0, b: 0 }))).toEqual([]);
  });

  it('has the debtor pay the creditor', () => {
    expect(suggestTransfers(balances({ a: 2500, b: -2500 }))).toEqual([{ from: 'b', to: 'a', amountCents: 2500 }]);
  });

  it('pays the biggest creditor first', () => {
    expect(suggestTransfers(balances({ a: 6000, b: -3000, c: -3000 }))).toEqual([
      { from: 'b', to: 'a', amountCents: 3000 },
      { from: 'c', to: 'a', amountCents: 3000 },
    ]);
    expect(suggestTransfers(balances({ a: 1000, b: 4000, c: -5000 }))).toEqual([
      { from: 'c', to: 'b', amountCents: 4000 },
      { from: 'c', to: 'a', amountCents: 1000 },
    ]);
  });

  it.todo('never needs more than n - 1 transfers for any set of balances that sums to zero');
});
