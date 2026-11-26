# Tanora | Beta 2.0 and Beta 2.1 Release History

_Last updated: November 26, 2026. This file records the released scope and remaining verification separately from the original implementation/test checklists._

## Status and provenance

- Beta 2.0 established workout tracking on top of the existing nutrition app.
- Beta 2.1 was developed on `feature/beta-v2.1-quality-of-life`, merged into `main` via [PR #4](https://github.com/saiattinti/tanora/pull/4), merge SHA `2267f847580bcbc0f5227b7da2396e5e50bc4da0`.
- The owner reported Beta 2.1 running on the Cloudflare Pages site at https://tanora.pages.dev, approved the unified visual design, and shared successful Mac `npm run lint` and `npm run build` outputs.
- This summary **does not** certify CI, complete iPhone device tests, end-to-end persistence of every feature, or RLS policy verification. Older `BETA_*.md` documents were written at implementation time and may still say “not deployed” or “pending”; retain them as test specifications, not the present release status.

## Beta 2.0: Workout tracker

**Interface and logging:** Added Nutrition/Workouts navigation and a workout logger that records exercises, sets, repetitions, weight, date, notes and completed status.

**Exercise library:** Searchable 177-exercise starter library, muscle group/equipment filters, and RepDB illustration mappings where available (with fallback). Licensed images are illustrative references, not guaranteed exercise-form instruction.

**Routines and history:** Create/reuse routines, review/delete workout history, inspect recorded sets, and calculate workout counts, completed sets, total weight-volume, best completed-set weights, and per-exercise progression charts. “Personal best” refers to the heaviest completed set, not a calculated one-rep maximum.

**Data:** Signed-in workout data is stored in Supabase in `public.workout_data`, with guest workouts stored separately in the browser. Workout storage does not replace existing nutrition logs.

**Schema:** `supabase/migrations/20261123_workout_data.sql`.

**Reference:** `BETA_V2.0_WORKOUT_PLAN.md`.

## Beta 2.1: Eleven convenience features plus UI redesign

| Group | Implementation | Reference |
| --- | --- | --- |
| 2.1.1: Workout logging | Prefill previous completed working sets (unchecked), edit completed workouts, recover local drafts, warm-up vs working classification | `BETA_V2.1.1_TESTING.md` |
| 2.1.2: Gym utilities | Rest timer with presets/optional auto-start, symmetric barbell plate calculator, lb/kg toggle with pound-canonical recorded weights | `BETA_V2.1.2_TESTING.md` |
| 2.1.3: Nutrition convenience | Saved meals, recipe builder, scalable servings/grams, food timestamps and editable log times | `BETA_V2.1.3_TESTING.md` |
| 2.1.4: Overview and recipes | Seven-day nutrition/workout Overview; recipes inside saved meals with nutrition snapshots | `BETA_V2.1.4_TESTING.md` |
| UI | Consistent emerald/near-black Nutrition, Workouts and Overview; desktop sidebars and compact mobile feature navigation | `BETA_V2.1_UI_REDESIGN_TESTING.md`, `BETA_V2.1_UNIFIED_DESIGN_TESTING.md` |

### Nutrition UI choices approved

- Circular calorie ring, compact protein/carbs/fat summary, dark raised panels.
- Chronological timeline diary rather than mandatory Breakfast/Lunch/Dinner buckets.
- Text-first food diary without relying on a photo for every item.
- Saved meal vs recipe explanation available contextually instead of a permanently displayed disclaimer.
- Distinct nutrition features/screens, desktop sidebar and mobile-oriented navigation.

### Behavioral notes

- A saved meal is a reusable set of foods and/or recipe portions; logging a meal creates diary entries scaled to the requested quantity.
- A saved recipe uses ingredient nutrition snapshots, cooked yield and batch servings; a recipe portion can be logged by grams or servings.
- Including a recipe in a saved meal stores a nutrition snapshot: changing the source recipe should not retroactively change prior logs or saved meal values.
- Diary timestamps are editable; previously recorded untimed entries are not assigned a fabricated historical clock time.
- Seven-day nutrition averages use only days with recorded food entries and label the denominator. They are not averages over every calendar day.
- Warm-up sets stay visible but do not inflate working-set volume/PRs.
- A local workout draft is not a completed workout and does not automatically sync between devices.

### Source files

- `src/App.tsx`, `src/NutritionRedesign.css`, `src/NutritionTemplates.tsx`, `src/NutritionTemplates.css`
- `src/WorkoutTracker.tsx`, `src/WorkoutTracker.css`, `src/WorkoutUtilities.tsx`
- `src/WeeklyOverview.tsx`, `src/WeeklyOverview.css`, `src/TanoraModules.css`, `src/Root.tsx`, `src/index.css`
- `src/lib/nutritionTemplates.ts`, `src/lib/foodTimes.ts`, `src/lib/useRestTimer.ts`, `src/lib/workoutDraft.ts`, `src/lib/workoutUnits.ts`, `src/lib/workoutTypes.ts`
- `supabase/migrations/20261124_nutrition_convenience.sql`

### Supabase and production safety

The owner visually confirmed `saved_meals`, `saved_recipes`, and the `food_entries.eaten_at` column in Supabase. This confirms the objects exist, **not** that all grants and row-level-security policies have been inspected. The migration file is additive but contains policy setup and should not be blindly reapplied. Preserve nutrition and workout records and isolate guest local storage from authenticated cloud data.

## Build / QA record

- **Mac:** User-provided terminal screenshots showed success for `npm run lint` and `npm run build` after pulling the merged changes; a Vite bundle-size advisory was nonblocking.
- **Design:** Owner reported all three redesigned sections looking good before release approval.
- **Deployment:** Owner reported Beta 2.1 up and running after Cloudflare deployment instructions.
- **Still worthwhile:** Validate live auth, USDA/barcode Functions, saved meal and recipe persistence, edit/delete flows, workout routine/history, iPhone safe areas and PWA navigation, cross-device refresh, Supabase RLS/grants and no accidental guest-to-account data mixing.

## Known technical boundaries

1. Workout cloud history/routines share a JSON document per account. Concurrent multi-device writes can overwrite newer data.
2. Local drafts and rest timer state are browser-specific; background alerts on iPhone PWA are not guaranteed.
3. In-progress UI, storage, and time handling require continuing regression tests as more features arrive.
4. Exercise imagery depends partly on external RepDB assets and their license/attribution; some mappings are approximate.

## Next versions (planning only)

- **3.0:** Body measurements, body-composition logging, more connected fitness analytics; optional DEXA result entry.
- **4.0:** Personal Response Engine, Tanora Experiments, Adaptive Goal Planning, shareable Progress Replay, and Decision Memory. Personal Response Engine and Decision Memory are potential paid-tier differentiators.

No 3.0 or 4.0 functionality is claimed as shipped.
