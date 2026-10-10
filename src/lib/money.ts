// All money in SplitPot is an integer number of cents (see ADR-002).
// Amounts arrive over the API as decimal strings ("12.30") and are converted
// here, once, at the edge. Nothing else should do arithmetic on decimals.
import { InvalidAmount } from './errors';

const AMOUNT_PATTERN = /^\d{1,9}(\.\d{1,2})?$/;

export function parseCents(amount: string): number {
  if (!AMOUNT_PATTERN.test(amount)) {
    throw new InvalidAmount(`"${amount}" is not a valid amount (use e.g. "12.50")`);
  }
  const [whole, fraction = ''] = amount.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

// Splits `total` into parts proportional to `weights`, so that the parts
// always add up to exactly `total`. Each part is first rounded down; the
// leftover cents then go one each to the parts with the largest remainder,
// earlier entries winning ties.
//
//   allocate(1000, [1, 1, 1]) → [334, 333, 333]
export function allocate(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0 || weightSum <= 0) {
    throw new InvalidAmount('Cannot split an amount with no weights');
  }
  const exact = weights.map((w) => (total * w) / weightSum);
  const parts = exact.map(Math.floor);
  let leftover = total - parts.reduce((a, b) => a + b, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (const { index } of byRemainder) {
    if (leftover === 0) break;
    parts[index] += 1;
    leftover -= 1;
  }
  return parts;
}
