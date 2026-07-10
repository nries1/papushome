import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const createEnvironmentReading: NonNullable<
  MutationResolvers['createEnvironmentReading']
> = ({ input }) => {
  return db.environmentReading.create({ data: input })
}
