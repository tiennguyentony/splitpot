import { describe, expect, it } from 'vitest';
import { computeBalances } from '../../src/domain/balances';

describe('computeBalances', () => {
  it('credits the payer and debits each share', () => {
    const result = computeBalances(
      ['a', 'b', 'c'],
      [
        {
          paidBy: 'a',
          baseAmountCents: 9000,
          shares: [
            { memberId: 'a', cents: 3000 },
            { memberId: 'b', cents: 3000 },
            { memberId: 'c', cents: 3000 },
          ],
        },
      ],
      [],
    );
    expect(Object.fromEntries(result)).toEqual({ a: 6000, b: -3000, c: -3000 });
  });

  it('applies payments: the sender owes less, the receiver is owed less', () => {
    const result = computeBalances(
      ['a', 'b'],
      [{ paidBy: 'a', baseAmountCents: 2000, shares: [{ memberId: 'b', cents: 2000 }] }],
      [{ fromUser: 'b', toUser: 'a', amountCents: 1500 }],
    );
    expect(Object.fromEntries(result)).toEqual({ a: 500, b: -500 });
  });

  it('lists members with no activity at zero', () => {
    expect(Object.fromEntries(computeBalances(['a', 'b'], [], []))).toEqual({ a: 0, b: 0 });
  });
});
