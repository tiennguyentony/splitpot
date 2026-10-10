import { describe, expect, it } from 'vitest';
import { computeShares, rebaseShares } from '../../src/domain/split';

describe('computeShares', () => {
  it('splits equally', () => {
    expect(computeShares(9000, { type: 'equal', members: ['a', 'b', 'c'] })).toEqual([
      { memberId: 'a', cents: 3000 },
      { memberId: 'b', cents: 3000 },
      { memberId: 'c', cents: 3000 },
    ]);
  });

  it('splits by shares', () => {
    const shares = computeShares(4560, {
      type: 'shares',
      shares: [
        { memberId: 'a', shares: 2 },
        { memberId: 'b', shares: 1 },
        { memberId: 'c', shares: 1 },
      ],
    });
    expect(shares.map((s) => s.cents)).toEqual([2280, 1140, 1140]);
  });

  it('gives leftover cents from a shares split to the first members listed', () => {
    const shares = computeShares(1000, {
      type: 'shares',
      shares: [
        { memberId: 'a', shares: 1 },
        { memberId: 'b', shares: 1 },
        { memberId: 'c', shares: 1 },
      ],
    });
    expect(shares.map((s) => s.cents)).toEqual([334, 333, 333]);
  });

  it('uses exact amounts as given', () => {
    const shares = computeShares(3000, {
      type: 'exact',
      parts: [
        { memberId: 'a', amountCents: 1200 },
        { memberId: 'b', amountCents: 1800 },
      ],
    });
    expect(shares).toEqual([
      { memberId: 'a', cents: 1200 },
      { memberId: 'b', cents: 1800 },
    ]);
  });

  it('rejects a member listed twice', () => {
    expect(() => computeShares(1000, { type: 'equal', members: ['a', 'a'] })).toThrow(/only appear once/);
  });
});

describe('rebaseShares', () => {
  it('keeps the proportions and adds up to the converted total', () => {
    const rebased = rebaseShares(
      [
        { memberId: 'a', cents: 1000 },
        { memberId: 'b', cents: 3000 },
      ],
      4680,
    );
    expect(rebased).toEqual([
      { memberId: 'a', cents: 1170 },
      { memberId: 'b', cents: 3510 },
    ]);
  });
});
