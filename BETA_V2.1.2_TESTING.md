# Tanora Beta 2.1.2 | Gym Utilities

Status: DEVELOPMENT CODE COMMITTED; LINT/BUILD AND DEVICE TESTS PENDING
Branch: `feature/beta-v2.1-quality-of-life`
Production remains `v2.0.0-beta` at `https://tanora-1qa.pages.dev/`.

Beta 2.1.2 builds on the already locally tested 2.1.1 workout updates. Do not merge/deploy it to production without testing.

## Implemented for testing

1. **Rest timer**: 60/90/120/180-second presets, custom seconds, pause, resume, reset, an optional start-after-working-set checkbox, and a saved end timestamp for accurate countdown after backgrounding. The timer is shown in the Log tab and Tools tab. It saves local state per account or guest. It cannot guarantee background alarms/notifications on iPhone.
2. **Plate calculator**: bar weight + target total + available plates per side. Displays symmetric plate quantities for both ends of the bar, or a clear no-exact-combination message. Uses integer quarter-unit bounded search instead of greedy sums, and supports lb/kg plate sets.
3. **Weight units**: lb/kg selection in the workout header. All saved historical workout weights remain stored in pounds. Conversions apply to displayed weights, newly entered weights, previous-best labels, history, progress metrics and charts. Existing Supabase schema and records are unchanged.

## Local test steps

Stop `npm run dev:api` using Ctrl+C, then:

```bash
cd ~/nutrition-app
git status
git pull --ff-only
npm run lint
npm run build
npm run dev:api
```

Open `http://localhost:8788`. Do not deploy `--branch main`.

## Acceptance checklist

- Rest timer: start 60s, pause, resume, reset; switch browser tab and return after elapsed time. The clock should reflect real elapsed wall time.
- Timer auto-start: check the option, complete a **working** set; the timer begins. Complete a warm-up set instead; it must not auto-start.
- Timer state: navigate between Nutrition and Workouts or refresh; timer should resume from the correct end timestamp, rather than starting from 90s.
- Plate calculator: using lb, target 135 lb and bar 45 lb, with 45-lb plates available, the answer is 1 × 45 lb on **each** side. No exact target with limited inventory should display an explanation, not a false result.
- kg plate calculator: target 60 kg and 20 kg bar gives 20 kg on each side (if available). Check 1.25/2.5 kg variations, inventory limits and impossible asymmetric loads.
- Unit conversion: switch an existing 100 lb saved set to kg and confirm it displays about 45.36 kg; back to lb shows 100 lb. The same record and all reps remain unchanged.
- Unit input: enter a new 50 kg working set; after saving, switching to lb should display about 110.23 lb, with no repeated-conversion drift. The unit selector should also update previous best, history and progress chart.
- Confirm old workouts without set-type flags still load, warm-up sets remain excluded from working-set volume/PR, and the 177-exercise library works.
- Verify recovered drafts, history editing, and account-specific guest data remain working after changing units.
- Test on a real iPhone in Safari/PWA; background timer alerts are **not guaranteed** due to browser restrictions.
- Check Google sign-in, USDA/barcode features, nutrition goals, and cloud syncing as regressions before a later release.

## Design and known limits

- Plate calculator inventories are editing-session state, not cloud saved. Switching displayed weight units remounts the calculator with sensible bar defaults.
- The timer preference for automatically starting on set completion is saved in this browser. Runtime countdown is a local convenience, not part of Supabase workout history.
- Client-side displayed kilograms are rounded to 2 decimals; internal pounds use more precision to avoid unit-toggle drift, though entering a kg value creates an appropriately converted pound record.
- Previous limitations of signed-in shared-JSON workout data (concurrent edits across devices) still apply; do not test concurrent cloud writes with important records.

## Release gate

After lint/build and local review, preview deploy using non-main branch only. Merge `main`, production deploy, tag and update release notes only after the 2.1 feature set is tested and approved.
