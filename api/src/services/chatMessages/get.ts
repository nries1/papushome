import { db } from 'src/lib/db'

// No standalone `chatMessages` GraphQL query by design — covered via
// `chatSession(sessionKey) { messages { ... } }`. This plain helper exists
// for library code (chatContext.ts) that needs the ordered list directly
// without going through a list-resolver return type (see the comment on
// getAllHomeKnowledgeRows in src/services/homeKnowledge/get.ts).
export function getChatMessagesForSession(sessionKey: string) {
  return db.chatMessage.findMany({
    where: { session: { sessionKey } },
    orderBy: { timestamp: 'asc' },
  })
}
