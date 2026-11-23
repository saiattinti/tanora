
export type USDAFood = {
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

type RawNutrient = {
  nutrientId?: number
  value?: number
}

type RawFood = {
  fdcId: number
  description: string
  dataType?: string
  foodNutrients?: RawNutrient[]
}

type SearchResponse = {
  foods?: RawFood[]
}

export type IngredientSearch = {
  recommended: USDAFood[]
  more: USDAFood[]
}

// Search guidance only. Nutrition data comes from USDA.
const commonFoods: Record<
  string,
  { search: string; good: string[]; bad: string[] }
> = {
  tomato: {
    search: 'tomatoes raw',
    good: ['raw', 'ripe', 'roma', 'red'],
    bad: ['powder', 'paste', 'sauce', 'juice', 'canned', 'soup', 'dried'],
  },
  carrot: {
    search: 'carrots raw',
    good: ['raw', 'fresh'],
    bad: ['juice', 'dehydrated', 'dry', 'cake', 'babyfood', 'soup', 'canned'],
  },
  milk: {
    search: 'milk whole',
    good: ['whole', 'fluid', 'cow'],
    bad: ['sheep', 'goat', 'buttermilk', 'dried', 'powder', 'shake', 'bar', 'chocolate', 'condensed'],
  },
  apple: {
    search: 'apples raw with skin',
    good: ['raw', 'skin'],
    bad: ['juice', 'dried', 'pie', 'sauce', 'canned'],
  },
  banana: {
    search: 'bananas raw',
    good: ['raw'],
    bad: ['chips', 'bread', 'dried', 'babyfood'],
  },
  potato: {
    search: 'potatoes raw',
    good: ['raw', 'flesh'],
    bad: ['chips', 'fries', 'frozen', 'dehydrated'],
  },
  egg: {
    search: 'egg whole raw',
    good: ['whole', 'raw'],
    bad: ['substitute', 'dried', 'powder', 'sandwich'],
  },
  broccoli: {
    search: 'broccoli raw',
    good: ['raw'],
    bad: ['soup', 'cheese', 'casserole', 'babyfood'],
  },
  rice: {
    search: 'rice white cooked',
    good: ['white', 'cooked'],
    bad: ['cake', 'cracker', 'flour', 'cereal', 'pudding'],
  },
  chicken: {
    search: 'chicken breast meat only raw',
    good: ['breast', 'meat', 'raw', 'skinless', 'boneless'],
    bad: ['lunchmeat', 'breaded', 'battered', 'nuggets', 'sausage', 'roll', 'sandwich', 'patty', 'fried'],
  },
}

const aliases: Record<string, string> = {
  tomatoes: 'tomato',
  carrots: 'carrot',
  apples: 'apple',
  bananas: 'banana',
  potatoes: 'potato',
  eggs: 'egg',
  'chicken breast': 'chicken',
}

function normalized(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function guideFor(query: string) {
  const q = normalized(query)
  const key = aliases[q] ?? q

  return commonFoods[key] ?? null
}

function nutrient(
  nutrients: RawNutrient[],
  ids: number[]
): number | null {
  for (const id of ids) {
    const found = nutrients.find(
      item =>
        item.nutrientId === id &&
        Number.isFinite(item.value)
    )

    if (found && found.value !== undefined) {
      return found.value
    }
  }

  return null
}

function convert(food: RawFood): USDAFood | null {
  const nutrients = food.foodNutrients ?? []

  const calories = nutrient(nutrients, [1008, 2048, 2047])
  const protein = nutrient(nutrients, [1003])
  const carbs = nutrient(nutrients, [1005])
  const fat = nutrient(nutrients, [1004])

  if (
    calories === null ||
    protein === null ||
    carbs === null ||
    fat === null
  ) {
    return null
  }

  return {
    id: `usda-${food.fdcId}`,
    name: food.description,
    source: food.dataType ?? 'USDA',
    calories,
    protein,
    carbs,
    fat,
  }
}

// The API key now stays on the Cloudflare server.
async function requestUSDA(query: string): Promise<USDAFood[]> {
  const response = await fetch('/api/usda/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    let message = `USDA request failed (${response.status})`

    try {
      const data = await response.json() as {
        error?: string
      }

      if (data.error) {
        message = data.error
      }
    } catch {
      // Use the HTTP error when no JSON error is available.
    }

    if (import.meta.env.DEV && response.status === 404) {
      message = 'Local USDA API unavailable. Run npm run dev:api in another Terminal.'
    }
    throw new Error(message)
  }

  const data = await response.json() as SearchResponse

  return (data.foods ?? [])
    .map(convert)
    .filter((food): food is USDAFood => food !== null)
}

function ranking(food: USDAFood, query: string): number {
  const q = normalized(query)
  const name = normalized(food.name)
  const words = name.split(' ')
  const requested = q.split(' ').filter(Boolean)
  const rawRequested = requested.some(term => ['raw', 'uncooked'].includes(term))
  const cookedRequested = requested.some(term => ['cooked', 'roasted', 'grilled', 'baked', 'boiled'].includes(term))
  const guide = guideFor(query)

  let score = 0

  if (name === q) {
    score += 120
  }

  if (name.startsWith(q + ' ')) {
    score += 30
  }

  if (name.includes(q)) {
    score += 22
  }

  for (const term of requested) {
    score += words.includes(term) ? 24 : -12
  }

  if (food.source === 'Foundation') score += 15
  if (food.source === 'SR Legacy') score += 10
  if (food.source === 'Survey (FNDDS)') score -= 8

  // Prioritize simple ingredients over packaged and prepared dishes,
  // unless the user explicitly searches for those foods.
  const prepared = ['restaurant', 'fast food', 'sandwich', 'nugget', 'casserole', 'breaded']
  if (prepared.some(term => name.includes(term) && !q.includes(term))) score -= 45


  score -= Math.max(
    0,
    words.length - requested.length
  ) * 1.2

  const bad = guide?.bad ?? [
    'breaded',
    'battered',
    'juice',
    'powder',
    'cake',
    'soup',
    'sandwich',
  ]

  for (const term of bad) {
    if (
      words.includes(term) &&
      !requested.includes(term)
    ) {
      score -= 80
    }
  }

  for (const term of guide?.good ?? []) {
    if (words.includes(term)) {
      score += 12
    }
  }

  if (cookedRequested && words.includes('raw')) score -= 55
  if (rawRequested && words.some(term => ['cooked', 'boiled', 'roasted', 'grilled'].includes(term))) score -= 55

  if (
    guide &&
    [
      'tomato',
      'carrot',
      'apple',
      'banana',
      'potato',
      'broccoli',
    ].includes(aliases[q] ?? q) &&
    words.includes('raw')
  ) {
    score += 35
  }

  for (const term of [
    'raw',
    'cooked',
    'roasted',
    'boiled',
    'grilled',
  ]) {
    if (requested.includes(term)) {
      score += words.includes(term) ? 40 : -25
    }
  }

  return score
}

export async function searchIngredients(
  query: string
): Promise<IngredientSearch> {
  if (!query.trim()) {
    return {
      recommended: [],
      more: [],
    }
  }

  const guide = guideFor(query)

  const searches = [requestUSDA(query)]

  if (
    guide &&
    normalized(guide.search) !== normalized(query)
  ) {
    searches.push(requestUSDA(guide.search))
  }

  const attempts = await Promise.allSettled(searches)

  const combined = attempts.flatMap(result =>
    result.status === 'fulfilled'
      ? result.value
      : []
  )

  if (
    combined.length === 0 &&
    attempts.every(result => result.status === 'rejected')
  ) {
    const failed = attempts.find(
      result => result.status === 'rejected'
    )

    throw failed && failed.status === 'rejected'
      ? failed.reason
      : new Error('USDA search failed')
  }

  const unique = Array.from(
    new Map(
      combined.map(food => [food.id, food])
    ).values()
  )

  unique.sort(
    (a, b) =>
      ranking(b, query) - ranking(a, query) ||
      a.name.localeCompare(b.name)
  )

  return {
    recommended: unique.slice(0, 6),
    more: unique.slice(6),
  }
}
