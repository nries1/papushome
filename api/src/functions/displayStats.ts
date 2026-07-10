import type { APIGatewayEvent, Context } from 'aws-lambda'

import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'
import { latestEnvironmentReading } from 'src/services/environmentReadings/get'
import { getCurrentWeather, weatherCodeToText } from 'src/lib/weather'

// Replaces the old GET /api/display-stats Express route. Feeds the
// physical e-ink display board, which authenticates with a static
// DISPLAY_TOKEN query param instead of Cloudflare Access — this
// intentionally bypasses getCurrentUserFromEvent entirely, same as the old
// route bypassed authMiddleware by being registered before it.

function roomLabel(name: string | null): string {
  const map: Record<string, string> = { living_room: 'LR', office: 'OF' }
  return map[name ?? ''] ?? (name ?? '??').slice(0, 2).toUpperCase()
}

export const handler = async (event: APIGatewayEvent, _context: Context) => {
  const token = event.queryStringParameters?.token
  if (!token || token !== process.env.DISPLAY_TOKEN) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  try {
    const [
      weather,
      lrTemp,
      offTemp,
      lrHum,
      offHum,
      lrIAQ,
      offIAQ,
      tankReadings,
      waterEvents,
      devices,
    ] = await Promise.all([
      getCurrentWeather().catch(() => null),
      latestEnvironmentReading({ metric: 'temperature_f', roomName: 'living_room' }),
      latestEnvironmentReading({ metric: 'temperature_f', roomName: 'office' }),
      latestEnvironmentReading({ metric: 'humidity_pct', roomName: 'living_room' }),
      latestEnvironmentReading({ metric: 'humidity_pct', roomName: 'office' }),
      latestEnvironmentReading({ metric: 'iaq', roomName: 'living_room' }),
      latestEnvironmentReading({ metric: 'iaq', roomName: 'office' }),
      // Direct Prisma reads rather than the latestTankReadings/
      // latestWateringEvents resolvers — same precedent as waterDevice.ts's
      // cooldown check: GraphQL list-resolver elements are individually
      // T | Promise<T> and break direct property access when mapped over.
      db.tankReading.findMany({
        distinct: ['deviceId'],
        orderBy: [{ deviceId: 'asc' }, { timestamp: 'desc' }],
      }),
      db.wateringEvent.findMany({
        where: { status: 'complete' },
        distinct: ['deviceId'],
        orderBy: [{ deviceId: 'asc' }, { timestamp: 'desc' }],
      }),
      db.device.findMany({ select: { deviceId: true, room: { select: { name: true } } } }),
    ])

    const outdoor = weather
      ? { temp_f: weather.temperature, description: weatherCodeToText(weather.weathercode) }
      : { temp_f: null, description: null }

    const readingValue = (reading: Awaited<ReturnType<typeof latestEnvironmentReading>>) => {
      const readings = reading?.readings as { value?: number } | null | undefined
      return readings?.value ?? null
    }
    const lrTempVal = readingValue(lrTemp)
    const offTempVal = readingValue(offTemp)
    const lrHumVal = readingValue(lrHum)
    const offHumVal = readingValue(offHum)
    const lrIAQVal = readingValue(lrIAQ)
    const offIAQVal = readingValue(offIAQ)

    const humVals = [lrHumVal, offHumVal].filter((v): v is number => v !== null)
    const iaqVals = [lrIAQVal, offIAQVal].filter((v): v is number => v !== null)
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)

    const roomByDeviceId = new Map(devices.map((d) => [d.deviceId, d.room?.name ?? null]))
    const now = Date.now()

    const tanks = tankReadings.map((row) => ({
      label: roomLabel(roomByDeviceId.get(row.deviceId) ?? null),
      gallons: row.gallons?.toNumber() ?? 0,
      pct_full: row.pctFull ?? 0,
    }))

    const last_water = waterEvents.map((row) => ({
      label: roomLabel(roomByDeviceId.get(row.deviceId) ?? null),
      seconds_ago: row.timestamp ? Math.floor((now - row.timestamp.getTime()) / 1000) : null,
    }))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outdoor,
        living_room: { temp_f: lrTempVal },
        office: { temp_f: offTempVal },
        avg_humidity_pct: avg(humVals),
        avg_iaq: avg(iaqVals),
        tanks,
        last_water,
      }),
    }
  } catch (err) {
    logger.error({ err }, 'display-stats: failed to build response')
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal error' }),
    }
  }
}
