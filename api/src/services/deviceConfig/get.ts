import type { QueryResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const deviceConfig: NonNullable<
  QueryResolvers['deviceConfig']
> = async ({ deviceId }) => {
  const device = await db.device.findUnique({
    where: { deviceId },
    select: { config: true },
  })
  return device?.config ?? {}
}
