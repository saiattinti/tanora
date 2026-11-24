# Tanora Beta 2.1 | Quality of Life Update

Status: PHASE 1 (BETA 2.1.1) CODE COMMITTED, NOT YET TESTED. PHASES 2–4 NOT STARTED.
Base release: `v2.0.0-beta` (`main` as of branch creation)
Development branch: `feature/beta-v2.1-quality-of-life`

## Locked scope: eleven requested features

1. Built-in rest timer
2. Auto-fill previous weights and reps
3. Edit completed workouts
4. Auto-save unfinished workout drafts
5. Warm-up sets
6. Saved meals
7. Recipe builder
8. Weekly nutrition and workout overview
9. Barbell plate calculator
10. Pounds/kilograms toggle
11. Food diary timestamps with chronological sorting and editable log times

Do not silently remove, replace, or expand this scope. Treat the plan below as an initial implementation design that can be refined while keeping these eleven user-facing requirements intact.

## Phase 0 | Safety and compatibility

- Keep the production URL `https://tanora-1qa.pages.dev/` running Beta 2.0 until the 2.1 preview is tested and approved.
- Develop and review changes only on `feature/beta-v2.1-quality-of-life`. Never deploy this branch using `--branch main`.
- Preserve `nutrition_goals`, `food_entries`, `favorite_foods` and `workout_data`. No destructive SQL, table resets, or rewritten nutrition entries.
- Any added Supabase objects must use `auth.uid()`-scoped RLS and explicit role grants. Add migration files, review them, and apply them separately before testing signed-in features.
- Keep guest nutrition/workout data local and separate from authenticated accounts.
- Prefer optional, backward-compatible fields and a versioned migration/normalization layer for existing workout JSON records. Existing 2.0 workouts and routines must still load.
- Protect against stale writes or lost edits, especially for autosaved drafts and multi-device cloud updates.
- Check `npm run lint` and `npm run build` after each implementation phase. Then test desktop, iPhone Safari, PWA, refresh, Google login, guest mode, and cross-device cloud sync.
- Avoid asking users to enter credentials or API keys in chat.

## Phase 1 | Workout logging convenience (features 2, 3, 4, 5)

Implementation checkpoint: See `BETA_V2.1.1_TESTING.md`. Changes are committed on the 2.1 development branch. Lint, build, local tests and iPhone preview remain required. Never treat this as a production release.

**Auto-fill previous weights/reps**
- On adding an exercise or starting a routine, optionally prefill the most recent logged completed sets for the same exercise ID.
- Keep set completion states unchecked and never silently overwrite current edits.
- Provide a visible “Last time” indication and a way to reset suggested values.

**Edit completed workouts**
- Add an Edit action to a workout in History. Reuse the logger's exercise/set inputs; save changes to the same workout ID.
- Confirmation before deletion, cancel without changing the history, validation for nonnegative weight/whole-number reps.
- Update aggregate stats, max weight, and progress charts from edited workouts. Do not affect saved routines unless explicitly edited.

**Auto-save unfinished workout drafts**
- Persist the current in-progress workout locally per account identity and for guests in their own separate storage key.
- Auto-restore after app refresh, navigation, or crash; show Resume / Discard. Never treat a draft as a completed workout.
- Clear the draft only after successful saving or confirmed discard. Avoid overwriting a newer draft from another tab.

**Warm-up sets**
- Extend `WorkoutSet` with an optional `kind` (`warmup` or `working`); missing kind means `working` for old data.
- Clearly label warm-up rows and allow changing their type.
- Exclude warm-up sets from working-set counts, working-set strength PRs and lifting-volume summaries, unless a separately labeled total explicitly includes them.

Acceptance: 2.0 logs remain readable; a workout can be edited and resaved; drafts restore after refresh; prefilled values never auto-complete sets; warm-up classification does not distort PRs.

## Phase 2 | Workout utilities (features 1, 9, 10)

**Built-in rest timer**
- Presets: 60, 90, 120, 180 seconds; custom duration.
- Start manually or optionally after a working set is checked complete. Pause/reset.
- Use a persisted end timestamp rather than only a decrementing interval so the timer stays accurate after backgrounding.
- iPhone PWA/browser alerts are best effort; no promise of guaranteed background notifications.

**Barbell plate calculator**
- Input total target weight, selectable bar weight, available plate denominations and quantities.
- Compute a symmetric per-side loading arrangement; surface impossible exact totals instead of inventing a configuration.
- Explain that the bar is included in the target; support lb/kg units.

