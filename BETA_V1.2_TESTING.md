# Tanora Beta v1.2: combined testing and release checklist

This branch is not production. Keep the existing Beta v1.1 Cloudflare Pages project live until ALL checks pass.

## Local development
1. `cd ~/nutrition-app && git switch feature/beta-v1.2-food-logging-tanora && git pull`
2. Copy the provided Tanora PNG icon pack into `public/` (apple-touch-icon.png, tanora-192.png, tanora-512.png).
3. `npm run lint && npm run build`
4. `npm run dev:api`, then open `http://localhost:8788`. Local Wrangler uses the existing `.dev.vars` for `USDA_API_KEY`. Do not commit or share secrets.

## User acceptance tests
- Manual food: enter 30g protein, 40g carbs, 10g fat, and 370 kcal; accept. 450 kcal must be blocked. Test decimals and 0.5, 1.25 servings. The 4/4/9 check is intentionally strict only for manual foods.
- Custom foods: save a custom food to Favorites, reload, edit its nutrition without logging, verify past diary entries unchanged; test cloud user and Guest Mode separately.
- Repeat and Quick Log: repeat an entry, then navigate to another date, log again from recent list. Confirm quantities and daily totals are correct and that repeated rows have unique IDs.
- USDA: search chicken breast raw/cooked, rice, tomato, milk; check ranking and nutrients.
- Barcode: scan or manually search a product with full nutrition, edit a value, save. Test an incomplete product: absent fields should appear blank, not zero; supply values and verify the calculated total. Test an unrecognized barcode and manual fallback. Test a liquid with 100ml nutrition and fractional servings.
- Auth: email/password, Google, sign out/in, Guest Mode isolation, migration of old browser data only after explicit confirmation.
- Cloud: log/edit/delete on one device; refocus another device to refresh and confirm changes. Check Supabase user isolation.
- Appearance: both themes, Safari iPhone screen widths, camera permissions, and Home Screen icon/label `Tanora`.

## Rename Cloudflare Pages project safely, AFTER successful tests
Cloudflare does not rename an existing `*.pages.dev` project subdomain. Create a **second** Pages project; do not delete the working original.

If the project name is available, on your Mac:
```bash
npx wrangler pages project create tanora --production-branch main
```
After rebuilding the app, deploy:
```bash
npx wrangler pages deploy dist --project-name tanora --branch main
```
The exact `tanora.pages.dev` address is NOT guaranteed until Cloudflare accepts the project name. Use a name such as `tanora-app` if unavailable.

Before testing production API calls, add the `USDA_API_KEY` secret to the **new** Cloudflare Pages project under its Settings / Variables and Secrets (same value as old project; do not paste into chat or GitHub). Confirm the new deployment has Pages Functions for USDA search and barcodes.

In Supabase Authentication → URL Configuration, **add** the new `https://tanora.pages.dev/` redirect URL without removing the existing site. For Google OAuth web client, add the new site to Authorized JavaScript Origins when needed. The Google **Authorized redirect URI stays your existing Supabase** `/auth/v1/callback`. Keep Site URL on your old, functioning production domain until migration is verified.

Open the new domain on iPhone and verify Google sign-in, password reset/signup, cloud data, guest isolation, barcode and USDA. When everything passes, decide whether to switch Supabase Site URL and share the new domain. Keep the old URL working as a fallback. Reinstall Add to Home Screen on iPhone if the name/icon or domain remains cached.

## Release
After tests: merge the PR to `main`, build, deploy new Pages project, smoke-test, then tag `v1.2.0-beta`. Never force-push, delete old Pages project, reset the Supabase database, or publish secrets.
