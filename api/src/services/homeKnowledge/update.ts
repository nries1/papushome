import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

// Mirrors the old behavior exactly: `embedding` is unconditionally overwritten,
// so an update call that omits it *clears* any previously stored embedding
// rather than leaving it untouched. Same foot-gun as the original dao.ts.
export const updateHomeKnowledge: NonNullable<
  MutationResolvers['updateHomeKnowledge']
> = async ({ id, input: { subject, category, fact, embedding } }) => {
  const vectorStr = embedding ? `[${embedding.join(',')}]` : null
  await db.$executeRaw`
    UPDATE home_knowledge
    SET subject = ${subject}, category = ${category}, fact = ${fact},
        embedding = ${vectorStr}::vector, updated_at = NOW()
    WHERE id = ${id}
  `
  return db.homeKnowledge.findUniqueOrThrow({ where: { id } })
}
