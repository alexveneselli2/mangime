-- NutrIA schema. Idempotent: safe to run on every boot.
-- The dedicated schema name is injected by migrate.js as a SET search_path,
-- and created beforehand. All objects below are unqualified and land in it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT,
  calorie_goal  INTEGER NOT NULL DEFAULT 2000,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prt_user_idx ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS prt_token_idx ON password_reset_tokens (token_hash);

CREATE TABLE IF NOT EXISTS food_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date    DATE NOT NULL,
  meal_type     TEXT NOT NULL DEFAULT 'meal',
  description   TEXT NOT NULL,        -- the user's natural-language prompt
  name          TEXT NOT NULL,        -- short label for the meal
  calories      NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein       NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs         NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat           NUMERIC(8,2) NOT NULL DEFAULT 0,
  fiber         NUMERIC(8,2) NOT NULL DEFAULT 0,
  sugar         NUMERIC(8,2) NOT NULL DEFAULT 0,
  sodium        NUMERIC(8,2) NOT NULL DEFAULT 0,  -- mg
  ai_model      TEXT,
  edited        BOOLEAN NOT NULL DEFAULT FALSE,   -- manually edited after AI
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fe_user_date_idx ON food_entries (user_id, entry_date);

CREATE TABLE IF NOT EXISTS food_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID NOT NULL REFERENCES food_entries(id) ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  name          TEXT NOT NULL,
  quantity      TEXT,
  calories      NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein       NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs         NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat           NUMERIC(8,2) NOT NULL DEFAULT 0,
  fiber         NUMERIC(8,2) NOT NULL DEFAULT 0,
  -- Provenance of the numbers for this item:
  --   'ai'            -> estimated by the model
  --   'openfoodfacts' -> official data from an Open Food Facts product
  --   'manual'        -> entered/corrected by the user
  source        TEXT NOT NULL DEFAULT 'ai',
  off_code      TEXT,   -- Open Food Facts product barcode
  off_name      TEXT,   -- matched product name
  off_url       TEXT,   -- link to the product page
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fi_entry_idx ON food_items (entry_id);
