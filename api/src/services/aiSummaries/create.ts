import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const createAiSummary: NonNullable<
  MutationResolvers['createAiSummary']
> = ({ input }) => {
  return db.aiSummary.create({ data: input })
}
