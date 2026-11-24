# Tanora Beta 2.1.3 | Nutrition Convenience
Status: CODE COMMITTED, LOCAL LINT/BUILD AND FUNCTIONAL TESTING PENDING.
Production remains Beta 2.0 at https://tanora-1qa.pages.dev/.
Development branch: feature/beta-v2.1-quality-of-life (draft PR #4).

## Features implemented
1. **Saved meals:** Create and edit reusable combinations of existing foods or USDA-searched ingredients. Each food stores a nutrition snapshot and a measured quantity. Log 0.5, 1, 1.5, or multiple meal portions at once; every ingredient becomes a normal food diary entry.
2. **Recipe builder:** Search/add ingredient quantities; specify total cooked yield in grams and servings per batch. Calculate batch nutrition, per-serving macros, and log a recipe by serving count or grams cooked. The recipe appears as one diary entry with a saved nutrition snapshot.
3. **Food timestamps:** New food logs default to the current local clock at actual save time. The time picker supports manual overrides. Food diary entries sort earliest to latest. Edits retain or change the time; historical entries without a timestamp display **Time not recorded** and sort after timed foods.

## ADDITIVE SUPABASE MIGRATION (REQUIRED BEFORE SIGNED-IN TESTS)

Review the SQL file:
`supabase/migrations/20261124_nutrition_convenience.sql`

Run its SQL **once** in the existing Supabase SQL Editor using your current authenticated project. The SQL adds only a nullable `food_entries.eaten_at` column, plus `saved_meals` and `saved_recipes` tables with per-user RLS and grants. It does not drop or rewrite any prior diary entries, macro goals, favorites, or workouts.

**Important:** Cloud nutrition reads in 2.1.3 request the new `eaten_at` column. Signed-in test builds will show an error until the migration is applied. The live 2.0 app does not query this column and should keep working. Never rerun the original production table-creation script or reset old tables.

Guest data works without the Supabase migration and stays isolated in browser localStorage.

## Build and start (run from Mac after syncing branch)

```bash
cd ~/nutrition-app
git status
git pull --ff-only
npm run lint
npm run build
npm run dev:api
```

Open http://localhost:8788 (full-stack Wrangler local preview). Only test signed-in 2.1.3 after applying the additive migration. Do not deploy to production.

## Acceptance checklist
- Old food diary entries, favorites, manual foods, barcode products, workout history and cloud login still appear as before.
- USDA search still works and its ranking is unchanged.
- Log a new food without changing the time picker, then confirm the diary displays a local timestamp close to when Save was pressed.
- Log an earlier meal using a custom time. It must appear **before** later foods on that date regardless of creation order.
- Edit an existing entry's time without changing its calories or macros; refresh and check the time persisted across login/device.
- Old v2.0 entries show **Time not recorded** instead of an invented timestamp.
- Quick Log and Repeat assign the actual new log time rather than copying the source entry's old timestamp.
- Create a saved meal of 200 g chicken + 150 g rice. Check macro sums. Log at 1.5 servings, and verify each ingredient is logged with scaled amounts.
- Editing a saved meal updates the template without modifying previously logged entries.
- Build a recipe from weighed ingredients. Set raw ingredient totals to a batch yield of 600 g cooked, 4 servings. Per-serving macros must equal one quarter of total ingredient macros; logging 150 g cooked must equal one quarter of batch macros.
- Recipe is logged as a single diary entry, and changing the saved recipe later must not rewrite that earlier diary entry.
- A custom recipe portion of 0.5 servings or any valid measured cooked gram quantity works.
- Delete a saved meal or recipe and confirm old food logs remain untouched.
- Save, reload, and verify saved meals and recipes persist for the same signed-in account across devices.
- Guest meals and recipes must stay in guest browser storage, not leak into authenticated accounts.
- Food date navigation and daylight-saving/timezone edge cases do not produce spurious dates. Date and time are editable for existing food entries through the corresponding daily diary.
- Confirm saved meal components upload together in one Supabase insert request; failed requests must not leave partial meal logs.
- Check on iPhone Safari/PWA after local tests and preview deployment: form usability, time picker, recipe yield, serving fractions, logged-food ordering and cloud sync.

## Design notes / deferred work
- Recipes use per-ingredient recorded nutrition snapshots. Cooking weight loss changes nutrition **per cooked gram**, not the total nutrition of the batch. Water absorbed or evaporated changes weight but not the sum of ingredient macro estimates.
- Saved meals log distinct food entries rather than a single combined food.
- Custom date/time uses the user's local timezone when saved, stored as a UTC instant in Supabase. Very unusual daylight-saving ambiguity may need explicit timezone selection later.
- Guests have local data; signed-in templates are stored in Supabase under user-specific RLS.
- No image/recipe photo feature is included in 2.1.3.
- Beta 2.1.4 weekly overview remains unimplemented.
- Do not merge or deploy to production until all local, preview and iPhone checks pass, and the user explicitly approves the full Beta 2.1 release.
