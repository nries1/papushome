import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const createChatEval: NonNullable<
  MutationResolvers['createChatEval']
> = ({ input }) => {
  return db.chatEval.create({ data: input })
}
