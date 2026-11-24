
import { supabase } from './supabase'

export type NutritionGoals = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type SavedFood = {
  id: string
  name: string
  source: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize?: number
  unit?: 'g' | 'ml'
}

export type SavedEntry = NutritionGoals & {
  id: string
  name: string
  grams: number
  date: string
  eatenAt?: string | null
  unit?: 'g' | 'ml'
  food?: SavedFood
}

export type NutritionData = {
  goals: NutritionGoals | null
  entries: SavedEntry[]
  favorites: SavedFood[]
}

type GoalRow = NutritionGoals

type EntryRow = SavedEntry & {
  user_id: string
}

type FavoriteRow = {
  food_id: string
  food: SavedFood
}

function checkError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message)
  }
}

// Reads all nutrition data belonging to one user.
export async function loadNutritionData(
  userId: string
): Promise<NutritionData> {
  const [
    goalResult,
    entryResult,
    favoriteResult,
  ] = await Promise.all([
    supabase
      .from('nutrition_goals')
      .select('calories, protein, carbs, fat')
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('food_entries')
      .select(
        'id, date, eaten_at, name, grams, unit, calories, protein, carbs, fat, food'
      )
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),

    supabase
      .from('favorite_foods')
      .select('food_id, food')
      .eq('user_id', userId),
  ])

  checkError(goalResult.error)
  checkError(entryResult.error)
  checkError(favoriteResult.error)

  const goals = goalResult.data as GoalRow | null

  const entries = (
    entryResult.data ?? []
  ).map(row => ({
    id: row.id as string,
    date: row.date as string,
    eatenAt: row.eaten_at as string | null,
    name: row.name as string,
    grams: Number(row.grams),
    unit: row.unit as 'g' | 'ml',
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    food: row.food as SavedFood | undefined,
  }))

  const favorites = (
    favoriteResult.data ?? []
  ).map(row => (
    row as FavoriteRow
  ).food)

  return {
    goals: goals
      ? {
          calories: Number(goals.calories),
          protein: Number(goals.protein),
          carbs: Number(goals.carbs),
          fat: Number(goals.fat),
        }
      : null,
    entries,
    favorites,
  }
}

// Creates or updates daily macro goals.
export async function saveCloudGoals(
  userId: string,
  goals: NutritionGoals
): Promise<void> {
  const { error } = await supabase
    .from('nutrition_goals')
    .upsert(
      {
        user_id: userId,
        ...goals,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  checkError(error)
}

// Adds a food or updates an existing diary entry.
export async function saveCloudEntry(
  userId: string,
  entry: SavedEntry
): Promise<void> {
  const row: EntryRow = {
    ...entry,
    user_id: userId,
  }

  const { error } = await supabase
    .from('food_entries')
    .upsert(
      {
        id: row.id,
        user_id: row.user_id,
        date: row.date,
        eaten_at: row.eatenAt ?? null,
        name: row.name,
        grams: row.grams,
        unit: row.unit ?? 'g',
        calories: row.calories,
        protein: row.protein,
        carbs: row.carbs,
        fat: row.fat,
        food: row.food ?? null,
      },
      { onConflict: 'id' }
    )

  checkError(error)
}

// Deletes an individual diary entry.
export async function deleteCloudEntry(
  userId: string,
  entryId: string
): Promise<void> {
  const { error } = await supabase
    .from('food_entries')
    .delete()
    .eq('user_id', userId)
    .eq('id', entryId)

  checkError(error)
}

// Adds or updates a favorite food.
export async function saveCloudFavorite(
  userId: string,
  food: SavedFood
): Promise<void> {
  const { error } = await supabase
    .from('favorite_foods')
    .upsert(
      {
        user_id: userId,
        food_id: food.id,
        food,
      },
      { onConflict: 'user_id,food_id' }
    )

  checkError(error)
}

// Removes a food from favorites.
export async function deleteCloudFavorite(
  userId: string,
  foodId: string
): Promise<void> {
  const { error } = await supabase
    .from('favorite_foods')
    .delete()
    .eq('user_id', userId)
    .eq('food_id', foodId)

  checkError(error)
}
