-- Core schema. Money is always INTEGER cents. Timestamps are ISO-8601 UTC.

CREATE TABLE users (
  id    TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE groups (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  base_currency TEXT NOT NULL,
  created_by    TEXT NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL
);

CREATE TABLE group_members (
  group_id  TEXT NOT NULL REFERENCES groups(id),
  user_id   TEXT NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- The payer must be a member of the expense's group: enforced by the
-- composite foreign key, whatever code path inserts the row.
CREATE TABLE expenses (
  id                TEXT PRIMARY KEY,
  group_id          TEXT NOT NULL,
  paid_by           TEXT NOT NULL,
  description       TEXT NOT NULL,
  amount_cents      INTEGER NOT NULL CHECK (amount_cents > 0),
  currency          TEXT NOT NULL,
  base_amount_cents INTEGER NOT NULL,
  rate              TEXT NOT NULL,
  split_type        TEXT NOT NULL CHECK (split_type IN ('equal', 'shares', 'exact')),
  spent_at          TEXT NOT NULL,
  created_by        TEXT NOT NULL REFERENCES users(id),
  created_at        TEXT NOT NULL,
  deleted_at        TEXT,
  FOREIGN KEY (group_id, paid_by) REFERENCES group_members(group_id, user_id)
);

CREATE INDEX expenses_by_group_date ON expenses(group_id, spent_at);

-- Same rule for everyone who owes a share.
CREATE TABLE expense_shares (
  expense_id  TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  group_id    TEXT NOT NULL,
  member_id   TEXT NOT NULL,
  share_cents INTEGER NOT NULL CHECK (share_cents >= 0),
  PRIMARY KEY (expense_id, member_id),
  FOREIGN KEY (group_id, member_id) REFERENCES group_members(group_id, user_id)
);

CREATE TABLE payments (
  id           TEXT PRIMARY KEY,
  group_id     TEXT NOT NULL,
  from_user    TEXT NOT NULL,
  to_user      TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  paid_at      TEXT NOT NULL,
  created_by   TEXT NOT NULL REFERENCES users(id),
  FOREIGN KEY (group_id, from_user) REFERENCES group_members(group_id, user_id),
  FOREIGN KEY (group_id, to_user) REFERENCES group_members(group_id, user_id),
  CHECK (from_user <> to_user)
);

CREATE TABLE idempotency_keys (
  user_id    TEXT NOT NULL,
  key        TEXT NOT NULL,
  status     INTEGER NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);
