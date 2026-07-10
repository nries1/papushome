import type {
  QueryResolvers,
  WateringEventRelationResolvers,
} from 'types/graphql'

import { db } from 'src/lib/db'

export const wateringEvents: NonNullable<QueryResolvers['wateringEvents']> = ({
  deviceId,
  page,
  rows,
  order,
}) => {
  const limit = rows ?? 5
  const offset = page ? page * limit : 0
  const direction = order?.toUpperCase() === 'DESC' ? 'desc' : 'asc'

  return db.wateringEvent.findMany({
    where: deviceId ? { deviceId } : undefined,
    orderBy: { timestamp: direction },
    skip: offset,
    take: limit,
  })
}

export const latestWateringEvents: NonNullable<
  QueryResolvers['latestWateringEvents']
> = () => {
  return db.wateringEvent.findMany({
    where: { status: 'complete' },
    distinct: ['deviceId'],
    orderBy: [{ deviceId: 'asc' }, { timestamp: 'desc' }],
  })
}

export const WateringEvent: WateringEventRelationResolvers = {
  device: (_args, { root }) =>
    db.device.findUnique({ where: { deviceId: root.deviceId } }),
}
