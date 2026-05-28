# moodmap — roadmap

Next steps after the current state: AI plumbing + weekly summary live, full dashboard wired to real data.

---

## 1. Finish the AI surfaces

The original AI plan had four surfaces. Only surface 1 (weekly summary) is shipped.

### 1.1 Daily journal prompt (surface 3)
- **Where:** new slim card under the Topbar, or a card in the right column above `ProgressCard`. Recommend under Topbar so it's the first thing the user sees.
- **Input to model:** today's logged values + yesterday's + one recent note if present.
- **Output:** one open Swedish question. Examples: *"Vad gjorde att lördagen kändes lugnare än de andra dagarna?"*, *"Vad behöver du av idag?"*
- **Cache:** keyed per calendar day (`input_hash` includes today's `YYYY-MM-DD`). Generated once on first dashboard load per day.
- **Files to add:**
  - `src/lib/ai/journalPrompt.ts` — `getDailyJournalPrompt` server fn
  - update `src/routes/index.tsx` with a `JournalPromptCard` component
- **UX:** dismissable per day (store dismissal in localStorage or as a separate row). Clicking the prompt opens a small write-a-note modal that creates an entry with just `note` populated.

### 1.2 Pattern observation (surface 2)
- **Where:** small block beneath the weekly summary inside `InsightCard`, or a separate card directly under it. Keep the existing hedged-language tone (*"Det verkar som att…"*).
- **Input to model:** the same 30-day aggregated series we already compute in `dashboard.ts:series30d`. Reusing it avoids a second DB query.
- **Output:** one hedged sentence about a correlation or trend the model notices.
- **Cache:** weekly. Freshness window: 7 days.
- **Files to add:**
  - `src/lib/ai/pattern.ts`
  - extend `InsightCard` to render a `<PatternLine>` under the summary.

### 1.3 Reframe of a self-critical note (surface 4)
- **Where:** inside the `LogSliderModal` save flow. After save, if the note exists and `looksSelfCritical()` returns true, show a small inline link: *"Vill du se det från ett annat håll?"*.
- **Input to model:** the note text only — no other context.
- **Output:** 2-sentence gentler rephrasing, framed as *"Ett annat sätt att se det:…"*.
- **Trigger:** only on click. No automatic call.
- **Files to add:**
  - `src/lib/ai/reframe.ts`
  - update `LogSliderModal` to expose the reframe affordance after save.

---

## 2. Dashboard interaction gaps

Things in the current UI that look interactive but aren't.

### 2.1 Edit / delete past entries
The `RecentEntries` card invites *"Tryck på en dag för att lägga till en anteckning eller redigera."* but rows aren't clickable. Smallest useful slice: clicking a row opens a modal showing the day's full record with delete + edit-note actions. Needs a server fn `updateEntry` and `deleteEntry`.

### 2.2 Chart range tabs
`CombinedChartCard` has 7d / 30d / 90d / 1år buttons but they don't do anything. Wire to switchable state, and either:
- (a) extend `dashboard.ts` to return multiple ranges, or
- (b) keep 30d server-side and re-window in the client for 7d (cheaper).
Recommend (b) for 7d/30d, and an explicit server fn for 90d/1år.

### 2.3 Topbar actions
- **"Exportera"** — see section 6.
- **"Visa historik"** — needs the Historik route (section 3).
- **"+ Ny incheckning"** — already covered by individual card "Logga" buttons; consider whether this button should open a meta-modal that walks the user through the major sliders in one flow, or remove it.

### 2.4 "Visa alla →" footer button in `RecentEntries`
Should link to the Historik route once it exists.

---

## 3. Navigation & sub-routes

Sidebar items (`Översikt`, `Historik`, `Insikter`, `Dagbok`, `Inställningar`, `Konto`) all currently `href="#"`. Build each as a real route:

### 3.1 `/historik`
Paginated list of all entries with day grouping. Filter by metric. Click → edit modal (section 2.1).

### 3.2 `/insikter`
Long-form AI surfaces: full weekly/monthly summaries, pattern history, ability to scroll through old summaries. Reuses the `ai_outputs` table.

### 3.3 `/dagbok`
Notes-only view. All entries that have a `note`, chronological, with the metric values visible. Optional: filter by mood/energy. Could become the main "writing" surface.

### 3.4 `/installningar`
Configurable goals (water 8 glas, etc.), reminder times, AI surface on/off toggles, locale (locked to sv for now), data retention.

### 3.5 `/konto`
Email, password change, sign out (currently lives on the avatar button), delete account (must hard-delete `entries` and `ai_outputs` rows — RLS already cascades via `on delete cascade`).

---

## 4. Mobile & responsive

The dashboard grid is `232px | 1fr | 300px`. On phones it will overflow. Smallest useful work:
1. Below 1024px, hide the right column and surface `InsightCard` / `ProgressCard` / `RecentEntries` as a section in the main column.
2. Below 720px, collapse sidebar into a top hamburger.
3. Metric grid → single column below 600px.
4. Verify the slider modal works at 360px width (emoji row is the risk).

---

## 5. Empty-state and onboarding

A new user lands on a dashboard full of dashes. Currently `RecentEntries` has a soft empty-state line; nothing else does.

- First-run flow: detect zero entries → show a single welcome card with one CTA ("Börja med en liten incheckning"), hide the rest of the dashboard.
- For the AI summary specifically: if fewer than ~3 days of data exist, skip the model call entirely and show a static *"Vi väntar med sammanfattningen tills det finns lite mer att läsa av."*

---

## 6. Data export

The "Exportera" button is wired to nothing.
- **v1:** CSV download of all entries (one row per entry). Server fn returns a streaming response. No PII transformation needed — it's the user's own data.
- **v2:** PDF "report" assembled from a date range + the relevant AI summary for that period.

---

## 7. Reminders & notifications

Optional but core to the "show up" philosophy.
- Email reminder at user-chosen times (uses Supabase scheduled functions or a Vercel/Netlify cron).
- Web push notifications (browser permission) — lower priority.
- Configurable in `/installningar` (section 3.4).

---

## 8. Safety, cost, and ops

### 8.1 Crisis path verification
The `detectCrisis()` regex + static `CRISIS_FALLBACK_SV` are untested in the live flow. Add a small dev-only route that lets you submit a test note string and see whether the crisis path triggers — verify with phrasings from real Swedish helplines' guidance.

### 8.2 AI rate limiting
A determined user could spam "Uppdatera" on the weekly summary. Add a simple per-user, per-surface throttle (e.g. max 10 forced regenerations per day) enforced in the server fn before the OpenAI call. Returns the latest cached row if exceeded.

### 8.3 Cost monitoring
Add a server-side log line on every OpenAI call: model, completion_tokens, reasoning_tokens. Aggregate weekly to confirm spend is in the cents range. If it climbs, the lever is the freshness window (currently 24h for summary) and per-user rate limits.

### 8.4 Error tracking
No error reporter is hooked up. Wire Sentry (or similar) so OpenAI failures, Supabase errors, and server-fn exceptions surface beyond browser console.

---

## 9. Tests

Lowest-cost, highest-value coverage:
- `dashboard.ts` aggregator: feed synthetic `EntryRow[]` and assert `today` / `avg7d` / `series30d` shapes. Pure function, no DB needed.
- `safety.ts`: each Swedish crisis phrase triggers `detectCrisis`; non-matches don't false-positive.
- `cache.ts`: `hashInput` is stable across equivalent objects.

---

## 10. Sequence I'd recommend

1. **Surface 3 (daily journal prompt)** — small slice, visible payoff, exercises a different cache shape (per-day).
2. **Edit/delete past entries (2.1)** — the dashboard already invites the action; closing this loop matters before adding more.
3. **Surface 2 (pattern observation)** — reuses `series30d` already in hand.
4. **Empty-state / few-days handling (5)** — important before showing this to anyone new.
5. **Historik route (3.1)** — gives the "Visa historik" / "Visa alla →" actions a destination.
6. **Mobile responsive pass (4)** — easier to do once the routes exist so each gets the treatment together.
7. **Surface 4 (reframe)** — lower-priority since it's opt-in and modal-local.
8. **Settings + reminders (3.4, 7)**.
9. **Export, account page, sub-routes** as needed.

---

*Generated by Claude during the same session that built the AI plumbing and the dashboard data wiring. Edit freely — this is a working doc, not a contract.*
