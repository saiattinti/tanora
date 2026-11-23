# Tanora Beta 2.0: Workout Tracker (development draft)

## Safety and release status

This work belongs on `feature/beta-v2.0-workout-tracker`. Keep the current Beta 1.2 production site and `main` unchanged until all checks pass. Do not delete, reset, or change existing nutrition tables. No new API key is needed.

**Not yet tested or deployed.** The workout UI and cloud storage code need local build checks and iPhone testing.

## Included in this first implementation

- A new Nutrition / Workouts navigation bar
- Searchable exercise library with muscle and equipment filters
- Workout sets (weight in pounds, reps, completed checkbox), workout notes, and date
- Create and reuse workout routines from a prepared workout
- Workout history with set detail and delete confirmation
- Previous maximum completed weight for each exercise, personal best, workout counts, completed sets, and total lifted volume
- A simple per-exercise strength chart
- A link between the workout and nutrition dashboards
- Workout cloud storage under the existing Supabase login, and browser-only guest workout storage

**Scope still needing refinement before a release:** a richer exercise catalog and custom exercises; rest timer; workout editing; support for kg; performance improvements; better handling of interrupted in-progress workouts; deeper nutrition/workout analytics. Current workout history is keyed to a dedicated JSONB document per account and is not yet intended for large, concurrent multi-device editing.

## Database setup before signed-in testing

In the existing Supabase project, open SQL Editor and run `supabase/migrations/20261123_workout_data.sql` **once**. It creates `public.workout_data` with RLS so only the authenticated owner can read/update the row. No existing nutrition data is migrated or changed.

Do not run this SQL until you are ready to test the v2 branch locally. Guest data works without a database change.

## Local test

On your Mac, from `~/nutrition-app`, save any local changes first, then:

```bash
git fetch origin
git switch feature/beta-v2.0-workout-tracker
npm ci
npm run lint
npm run build
npm run dev:api
```

Visit `http://localhost:8788`. Do **not** deploy this build to the production Cloudflare Pages project. If lint/build reports an error, capture the exact output before continuing.

Test: 1) Existing nutrition dashboard and Supabase sign-in still function; 2) click Workouts and add exercises, record and complete sets; 3) save workout and reload; 4) save and reuse a routine; 5) inspect History and Progress; 6) confirm signed-in data reloads after signing in on another device; 7) confirm guest workouts remain separate from signed-in workouts; 8) on iPhone check numeric inputs, keyboard overlap, horizontal chart scrolling and Home Screen navigation; 9) verify users cannot see another account's workout rows.

The release will remain pending until the migration, build, and device tests are confirmed.

## Design notes

- Weight unit is currently **lb** and total volume is completed sets × repetitions × weight.
- A personal best means the **heaviest completed set** in the recorded history, not a rep-adjusted 1RM.
- The workout data are distinct from nutrition rows and do not overwrite food history.
- The starter exercise library can later be expanded without altering existing recorded exercise names.
