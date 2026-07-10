import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const deleteHomeKnowledge: NonNullable<
  MutationResolvers['deleteHomeKnowledge']
> = ({ id }) => {
  return db.homeKnowledge.delete({ where: { id } })
}
