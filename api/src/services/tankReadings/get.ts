import type {
  QueryResolvers,
  TankReadingRelationResolvers,
} from 'types/graphql'

import { db } from 'src/lib/db'

export const tankReadings: NonNullable<QueryResolvers['tankReadings']> = ({
  deviceId,
  rows,
}) => {
  return db.tankReading.findMany({
    where: deviceId ? { deviceId } : undefined,
    orderBy: { timestamp: 'desc' },
    take: rows ?? 1,
  })
}

export const latestTankReadings: NonNullable<
  QueryResolvers['latestTankReadings']
> = () => {
  return db.tankReading.findMany({
    distinct: ['deviceId'],
    orderBy: [{ deviceId: 'asc' }, { timestamp: 'desc' }],
  })
}

export const TankReading: TankReadingRelationResolvers = {
  device: (_args, { root }) =>
    root.deviceId
      ? db.device.findUnique({ where: { deviceId: root.deviceId } })
      : null,
}
