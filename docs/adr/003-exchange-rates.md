# ADR-003: Exchange rates are snapshotted on each expense

**Status:** Accepted

## Context

Groups travel. An expense in USD has to count towards a group whose
currency is EUR. Rates change every day, and users update the `rates` table
from time to time.

If balances were recalculated with today's rate, a dinner paid three weeks
ago would change value every time someone touched the rates table, and
people who had already settled up would suddenly owe money again.

## Decision

- An expense stores its original `amount_cents` and `currency`, the
  converted `base_amount_cents`, and the `rate` that was used. All three are
  fixed when the expense is created.
- Balances only ever use `base_amount_cents`. Changing a rate affects
  **new** expenses only.
- The `exchange_rates` table stores one row per currency pair:
  `(base, quote, rate)` means 1 `base` = `rate` `quote`. If a conversion
  needs the other direction, it uses `1 / rate`. Saving a pair replaces the
  row for the opposite direction.
- Shares are computed in the expense currency, then spread over the
  converted total with `allocate` (ADR-002).
- Calendar days in filters (`?from=` / `?to=`) are UTC days, the same as
  every timestamp we store.

## Consequences

- History never changes under people's feet.
- To fix an expense entered with a wrong rate, delete it and enter it again.
- There is no automatic rate feed; someone has to keep the table current.
