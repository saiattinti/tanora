# Tanora

Tanora is a mobile-first nutrition and workout tracking web app built with React, TypeScript, Vite, Supabase, and Cloudflare Pages. The web app is also available as a progressive web app (PWA). A separate React Native/Expo iOS project is being developed; the native app is **not** the released web build.

> **Current release: Beta 2.1 (November 2026).** The Beta 2.1 feature and unified-interface update was merged into `main` in [PR #4](https://github.com/saiattinti/tanora/pull/4) (merge commit `2267f847`). The project owner reported the Cloudflare deployment at [tanora.pages.dev](https://tanora.pages.dev) running. Local ESLint and production build passed; this is not a claim that automated CI, iPhone regression tests, live cloud synchronization, and all account-security policies have been independently verified.

## Current features

### Nutrition
- Daily calorie, protein, carbohydrate, and fat goals, with Smart Goals calculator and progress.
- USDA FoodData Central ingredient search, Open Food Facts barcode lookup, and iPhone camera scanning in the web/PWA experience.
- Custom foods, favorites, recent foods, quick repeat logging, grams and fractional portions.
- Editable food entries and dates; food timestamps with a chronological, meal-name-independent diary.
- Saved meals with scalable quantities and reusable cooked recipes; recipes can be added to saved meals as nutritional snapshots.
- Recipe builder with ingredient quantities, cooked yield, and gram/serving-based portions.
- Redesigned emerald dashboard with a calorie ring, compact macro cards, desktop sidebar, and mobile navigation.

### Workouts
- Searchable 177-exercise starter catalog with muscle/equipment filters, exercise imagery when available, and fallbacks.
- Log working and warm-up sets, repetitions, weights, dates, and notes; create and reuse routines.
- Workout history, edit/delete, best completed weight, workout counts, working volume, and exercise strength charts.
- Suggested previous working-set values, recoverable browser-local in-progress drafts, rest timer with presets and optional auto-start.
- Barbell plate calculator and lb/kg display/input toggle; historical workout weights retain pound-based storage.
- Matching emerald interface, desktop workout sidebar, and mobile navigation.

### Overview and accounts
- Seven-day nutrition and workout overview, with logged-day nutrition averages excluding days without logs.
- Workout counts and working-set volume exclude warm-up sets.
- Supabase email/password and Google sign-in, authenticated cloud storage, separate local-only Guest Mode.
- Light/dark appearance modes, PWA/Home Screen branding, and responsive design.

## Version history

| Release | Highlights | Status |
| --- | --- | --- |
| Beta 1.0 | Food diary, USDA, barcode, Smart Goals, account syncing | Historical |
| Beta 1.1 | Google sign-in, Guest Mode, dark mode | Historical |
| Beta 1.2 | Food logging, custom foods, favorites, fractional portions, Tanora branding/PWA | Included in current release |
| **Beta 2.0** | Workouts, exercise library, routines, workout history, strength tracking and cloud/guest workout storage | Released before 2.1 |
| **Beta 2.1** | Workout convenience and tools, saved meals/recipes, timestamps, seven-day overview, unified emerald UI | **Merged and owner-reported live** |

Full documentation: [Beta 2.0 and 2.1 release history](RELEASE_HISTORY_BETA_2_0_2_1.md). Original phase-specific planning/testing checklists are retained as historical documents; their “not released” statuses may refer to the time they were written.

## Technology

React 19, TypeScript, Vite 8, Supabase Auth/Postgres, Cloudflare Pages/Functions, USDA FoodData Central, Open Food Facts, html5-qrcode, and a Vite PWA plugin.

## Local development

Requirements: Node.js/npm, Supabase client environment variables in `.env.local`, and a USDA server-side secret for local Cloudflare Functions development in `.dev.vars`. These files must stay uncommitted. Never expose a Supabase service-role key or USDA server secret in client-side Vite variables, GitHub, or chat.

```bash
cd ~/nutrition-app
git switch main
git pull --ff-only origin main
npm ci
npm run lint
npm run build
npm run dev:api
```

Open `http://localhost:8788`. The `dev:api` script serves the existing `dist` build through Wrangler, so **rebuild** after changing source files before previewing with this command. For hot-reload UI development, use `npm run dev`, but API Functions require the appropriate separate Wrangler/server configuration.

## Deployment and database

- **Source:** `main`; latest Beta 2.1 feature merge [PR #4](https://github.com/saiattinti/tanora/pull/4).
- **Public URL reported by owner:** https://tanora.pages.dev
- **Cloudflare direct deployment (after building and confirming the Pages project):** `npx wrangler pages deploy dist --project-name=tanora --branch=main`. Confirm the actual Cloudflare project, environment variables and Functions configuration before deploying.
- **Supabase workout migration:** `supabase/migrations/20261123_workout_data.sql` creates user-scoped `workout_data`.
- **Supabase 2.1 convenience migration:** `supabase/migrations/20261124_nutrition_convenience.sql` adds `food_entries.eaten_at` and user-scoped `saved_meals` and `saved_recipes`. The owner verified that both tables and the column exist. Table existence alone does not verify RLS policies/grants or successful end-to-end cloud writes.
- Do not reset production tables or rerun broad schema creation scripts to deploy an interface update. Verify migration status and policies before applying any SQL.

## Known limitations / verification

- Concurrent edits from separate devices to the same workout JSON document may cause last-writer-wins updates. Local draft recovery is per browser/device, not cloud draft sync.
- iPhone PWA background rest-timer alerts are best effort, not guaranteed notifications.
- RepDB exercise imagery can be approximate; do not treat an illustration as authoritative exercise-form instruction. Follow its [dataset licensing/attribution requirements](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md).
- The owner reported local lint/build success and visual approval of Nutrition, Workouts and Overview. A complete signed-in/guest, cross-device, iPhone and security regression pass remains advisable.
- Nutrition information from third-party databases is approximate and should be checked against product labels.

## Further plans

Beta 3.0 is intended to expand body measurements, body composition, and progress analytics (DEXA entry optional). Beta 4.0 is reserved for Personal Response Engine, Tanora Experiments, Adaptive Goal Planning, Progress Replay, and Decision Memory. These are **planned**, not released features.
