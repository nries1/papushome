import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

// Atomic partial merge (`config || patch`) with `jsonb_strip_nulls` to delete
// keys the caller explicitly set to null. Prisma's query builder can only
// replace a JSON field wholesale, not merge-patch it, so this stays raw SQL.
export const updateDeviceConfig: NonNullable<
  MutationResolvers['updateDeviceConfig']
> = async ({ deviceId, patch }) => {
  await db.$executeRaw`
    UPDATE devices
    SET config = jsonb_strip_nulls(config || ${JSON.stringify(patch)}::jsonb)
    WHERE device_id = ${deviceId}
  `

  const device = await db.device.findUnique({
    where: { deviceId },
    select: { config: true },
  })
  return device?.config ?? {}
}
