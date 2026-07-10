import axios from 'axios'

import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'
import { latestEnvironmentReading } from 'src/services/environmentReadings/get'
import { tankSensorHealthMetrics } from 'src/services/tankSensorMetrics/get'
import { createAiSummary } from 'src/services/aiSummaries/create'

async function buildPrompt(): Promise<string> {
  const [temp, humidity, pressure, gas, waterLevels, waterEvents, sensorMetrics] =
    await Promise.all([
      latestEnvironmentReading({ metric: 'temperature_f' }),
      latestEnvironmentReading({ metric: 'humidity_pct' }),
      latestEnvironmentReading({ metric: 'pressure_hpa' }),
      latestEnvironmentReading({ metric: 'iaq' }),
      // Direct Prisma rather than the `tankReadings`/`wateringEvents` list
      // resolvers — list-resolver elements are individually `T | Promise<T>`,
      // which breaks direct property access (see src/lib/mqtt.ts
      // canWaterPlants for the same precedent).
      db.tankReading.findMany({ orderBy: { timestamp: 'desc' }, take: 1 }),
      db.wateringEvent.findMany({ orderBy: { timestamp: 'desc' }, take: 5 }),
      tankSensorHealthMetrics({ days: 7 }),
    ])

  const fmtTime = (ts: Date | string | null | undefined) =>
    ts ? new Date(ts).toLocaleString() : 'unknown'
  const fmtNum = (n: number | null | undefined, d = 1) =>
    n != null ? Number(n).toFixed(d) : '—'

  const readingValue = (row: { readings: unknown } | null) => {
    const readings = row?.readings as { value?: number } | null
    return readings?.value
  }

  // System/API logs (`getSystemLogs`) are part of the logging domain
  // deferred in Diff 1 of Phase 2 — the api_logs/app_logs tables aren't
  // ported yet, pending a decision on the new logging strategy. Once that
  // lands, restore this section from the old `logLines` build in
  // server/aiSummaries/aiSummaryService.ts.
  const logLines = 'No recent logs (system logs domain not yet migrated).'

  const envLines = [
    `Temperature:   ${fmtNum(readingValue(temp))}°F`,
    `Humidity:      ${fmtNum(readingValue(humidity))}%`,
    `Pressure:      ${fmtNum(readingValue(pressure))} hPa`,
    `Air Quality:   ${fmtNum(readingValue(gas))} IAQ`,
  ].join('\n')

  const tank = waterLevels[0]
  const tankLine = tank
    ? `${fmtNum(tank.gallons?.toNumber())} gallons (${fmtNum(tank.pctFull)}% full) as of ${fmtTime(tank.timestamp)}`
    : 'No tank data.'

  const eventLines = waterEvents.length
    ? waterEvents
        .map(
          (e) =>
            `  - ${fmtTime(e.timestamp)} | ${e.deviceId} | ${e.status} | ${e.durationMs != null ? e.durationMs / 1000 + 's' : '—'}`
        )
        .join('\n')
    : '  No recent watering events.'

  const stability = sensorMetrics
    ? `${sensorMetrics.totalCount} readings | Mean: ${fmtNum(sensorMetrics.meanValue)} | Std Dev: ${fmtNum(sensorMetrics.stdDev)} | Range: ${fmtNum(sensorMetrics.minValue)}–${fmtNum(sensorMetrics.maxValue)}`
    : 'No stability data.'

  return `You are Papus, a home automation AI assistant monitoring a smart home in Brooklyn. Analyze the system data below and give a warm, concise health summary covering environment conditions, water system status, sensor stability, and any errors or warnings worth noting. Keep it under 200 words and conversational.

--- SYSTEM LOGS (most recent 20) ---
${logLines}

--- ENVIRONMENT (latest readings) ---
${envLines}

--- WATER SYSTEM ---
Tank: ${tankLine}
Recent watering events:
${eventLines}

--- SENSOR STABILITY (7-day tank sensor) ---
${stability}`
}

async function generateAndSaveSummary(): Promise<void> {
  try {
    const prompt = await buildPrompt()

    const response = await axios.post<{ message: { content: string } }>(
      process.env.OLLAMA_URL ?? 'http://ollama:11434/api/chat',
      {
        model: process.env.OLLAMA_MODEL ?? 'qwen3.5:9b',
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }
    )

    const summary = response.data.message.content
    await createAiSummary({ input: { summary } })
    logger.info('AI system summary generated')
  } catch (err) {
    logger.error({ err }, 'Failed to generate AI system summary')
  }
}

export function startHourlySummary(): void {
  generateAndSaveSummary()
  setInterval(generateAndSaveSummary, 60 * 60 * 1000)
}

// Self-starts on import — mirrors src/lib/mqtt.ts, which is side-effect
// imported from graphql.ts (the one place guaranteed to load in both
// `yarn rw dev` and `yarn rw serve`). Matches the old index.ts behavior,
// which kicked this off once from the Express app.listen() callback.
startHourlySummary()
