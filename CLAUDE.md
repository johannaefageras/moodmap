# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server on port 3000
npm run build    # Production build
npm run test     # Run all Vitest tests once
npm run check    # Biome lint + format check (run before committing)
npm run lint     # Biome lint only
npm run format   # Biome format
```

Run a single test file: `npx vitest run src/lib/insights/correlations.test.ts`
Watch mode: `npx vitest`

## Conventions

- **Biome** formats with **tabs** and **double quotes**. Some files still use spaces/single quotes from before Biome was adopted; match the file you are editing, or run `npm run format` on it. `src/routeTree.gen.ts` and `src/styles.css` are excluded from Biome.
- Import alias: `#/*` maps to `src/*` (e.g. `import { env } from '#/env'`). `@/*` is also configured but `#/*` is the convention in use.
- **The product UI and all user-facing strings are in Swedish.** Error messages thrown from server functions (e.g. `"Inte inloggad"`) surface to users — keep them Swedish and gentle.
- TypeScript is strict with `noUnusedLocals`/`noUnusedParameters`; unused code fails the build.
- **Dates: a "day" is a Stockholm calendar day, not UTC.** All server-side date logic must go through `src/lib/date.ts` (`todayISO`, `daysAgoISO`, `lastNDays`, `isoDate`, etc.) — never `new Date().toISOString().slice(0, 10)` or local `getDate()`/`getHours()`. Inserts set `logged_for` explicitly via `todayISO()` rather than relying on the Postgres `current_date` (UTC) default, so check-ins logged after local midnight land on the correct day. See [Day boundary](#day-boundary) below.

## Architecture

MoodMap is a mood/wellbeing tracking app: users log daily metrics (mood, energy, sleep, etc.) and get AI-generated reflections.

**Stack:** TanStack Start (SSR React 19) + TanStack Router (file-based) + TanStack Query, Supabase (Postgres + Auth), OpenAI, Tailwind v4 + CSS Modules, Zod, Biome, Vitest.

### Server functions are the data layer

All data access goes through `createServerFn` handlers in `src/lib/` — there are no API route files. Each handler follows the same shape:

1. `createSupabaseServerClient()` (reads auth from request cookies, RLS-enforced)
2. `supabase.auth.getUser()` → throw `new Error("Inte inloggad")` if missing
3. Zod `.inputValidator(...)` validates input before the handler runs
4. Query/mutate `entries`, return a narrow `.select(...)` shape

Key modules: `src/lib/entries.ts` (all CRUD + the many specialized loggers — slider/physical/selfcare/social/substance/sleep/check-in), `src/lib/dashboard.ts` (aggregates 7d/30d series for the home page), `src/lib/auth.ts` (current user, sign out, account deletion via service-role admin client).

### Entries are a single wide table

Everything a user logs is one row in `public.entries`. There can be **multiple rows per day** (`logged_for` date); dashboard/summary code groups by `logged_for` and aggregates (avg for sliders, sum for counts, OR for booleans). Many columns are nullable — a single insert sets only the columns relevant to what was logged.

### Day boundary

The app is Swedish, so a "day" rolls over at **Stockholm midnight**, not UTC. `src/lib/date.ts` is the single authority: it derives the current day, ranges, and time-of-day greeting in `Europe/Stockholm` via `Intl` (DST handled automatically). Every server path that reasons about dates uses it — both the `logged_for` written on inserts (`entries.ts`) and the ranges read back (`dashboard.ts`, `summary.ts`, `pattern.ts`, `insights/server.ts`). Client display code (`historik.tsx`, the dashboard chart, modals) is intentionally left on browser-local time, which equals Stockholm for the target audience; if the app ever goes international, switching to per-user timezones centralizes here.

### Database schema lives in migrations, not schema.sql

`supabase/schema.sql` is the **original** schema only. Later columns and tables (`ai_outputs`, `social_note`, meal flags, etc.) exist only in `supabase/migrations/NNNN_*.sql`. Treat the numbered migrations as the source of truth and add a new numbered migration for any schema change. Migrations are applied manually in the Supabase SQL editor. RLS is enabled on `entries` (and `ai_outputs`) with per-user `auth.uid() = user_id` policies — never bypass with the service-role key except in deliberate admin paths like account deletion.

### AI layer (`src/lib/ai/`)

Generates Swedish reflective text. Pipeline in `summary.ts` / `pattern.ts` / `reframe.ts` / `correlations.ts`:

- `client.ts` — thin OpenAI Chat Completions wrapper; model from `OPENAI_MODEL` (default `gpt-5-mini`). Token budgets in `prompts.ts` `SURFACE_LIMITS` are generous because gpt-5 reasoning tokens count against `max_completion_tokens`.
- `cache.ts` — outputs are cached in the `ai_outputs` table keyed by `(user_id, kind, input_hash)`, where `input_hash` is a sha256 of the aggregated input. Reused if fresh (e.g. 24h for summary) or if the input is unchanged.
- `safety.ts` — `detectCrisis()` is run on **both** user notes and model output; on a hit, a fixed Swedish crisis-resource message (`CRISIS_FALLBACK_SV`) replaces the AI text. `prompts.ts` `SYSTEM_PREAMBLE` hard-bans diagnoses, comparisons, and alarming/imperative language.
- Sparse-data guard: summaries are skipped (static fallback) when fewer than 3 days have data.

### Routes & auth

File-based routes in `src/routes/` with Swedish paths (`logga-in`, `skapa-konto`, `historik`, `insikter`, `konto`). `src/routeTree.gen.ts` is auto-generated — never edit it. Protected routes guard in `beforeLoad` by calling `fetchCurrentUser()` and `throw redirect({ to: '/logga-in' })` when absent. Root shell is `src/routes/__root.tsx` (`<html lang="sv">`).

### Environment

Env is validated through `@t3-oss/env-core` in `src/env.ts` — add new vars there, not via raw `process.env`/`import.meta.env`. Client vars need the `VITE_` prefix; everything else is server-only. Copy `.env.example` to `.env`. The app degrades gracefully when keys are absent (Supabase/OpenAI vars are `.optional()`), throwing descriptive errors only when a feature needing them is used.
