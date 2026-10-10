# SplitPot

Backend API for splitting shared expenses among friends: trips, flatshares,
nights out.

People create a **group**, add friends by email, and record **expenses**
("I paid €100 for dinner, split between the three of us"). SplitPot keeps a
running **balance** for everyone in the group and suggests the shortest list
of payments to **settle up**. When someone pays a friend back, they record a
**payment** and the balances update.

## Features

- Groups with members and a base currency (EUR, GBP, USD, ...)
- Expenses paid by one member and split **equally**, **by shares** (2:1:1),
  or by **exact amounts**
- Multi-currency expenses, converted to the group's currency with a rates table
- Balances per member, and "settle up" suggestions
- Recording payments between members
- Venmo sync: payments made in Venmo with `#splitpot` in the note are imported
  automatically
- Retry-safe create endpoints (`Idempotency-Key`)

## Tech stack

- Node.js 24 + TypeScript, [Express](https://expressjs.com)
- PostgreSQL 16
- Zod for request validation
- Vitest for tests

## Getting started

Requirements: Node 24 (see `.nvmrc`) and a running PostgreSQL.

```bash
npm install
cp .env.example .env        # then set DATABASE_URL
npm run dev                 # http://localhost:3000
npm test
```

| Variable       | Default | Purpose                                   |
|----------------|---------|-------------------------------------------|
| `DATABASE_URL` | —       | Postgres connection string                |
| `PORT`         | `3000`  | HTTP port                                 |
| `VENMO_TOKEN`  | —       | API token for Venmo sync (optional)       |

On first start the database is seeded with demo data.

## Demo users

Login is email-only for the demo (no passwords).

| Email               | Groups                  |
|---------------------|-------------------------|
| alice@example.com   | Lisbon trip, Flat 3B    |
| bea@example.com     | Lisbon trip             |
| chen@example.com    | Lisbon trip             |
| dan@example.com     | Flat 3B                 |

## API

Money is always sent and returned as a **decimal string** (`"12.50"`), never
as a JSON number. Dates are ISO-8601 in UTC.

| Method   | Path                              | Notes |
|----------|-----------------------------------|-------|
| `POST`   | `/auth/login`                     | `{ "email" }` → `{ token }` |
| `GET`    | `/groups`                         | my groups |
| `POST`   | `/groups`                         | `{ "name", "baseCurrency" }` |
| `GET`    | `/groups/:id`                     | group with members |
| `POST`   | `/groups/:id/members`             | `{ "email" }` |
| `GET`    | `/groups/:id/expenses`            | optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` (inclusive) |
| `POST`   | `/groups/:id/expenses`            | see below |
| `GET`    | `/expenses/:id`                   | |
| `DELETE` | `/expenses/:id`                   | payer or creator only |
| `GET`    | `/groups/:id/payments`            | |
| `POST`   | `/groups/:id/payments`            | `{ "from", "to", "amount" }` in the group currency |
| `GET`    | `/groups/:id/balances`            | positive = is owed money |
| `GET`    | `/groups/:id/settle-up`           | suggested transfers |
| `GET`    | `/rates`                          | |
| `PUT`    | `/rates/:base/:quote`             | `{ "rate": "1.08" }` means 1 base = 1.08 quote |

Everything except login needs `Authorization: Bearer <token>`. Only members
can see or change a group.

The mobile app retries a `POST` when the connection drops. It sends an
`Idempotency-Key` header on every request that creates an expense or a
payment, and the server returns the original response for a repeated key
instead of creating a duplicate.

Creating an expense:

```json
{
  "description": "Dinner",
  "amount": "100.00",
  "currency": "EUR",
  "paidBy": "usr_alice",
  "spentAt": "2026-04-14T20:30:00Z",
  "split": { "type": "equal", "members": ["usr_alice", "usr_bea", "usr_chen"] }
}
```

Other split types:

```json
{ "type": "shares", "shares": [{ "memberId": "usr_alice", "shares": 2 }, { "memberId": "usr_bea", "shares": 1 }] }
{ "type": "exact",  "parts":  [{ "memberId": "usr_alice", "amount": "12.00" }, { "memberId": "usr_bea", "amount": "18.00" }] }
```

`currency` defaults to the group's currency.

Example:

```bash
curl -X POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"alice@example.com"}'
```

## Project layout

```
src/
  app.ts            composition root (createApp)
  routes/           HTTP layer (validation, DTOs)
  services/         business logic
  repositories/     SQL
  domain/           pure rules: splitting, currency, balances, settle up
  lib/              money, dates, clock, ids, errors
  legacy/           Venmo sync
migrations/         schema, applied in order on startup
seed/               demo data
docs/adr/           architecture decision records
tests/              unit + integration tests
```

## Docs

Design decisions are recorded in [`docs/adr`](docs/adr).
