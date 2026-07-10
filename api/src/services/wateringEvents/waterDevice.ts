import type { MutationResolvers } from 'types/graphql'

import { context } from '@redwoodjs/context'
import { UserInputError } from '@redwoodjs/graphql-server'

import type { CurrentUser } from 'src/lib/auth'
import { db } from 'src/lib/db'
import { publishWaterCommand } from 'src/lib/mqtt'
import { createWateringEvent } from 'src/services/wateringEvents/create'

import SHARED from '../../../../shared/plant_config.json'

// The old /api/admin/water route trusted client-supplied duration_seconds
// with zero bounds checking. Clamping here is a deliberate hardening (same
// spirit as createPhoto's filename sanitization) — this triggers a real
// pump, and the old route had no upper bound at all.
const MIN_DURATION_SECONDS = 5
const MAX_DURATION_SECONDS = 120

// Replaces the on-demand "admin clicks water now" flow behind the old
// POST /api/admin/water route. createWateringEvent (the mutation) already
// existed, but nothing called publishWaterCommand from GraphQL — so before
// this, there was no way to actually trigger a pump through the new API.
export const waterDevice: NonNullable<MutationResolvers['waterDevice']> = async ({
  deviceId,
  durationSeconds,
}) => {
  const clampedSeconds = Math.max(
    MIN_DURATION_SECONDS,
    Math.min(MAX_DURATION_SECONDS, Math.round(durationSeconds))
  )

  // Direct Prisma read rather than the wateringEvents/latestWateringEvents
  // resolvers — same precedent as homeActions.ts's waterPlants() (GraphQL
  // list-resolver elements are individually T | Promise<T> and break direct
  // property access on the result).
  const last = await db.wateringEvent.findFirst({
    where: { deviceId },
    orderBy: { timestamp: 'desc' },
  })
  if (
    last?.status === SHARED.water_status_complete &&
    last.timestamp &&
    Date.now() - last.timestamp.getTime() <
      SHARED.pump_cycle_cooldown_hours * 60 * 60 * 1000
  ) {
    throw new UserInputError('Too soon to water — within the cooldown window.')
  }

  // The old route derived userEmail from the (trusted, server-set)
  // req.userEmail rather than accepting it from the client — same here,
  // via context.currentUser rather than a client-supplied field.
  const currentUser = context.currentUser as CurrentUser | undefined

  const created = await createWateringEvent({
    input: {
      deviceId,
      durationMs: clampedSeconds * 1000,
      action: SHARED.water_action_on,
      startedBy: currentUser?.email ?? 'unknown',
    },
  })

  // publishWaterCommand has its own low-water safety block (canWaterPlants)
  // independent of the cooldown check above.
  const sent = await publishWaterCommand({
    event_id: created.id,
    device_id: deviceId,
    action: SHARED.water_action_on,
    duration_ms: clampedSeconds * 1000,
  })

  return {
    eventId: created.id,
    sent,
    message: sent ? 'Command sent to node' : 'Broker offline, command queued',
  }
}
