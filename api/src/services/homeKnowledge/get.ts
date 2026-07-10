import type { QueryResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export type HomeKnowledgeRow = {
  id: number
  subject: string
  category: string
  fact: string
  updatedAt: Date
}

// Plain (non-resolver-typed) helpers so library code (chatContext.ts,
// homeKnowledgeOnboarding.ts) can call the exact same queries and read
// fields off the results directly. GraphQL list-resolver return types make
// each array element individually `T | Promise<T>` (resolvers may resolve
// elements lazily), which breaks direct property access on `.map()`/indexing
// even after awaiting the outer call — see src/lib/mqtt.ts canWaterPlants
// for the same gotcha, caught by type-check not inspection.
export function getAllHomeKnowledgeRows() {
  return db.homeKnowledge.findMany({
    orderBy: [{ subject: 'asc' }, { category: 'asc' }],
  })
}

// `embedding` is an `Unsupported("vector(768)")` column, invisible to the
// Prisma Client query builder, so both the similarity ordering and the read
// of the column itself require raw SQL.
export function searchHomeKnowledgeRows(embedding: number[]) {
  const vectorStr = `[${embedding.join(',')}]`
  return db.$queryRaw<HomeKnowledgeRow[]>`
    SELECT id, subject, category, fact, updated_at AS "updatedAt"
    FROM home_knowledge
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorStr}::vector
    LIMIT 8
  `
}

export const homeKnowledge: NonNullable<QueryResolvers['homeKnowledge']> = () => {
  return getAllHomeKnowledgeRows()
}

export const searchHomeKnowledge: NonNullable<
  QueryResolvers['searchHomeKnowledge']
> = ({ embedding }) => {
  return searchHomeKnowledgeRows(embedding)
}
