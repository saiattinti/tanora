# Tanora Beta 2.1.4 | Weekly Nutrition + Workout Overview

Status: IMPLEMENTED ON DEVELOPMENT BRANCH, NOT LOCALLY BUILT OR TESTED
Branch: `feature/beta-v2.1-quality-of-life`
Live production: `v2.0.0-beta`, unchanged.

## Features added

- A dedicated **Overview** tab in the three-tab primary navigation (Nutrition, Workouts, Overview).
- **Last 7 local calendar days**, including today. Each day shows calories logged and whether any foods were recorded.
- **Logged-day calorie and protein averages:** exclude unlogged days, label the denominator, and warn that partial days may understate intake.
- **Saved workout count, completed working sets, and working-set volume:** derived from existing workout history, not drafts; warm-up sets excluded.
- Workout activity shown day by day. Volume respects the user's preferred lb/kg display.
- Signed-in users read their own Supabase nutrition and workout records; guests read their own local storage. Refresh button and visibility refresh allow cross-device updates.
- Empty, partial-data, loading, and error displays.

## Beta 2.1.3 addition: recipes inside saved meals

- Under Saved Meals & Recipes, create or edit a meal and use **Add a saved recipe to this meal**.
- Select a saved recipe directly, without logging it into the diary first.
- Specify the cooked portion as **servings** or **grams cooked** in that meal.
- Combine with USDA foods, favorites and other items.
- A saved meal stores a **nutritional snapshot** of each included cooked recipe, using its finished cooked yield, not a live reference.
- Editing or deleting the original recipe afterwards does not rewrite existing saved meals or logged diary entries.
- No additional SQL migration beyond `supabase/migrations/20261124_nutrition_convenience.sql`, which has already been applied by the user for 2.1.3.

## Local build, not yet performed

Stop running the dev server with Ctrl+C, then from the existing development branch:

```bash
cd ~/nutrition-app
git status
git pull --ff-only
npm run lint
npm run build
npm run dev:api
```

If `git status` shows changes, resolve or back up them before pulling. Do not run a production deploy or switch to main.

## Acceptance tests

1. **Recipe in meal:** Make a 900 g cooked curry recipe with 3 servings. Create a saved lunch, add 1 serving of curry (300 g), then 150 g rice. Confirm combined total equals the two component macro calculations.
2. **Gram-based recipe portion:** Change curry within the saved meal from 1 serving to 200 g cooked. Confirm macros scale by 200/900 of the full recipe batch.
3. **Fractional saved meal:** Log 0.5 and 1.5 servings of that saved meal on different test dates. Verify separate diary entries for curry and rice and correctly scaled total macros.
4. **Snapshot stability:** Modify or delete the original curry recipe. The saved lunch and any previously logged diary entries must retain their earlier nutrition values.
5. **Old templates:** Saved meals created in initial 2.1.3 without recipe ingredients must still load and log.
6. **Overview period:** Dates must be seven consecutive **local** calendar days and show the correct date range, including iPhone timezone.
7. **Nutrition average:** Log 2,000 calories on one day and 1,000 on another. With only these two logged days, average should show 1,500 kcal for 2 logged days, **not** 428.6 kcal across all 7.
8. **Missing vs zero:** Unlogged days display 'No log'; a day with a zero-calorie item is counted as a logged day rather than a missing day.
9. **Workouts:** Log two saved workouts in the week, each with one warm-up and two completed working sets. Overview should show 2 workouts and 4 working sets, with volume excluding warm-ups.
10. **History edit:** Editing an earlier workout should recalculate weekly volume and counts after refreshing Overview. Older workouts outside the seven-day range should not count.
11. **Guest isolation:** Guest overview displays guest-only records; after switching to signed-in account, the same app shows only that account's nutrition/workout records.
12. **Cloud sync:** Log on iPhone and refresh Overview on Mac. Confirm data reflects the same authenticated account.
13. **Navigation:** Confirm three navigation tabs fit on narrow iPhone screens, retain dark mode styles, and don't break the workout rest timer or nutrition time picker.
14. **Regression:** USDA food search, barcode logging, saved meals, recipe builder, food diary dates/times, workout history/routines, Google login, and 2.1.1/2.1.2 features remain working.

## Release gate

Do not merge draft PR #4 or deploy this code to `main` yet. Local lint/build, a complete test pass, iPhone preview deployment, and explicit user approval are all required first.
