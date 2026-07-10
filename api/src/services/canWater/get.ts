import type { QueryResolvers } from 'types/graphql'

import { context } from '@redwoodjs/context'

import type { CurrentUser } from 'src/lib/auth'
import { ADMIN_EMAILS } from 'src/lib/auth'
import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

import SHARED from '../../../../shared/plant_config.json'

// Replaces the old GET /api/can-water route — computes whether the UI's
// water button should be enabled, and why not if it's disabled. This is
// deliberately left at plain @requireAuth rather than admin-gated: any
// authenticated user can ask "can I water?" and gets "Admin access
// required" back as one of the disabledReasons (same as the old route),
// rather than a hard 403 on the whole query.
export const canWater: NonNullable<QueryResolvers['canWater']> = async ({
  deviceId,
}) => {
  const disabledReasons: string[] = []
  const currentUser = context.currentUser as CurrentUser | undefined

  if (!currentUser || !ADMIN_EMAILS.includes(currentUser.email)) {
    disabledReasons.push('Admin access required')
  }

  try {
    const latestReading = await db.tankReading.findFirst({
      where: deviceId ? { deviceId } : undefined,
      orderBy: { timestamp: 'desc' },
    })
    const gallons = latestReading?.gallons?.toNumber() ?? null
    if (gallons !== null && gallons < 3) {
      const device = deviceId
        ? await db.device.findUnique({
            where: { deviceId },
            select: { config: true },
          })
        : null
      const config = (device?.config ?? {}) as Record<string, unknown>
      const tankCapacity =
        typeof config.tank_capacity_gallons === 'number'
          ? config.tank_capacity_gallons
          : 30
      disabledReasons.push(
        `Water level too low (${gallons.toFixed(1)}/${tankCapacity} gal)`
      )
    }
  } catch (err) {
    logger.warn({ err, deviceId }, 'canWater: failed checking water level')
  }

  try {
    const lastEvent = await db.wateringEvent.findFirst({
      where: deviceId ? { deviceId } : undefined,
      orderBy: { timestamp: 'desc' },
    })
    if (lastEvent?.status === SHARED.water_status_complete && lastEvent.timestamp) {
      const hoursSince =
        (Date.now() - lastEvent.timestamp.getTime()) / (1000 * 60 * 60)
      if (hoursSince < SHARED.pump_cycle_cooldown_hours) {
        const remaining = (SHARED.pump_cycle_cooldown_hours - hoursSince).toFixed(1)
        disabledReasons.push(
          `Must wait ${remaining} more hours (${SHARED.pump_cycle_cooldown_hours}-hour minimum)`
        )
      }
    }
  } catch (err) {
    logger.warn({ err, deviceId }, 'canWater: failed checking watering history')
  }

  return { canWater: disabledReasons.length === 0, disabledReasons }
}
