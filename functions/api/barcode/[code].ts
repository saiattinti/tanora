
type Env = Record<string, never>

type Context = {
  request: Request
  params: { code: string }
  env: Env
}

type Nutriments = {
  'energy-kcal_100g'?: number
  proteins_100g?: number
  carbohydrates_100g?: number
  fat_100g?: number
}

type Product = {
  product_name?: string
  brands?: string
  serving_size?: string
  serving_quantity?: number
  nutrition_data_per?: string
  nutriments?: Nutriments
}

type ProductResponse = {
  status?: number
  product?: Product
}

function reply(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function onRequestGet({
  params,
}: Context): Promise<Response> {
  const code = params.code

  if (!/^\d{8,14}$/.test(code)) {
    return reply({ error: 'Enter a valid food barcode (8–14 digits).' }, 400)
  }

  const url = new URL(
    `https://world.openfoodfacts.org/api/v2/product/${code}.json`
  )

  url.searchParams.set(
    'fields',
    'code,product_name,brands,serving_size,serving_quantity,nutrition_data_per,nutriments'
  )

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent':
          'PersonalNutritionTracker/1.0 (https://personal-nutrition-tracker-5a0.pages.dev)',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return reply(
        { error: `Product lookup failed (${response.status}).` },
        response.status === 429 ? 429 : 502
      )
    }

    const data = await response.json() as ProductResponse

    if (data.status !== 1 || !data.product) {
      return reply({ error: 'This barcode was not found in Open Food Facts.' }, 404)
    }

    const product = data.product
    const n = product.nutriments ?? {}

    const calories = n['energy-kcal_100g']
    const protein = n.proteins_100g
    const carbs = n.carbohydrates_100g
    const fat = n.fat_100g

    // Return incomplete records to the client so a user can complete them
    // from the product label. Missing fields stay null, never fabricated as zero.
    const checked = (value: unknown): number | null =>
      typeof value === 'number' && Number.isFinite(value) &&
      value >= 0 ? value : null


    const servingQuantity = product.serving_quantity
    const servingText = product.serving_size ?? ''

    // The standardized nutrition values are per 100 g or 100 ml.
    // Do not equate ml with grams without a known density.
    const volumeBased =
      product.nutrition_data_per === '100ml' ||
      /\bml\b/i.test(servingText)

    const servingUnit = volumeBased ? 'ml' : 'g'
    const servingSize =
      typeof servingQuantity === 'number' &&
      Number.isFinite(servingQuantity) &&
      servingQuantity > 0
        ? servingQuantity
        : null

    return reply({
      barcode: code,
      name: product.product_name?.trim() ||
        `Product ${code}`,
      brand: product.brands?.trim() || '',
      calories: checked(calories),
      protein: checked(protein),
      carbs: checked(carbs),
      fat: checked(fat),
      servingSize,
      servingUnit,
      servingDescription: servingText,
    })
  } catch {
    return reply({
      error: 'Unable to contact Open Food Facts. Try again.',
    }, 502)
  }
}
