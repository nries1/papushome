import type { QueryResolvers } from 'types/graphql'

import { buildSystemPrompt } from 'src/lib/chatContext'

export const chatSystemPrompt: NonNullable<QueryResolvers['chatSystemPrompt']> = ({
  person,
}) => {
  return buildSystemPrompt(person ?? null)
}