**Pounds/kilograms toggle**
- App preference for display and new workout entry; define canonical storage unit before implementation.
- Existing v2.0 numeric weights are **pounds** and must not be reinterpreted as kilograms.
- Convert consistently using 1 kg = 2.20462262185 lb, with controlled rounding and no cumulative drift.
- Distinguish display conversion from plate availability, which is unit-specific.

Acceptance: timer accurate after app is backgrounded; plate calculator results are symmetric and honor inventory; switching units does not alter recorded physical loads.

## Phase 3 | Nutrition convenience (features 6, 7, 11)

**Saved meals**
- A named, reusable group of ingredients/foods with individual measured quantities.
- Save, edit, rename, delete, and log a meal with an adjustable servings multiplier. Each logged component becomes a regular diary entry, with aggregate macros displayed.
- Reusing a meal must not mutate previously logged food entries.

**Recipe builder**
- Enter multiple existing food ingredients and per-ingredient grams/mL, plus total cooked yield (grams) or number of servings.
- Calculate batch macros and per-gram/per-serving nutrition using the ingredient data. Handle cooking weight loss by dividing total batch nutrition by finished yield, not by changing total calories.
- Make recipes reusable and permit logging a measured cooked portion. Clarify precision, approximations and USDA source differences.
- Store a snapshot of ingredient nutrition when saving a recipe so changes to external food data do not unexpectedly rewrite old recipes.
- Share existing nutrition models where possible, but keep meals and recipes distinct: meals group ready-to-log items; recipes define a combined cooked food.

**Food diary timestamps and chronological ordering**
- Every new food diary entry records the time it was eaten; default the time picker to the user's current local time at the moment of logging, with a manual time override before saving.
- Display the time next to each food and sort each day's diary from earliest to latest; use a stable secondary sort for equal times.
- Allow changing the logged time when editing an existing diary entry, without altering its nutritional values.
- Persist an unambiguous timestamp (e.g., ISO 8601 UTC instant) plus the intended local date/time representation or zone as appropriate, so daylight-saving changes, device timezone changes and entries logged for past/future dates are handled deliberately.
- For foods logged onto a different date, show a clearly editable date and time; do not silently attach the current date's clock time without letting the user adjust it.
- Keep historical v2.0 food records unchanged. Existing entries without an eaten-at timestamp should still render and be grouped correctly with an explicit "Time not recorded" label, rather than inventing historical times from creation metadata.
- Preserve the entered date/time and meaningful ordering when signing in, syncing, and adding foods through saved meals and recipes. Apply consistent ordering to cloud and guest diary data.
- Implement as a backward-compatible, additive database migration if a timestamp field is needed; do not drop or rewrite existing food entries.

**Persistence**
- Prefer a new user-scoped `saved_meals` and `saved_recipes` schema or equally secure versioned data store. Separate guest/local storage.
- The existing `favorite_foods` records and `food_entries` are preserved. No forced migration of old entries.
- Document and review the migrations before running them.

Acceptance: correctly total ingredients, adjust to 0.5/1.5 servings, repeat a saved meal, save a recipe by cooked weight, verify historic diaries are unchanged, and confirm timestamps are editable and diary entries sort earliest to latest (including ties and old entries without times).

## Phase 4 | Unified insights (feature 8)

**Weekly nutrition & workout overview**
- Show rolling or calendar-aligned last 7 days, clearly label date range and local timezone.
- Calculate daily/weekly average calories and protein only from entries on that day; distinguish no log from a confirmed zero intake.
- Show workout frequency, completed working sets, and strength volume for the same time range.
- Integrate on a simple mobile-friendly overview accessible from both sections; no new AI in this release.
- Handle partial logging, missing data, late sync and edited history without misleading denominators.

Acceptance: results match the actual diary and workout history, date boundaries are correct, and empty/partial-data states are understandable.

## Review and rollout sequence

1. Confirm phase 0 safeguards and review current schemas.
2. Implement Phase 1 on the feature branch. Test prior workout preservation and drafts.
3. Implement Phase 2. Test timers and conversions on iPhone.
4. Implement Phase 3 with additive Supabase migration, guest storage, and complete nutrition regression checks.
5. Implement Phase 4 dashboard.
6. Run lint/build, preview deploy on a non-main Cloudflare branch, configure Auth redirect origins if needed.
7. Confirm iPhone PWA, Google login, nutrition/USDA/barcode, exercises/RepDB, all eleven new features, guest isolation and cloud synchronization.
8. Merge by PR only after review and successful test. Deploy `main` to production, verify production, tag `v2.1.0-beta`, and append release notes.

## Explicitly deferred

Weight/body measurements, DEXA, progress photos and recovery tracking stay in 3.0. Personal Response Engine, Decision Memory, Tanora Experiments, adaptive planning and Progress Replay stay in 4.0.
