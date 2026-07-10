import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const upsertDevicePresence: NonNullable<
  MutationResolvers['upsertDevicePresence']
> = ({ deviceId, ipAddress }) => {
  return db.devicePresence.upsert({
    where: { deviceId },
    update: { ipAddress, lastBoot: new Date() },
    create: { deviceId, ipAddress, lastBoot: new Date() },
  })
}
