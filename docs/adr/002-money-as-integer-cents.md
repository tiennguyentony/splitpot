# ADR-002: Money is integer cents

**Status:** Accepted

## Context

`0.1 + 0.2 !== 0.3` in JavaScript. A splitting app adds and subtracts
thousands of small amounts, and users notice a missing cent immediately: the
balances of a group must always add up to exactly zero.

## Decision

1. Every amount in the database and in the code is an **integer number of
   cents** (minor units). Columns end in `_cents`.
2. Amounts cross the API as **decimal strings** (`"12.50"`). They are
   converted once, in `parseCents` / `formatCents` (`src/lib/money.ts`).
   No `parseFloat`, no `* 100` anywhere else.
3. When an amount must be divided, use `allocate(total, weights)`. It
   guarantees that the parts add up to the total. Leftover cents go one at a
   time to the largest remainders, and on a tie to the entry that comes first
   in the list the client sent. Every split type follows this rule.
4. Exchange rates are the one place where we multiply by a non-integer. The
   result is rounded to the nearest cent once, at conversion time (ADR-003).

## Consequences

- Shares of an expense always add up to the expense, and group balances
  always add up to zero.
- Who gets the extra cent is deterministic and predictable from the request,
  which makes tests exact.
- JPY and other zero-decimal currencies are still stored "in cents" (×100).
  Good enough for now.
