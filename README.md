# NutrIA 🥗

Diario alimentare multi-utente. Descrivi cosa hai mangiato in linguaggio naturale e l'AI (Claude) stima calorie e valori nutrizionali. Quando citi un **prodotto di marca**, NutrIA recupera i dati ufficiali da **Open Food Facts** e li mostra esplicitamente.

App full-stack production-grade pensata per il deploy su **Render**.

## Funzionalità

- 🔐 **Gestione utenti completa**: registrazione, login, cambio password, password dimenticata (email via Resend), sessioni sicure server-side
- 🤖 **Analisi AI** dei pasti (server-side, la API key resta solo sul server)
- 🛈 **Dati ufficiali Open Food Facts** per i prodotti di marca, con link al prodotto e attribuzione esplicita della fonte (`stima AI` / `Open Food Facts` / `manuale`)
- ✏️ **Modifica dei pasti** sia manuale (nome, alimenti, macro) sia tramite **riformulazione del prompt** dato all'AI
- 📊 Totali giornalieri, obiettivo calorico personalizzabile, storico per giorno
- 🗄️ **Isolamento DB** in uno schema Postgres dedicato (`nutria`) nel database condiviso — migrazione futura a un DB a sé semplicemente cambiando `DATABASE_URL`

## Stack

- **Backend**: Node.js + Express (ESM)
- **DB**: PostgreSQL via `pg`, schema dedicato, migrazioni idempotenti all'avvio
- **Sessioni**: `express-session` + `connect-pg-simple` (store nello schema dedicato)
- **Auth**: bcrypt, token di reset con hash SHA-256 e scadenza
- **AI**: `@anthropic-ai/sdk` (modello configurabile)
- **Nutrizione**: Open Food Facts (search API, nessuna chiave)
- **Email**: Resend
- **Frontend**: SPA vanilla JS (nessun build step), servita da Express

## Variabili d'ambiente

Vedi [`.env.example`](./.env.example). Le principali:

| Variabile | Descrizione |
|---|---|
| `DATABASE_URL` | Connessione al Postgres condiviso (su Render: Internal Database URL) |
| `DB_SCHEMA` | Schema dedicato, default `nutria` |
| `DATABASE_SSL` | `true` per i Postgres gestiti |
| `SESSION_SECRET` | Stringa random lunga |
| `ANTHROPIC_API_KEY` | Chiave Anthropic (solo server) |
| `ANTHROPIC_MODEL` | Default `claude-sonnet-4-6` |
| `RESEND_API_KEY` | Chiave Resend per le email |
| `EMAIL_FROM` | Mittente verificato su Resend |
| `APP_URL` | URL pubblico (per i link di reset) |

> In sviluppo, senza `RESEND_API_KEY` il link di reset viene loggato e restituito nella risposta, così il flusso è testabile.

## Avvio locale

```bash
npm install
cp .env.example .env   # compila i valori
npm run migrate        # crea schema e tabelle (idempotente)
npm run dev            # http://localhost:3000
```

## Deploy su Render

Il repo include [`render.yaml`](./render.yaml). Su Render:

1. Il web service è già collegato al repo. Imposta come **branch** quello di sviluppo (`claude/ai-food-tracker-app-Yyb8k`) oppure mergialo su `main`.
2. **Build command**: `npm install` · **Start command**: `npm start`
3. Nella tab **Environment** imposta i secret: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` (e lascia che `SESSION_SECRET` sia generato).
4. Le migrazioni girano automaticamente all'avvio. Health check su `/healthz`.

## Migrazione futura a un DB dedicato

Tutte le tabelle vivono nello schema `nutria`. Per spostarle in un database a sé:

```bash
pg_dump --schema=nutria "$OLD_DATABASE_URL" | psql "$NEW_DATABASE_URL"
```

Poi aggiorna `DATABASE_URL` (ed eventualmente `DB_SCHEMA`) e riavvia.
