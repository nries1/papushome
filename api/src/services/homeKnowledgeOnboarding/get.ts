import type { QueryResolvers } from 'types/graphql'

import { getCoverage } from 'src/lib/homeKnowledgeOnboarding'

export const homeKnowledgeCoverage: NonNullable<
  QueryResolvers['homeKnowledgeCoverage']
> = () => {
  return getCoverage()
}
