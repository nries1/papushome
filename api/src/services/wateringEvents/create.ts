import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const createWateringEvent: NonNullable<
  MutationResolvers['createWateringEvent']
> = ({ input }) => {
  return db.wateringEvent.create({
    data: { ...input, status: 'requested' },
  })
}
