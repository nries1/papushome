import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const setChatSessionSummary: NonNullable<
  MutationResolvers['setChatSessionSummary']
> = ({ sessionKey, summary }) => {
  return db.chatSession.update({
    where: { sessionKey },
    data: { summary, endedAt: new Date() },
  })
}
