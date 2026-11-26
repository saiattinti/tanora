# Tanora Beta 2.1 | Nutrition UI Redesign Preview

**Status: COMMITTED TO DEVELOPMENT BRANCH. NOT BUILT OR VISUALLY VERIFIED ON THE USER'S MAC.**
Live Cloudflare Pages Beta 2.0 production remains unchanged. Do not merge draft PR #4 before local, iPhone preview and regression tests.

## Approved visual reference
The user selected the **first iPhone food-diary concept** (dark emerald palette, circular calorie gauge, compact protein/carbs/fat cards, chronological food timeline, flat text-only diary rows, large Add Food button, Saved Meals and Recipes shortcuts, bottom mobile navigation). The same design language is applied to the desktop web layout with a left sidebar.

Explicit requirements:
- Do not classify eating events as breakfast/lunch/dinner. Show entries by **actual timestamp**, as individual diary rows. No fixed meal count.
- No food photography or automatic food-image fetching.
- Explanation of saved meals vs recipes should be an **on-demand info dialog**, never a permanent dashboard notice.
- Every existing feature must remain available: USDA-ranked ingredient search, starter foods, favorites, recent foods, barcode scanning, manual/custom foods, portion editor, Quick Log, recipes inside saved meals, goals, date navigation, editing/repeating/deleting food entries, cloud/guest persistence, and the combined workout/overview system.

## Code changed
- `src/App.tsx`: Navigation-aware nutrition screens, diary summary/ring, per-food timeline and action menus, mobile bottom tabs, Add Food chooser, on-demand recipe explainer. Original food-search/scanner/manual/Quick Log logic is reused inside Search.
- `src/NutritionRedesign.css`: New isolated desktop/mobile responsive nutrition visual system. Only the nutrition route styles are affected. No images were introduced.
- `src/NutritionTemplates.tsx`: initialKind selects Saved Meals or Recipes; starts expanded for direct access.

## Validate on Mac
```bash
cd ~/nutrition-app
git status
git pull --ff-only
npm run lint
npm run build
npm run dev:api
```
Use `http://localhost:8788` locally. If the lint/build reports errors, send Terminal output and correct them before preview.

## Visual and functional acceptance
1. iPhone width (about 375–430px): top-level Tanora Nutrition/Workouts/Overview tabs, branded nutrition heading, daily calorie ring, three macro tiles, chronological timeline, large Add Food, Saved Meals and Recipes shortcuts, fixed bottom nutrition tabs.
2. Desktop width (1024px+): left navigation sidebar and centered expanded diary. No food images.
3. Diary entries show time and macros; old entries without timestamps show "Time not recorded" rather than invented times. No Breakfast/Lunch/Dinner group headings.
4. Three-dot menu on each entry: edit amount/time, repeat and delete. Verify Supabase changes persist after reload.
5. Add Food chooser offers USDA/ingredient search, Scan Barcode, Manual Food, Saved Meals and Recipes.
6. Search screen retains USDA recommendations, Favorites, Recently Logged, Starter Foods, fractional portions, edit custom foods, Quick Log and source attribution.
7. Saved Meals and Recipes pages open directly from sidebar/bottom tabs. Verify saved recipes can be added to meals by cooked grams or servings.
8. Recipe vs meal explainer only opens on demand and can be dismissed.
9. Navigation between nutrition, workout and overview preserves existing account-specific data and workout editing/draft recovery.
10. User can edit Nutrition Goals; previous goals load and Save persists correctly.
11. Test 320px, 375px, 390px, 430px, tablet and desktop layouts; confirm no horizontal overflow, off-screen modal actions, blocked iPhone home indicator or inaccessible logging controls.
12. Test light/dark theme switching and signed-in/guest data isolation; neither mode hides important text or forms.
13. Refresh and sign-out controls still work. Old browser-import process remains accessible when applicable.
14. Confirm no automatic migration or production release is necessary. No SQL changes were made in this redesign.

## Known limitations to check during UI review
- The redesigned mobile iconography currently uses text/Unicode symbols, not custom icon assets; improve after user reviews the general layout.
- A few forms still use their legacy visual components, with updated theme overrides. The main dashboard redesign intentionally does not rewrite the underlying nutrition business logic.
- User's live Beta 2.0 remains a rollback reference, as before.
