import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const updateChatEvalRating: NonNullable<
  MutationResolvers['updateChatEvalRating']
> = ({ id, field, value }) => {
  return db.chatEval.update({
    where: { id },
    data: field === 'QUALITY' ? { quality: value } : { correctness: value },
  })
}
