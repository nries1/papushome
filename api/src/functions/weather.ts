import type { APIGatewayEvent, Context } from 'aws-lambda'

import { getCurrentUserFromEvent } from 'src/lib/auth'
import { getCurrentWeather, weatherCodeToText } from 'src/lib/weather'
import { moduleLogger } from 'src/lib/logger'

const logger = moduleLogger('api')

// Replaces the old GET /api/weather Express route (Open-Meteo proxy). This
// is a plain Function rather than a GraphQL query only because it's a thin
// unauthenticated-upstream proxy with no domain data of its own — but it
// still needs its own auth guard since @requireAuth doesn't apply to
// Functions (same reasoning as media.ts). The old route required any
// authenticated user (not admin-only — it came after authMiddleware but the
// URL doesn't contain /admin).
export const handler = async (event: APIGatewayEvent, _context: Context) => {
  if (!getCurrentUserFromEvent(event)) {
    return { statusCode: 401, body: 'Access Denied: please log in via Cloudflare.' }
  }

  try {
    const weather = await getCurrentWeather()
    if (!weather) throw new Error('Open-Meteo returned no current weather')

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temp: weather.temperature,
        description: weatherCodeToText(weather.weathercode),
        time: weather.time,
      }),
    }
  } catch (err) {
    logger.warn({ err }, 'weather: failed to fetch from Open-Meteo')
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Could not fetch weather' }),
    }
  }
}
