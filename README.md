# Tanora

A personal nutrition tracker being developed into a broader fitness app. Tanora started as a React + Vite prototype and is currently a mobile-friendly web app with cloud-synced accounts and browser-only Guest Mode.

> **Version status:** Beta v1.1 is deployed. Beta v1.2 (food logging improvements and Tanora rebrand) is in active development on a separate branch. Do not treat v1.2 as released until local and iPhone testing passes.

## Features

- Daily calories, protein, carbohydrate and fat goals and diary
- Smart macro-goal calculator and daily progress
- USDA FoodData Central ingredient search via Cloudflare Pages Functions
- Open Food Facts barcode lookup and iPhone camera scanning
- Manual custom foods with strict 4/4/9 calorie consistency validation
- Saved favorite foods and recently eaten foods; quick repeat logging
- Fractional portion sizes (including grams, milliliters and supported serving sizes)
- Email/password and Google sign-in with Supabase
- Cloud-synced personal food diary, custom favorites and goals
- Guest Mode with device-only nutrition data, separate from Supabase
- Light and dark appearance modes
- Tanora PWA branding and Home Screen metadata (v1.2)

## Tech

React 19, TypeScript, Vite 8, Supabase Auth/Postgres, Cloudflare Pages & Functions, USDA FoodData Central, Open Food Facts, html5-qrcode.

## Local development

Requires Node.js/npm, project-specific Supabase Vite environment variables in `.env.local`, and a local USDA API secret in `.dev.vars`. These secret files are ignored by Git and must **never** be committed. Never place the USDA server key or Supabase service-role key in client-side Vite variables.

```bash
npm ci
npm run lint
npm run build
npm run dev:api
```

Open `http://localhost:8788` to test both the app and its Cloudflare API endpoints. Alternatively, use `npm run dev` for Vite UI development **only if** a local Wrangler Functions server is also running at port 8788.

## Version history

- **Beta v1.0:** Initial food diary, USDA integration, barcode search, Smart Goals and Supabase account syncing.
- **Beta v1.1:** Google Sign-In, Guest Mode, Dark Mode.
- **Beta v1.2 (in development):** Improved barcode correction, manual food entry, editable custom favorites, quick logging, Tanora identity and iPhone PWA icon.
- **Beta v2.0 (planned):** Workout tracking, exercise history and progressive overload.

See [Beta v1.2 testing and rollout plan](BETA_V1.2_TESTING.md) before merging or deploying.

## Data & release safety

The current public production URL is `https://personal-nutrition-tracker-5a0.pages.dev/`. A future `tanora.pages.dev` deployment requires a **new** Cloudflare Pages project if that name is available. Do not delete the old project or modify Supabase tables during branding changes. Existing user's cloud entries and guest browser entries are distinct data stores.

The nutrition app is for general tracking, not medical advice. Nutrition sourced from third-party databases can be inaccurate; compare products against their labels when necessary.
