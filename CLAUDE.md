@AGENTS.md

# NutrIA - AI Food Tracker App

## Project Overview
**NutrIA** (Nutri + IA) is a multi-user AI-powered food tracking mobile app built as a web-first PWA.
Users describe what they eat in natural language, and Claude AI estimates calories and macronutrients.
The app provides a food diary, AI-generated dietary insights, water tracking, and health data integration.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Framer Motion animations
- **Database**: Prisma 7 + PostgreSQL via Neon (adapter: `@prisma/adapter-pg`)
- **Deploy**: Vercel
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Charts**: Recharts
- **Auth**: Custom session-based (bcryptjs + HTTP-only cookies)

## Project Structure
```
src/
├── app/
│   ├── (auth)/          # Login, Register pages
│   ├── (dashboard)/     # Dashboard, Diary, Insights, Profile pages
│   ├── api/             # REST API routes (auth, food, water, insights, health, profile, diary)
│   └── layout.tsx       # Root layout
├── components/
│   ├── ui/              # Button, Input, Card, Modal, Select, ProgressRing
│   ├── food/            # FoodInput (modal), FoodEntryCard
│   ├── charts/          # MacroChart (pie), WeeklyCaloriesChart (bar)
│   └── layout/          # BottomNav
├── lib/
│   ├── ai.ts            # Claude API integration (analyzeFoodEntry, generateDailyInsight, generateWeeklyReport)
│   ├── auth.ts          # Session auth (register, login, logout, getSession, getCurrentUser)
│   ├── db.ts            # Prisma client singleton
│   └── utils.ts         # Helpers (cn, formatDate, getMealTypeLabel, calculateBMR, calculateTDEE)
└── middleware.ts         # Route protection (auth redirects)
```

## Key Commands
```bash
npm run dev              # Start dev server
npm run build            # Production build
npx prisma migrate dev   # Run DB migrations
npx prisma generate      # Regenerate Prisma client
npx prisma studio        # Open DB browser
```

## Environment Variables
See `.env.example`. Required:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `ANTHROPIC_API_KEY` - Claude API key for AI food analysis
- `AUTH_SECRET` - Session encryption secret

## Deployment (Vercel + Neon)
1. Create a free Neon database at neon.tech
2. Import the repo on Vercel
3. Set `DATABASE_URL`, `ANTHROPIC_API_KEY`, `AUTH_SECRET` in Vercel env vars
4. Run `npx prisma migrate deploy` against the Neon DB (or use Vercel build command)
5. Vercel auto-deploys on push

## Database Schema (Prisma)
Models: `User`, `Session`, `FoodEntry`, `DailySummary`, `HealthData`, `WaterEntry`, `AIInsight`
- `FoodEntry` stores raw description + AI-parsed nutritional data
- `DailySummary` aggregates daily totals (auto-updated on food create/delete)
- `HealthData` stores manual health metrics (ready for Apple Health integration)

## Design System
- **Colors**: Emerald-600 primary, gray-50 background, white cards
- **Style**: Rounded-2xl corners, shadow-sm, mobile-first, bottom navigation
- **Animations**: Framer Motion for page transitions, modals (bottom-sheet style), and micro-interactions
- **Typography**: System font stack (Inter when available)

## Important Notes
- Prisma 7 requires a driver adapter (not just a URL) - using `PrismaPg`
- The app uses `middleware.ts` for route protection (deprecated in Next.js 16, may need migration to `proxy`)
- AI fallback: if Claude API is unavailable, a heuristic estimator provides basic calorie guesses
- All AI responses are in Italian (matching the app's UI language)
- The app is entirely in Italian

## Future Development Plans
- Photo-based food recognition (Claude Vision)
- Intermittent fasting timer
- Barcode scanner integration
- Recipe suggestions based on nutritional gaps
- Apple Health native integration (React Native / Capacitor)
- Push notifications
- Gamification (streaks, badges)
- Social sharing features
- PDF report export
