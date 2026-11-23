
type Env = {
  USDA_API_KEY: string
}

type RequestContext = {
  request: Request
  env: Env
}

function json(
  data: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function onRequestPost(
  context: RequestContext
): Promise<Response> {
  const apiKey = context.env.USDA_API_KEY

  if (!apiKey) {
    return json(
      { error: 'USDA server configuration is missing.' },
      503
    )
  }

  let body: unknown

  try {
    body = await context.request.json()
  } catch {
    return json(
      { error: 'Invalid search request.' },
      400
    )
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('query' in body) ||
    typeof body.query !== 'string'
  ) {
    return json(
      { error: 'A search query is required.' },
      400
    )
  }

  const query = body.query.trim()

  if (query.length === 0 || query.length > 150) {
    return json(
      { error: 'Search must contain 1 to 150 characters.' },
      400
    )
  }

  const endpoint =
    'https://api.nal.usda.gov/fdc/v1/foods/search'

  const url = new URL(endpoint)
  url.searchParams.set('api_key', apiKey)

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        pageSize: 150,
        dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'],
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return json(
        {
          error:
            response.status === 429
              ? 'USDA search limit reached. Try again shortly.'
              : `USDA search failed (${response.status}).`,
        },
        response.status
      )
    }

    const data: unknown = await response.json()

    return json(data)
  } catch {
    return json(
      { error: 'Could not reach USDA. Please try again.' },
      502
    )
  }
}
