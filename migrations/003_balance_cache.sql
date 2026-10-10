-- Balances are derived from expenses and payments. Recomputing them on every
-- read got slow for big groups, so we keep the result here and refresh it
-- whenever a group's money changes.
CREATE TABLE group_balances (
  group_id      TEXT NOT NULL REFERENCES groups(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  balance_cents INTEGER NOT NULL,
  updated_at    TEXT NOT NULL,
  PRIMARY KEY (group_id, user_id)
);
