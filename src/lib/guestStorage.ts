import type { NutritionData, NutritionGoals, SavedEntry, SavedFood } from './nutritionStorage'

const KEY = 'nutrition-guest-v1'

export function readGuestData(): NutritionData {
  const empty: NutritionData = { goals: null, entries: [], favorites: [] }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return empty
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object') return empty
    const value = data as Record<string, unknown>
    const keys = ['calories', 'protein', 'carbs', 'fat'] as const
    const validMacros = (v: unknown): v is NutritionGoals =>
      !!v && typeof v === 'object' &&
      keys.every(key => typeof (v as Record<string, unknown>)[key] === 'number' &&
        Number.isFinite((v as Record<string, number>)[key]) &&
        (v as Record<string, number>)[key] >= 0)
    const validFood = (v: unknown): v is SavedFood =>
      !!v && typeof v === 'object' &&
      typeof (v as SavedFood).id === 'string' &&
      typeof (v as SavedFood).name === 'string' &&
      typeof (v as SavedFood).source === 'string' && validMacros(v)
    const validEntry = (v: unknown): v is SavedEntry =>
      !!v && typeof v === 'object' &&
      validMacros(v) &&
      typeof (v as SavedEntry).id === 'string' &&
      typeof (v as SavedEntry).name === 'string' &&
      typeof (v as SavedEntry).date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test((v as SavedEntry).date) &&
      typeof (v as SavedEntry).grams === 'number' &&
      Number.isFinite((v as SavedEntry).grams) &&
      (v as SavedEntry).grams > 0 &&
      (!(v as SavedEntry).food || validFood((v as SavedEntry).food))
    return {
      goals: validMacros(value.goals) && value.goals.calories > 0 ? value.goals : null,
      entries: Array.isArray(value.entries) ? value.entries.filter(validEntry) : [],
      favorites: Array.isArray(value.favorites) ? value.favorites.filter(validFood) : [],
    }
  } catch {
    return empty
  }
}

export function saveGuestData(data: NutritionData): void {
  // Guest nutrition data must never use the signed-in user's Supabase tables.
  window.localStorage.setItem(KEY, JSON.stringify(data))
}
