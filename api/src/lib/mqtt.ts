import type { ServerResponse } from 'http'

import mqtt from 'mqtt'

import { db } from 'src/lib/db'
import { moduleLogger } from 'src/lib/logger'
import { deviceConfig } from 'src/services/deviceConfig/get'
import { upsertDevicePresence } from 'src/services/devicePresence/upsert'
import { createEnvironmentReading } from 'src/services/environmentReadings/create'
import { createTankReading } from 'src/services/tankReadings/create'
import { updateWateringEvent } from 'src/services/wateringEvents/update'

import SHARED from '../../../shared/plant_config.json'

// Two module tags on one file: 'mqtt' for the broker transport itself
// (connect/reconnect/offline/error/subscribe), 'hardware' for the actual
// device data this transport carries (tank/environment readings, watering
// commands, device presence/logs) — distinguishes "the broker connection is
// flaky" from "a specific sensor/device is misbehaving" in Grafana.
const logger = moduleLogger('mqtt')
const hwLogger = moduleLogger('hardware')

interface WaterCommandPayload {
  device_id: string
  event_id: number
  action: string
  duration_ms: number
}

interface DeviceConfigShape {
  tank_capacity_gallons?: number
  calibration_raw?: number
  calibration_gallons?: number
}

const client = mqtt.connect(
  process.env.MQTT_BROKER_URL || 'mqtt://mqtt-broker:1883'
)
const commandQueue: WaterCommandPayload[] = []
export const visionListeners = new Set<ServerResponse>()

export const serviceStatus = {
  mqttConnected: false,
  lastVisionResult: null as Date | null,
  lastPublisherFrame: null as Date | null,
}

// Device telemetry, not our own server's operational logging — kept as a
// direct Prisma write since `device_logs` is real domain data (feeds
// `deviceHealthStats.deviceLogErrors7d`), unlike the deferred `app_logs`/
// `api_logs` logging-strategy domain that this file's own log calls
// (`logger.info`/`warn`/`error` below) replace `appLog` with.
async function appendDeviceLog({
  deviceId,
  logLevel,
  message,
}: {
  deviceId: string
  logLevel: string
  message: string
}): Promise<void> {
  try {
    await db.deviceLog.create({ data: { deviceId, logLevel, message } })
  } catch (err) {
    hwLogger.error({ err, deviceId }, 'Failed to write device log')
  }
}

async function getRoomIdForDevice(deviceId: string): Promise<number | null> {
  try {
    const device = await db.device.findUnique({
      where: { deviceId },
      select: { roomId: true },
    })
    return device?.roomId ?? null
  } catch (err) {
    hwLogger.error({ err, deviceId }, 'Failed to look up room for device')
    return null
  }
}

// SSE clients (/vision/stream) need to tell the two vision topics apart —
// the raw MQTT payloads have no topic field of their own — so both are
// wrapped with a `type` discriminator rather than forwarded as-is. Only
// `result` was forwarded before this; `tracking` (the fast Haar-cascade
// pan/tilt feed, published far more often than the CNN recognition result)
// was silently dropped, which is fine for `serviceStatus` but breaks a
// low-latency head-follow UI that needs it.
function broadcastVision(type: 'tracking' | 'result', data: Record<string, unknown>): void {
  const payload = JSON.stringify({ type, ...data })
  for (const res of visionListeners) {
    try {
      res.write(`data: ${payload}\n\n`)
    } catch (err) {
      // Expected: the client closed the SSE connection. Debug, not error —
      // this is routine cleanup, not a failure.
      logger.debug({ err }, 'Dropping closed /vision/stream listener')
      visionListeners.delete(res)
    }
  }
}

client.on('connect', () => {
  serviceStatus.mqttConnected = true
  logger.info('Connected to MQTT Broker')

  const topics: string[] = [
    SHARED.pump_cycle_complete_topic,
    SHARED.water_level_topic,
    SHARED.environment_temp_1f_topic,
    SHARED.environment_humidity_1f_topic,
    SHARED.environment_pressure_1f_topic,
    SHARED.environment_gas_1f_topic,
    SHARED.device_logs_topic,
    SHARED.device_boot_topic,
    'robot/vision/result',
    'robot/vision/tracking',
  ]

  for (const topic of topics) {
    client.subscribe(topic, (err) => {
      if (err) {
        logger.warn({ err, topic }, 'Failed to subscribe to MQTT topic')
      } else {
        logger.info({ topic }, 'Subscribed to MQTT topic')
      }
    })
  }

  while (commandQueue.length > 0) {
    const cmd = commandQueue.shift()!
    publishWaterCommand(cmd)
  }
})

