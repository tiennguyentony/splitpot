import { describe, expect, it } from 'vitest';
import { convert, type RateLookup } from '../../src/domain/currency';

const stored: Record<string, number> = { 'GBP/EUR': 1.17, 'EUR/JPY': 162.5 };
const rates: RateLookup = { find: (base, quote) => stored[`${base}/${quote}`] };

describe('convert', () => {
  it('returns the same amount for the same currency', () => {
    expect(convert(1234, 'EUR', 'EUR', rates)).toEqual({ cents: 1234, rate: 1 });
  });

  it('converts with a stored rate', () => {
    expect(convert(1000, 'GBP', 'EUR', rates)).toEqual({ cents: 1170, rate: 1.17 });
    expect(convert(2000, 'EUR', 'JPY', rates)).toEqual({ cents: 325000, rate: 162.5 });
  });

  it('rounds to the nearest cent', () => {
    expect(convert(333, 'GBP', 'EUR', rates).cents).toBe(390); // 389.61
  });

  it('fails clearly when there is no rate', () => {
    expect(() => convert(1000, 'CHF', 'EUR', rates)).toThrow(/No exchange rate between CHF and EUR/);
  });
});
