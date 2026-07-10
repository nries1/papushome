import type { MutationResolvers } from 'types/graphql'

import { generateQuestions, processAnswers } from 'src/lib/homeKnowledgeOnboarding'

export const generateHomeKnowledgeQuestions: NonNullable<
  MutationResolvers['generateHomeKnowledgeQuestions']
> = () => {
  return generateQuestions()
}

export const processHomeKnowledgeAnswers: NonNullable<
  MutationResolvers['processHomeKnowledgeAnswers']
> = ({ pairs }) => {
  const filled = pairs.filter((p) => p.answer?.trim())
  if (!filled.length) return { saved: 0, facts: [] }
  return processAnswers(filled)
}
