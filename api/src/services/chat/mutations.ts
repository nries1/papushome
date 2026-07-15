import type { MutationResolvers } from 'types/graphql'

import { runChatTurn } from 'src/lib/chatContext'
import { summarizeSessionAsync } from 'src/lib/chatSummarizer'
import { ollamaChat } from 'src/lib/ollama'
import { createChatEval } from 'src/services/chatEvals/create'
import { createChatSession } from 'src/services/chatSessions/create'

export const sendChatMessage: NonNullable<
  MutationResolvers['sendChatMessage']
> = async ({ sessionKey, message, personName, system }) => {
  // Legacy path: no sessionKey, one-shot context built from the old `system` param
  if (!sessionKey) {
    const msgs: Array<{ role: string; content: string }> = []
    if (system) msgs.push({ role: 'system', content: system })
    msgs.push({ role: 'user', content: message })
    const reply = await ollamaChat(msgs)
    return { reply, evalId: null }
  }

  const t0 = Date.now()
  const reply = await runChatTurn(sessionKey, message, personName ?? null)
  const responseTimeMs = Date.now() - t0
  const evalResult = await createChatEval({
    input: { sessionKey, question: message, response: reply, responseTimeMs },
  })
  return { reply, evalId: evalResult.id }
}

export const startChatSession: NonNullable<
  MutationResolvers['startChatSession']
> = async ({ sessionKey, personName, prevSessionKey }) => {
  const session = await createChatSession({ input: { sessionKey, personName } })
  if (prevSessionKey) summarizeSessionAsync(prevSessionKey)
  return session
}
