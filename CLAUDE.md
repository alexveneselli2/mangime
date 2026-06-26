# NutrIA — Project Context

## What this is

**NutrIA** is a multi-user full-stack food diary. The user describes what they ate in natural language (Italian), and AI (Claude) estimates calories and nutritional values. When the user mentions a branded product (e.g. "Nutella", "Coca-Cola"), the server fetches official data from **Open Food Facts** and displays it with explicit source attribution.

- **GitHub repo**: `alexveneselli2/mangime`
- **Main branch**: `main`
- **Deploy**: Render (web service named "NutrIA", auto-deploys from `main`)

## Tech stack

- **Backend**: Node.js 20+ / Express (ESM, `"type": "module"`)
- **DB**: PostgreSQL via `pg` (raw SQL, no ORM). Dedicated schema `nutria` inside a shared database ("stresstest"). The `search_path` is set in the pool so all queries use unqualified table names.
- **Sessions**: `express-session` + `connect-pg-simple` (store in `nutria` schema)
- **Auth**: `bcryptjs` for password hashing, reset tokens with SHA-256 + expiry
- **AI**: `@anthropic-ai/sdk`, model `claude-sonnet-4-6` (configurable via `ANTHROPIC_MODEL`)
- **Nutrition**: Open Food Facts search API (no API key needed)
- **Email**: Resend (password reset). In dev without `RESEND_API_KEY` the reset link is logged and returned in the response.
- **Security**: Helmet (CSP, HSTS), rate limiting on auth and AI endpoints
- **Frontend**: Vanilla JS SPA (no framework, no build step), served by Express as static files. CSP-compliant (no inline scripts/styles).

## File structure

```
server/
  index.js           -- Entry point: Helmet, session, routes, SPA fallback, migrations on boot, /healthz
  config.js          -- Centralized config from env vars (validates DB_SCHEMA with regex)
  db/
    pool.js          -- PostgreSQL pool with search_path on dedicated schema; exports query() and withTransaction()
    schema.sql       -- Idempotent DDL (CREATE IF NOT EXISTS): users, password_reset_tokens, food_entries, food_items
    migrate.js       -- Creates schema if missing, runs schema.sql. Runnable standalone (npm run migrate) or on boot
  middleware/
    auth.js          -- requireAuth middleware (checks session.userId)
    errors.js        -- ApiError class + Express error handler
  lib/
    ai.js            -- analyzeMeal(): calls Claude with Italian system prompt, then enriches branded items via Open Food Facts
    openfoodfacts.js -- searchProduct() with 1h cache and 6s timeout; scaleNutriments()
    email.js         -- sendPasswordResetEmail() via Resend (dev fallback: log)
    validate.js      -- normalizeEmail(), validatePassword(), cleanString(), parseDate(), toNumber()
  routes/
    auth.js          -- POST register/login/logout/change-password/forgot-password/reset-password, GET me
    entries.js       -- GET / (list by date), POST / (create via AI), POST /:id/reprompt, PUT /:id (manual edit), DELETE /:id
    profile.js       -- PUT / (name + calorie goal)

public/
  index.html         -- Minimal HTML shell (14 lines), loads styles.css + app.js as ESM module
  styles.css         -- Complete design system with CSS custom properties, source badges (.src.off/.src.ai/.src.manual)
  app.js             -- Full SPA (~585 lines): client-side router with history.pushState, auth views, diary with date navigation, totals with progress bar, manual edit modal, AI reprompt modal, settings, toast notifications
  api.js             -- Fetch wrapper with all API endpoints

render.yaml          -- Render blueprint: web service, free plan, deploy from main, /healthz health check
.env.example         -- All env vars documented
```

## Database schema (PostgreSQL, schema `nutria`)

- **users**: id (UUID PK), email (unique), password_hash, name, calorie_goal (default 2000), email_verified, created_at, updated_at
- **password_reset_tokens**: id, user_id (FK users), token_hash, expires_at, used_at, created_at
- **food_entries**: id, user_id (FK users), entry_date, meal_type, description (original prompt), name (label), calories/protein/carbs/fat/fiber/sugar/sodium (totals), ai_model, edited (boolean), created_at, updated_at
- **food_items**: id, entry_id (FK food_entries CASCADE), position, name, quantity, calories/protein/carbs/fat/fiber/sugar, **source** (`ai`/`openfoodfacts`/`manual`), off_code, off_name, off_url, created_at

## AI + Open Food Facts flow

1. User sends a description (e.g. "pasta al pomodoro e un bicchiere di Coca-Cola")
2. Server calls Claude with a system prompt that instructs it to: decompose the meal into individual items, estimate macros, and for branded products set `branded: true` with `search_query` and `grams`
3. For each item with `branded: true`, the server calls `searchProduct()` on Open Food Facts
4. If found, AI data is replaced with official data scaled to the estimated grams; `source` becomes `"openfoodfacts"` with `off_code`, `off_name`, `off_url`
5. Frontend shows provenance badges: "Open Food Facts" (with link), "stima AI", "manuale"

## Environment variables (all on Render)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Internal Database URL on Render) |
| `DB_SCHEMA` | Dedicated schema, default `nutria` |
| `DATABASE_SSL` | `true` for managed Postgres |
| `SESSION_SECRET` | Long random string (auto-generated by Render via render.yaml) |
| `ANTHROPIC_API_KEY` | Anthropic key (server-side only) |
| `ANTHROPIC_MODEL` | Default `claude-sonnet-4-6` |
| `RESEND_API_KEY` | Resend key for transactional emails |
| `EMAIL_FROM` | Verified sender on Resend |
| `APP_URL` | Public app URL (for reset password links) |

Test overrides: `ANTHROPIC_BASE_URL`, `OFF_SEARCH_URL`

## Commands

```bash
npm install          # install dependencies
npm run migrate      # create schema and tables (idempotent)
npm run dev          # start with --watch on localhost:3000
npm start            # production
```

## Current state

- App fully functional and deployed on Render
- All code is on `main` (merged via PR #1 with squash merge)
- Branch `claude/ai-food-tracker-app-Yyb8k` still exists on remote but is no longer needed
- No automated test suite in the repo (e2e tests were run during development but not committed)
- Shared database is "stresstest" on Render, with isolated schema `nutria`

## Key conventions

- **No build step**: frontend is vanilla JS served directly
- **Pure ESM**: the entire project uses `import/export`, not `require`
- **No ORM**: all queries are raw SQL via `pg`
- **Migrations on boot**: `server/index.js` calls `migrate()` before `app.listen()`
- **SPA routing**: Express serves `index.html` for all non-API, non-file routes (fallback for client-side routing)
- **Strict CSP**: Helmet configured with Content Security Policy; no inline scripts/styles
- **Italian UI**: all user-facing text is in Italian
