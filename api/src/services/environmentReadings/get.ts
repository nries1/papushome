import type {
  QueryResolvers,
  EnvironmentReadingRelationResolvers,
} from 'types/graphql'

import { db } from 'src/lib/db'

export const latestEnvironmentReading: NonNullable<
  QueryResolvers['latestEnvironmentReading']
> = ({ metric, roomName }) => {
  return db.environmentReading.findFirst({
    where: {
      readings: { path: ['metric'], equals: metric },
      room: roomName ? { name: roomName } : undefined,
    },
    orderBy: { timestamp: 'desc' },
  })
}

export const EnvironmentReading: EnvironmentReadingRelationResolvers = {
  room: (_args, { root }) =>
    db.environmentReading.findUnique({ where: { id: root.id } }).room(),
  device: (_args, { root }) =>
    db.device.findUnique({ where: { deviceId: root.deviceId } }),
}
