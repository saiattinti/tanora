// Existing Tanora 2.0 workout weights are stored in pounds.
// Never reinterpret historical numbers when the display unit changes.
export type WeightUnit = 'lb' | 'kg'
export const POUNDS_PER_KILOGRAM = 2.20462262185
const preferenceKey = 'tanora-workout-weight-unit'

export function readWeightUnit(): WeightUnit {
  try { return window.localStorage.getItem(preferenceKey) === 'kg' ? 'kg' : 'lb' }
  catch { return 'lb' }
}

export function saveWeightUnit(unit: WeightUnit): void {
  try { window.localStorage.setItem(preferenceKey, unit) } catch { /* preference remains in memory */ }
}

export function poundsToDisplay(pounds: number, unit: WeightUnit): number {
  return unit === 'kg' ? Number((pounds / POUNDS_PER_KILOGRAM).toFixed(2)) : pounds
}

export function displayToPounds(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? Number((value * POUNDS_PER_KILOGRAM).toFixed(6)) : value
}

export function formatWeight(pounds: number, unit: WeightUnit): string {
  return poundsToDisplay(pounds, unit).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ' + unit
}

export type Plate = { weight: number, countPerSide: number }
export type PlatePlan = { perSide: { weight: number, count: number }[], unit: WeightUnit } | null

export const plateSizes: Record<WeightUnit, number[]> = {
  lb: [45, 35, 25, 10, 5, 2.5, 1.25],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
}

// Quarter-unit integer arithmetic and bounded search avoid floating-point
// equality errors and greedy-loading mistakes. Quantities are per side.
export function calculatePlates(target: number, bar: number, inventory: Plate[], unit: WeightUnit): PlatePlan {
  if (![target, bar].every(Number.isFinite) || target < bar || bar < 0 || target > 2000) return null
  const required = (target - bar) / 2
  const units = required * 4
  if (Math.abs(Math.round(units) - units) > 1e-7) return null
  const wanted = Math.round(units)
  const plates = [...inventory]
    .filter(plate => plate.weight > 0 && Number.isInteger(plate.countPerSide) && plate.countPerSide >= 0)
    .sort((a,b)=>b.weight-a.weight)
  const memo = new Set<string>()
  const solve = (index: number, remaining: number): { weight: number, count: number }[] | null => {
    if (remaining === 0) return []
    if (index >= plates.length || remaining < 0) return null
    const key = index + ':' + remaining
    if (memo.has(key)) return null
    const plate = plates[index]
    const size = Math.round(plate.weight * 4)
    if (Math.abs(size - plate.weight * 4) > 1e-7) return null
    for (let count=Math.min(plate.countPerSide, Math.floor(remaining / size)); count >= 0; count--) {
      const rest = solve(index+1, remaining - count*size)
      if (rest) return count ? [{ weight:plate.weight, count }, ...rest] : rest
    }
    memo.add(key)
    return null
  }
  const result = solve(0, wanted)
  return result === null ? null : { perSide:result, unit }
}
