import type { QueryResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const latestAiSummary: NonNullable<
  QueryResolvers['latestAiSummary']
> = () => {
  return db.aiSummary.findFirst({ orderBy: { timestamp: 'desc' } })
}
