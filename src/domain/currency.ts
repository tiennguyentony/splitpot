// Converts an amount between currencies using the exchange_rates table.
// A stored row (base, quote, rate) means 1 base = `rate` quote. Each pair is
// stored in one direction only, so a conversion may need the opposite row.
import { MissingRate } from '../lib/errors';

export interface RateLookup {
  find(base: string, quote: string): number | undefined;
}

export interface Conversion {
  cents: number;
  // How many units of `to` one unit of `from` buys. Saved on the expense.
  rate: number;
}

export function convert(amountCents: number, from: string, to: string, rates: RateLookup): Conversion {
  if (from === to) return { cents: amountCents, rate: 1 };

  const direct = rates.find(from, to);
  if (direct !== undefined) {
    return { cents: Math.round(amountCents * direct), rate: direct };
  }

  const inverse = rates.find(to, from);
  if (inverse !== undefined) {
    const rate = 1 / inverse;
    return { cents: Math.round(amountCents * inverse), rate };
  }

  throw new MissingRate(from, to);
}
