# Tanora Beta 2.1 | Unified Workouts + Overview Visual Pass

Status: COMMITTED TO DEVELOPMENT BRANCH; MAC LINT/BUILD + iPHONE VISUAL/REGRESSION TESTS NOT YET RUN.
Live Beta 2.0 production remains unchanged.

## Design reference
Use the approved **first iPhone Nutrition** preview as a cohesive Tanora design language:
- deep emerald/near-black app background
- vibrant teal accent, dark raised cards with subtle borders
- consistent typography, section headings, compact stat blocks, progress charts
- desktop left sidebar and iPhone bottom feature navigation
- retain the global Nutrition / Workouts / Overview section switcher
- no changes to data model, Supabase tables or workouts/nutrition calculations.

## Files changed
- `src/WorkoutTracker.tsx`: wraps old workout functionality in desktop sidebar and mobile bottom navigation. Original buttons, state and routines remain intact.
- `src/WeeklyOverview.tsx`: shared app shell and sidebar; anchor navigation to nutrition and workout summaries, fixed mobile shortcut navigation.
- `src/TanoraModules.css`: standalone shared emerald styling for both modules, and consistent global top navigation.

## Local verification
```bash
cd ~/nutrition-app
git status
git pull --ff-only
npm run lint
npm run build
npm run dev:api
```

Review at http://localhost:8788. Keep the development branch separate; don't push the changes to production.

## Acceptance tests
1. Global tabs Nutrition / Workouts / Overview still work; consistent emerald top nav styling.
2. Workout desktop: sidebar items Log, Routines, History, Progress, Tools work and visually match nutrition sidebar.
3. Workout iPhone: fixed five-tab navigation does not hide content or overlap the iPhone home indicator.
4. Start workout, log reps and weights, finish, edit and delete saved workout.
5. Rest timer countdown, auto-start, and barbell plate calculator still work on Tools and Log views.
6. lb/kg toggle converts display and inputs without rewriting old pound values.
7. Recover draft, discard draft, working/warm-up set types, saved routines, workout history, progress charts and exercise imagery still work.
8. Weekly Overview desktop: left sidebar and dark nutrition + workout panels; navigation scrolls to sections.
9. Weekly Overview mobile: shortcut nav to nutrition/training and Refresh button; layout fits 375–430px, no horizontal overflow.
10. Seven-day averages still exclude unlogged days. Warm-up sets remain excluded from working volume.
11. Guest data remains separate from account data, and signed-in data refreshes from Supabase.
12. Nutrition redesign still works unchanged, including saved recipes inside saved meals, timestamp diary, USDA, barcode and food edits.
13. Dark and light theme settings do not produce unreadable text or obscure controls.
14. Check iPhone Safari PWA viewport and bottom safe area before production release.

## Release safeguard
This pass does not introduce schema migrations, dependencies, external services, food image fetching or cloud sync changes. **Do not merge or deploy until the full UI regression pass and user approval.**
