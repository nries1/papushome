import { Prisma } from '@prisma/client'
import type { QueryResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

// Raw-row shape as it actually comes back from Postgres, not guessed from
// the SQL — verified with a throwaway yarn rw g script against real data
// (see redwoodmigration.md Diff 5). Two gotchas that don't match a naive
// reading of the query:
// - jsonb columns (config, latest_env_readings) and json_object_agg/
//   row_to_json results are auto-parsed into plain JS objects by the driver.
// - timestamps that pass through row_to_json (inside latest_tank_reading /
//   latest_pump_event) come back as ISO strings, not Date objects, unlike
//   the top-level timestamp columns (last_boot, last_seen) which are real
//   Date objects — row_to_json serializes through JSON text, which has no
//   native date type.
type DeviceWithStatusRow = {
  device_id: string
  friendly_name: string
  device_type: string
  config: Prisma.JsonValue
  room_name: string | null
  room_display_name: string | null
  ip_address: string | null
  last_boot: Date | null
  last_seen: Date | null
  healthy: boolean
  ota_available: boolean
  latest_env_readings: Prisma.JsonValue | null
  latest_env_timestamp: Date | null
  latest_tank_reading: {
    raw_value: number
    gallons: number
    pct_full: number
    timestamp: string
  } | null
  latest_pump_event: {
    status: string
    action: string | null
    timestamp: string
  } | null
}

// Replaces the old getDevicesWithStatus() dao.ts query behind
// GET /api/devices/status — the dashboard's big per-device aggregate. No
// backing Prisma model (it's a correlated-subquery join across five
// tables plus tank-calibration math in CASE expressions), so this stays
// raw SQL rather than forcing it through the query builder, same
// precedent as deviceHealthStats/tankSensorMetrics.
export const devicesWithStatus: NonNullable<
  QueryResolvers['devicesWithStatus']
> = async () => {
  const rows = await db.$queryRaw<DeviceWithStatusRow[]>`
    SELECT
      d.device_id,
      d.friendly_name,
      d.device_type,
      d.config,
      r.name         AS room_name,
      r.display_name AS room_display_name,
      dp.ip_address,
      dp.last_boot,
      GREATEST(
        dp.last_boot,
        (SELECT MAX(dl.timestamp) FROM device_logs dl          WHERE dl.device_id = d.device_id),
        (SELECT MAX(er.timestamp) FROM environment_readings er WHERE er.device_id = d.device_id),
        (SELECT MAX(tr.timestamp) FROM tank_readings tr        WHERE tr.device_id = d.device_id)
      ) AS last_seen,
      COALESCE(
        GREATEST(
          dp.last_boot,
          (SELECT MAX(dl.timestamp) FROM device_logs dl          WHERE dl.device_id = d.device_id),
          (SELECT MAX(er.timestamp) FROM environment_readings er WHERE er.device_id = d.device_id),
          (SELECT MAX(tr.timestamp) FROM tank_readings tr        WHERE tr.device_id = d.device_id)
        ) > NOW() - INTERVAL '12 hours',
        false
      ) AS healthy,
      d.has_ota AS ota_available,
      (
        SELECT json_object_agg(e.metric, e.value)
        FROM (
          SELECT DISTINCT ON (er.readings->>'metric')
            er.readings->>'metric' AS metric,
            er.readings->'value'   AS value
          FROM environment_readings er
          WHERE er.device_id = d.device_id
          ORDER BY er.readings->>'metric', er.timestamp DESC
        ) e
      ) AS latest_env_readings,
      (SELECT MAX(er.timestamp) FROM environment_readings er WHERE er.device_id = d.device_id) AS latest_env_timestamp,
      (
        SELECT row_to_json(t) FROM (
          SELECT
            tr.raw_value,
            CASE
              WHEN (d.config->>'calibration_raw')::numeric > 0
                AND (d.config->>'calibration_gallons')::numeric > 0
              THEN ROUND(GREATEST(0, LEAST(
                COALESCE((d.config->>'tank_capacity_gallons')::numeric, 30),
                tr.raw_value
                  * (d.config->>'calibration_gallons')::numeric
                  / (d.config->>'calibration_raw')::numeric
              )), 1)
              ELSE ROUND(
                (tr.pct_full / 100.0) * COALESCE((d.config->>'tank_capacity_gallons')::numeric, 30), 1
              )
            END AS gallons,
            CASE
              WHEN (d.config->>'calibration_raw')::numeric > 0
                AND (d.config->>'calibration_gallons')::numeric > 0
              THEN ROUND(GREATEST(0, LEAST(100,
                tr.raw_value
                  * (d.config->>'calibration_gallons')::numeric
                  / (d.config->>'calibration_raw')::numeric
                  / COALESCE((d.config->>'tank_capacity_gallons')::numeric, 30) * 100
              )), 1)
              ELSE tr.pct_full
            END AS pct_full,
            tr.timestamp
          FROM tank_readings tr
          WHERE tr.device_id = d.device_id
          ORDER BY tr.timestamp DESC LIMIT 1
        ) t
      ) AS latest_tank_reading,
      (
        SELECT row_to_json(w) FROM (
          SELECT status, action, timestamp
          FROM watering_events
          WHERE device_id = d.device_id
          ORDER BY timestamp DESC LIMIT 1
        ) w
      ) AS latest_pump_event
    FROM devices d
    LEFT JOIN rooms r            ON r.id          = d.room_id
    LEFT JOIN device_presence dp ON dp.device_id  = d.device_id
    ORDER BY r.display_name, d.friendly_name
  `

  return rows.map((row) => ({
    deviceId: row.device_id,
    friendlyName: row.friendly_name,
    deviceType: row.device_type,
    config: row.config,
    roomName: row.room_name,
    roomDisplayName: row.room_display_name,
    ipAddress: row.ip_address,
    lastBoot: row.last_boot,
    lastSeen: row.last_seen,
    healthy: row.healthy,
    otaAvailable: row.ota_available,
    latestEnvReadings: row.latest_env_readings,
    latestEnvTimestamp: row.latest_env_timestamp,
    latestTankReading: row.latest_tank_reading
      ? {
          rawValue: row.latest_tank_reading.raw_value,
          gallons: row.latest_tank_reading.gallons,
          pctFull: row.latest_tank_reading.pct_full,
          timestamp: row.latest_tank_reading.timestamp,
        }
      : null,
    latestPumpEvent: row.latest_pump_event
      ? {
          status: row.latest_pump_event.status,
          action: row.latest_pump_event.action,
          timestamp: row.latest_pump_event.timestamp,
        }
      : null,
  }))
}
