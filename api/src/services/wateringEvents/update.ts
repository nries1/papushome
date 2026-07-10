import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const updateWateringEvent: NonNullable<MutationResolvers['updateWateringEvent']> = ({ id, input }) => {
  return db.wateringEvent.update({ where: { id }, data: input })
}
