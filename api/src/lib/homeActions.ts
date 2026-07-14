import axios from 'axios'

import { db } from 'src/lib/db'
import { createWateringEvent } from 'src/services/wateringEvents/create'
import { publishWaterCommand } from 'src/lib/mqtt'

import SHARED from '../../../shared/plant_config.json'

const HA_URL = process.env.HOMEASSISTANT_URL || 'http://homeassistant:8123'
const HA_TOKEN = process.env.HOMEASSISTANT_TOKEN || ''

export interface LightEntityInfo {
  entity_id: string
  friendly_name: string
  state: string
  brightness_pct?: number
}

export async function getLightEntities(): Promise<LightEntityInfo[]> {
  if (!HA_TOKEN) return []
  try {
    const res = await axios.get<
      Array<{
        entity_id: string
        state: string
        attributes: { friendly_name?: string; brightness?: number }
      }>
    >(`${HA_URL}/api/states`, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
      timeout: 5000,
    })
    return res.data
      .filter((e) => e.entity_id.startsWith('light.'))
      .map((e) => ({
        entity_id: e.entity_id,
        friendly_name:
          e.attributes.friendly_name ||
          e.entity_id.replace('light.', '').replace(/_/g, ' '),
        state: e.state,
        brightness_pct:
          e.attributes.brightness !== undefined
            ? Math.round((e.attributes.brightness / 255) * 100)
            : undefined,
      }))
  } catch {
    return []
  }
}

export interface LightCommand {
  entity_ids: string[]
  action: 'turn_on' | 'turn_off'
  brightness_pct?: number
  rgb_color?: [number, number, number]
  kelvin?: number
}

export interface ActionResult {
  success: boolean
  summary: string
}

export async function controlLight(command: LightCommand): Promise<ActionResult> {
  if (!HA_TOKEN) {
    return {
      success: false,
      summary: 'Home Assistant is not configured (missing HOMEASSISTANT_TOKEN).',
    }
  }
  if (!command.entity_ids.length) {
    return { success: false, summary: 'No lights matched that request.' }
  }

  const payload: Record<string, unknown> = { entity_id: command.entity_ids }
  if (command.action === 'turn_on') {
    if (command.brightness_pct !== undefined) {
      payload.brightness_pct = Math.max(1, Math.min(100, command.brightness_pct))
    }
    if (command.rgb_color) payload.rgb_color = command.rgb_color
    if (command.kelvin) payload.color_temp_kelvin = command.kelvin
  }

  let changed: Array<{ entity_id: string }>
  try {
    // HA's /api/services/<domain>/<service> doesn't error on an unknown
    // entity_id — it 200s with an empty array. A prior version of this
    // function treated any 200 as success, so the chat assistant once
    // confidently reported turning on a hallucinated entity_id
    // ("light.couch_lights", which doesn't exist — the real ones are
    // light.couch_1/light.couch_2) that HA silently did nothing with.
    const res = await axios.post<Array<{ entity_id: string }>>(
      `${HA_URL}/api/services/light/${command.action}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${HA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      }
    )
    changed = res.data
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, summary: `Light control failed: ${msg}` }
  }

  if (changed.length === 0) {
    return {
      success: false,
      summary: `No lights matched entity_id(s): ${command.entity_ids.join(', ')}. Call list_lights to get real entity_ids.`,
    }
  }

  // Report what HA actually confirms changed, not the requested entity_ids
  // verbatim — if only some of a multi-entity request matched, the summary
  // should reflect reality rather than the (possibly wrong) request.
  const names = changed
    .map((e) => e.entity_id.replace(/^light\./, '').replace(/_/g, ' '))
    .join(', ')

  let verb = command.action === 'turn_off' ? 'turned off' : 'turned on'
  if (command.action === 'turn_on') {
    if (command.brightness_pct !== undefined) verb += ` at ${command.brightness_pct}%`
    if (command.rgb_color) verb += ` with custom color`
    if (command.kelvin) verb += ` at ${command.kelvin}K`
  }

  return { success: true, summary: `${names}: ${verb}` }
}

const DEFAULT_DURATION_SECONDS = 30

export async function waterPlants(): Promise<ActionResult> {
  const pumps = await db.device.findMany({ where: { deviceType: 'pump' } })

  if (!pumps.length) {
    return { success: false, summary: 'No watering devices are configured.' }
  }

  const lines: string[] = []
  let anyStarted = false

  for (const device of pumps) {
    const name = device.friendlyName || device.deviceId

    // Check cooldown — direct Prisma query rather than the wateringEvents
    // list resolver, since GraphQL list-resolver elements are individually
    // `T | Promise<T>` and break direct property access (see src/lib/mqtt.ts
    // canWaterPlants for the same precedent).
    const last = await db.wateringEvent.findFirst({
      where: { deviceId: device.deviceId },
      orderBy: { timestamp: 'desc' },
    })
    if (last?.status === SHARED.water_status_complete && last.timestamp) {
      const hoursSince = (Date.now() - last.timestamp.getTime()) / (1000 * 60 * 60)
      if (hoursSince < SHARED.pump_cycle_cooldown_hours) {
        const minutesAgo = Math.round(hoursSince * 60)
        const hoursLeft = (SHARED.pump_cycle_cooldown_hours - hoursSince).toFixed(1)
        lines.push(
          `${name}: skipped — watered ${minutesAgo} min ago (${hoursLeft} hrs until next cycle allowed)`
        )
        continue
      }
    }

    // Schedule the event
    const created = await createWateringEvent({
      input: {
        deviceId: device.deviceId,
        durationMs: DEFAULT_DURATION_SECONDS * 1000,
        action: SHARED.water_action_on,
        startedBy: 'papu',
      },
    })

    // Publish — publishWaterCommand has its own low-water safety block
    const sent = await publishWaterCommand({
      event_id: created.id,
      device_id: device.deviceId,
      action: SHARED.water_action_on,
      duration_ms: DEFAULT_DURATION_SECONDS * 1000,
    })

    anyStarted = true
    lines.push(
      sent
        ? `${name}: watering started (${DEFAULT_DURATION_SECONDS}s)`
        : `${name}: command queued (MQTT broker temporarily offline)`
    )
  }

  return { success: anyStarted, summary: lines.join('\n') }
}
