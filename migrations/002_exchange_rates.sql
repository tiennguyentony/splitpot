-- One row means: 1 unit of `base` buys `rate` units of `quote`.
-- Example: base EUR, quote USD, rate 1.08 → €1 = $1.08.
-- Only one direction is stored per pair; the other is derived.
CREATE TABLE exchange_rates (
  base       TEXT NOT NULL,
  quote      TEXT NOT NULL,
  rate       TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (base, quote)
);
