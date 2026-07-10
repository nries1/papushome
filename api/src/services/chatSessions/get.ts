import type {
  QueryResolvers,
  ChatSessionRelationResolvers,
} from 'types/graphql'

import { db } from 'src/lib/db'

export const chatSession: NonNullable<QueryResolvers['chatSession']> = ({
  sessionKey,
}) => {
  return db.chatSession.findUnique({ where: { sessionKey } })
}

// Plain helper so library code (chatContext.ts) can read fields off each row
// directly — see the comment on getAllHomeKnowledgeRows in
// src/services/homeKnowledge/get.ts for why list resolvers can't be reused
// for that.
export function getRecentChatSessionRows(limit: number) {
  return db.chatSession.findMany({
    where: { summary: { not: null } },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })
}

export const recentChatSessions: NonNullable<
  QueryResolvers['recentChatSessions']
> = ({ limit }) => {
  return getRecentChatSessionRows(limit ?? 5)
}

export const ChatSession: ChatSessionRelationResolvers = {
  messages: (_args, { root }) =>
    db.chatSession.findUnique({ where: { id: root.id } }).messages(),
}
