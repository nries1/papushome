import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const createHomeKnowledge: NonNullable<
  MutationResolvers['createHomeKnowledge']
> = async ({ input: { subject, category, fact, embedding } }) => {
  const vectorStr = embedding ? `[${embedding.join(',')}]` : null
  const rows = await db.$queryRaw<{ id: number }[]>`
    INSERT INTO home_knowledge (subject, category, fact, embedding, updated_at)
    VALUES (${subject}, ${category}, ${fact}, ${vectorStr}::vector, NOW())
    RETURNING id
  `
  return db.homeKnowledge.findUniqueOrThrow({ where: { id: rows[0].id } })
}
