import type { QueryResolvers, DeviceRelationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const devices: NonNullable<QueryResolvers['devices']> = ({ page, rows, order }) => {
  const limit = rows ?? 20
  const offset = page ? page * limit : 0
  const direction = order?.toUpperCase() === 'DESC' ? 'desc' : 'asc'

  return db.device.findMany({
    orderBy: { deviceId: direction },
    skip: offset,
    take: limit,
  })
}

export const device: NonNullable<QueryResolvers['device']> = ({ id }) => {
  return db.device.findUnique({ where: { id } })
}

export const Device: DeviceRelationResolvers = {
  room: (_args, { root }) =>
    db.device.findUnique({ where: { id: root.id } }).room(),
}
