import { Prisma } from '@prisma/client'
import type { QueryResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

type SensorHealthMetricsRow = {
  total_count: bigint
  min_value: number
  max_value: number
  mean_value: Prisma.Decimal
  std_dev: Prisma.Decimal
  median_value: number
  mode_value: number
}

type DailyStdDevRow = {
  day: Date
  daily_stddev: Prisma.Decimal
}

const deviceFilter = (deviceId?: string | null) =>
  deviceId ? Prisma.sql`AND device_id = ${deviceId}` : Prisma.empty

export const tankSensorHealthMetrics: NonNullable<
  QueryResolvers['tankSensorHealthMetrics']
> = async ({ deviceId, days }) => {
  const interval = `${days ?? 7} days`
  const rows = await db.$queryRaw<SensorHealthMetricsRow[]>(Prisma.sql`
    WITH filtered AS (
      SELECT raw_value
      FROM tank_readings
      WHERE timestamp >= NOW() - ${interval}::interval ${deviceFilter(deviceId)}
    ),
    stats AS (
      SELECT
        COUNT(*) AS total_count,
        MIN(raw_value) AS min_value,
        MAX(raw_value) AS max_value,
        AVG(raw_value) AS mean_value,
        STDDEV_POP(raw_value) AS std_dev,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY raw_value) AS median_value
      FROM filtered
    ),
    mode_calc AS (
      SELECT raw_value AS mode_value
      FROM filtered
      GROUP BY raw_value
      ORDER BY COUNT(*) DESC, raw_value
      LIMIT 1
    )
    SELECT s.total_count, s.min_value, s.max_value, s.mean_value,
           s.std_dev, s.median_value, m.mode_value
    FROM stats s
    CROSS JOIN mode_calc m
  `)

  const row = rows[0]
  if (!row) return null

  return {
    totalCount: Number(row.total_count),
    minValue: row.min_value,
    maxValue: row.max_value,
    meanValue: row.mean_value.toNumber(),
    stdDev: row.std_dev.toNumber(),
    medianValue: row.median_value,
    modeValue: row.mode_value,
  }
}

export const tankReadingDailyStdDev: NonNullable<
  QueryResolvers['tankReadingDailyStdDev']
> = async ({ deviceId, days }) => {
  const interval = `${days ?? 7} days`
  const rows = await db.$queryRaw<DailyStdDevRow[]>(Prisma.sql`
    SELECT
        DATE_TRUNC('day', timestamp) AS day,
        STDDEV_POP(raw_value) AS daily_stddev
    FROM tank_readings
    WHERE timestamp >= NOW() - ${interval}::interval ${deviceFilter(deviceId)}
    GROUP BY day
    ORDER BY day ASC
  `)

  return rows.map((r) => ({
    day: r.day,
    dailyStdDev: r.daily_stddev.toNumber(),
  }))
}