client.on('message', async (topic: string, message: Buffer) => {
  const messageStr = message.toString()

  let data: Record<string, unknown>
  try {
    data = JSON.parse(messageStr) as Record<string, unknown>
  } catch (err) {
    // Not every topic publishes JSON — debug, not error, but worth a trace
    // for diagnosing an unexpectedly malformed payload on a topic that should.
    logger.debug({ err, topic }, 'Non-JSON MQTT payload, passing through raw')
    data = { raw: messageStr }
  }

  if (topic === SHARED.pump_cycle_complete_topic) {
    const eventId = data['event_id'] as number
    const status = data['status'] as string
    try {
      await updateWateringEvent({
        id: eventId,
        input: { durationMs: data['duration'] as number, status },
      })
      hwLogger.info({ eventId, status }, 'Pump cycle complete')
    } catch (err) {
      hwLogger.error({ err, eventId, status }, 'Failed to update water event')
    }
  }

  if (topic === SHARED.water_level_topic) {
    const deviceId = data['device_id'] as string
    const rawValue = data['raw_value'] as number
    const percentFull = data['percent_full'] as number
    const config = (await deviceConfig({ deviceId })) as DeviceConfigShape
    const tankCapacity = config.tank_capacity_gallons ?? 30

    let gallons: number
    let calibratedPct: number
    if (
      config.calibration_raw &&
      config.calibration_gallons &&
      config.calibration_raw > 0
    ) {
      gallons = Math.max(
        0,
        Math.min(
          tankCapacity,
          (rawValue * config.calibration_gallons) / config.calibration_raw
        )
      )
      calibratedPct = (gallons / tankCapacity) * 100
    } else {
      gallons = (percentFull / 100) * tankCapacity
      calibratedPct = percentFull
    }

    try {
      await createTankReading({
        input: {
          deviceId,
          gallons,
          rawValue,
          pctFull: Math.round(calibratedPct),
        },
      })
    } catch (err) {
      hwLogger.error({ err, deviceId }, 'Failed to persist tank reading')
    }
  }

  if (topic === 'robot/vision/result') {
    serviceStatus.lastVisionResult = new Date()
    broadcastVision('result', data)
  }

  if (topic === 'robot/vision/tracking') {
    serviceStatus.lastPublisherFrame = new Date()
    broadcastVision('tracking', data)
  }

  if (topic === SHARED.device_logs_topic) {
    await appendDeviceLog({
      deviceId: (data['device_id'] ??
        data['device_name'] ??
        'unknown') as string,
      logLevel: (data['log_level'] ?? 'info') as string,
      message: data['message'] as string,
    })
  }

  if (topic === SHARED.device_boot_topic) {
    const deviceId = (data['device_id'] ?? data['device_name'] ?? '') as string
    const ipAddress = (data['ip'] ?? '') as string
    if (deviceId) {
      await upsertDevicePresence({ deviceId, ipAddress })
    }
  }

  const envTopicMap: Record<string, string> = {
    [SHARED.environment_temp_1f_topic]: 'temperature_f',
    [SHARED.environment_humidity_1f_topic]: 'humidity_pct',
    [SHARED.environment_pressure_1f_topic]: 'pressure_hpa',
    [SHARED.environment_gas_1f_topic]: 'iaq',
  }

  if (Object.prototype.hasOwnProperty.call(envTopicMap, topic)) {
    let value: number | null
    if (typeof data === 'object' && !('raw' in data)) {
      value = (data['value'] ?? data['v'] ?? data['reading'] ?? null) as
        | number
        | null
    } else {
      value = parseFloat(messageStr)
    }

    const metric = envTopicMap[topic]
    const deviceId = (data['device_id'] ??
      data['device_name'] ??
      'env-unknown') as string
    const roomId = await getRoomIdForDevice(deviceId)

    try {
      await createEnvironmentReading({
        input: { deviceId, roomId, readings: { metric, value } },
      })
    } catch (err) {
      hwLogger.error(
        { err, topic, deviceId, metric, value },
        'Failed to persist environment reading'
      )
    }
  }
})

client.on('reconnect', () => {
  logger.warn('MQTT client attempting to reconnect')
})

client.on('offline', () => {
  serviceStatus.mqttConnected = false
  logger.warn('MQTT client went offline')
})

client.on('error', (err: Error) => {
  logger.error({ err }, 'MQTT client error')
})

function getTopicName(deviceId: string): string {
  return SHARED.pump_topic_template.replace('{device_id}', deviceId)
}

async function canWaterPlants(deviceId: string): Promise<boolean> {
  // Direct Prisma query rather than reusing the `tankReadings` resolver:
  // GraphQL resolver return types allow each array element to individually
  // be `T | Promise<T>` (ResolverTypeWrapper), which breaks direct property
  // access like `readings[0].pctFull` even after awaiting the outer call.
  // Fine for the other reused resolvers below since this file only awaits
  // them for their side effects and never reads fields off the result.
  try {
    const latest = await db.tankReading.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    })
    return (latest?.pctFull ?? 0) > 4 // percentage-based; tank-size-agnostic
  } catch (err) {
    hwLogger.error({ err, deviceId }, 'Failed to fetch water level data')
    return false
  }
}

export function publishLearnFrame(name: string, imageBase64: string): boolean {
  if (!client.connected) return false
  const payload = JSON.stringify({ name, frame: imageBase64 })
  client.publish('robot/vision/learn', payload, { qos: 1 })
  return true
}

export async function publishWaterCommand(
  payload: WaterCommandPayload
): Promise<boolean> {
  const {
    device_id: deviceId,
    event_id: eventId,
    action,
    duration_ms: durationMs,
  } = payload

  const safe = await canWaterPlants(deviceId)
  if (!safe) {
    hwLogger.warn({ eventId, deviceId }, 'Safety Block: Tank level too low')
    try {
      await updateWateringEvent({
        id: eventId,
        input: { durationMs: 0, status: 'BLOCKED_LOW_WATER' },
      })
    } catch (err) {
      hwLogger.error({ err, eventId }, 'Failed to record blocked water event')
    }
    return false
  }

  if (client.connected) {
    const topicName = getTopicName(deviceId)
    client.publish(
      topicName,
      JSON.stringify({ event_id: eventId, action, duration_ms: durationMs }),
      {
        qos: 1,
      }
    )
    hwLogger.info(
      { eventId, action, durationMs },
      `Command Published: ${topicName}`
    )
    return true
  } else {
    logger.warn(
      { deviceId, eventId, action, durationMs },
      'Broker offline. Queueing command.'
    )
    commandQueue.push(payload)
    return false
  }
}
