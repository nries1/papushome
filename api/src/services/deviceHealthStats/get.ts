import type { QueryResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

type DeviceHealthRow = {
  device_id: string
  friendly_name: string
  device_type: string
  room_display_name: string | null
  env_readings_7d: number
  tank_readings_7d: number
  watering_total_7d: number
  watering_complete_7d: number
  watering_errors_7d: number
  device_log_errors_7d: number
}

export const deviceHealthStats: NonNullable<
  QueryResolvers['deviceHealthStats']
> = async () => {
  const rows = await db.$queryRaw<DeviceHealthRow[]>`
    SELECT
      d.device_id,
      d.friendly_name,
      d.device_type,
      r.display_name AS room_display_name,
      COALESCE(env.cnt, 0)::int          AS env_readings_7d,
      COALESCE(tank.cnt, 0)::int         AS tank_readings_7d,
      COALESCE(water.total, 0)::int      AS watering_total_7d,
      COALESCE(water.complete, 0)::int   AS watering_complete_7d,
      COALESCE(water.errors, 0)::int     AS watering_errors_7d,
      COALESCE(dlogs.errors, 0)::int     AS device_log_errors_7d
    FROM devices d
    LEFT JOIN rooms r ON r.id = d.room_id
    LEFT JOIN (
      SELECT device_id, COUNT(*) AS cnt
      FROM environment_readings
      WHERE timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY device_id
    ) env ON env.device_id = d.device_id
    LEFT JOIN (
      SELECT device_id, COUNT(*) AS cnt
      FROM tank_readings
      WHERE timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY device_id
    ) tank ON tank.device_id = d.device_id
    LEFT JOIN (
      SELECT
        device_id,
        COUNT(*)                                                    AS total,
        COUNT(*) FILTER (WHERE status = 'complete')                 AS complete,
        COUNT(*) FILTER (WHERE status NOT IN ('complete', 'requested', 'BLOCKED_LOW_WATER')) AS errors
      FROM watering_events
      WHERE timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY device_id
    ) water ON water.device_id = d.device_id
    LEFT JOIN (
      SELECT device_id, COUNT(*) AS errors
      FROM device_logs
      WHERE log_level = 'error' AND timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY device_id
    ) dlogs ON dlogs.device_id = d.device_id
    ORDER BY r.display_name NULLS LAST, d.friendly_name
  `

  return rows.map((row) => ({
    deviceId: row.device_id,
    friendlyName: row.friendly_name,
    deviceType: row.device_type,
    roomDisplayName: row.room_display_name,
    envReadings7d: row.env_readings_7d,
    tankReadings7d: row.tank_readings_7d,
    wateringTotal7d: row.watering_total_7d,
    wateringComplete7d: row.watering_complete_7d,
    wateringErrors7d: row.watering_errors_7d,
    deviceLogErrors7d: row.device_log_errors_7d,
  }))
}
