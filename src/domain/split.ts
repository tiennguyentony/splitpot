// Turns "who owes what" for one expense into per-member shares in cents.
//
// Rounding policy: when an amount doesn't divide evenly, the payer absorbs
// the leftover cents, so the people who owe never pay more than their fair
// share.
import { InvalidAmount } from '../lib/errors';
import { allocate } from '../lib/money';

export type SplitInput =
  | { type: 'equal'; members: string[] }
  | { type: 'shares'; shares: { memberId: string; shares: number }[] }
  | { type: 'exact'; parts: { memberId: string; amountCents: number }[] };

export interface Share {
  memberId: string;
  cents: number;
}

export function computeShares(totalCents: number, split: SplitInput): Share[] {
  assertDistinctMembers(memberIdsOf(split));

  switch (split.type) {
    case 'equal':
      return equalSplit(totalCents, split.members);
    case 'shares': {
      const parts = allocate(
        totalCents,
        split.shares.map((s) => s.shares),
      );
      return split.shares.map((s, i) => ({ memberId: s.memberId, cents: parts[i] }));
    }
    case 'exact':
      return split.parts.map((p) => ({ memberId: p.memberId, cents: p.amountCents }));
  }
}

function equalSplit(totalCents: number, members: string[]): Share[] {
  const each = Math.floor(totalCents / members.length);
  return members.map((memberId) => ({ memberId, cents: each }));
}

// Shares are computed in the expense's own currency. When the group uses a
// different base currency, spread the converted total over the same
// proportions so the shares still add up to the converted amount.
export function rebaseShares(shares: Share[], baseTotalCents: number): Share[] {
  const parts = allocate(
    baseTotalCents,
    shares.map((s) => s.cents),
  );
  return shares.map((s, i) => ({ memberId: s.memberId, cents: parts[i] }));
}

export function memberIdsOf(split: SplitInput): string[] {
  switch (split.type) {
    case 'equal':
      return split.members;
    case 'shares':
      return split.shares.map((s) => s.memberId);
    case 'exact':
      return split.parts.map((p) => p.memberId);
  }
}

function assertDistinctMembers(ids: string[]): void {
  if (new Set(ids).size !== ids.length) {
    throw new InvalidAmount('A member can only appear once in a split');
  }
}
