# ADR-001: Hono and built-in SQLite instead of Express and PostgreSQL

**Status:** Accepted (supersedes the original Express + PostgreSQL setup)

## Context

The first version of SplitPot ran on Express with PostgreSQL. New
contributors spent their first hour installing and configuring Postgres, and
the test suite needed a live database. Our load is tiny: a group has a
handful of people and a few hundred expenses.

## Decision

- HTTP: [Hono](https://hono.dev), served with `@hono/node-server`. Tests call
  `app.request()` directly, with no port and no HTTP client library.
- Storage: Node's built-in SQLite (`node:sqlite`). One file, path from
  `DB_PATH` (default `splitpot.db`). Tests use `:memory:`.
- Migrations in `migrations/` run on startup, in file-name order. Never edit
  an applied migration; add a new one.
- Rules that must always hold live in the schema, not only in code. Example:
  composite foreign keys make sure the payer of an expense, everyone with a
  share, and both sides of a payment are members of that group.

## Consequences

- `npm install && npm test` works with nothing else installed.
- One process writes to the database; we don't run more than one instance.
- `PORT` and `DB_PATH` are the only settings.
- The old Postgres-only code (Venmo sync) was not ported.
