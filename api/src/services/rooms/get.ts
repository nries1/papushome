import type { QueryResolvers, RoomRelationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const rooms: NonNullable<QueryResolvers['rooms']> = () => {
  return db.room.findMany({ orderBy: { displayName: 'asc' } })
}

export const room: NonNullable<QueryResolvers['room']> = ({ id }) => {
  return db.room.findUnique({ where: { id } })
}

export const Room: RoomRelationResolvers = {
  devices: (_args, { root }) =>
    db.room.findUnique({ where: { id: root.id } }).devices(),
}
