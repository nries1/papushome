// ---------------------------------------------------------------------------
// Background session summarizer (fire-and-forget). Split out of
// chatContext.ts (see production_ready.md's "chatContext.ts is a god-file"
// note) to separate it from turn-by-turn orchestration.
// ---------------------------------------------------------------------------

import { ollamaChat } from 'src/lib/ollama'
import { getChatMessagesForSession } from 'src/services/chatMessages/get'
import { setChatSessionSummary } from 'src/services/chatSessions/update'

export function summarizeSessionAsync(sessionKey: string): void {
  getChatMessagesForSession(sessionKey)
    .then((messages) => {
      if (messages.length < 2) return
      const transcript = messages
        .map((m) => `${m.role === 'user' ? 'Human' : 'Papu'}: ${m.content}`)
        .join('\n')
      return ollamaChat([
        {
          role: 'system',
          content:
            'You are a summarizer. Write a 1–3 sentence summary of the conversation covering only things that were done or confirmed (actions taken, facts stated). ' +
            'Do NOT include anything the assistant said it did not know, could not do, or needed to look up. ' +
            'Do NOT include phrases like "Papu does not know", "information not available", "suggested using a search tool", or any statement of ignorance or failure. ' +
            'Be factual and concise.',
        },
        {
          role: 'user',
          content: `Summarize this conversation:\n\n${transcript}`,
        },
      ])
    })
    .then((summary) => {
      if (summary) return setChatSessionSummary({ sessionKey, summary })
    })
    .catch(() => {})
}
