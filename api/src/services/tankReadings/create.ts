import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const createTankReading: NonNullable<
  MutationResolvers['createTankReading']
> = ({ input }) => {
  return db.tankReading.create({ data: input })
}
