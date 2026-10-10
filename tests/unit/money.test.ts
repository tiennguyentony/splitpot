import { describe, expect, it } from 'vitest';
import { allocate, formatCents, parseCents } from '../../src/lib/money';

describe('parseCents', () => {
  it('parses whole and decimal amounts', () => {
    expect(parseCents('12')).toBe(1200);
    expect(parseCents('12.5')).toBe(1250);
    expect(parseCents('12.05')).toBe(1205);
    expect(parseCents('0.10')).toBe(10);
  });

  it('never goes through floating point', () => {
    // 1.15 * 100 === 114.99999999999999 in JavaScript
    expect(parseCents('1.15')).toBe(115);
    expect(parseCents('4.35')).toBe(435);
  });

  it.each(['', 'abc', '1.234', '-5', '1,50', '1e3', '.5'])('rejects %j', (bad) => {
    expect(() => parseCents(bad)).toThrow(/not a valid amount/);
  });
});

describe('formatCents', () => {
  it('formats with two decimals', () => {
    expect(formatCents(0)).toBe('0.00');
    expect(formatCents(5)).toBe('0.05');
    expect(formatCents(123456)).toBe('1234.56');
    expect(formatCents(-3333)).toBe('-33.33');
  });
});

describe('allocate', () => {
  it('splits proportionally', () => {
    expect(allocate(1000, [1, 1])).toEqual([500, 500]);
    expect(allocate(1000, [3, 1])).toEqual([750, 250]);
  });

  it('gives leftover cents to the largest remainders, earlier entries first', () => {
    expect(allocate(1000, [1, 1, 1])).toEqual([334, 333, 333]);
    expect(allocate(1001, [1, 1, 1])).toEqual([334, 334, 333]);
    expect(allocate(100, [1, 2])).toEqual([33, 67]);
  });

  it('always adds up to the total', () => {
    for (let total = 1; total < 500; total += 7) {
      for (const weights of [[1, 1, 1], [2, 3], [1, 1, 1, 1, 1, 1, 1], [5, 1, 1]]) {
        const parts = allocate(total, weights);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      }
    }
  });

  it('rejects empty weights', () => {
    expect(() => allocate(100, [])).toThrow();
    expect(() => allocate(100, [0, 0])).toThrow();
  });
});
