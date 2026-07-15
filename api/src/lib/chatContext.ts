import { buildSystemPrompt } from 'src/lib/chatSystemPrompt'
import { executeTool } from 'src/lib/chatToolExecutor'
import { buildTools, TOOL_NAMES } from 'src/lib/chatTools'
import { moduleLogger } from 'src/lib/logger'
import type { OllamaToolCall } from 'src/lib/ollama'
import { ollamaChat, ollamaChatWithTools } from 'src/lib/ollama'
import { getEmbedding } from 'src/lib/ollama'
import { appendChatMessage } from 'src/services/chatMessages/create'
import { getChatMessagesForSession } from 'src/services/chatMessages/get'
import { searchHomeKnowledgeRows } from 'src/services/homeKnowledge/get'

const logger = moduleLogger('chat')

// ---------------------------------------------------------------------------
// Chat turn
// ---------------------------------------------------------------------------

type AnyMessage = {
  role: string
  content: string
  tool_calls?: OllamaToolCall[]
  tool_call_id?: string
}

function parseTextToolCall(content: string): OllamaToolCall | null {
  const match = content.trim().match(/^(\w+)\((\{[\s\S]*\})\)$/)
  if (!match) return null
  if (!TOOL_NAMES.has(match[1])) return null
  try {
    return {
      id: 'text-0',
      function: { name: match[1], arguments: JSON.parse(match[2]) },
    }
  } catch (err) {
    // Expected sometimes: the model can emit a call-shaped string with
    // malformed JSON args. Debug, not error — falls back to no tool call.
    logger.debug({ err, content }, 'Malformed text-format tool call, ignoring')
    return null
  }
}

export async function runChatTurn(
  sessionKey: string,
  userMessage: string,
  personName: string | null
): Promise<string> {
  await appendChatMessage({ sessionKey, role: 'user', content: userMessage })

  const [systemPrompt, history, queryEmbedding] = await Promise.all([
    buildSystemPrompt(personName),
    getChatMessagesForSession(sessionKey),
    getEmbedding(userMessage),
  ])

  const knowledgeHits = await searchHomeKnowledgeRows(queryEmbedding)
  const SYSTEM_CATEGORIES = new Set([
    'system',
    'device',
    'room',
    'mqtt',
    'access',
    'ai',
    'people',
  ])
  const personalHits = knowledgeHits.filter(
    (r) => !SYSTEM_CATEGORIES.has(r.category.toLowerCase())
  )

  let fullPrompt = systemPrompt
  if (personalHits.length > 0) {
    const facts = personalHits.map((r) => `- ${r.fact}`).join('\n')
    fullPrompt += `\n\n== Relevant facts ==\n${facts}`
  }

  const messages: AnyMessage[] = [
    { role: 'system', content: fullPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ]

  const tools = buildTools(personalHits.length > 0)

  for (let round = 0; round < 5; round++) {
    const response = await ollamaChatWithTools(messages, tools)

    // qwen2.5:7b sometimes outputs tool calls as plain text instead of structured tool_calls
    if (!response.tool_calls?.length && response.content) {
      const textCall = parseTextToolCall(response.content)
      if (textCall) response.tool_calls = [textCall]
    }

    if (!response.tool_calls?.length) {
      await appendChatMessage({
        sessionKey,
        role: 'assistant',
        content: response.content,
      })
      return response.content
    }

    logger.info(
      {
        calls: response.tool_calls.map((tc) => ({
          name: tc.function.name,
          args: tc.function.arguments,
        })),
      },
      'tool calls'
    )

    messages.push({
      role: 'assistant',
      content: response.content ?? '',
      tool_calls: response.tool_calls,
    })

    for (const tc of response.tool_calls) {
      const result = await executeTool(tc.function.name, tc.function.arguments)
      logger.info(
        { args: tc.function.arguments, result },
        `tool:${tc.function.name}`
      )
      messages.push({ role: 'tool', content: result, tool_call_id: tc.id })
    }
  }

  const fallback = await ollamaChat(messages)
  await appendChatMessage({ sessionKey, role: 'assistant', content: fallback })
  return fallback
}
