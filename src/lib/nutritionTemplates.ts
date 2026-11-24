import { supabase } from './supabase'
import type { SavedFood, NutritionGoals } from './nutritionStorage'

export type IngredientPortion = { id: string, food: SavedFood, amount: number }
export type SavedMeal = { id: string, name: string, items: IngredientPortion[] }
export type SavedRecipe = {
  id: string, name: string, ingredients: IngredientPortion[],
  yieldGrams: number, portions: number
}
export type NutritionTemplates = { meals: SavedMeal[], recipes: SavedRecipe[] }
const EMPTY: NutritionTemplates = { meals: [], recipes: [] }
const GUEST_KEY = 'tanora-nutrition-templates-guest-v1'
const finitePositive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

export function isIngredientPortion(v: unknown): v is IngredientPortion {
  if (!v || typeof v !== 'object') return false
  const p = v as Partial<IngredientPortion>
  return typeof p.id === 'string' && finitePositive(p.amount) &&
    !!p.food && typeof p.food.name === 'string' && typeof p.food.source === 'string' &&
    ['calories','protein','carbs','fat'].every(k => {
      const value = p.food?.[k as keyof SavedFood]
      return typeof value === 'number' && Number.isFinite(value) && value >= 0
    })
}

function validMeal(value: unknown): value is SavedMeal {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<SavedMeal>
  return typeof item.id === 'string' && typeof item.name === 'string' &&
    Array.isArray(item.items) && item.items.length > 0 && item.items.every(isIngredientPortion)
}
function validRecipe(value: unknown): value is SavedRecipe {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<SavedRecipe>
  return typeof item.id === 'string' && typeof item.name === 'string' &&
    finitePositive(item.yieldGrams) && finitePositive(item.portions) &&
    Array.isArray(item.ingredients) && item.ingredients.length > 0 && item.ingredients.every(isIngredientPortion)
}

function readGuest(): NutritionTemplates {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    const value: unknown = raw ? JSON.parse(raw) : EMPTY
    if (!value || typeof value !== 'object') return EMPTY
    const item = value as Partial<NutritionTemplates>
    return {
      meals: Array.isArray(item.meals) ? item.meals.filter(validMeal) : [],
      recipes: Array.isArray(item.recipes) ? item.recipes.filter(validRecipe) : [],
    }
  } catch { return EMPTY }
}

export function portionMacros(portions: IngredientPortion[]): NutritionGoals {
  return portions.reduce((sum, part) => {
    const factor=part.amount/100
    return {
      calories: sum.calories + part.food.calories*factor,
      protein: sum.protein + part.food.protein*factor,
      carbs: sum.carbs + part.food.carbs*factor,
      fat: sum.fat + part.food.fat*factor,
    }
  }, {calories:0,protein:0,carbs:0,fat:0})
}


/**
 * A reusable snapshot of the finished cooked recipe.
 * Meals persist this food, so later edits/deletions of the source recipe
 * cannot silently recalculate previously saved meals or diary entries.
 */
export function recipeAsFood(recipe: SavedRecipe): SavedFood {
  if (!finitePositive(recipe.yieldGrams) || !finitePositive(recipe.portions)) {
    throw new Error('Recipe has an invalid cooked yield or serving count.')
  }
  const totals = portionMacros(recipe.ingredients)
  const multiplier = 100 / recipe.yieldGrams
  return {
    id: 'recipe-' + recipe.id,
    name: recipe.name,
    source: 'Tanora recipe',
    unit: 'g',
    servingSize: recipe.yieldGrams / recipe.portions,
    calories: totals.calories * multiplier,
    protein: totals.protein * multiplier,
    carbs: totals.carbs * multiplier,
    fat: totals.fat * multiplier,
  }
}

export async function loadTemplates(userId: string | null): Promise<NutritionTemplates> {
  if (!userId) return readGuest()
  const [meals, recipes] = await Promise.all([
    supabase.from('saved_meals').select('id,name,items').eq('user_id',userId).order('updated_at',{ascending:false}),
    supabase.from('saved_recipes').select('id,name,ingredients,yield_grams,portions').eq('user_id',userId).order('updated_at',{ascending:false}),
  ])
  if (meals.error) throw meals.error
  if (recipes.error) throw recipes.error
  return {
    meals: (meals.data??[]).map(m=>({id:m.id,name:m.name,items:m.items})).filter(validMeal),
    recipes:(recipes.data??[]).map(r=>({
      id:r.id,name:r.name,ingredients:r.ingredients,
      yieldGrams:Number(r.yield_grams),portions:Number(r.portions),
    })).filter(validRecipe),
  }
}

// Whole-template updates for guest mode only; cloud uses row-specific writes.
export async function saveMeal(userId: string | null, meal: SavedMeal): Promise<void> {
  if (!validMeal(meal)) throw new Error('Enter a meal name and at least one valid ingredient.')
  if (!userId) {
    const state=readGuest()
    localStorage.setItem(GUEST_KEY,JSON.stringify({
      ...state,meals:[meal,...state.meals.filter(m=>m.id!==meal.id)],
    }))
    return
  }
  const {error}=await supabase.from('saved_meals').upsert({
    id:meal.id,user_id:userId,name:meal.name,items:meal.items,updated_at:new Date().toISOString(),
  },{onConflict:'id'})
  if(error)throw error
}
export async function deleteMeal(userId: string|null,id:string):Promise<void>{
  if(!userId){
    const state=readGuest();localStorage.setItem(GUEST_KEY,JSON.stringify({...state,meals:state.meals.filter(m=>m.id!==id)}));return
  }
  const {error}=await supabase.from('saved_meals').delete().eq('id',id).eq('user_id',userId)
  if(error)throw error
}
export async function saveRecipe(userId: string|null,recipe:SavedRecipe):Promise<void>{
  if(!validRecipe(recipe))throw new Error('Enter a recipe name, ingredients, cooked yield, and portions.')
  if(!userId){
    const state=readGuest();localStorage.setItem(GUEST_KEY,JSON.stringify({...state,recipes:[recipe,...state.recipes.filter(r=>r.id!==recipe.id)]}));return
  }
  const {error}=await supabase.from('saved_recipes').upsert({
    id:recipe.id,user_id:userId,name:recipe.name,
    ingredients:recipe.ingredients,yield_grams:recipe.yieldGrams,portions:recipe.portions,
    updated_at:new Date().toISOString(),
  },{onConflict:'id'})
  if(error)throw error
}
export async function deleteRecipe(userId:string|null,id:string):Promise<void>{
  if(!userId){
    const state=readGuest();localStorage.setItem(GUEST_KEY,JSON.stringify({...state,recipes:state.recipes.filter(r=>r.id!==id)}));return
  }
  const {error}=await supabase.from('saved_recipes').delete().eq('id',id).eq('user_id',userId)
  if(error)throw error
}
