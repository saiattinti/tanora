# Tanora Beta 2.1.1 | Workout Logging Improvements

Status: IMPLEMENTED ON DEVELOPMENT BRANCH, NOT TESTED OR RELEASED
Branch: `feature/beta-v2.1-quality-of-life`
Production stays at `v2.0.0-beta` until approved.

## Scope included

1. Previous working sets: adding an exercise or launching a routine prepopulates the last **completed working** sets (weight + repetitions). Completion checkboxes start unchecked. Reset sets button clears suggestions.
2. Edit a completed workout: History > open a workout > Edit workout. Edits retain the same workout ID and update totals and charts after saving. Canceling leaves the saved workout unchanged.
3. Recover unfinished workouts: active workout changes are stored in browser-local, account-scoped storage. Returning after navigating away or refreshing offers Resume draft or Discard draft. A draft is never counted as completed. A successful save clears the draft.
4. Warm-up sets: each set is marked Working or Warm-up. Warm-ups remain visible in history but are excluded from working-set counts, volume, and heaviest-set PRs. Existing Beta 2.0 sets default to Working.

## Test on the Mac

From the repository, switch safely only when the working tree is clean:

```bash
cd ~/nutrition-app
git status
git fetch origin
git switch feature/beta-v2.1-quality-of-life
git pull --ff-only
npm run lint
npm run build
npm run dev:api
```

Open `http://localhost:8788`.

## Acceptance tests

- **Previous sets:** Save Bench Press at 100 lb x 8 and 110 lb x 6 with completed working sets. Start a fresh workout, add Bench Press. Expect both completed set values copied, each unchecked. Reset sets returns default blank weights.
- **Old 2.0 records:** Existing history, routines, exercise images and nutrition logs still load. They have no `kind` field and must count as working sets.
- **Warm-up exclusion:** Save a 45 lb x 10 warm-up and 100 lb x 5 working set. History displays both with the warm-up label. Working set volume must equal 500 lb and PR must equal 100 lb (not 45 lb). Editing the 100 lb set to warm-up must update metrics after saving.
- **Edit history:** History > Edit workout; change weight, date, reps or exercises; Save workout changes. The same workout ID must be retained and only one history entry should exist.
- **Cancel editing:** Make edits, choose Cancel editing, confirm discard, and verify the saved workout remains unchanged.
- **Draft recovery:** Start a workout and add/edit exercises. Refresh or switch Nutrition > Workouts. Expect a recovered-draft banner, then Resume draft with all details intact.
- **Draft discard:** Discard a recovered draft. A refresh should not show it again.
- **Account isolation:** A guest draft must not become visible to a signed-in account; another account must not inherit the first account's draft.
- **No data loss on failures:** Temporarily disconnect network during a signed-in save. It must show an error and retain the working draft; reconnect and save again.
- **No accidental duplicate writes:** Edit workout A then save; confirm workout count is unchanged. Check from another device after refresh.
- **Multiple tabs:** Do not overwrite a newer draft created in another tab. There is a client warning for conflicting local changes.
- **Regression:** Google Sign-In, nutrition USDA and barcode search, meal history and existing favorite foods should all continue working.
- **iPhone:** Test set type select, weight and rep inputs, small-screen layout and draft recovery using Safari/PWA.

## Known limitation to evaluate before release

Signed-in workout history and routines are stored as one JSON document in Supabase. This version does **not** resolve two devices editing the same cloud document simultaneously; the last cloud save can still replace another device's newer changes. Avoid concurrent writes until we implement a version/compare-and-swap mechanism. Draft backups are browser-local and do not sync between phones.

## No database migration

The `kind` field is optional inside the existing workout JSON document. Do not modify the Supabase schema for this feature.

## Release gate

Do not deploy the Beta 2.1 branch to `main` or production. After lint/build and local tests succeed, use a Cloudflare preview branch and test the iPhone; release only with explicit approval.
