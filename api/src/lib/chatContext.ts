import { ollamaChat, ollamaChatWithTools, getEmbedding } from 'src/lib/ollama'
import type { OllamaToolCall } from 'src/lib/ollama'
import { waterPlants, getLightEntities, controlLight } from 'src/lib/homeActions'
import type { LightCommand } from 'src/lib/homeActions'
import { getCalendarEvents, getDOECalendar, addCalendarEvent } from 'src/lib/calendar'
import { searchHomeKnowledgeRows } from 'src/services/homeKnowledge/get'
import { createHomeKnowledge } from 'src/services/homeKnowledge/create'
import { updateHomeKnowledge } from 'src/services/homeKnowledge/update'
import { deleteHomeKnowledge } from 'src/services/homeKnowledge/delete'
import { getRecentChatSessionRows } from 'src/services/chatSessions/get'
import { getChatMessagesForSession } from 'src/services/chatMessages/get'
import { appendChatMessage } from 'src/services/chatMessages/create'
import { setChatSessionSummary } from 'src/services/chatSessions/update'
import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const SEARCH_TOOL = {
  type: 'function',
  function: {
    name: 'search_knowledge',
    description:
      'Search the home knowledge base for facts about household members, devices, or the home.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search terms, e.g. "Arlo school" or "Nico work"',
        },
      },
      required: ['query'],
    },
  },
}

const ACTION_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'water_plants',
      description: 'Start watering all configured plants.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_lights',
      description:
        'Get available smart lights and their current state. Call this before control_light to find entity_ids.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'control_light',
      description:
        'Control smart lights. Call list_lights first to get entity_ids if you do not already have them.',
      parameters: {
        type: 'object',
        properties: {
          entity_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'One or more light entity_ids to control.',
          },
          action: { type: 'string', enum: ['turn_on', 'turn_off'] },
          brightness_pct: {
            type: 'number',
            description: 'Brightness 1–100. Only for turn_on.',
          },
          rgb_color: {
            type: 'array',
            items: { type: 'number' },
            description: '[r, g, b] each 0–255. Only for turn_on.',
          },
          kelvin: {
            type: 'number',
            description: 'Color temperature in Kelvin. Only for turn_on.',
          },
        },
        required: ['entity_ids', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_calendar',
      description:
        "Fetch upcoming calendar events for a household member. Use when asked about someone's schedule, appointments, plans, or what they have coming up.",
      parameters: {
        type: 'object',
        properties: {
          person: {
            type: 'string',
            description: 'Name of the person, e.g. "Nico" or "Avalon".',
          },
          days: {
            type: 'number',
            description: 'How many days ahead to look. Default 7.',
          },
        },
        required: ['person'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_doe_calendar',
      description:
        'Fetch the full NYC DOE school calendar for the current school year — holidays, closures, parent-teacher conferences, early dismissals, first/last day. Use for any question about school schedules, including dates months away.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_calendar_event',
      description:
        'Add a new event to the primary Google Calendar. Use when the user asks to add, create, or schedule an event.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title.' },
          start: {
            type: 'string',
            description: 'Start datetime in ISO 8601, e.g. "2026-07-04T18:00:00".',
          },
          end: {
            type: 'string',
            description: 'End datetime in ISO 8601, e.g. "2026-07-04T19:00:00".',
          },
          description: {
            type: 'string',
            description: 'Optional event notes or description.',
          },
        },
        required: ['title', 'start', 'end'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_yoga_class',
      description:
        'Book an in-person yoga class at Y7 Studio. Use when the user asks to book, reserve, or sign up for a yoga class.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'ISO date string, e.g. "2026-07-04"',
          },
          class_name: {
            type: 'string',
            description:
              'Class type only, e.g. "WeFlowHard" or "SCULPT". Do not include teacher name. Defaults to "WeFlowHard" if not specified.',
          },
          preferred_time: {
            type: 'string',
            description: 'Optional preferred time, e.g. "7:00 PM"',
          },
        },
        required: ['date', 'class_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_tabata_class',
      description:
        'Book a class at Tabata Ultimate Fitness. Use when the user asks to book, reserve, or sign up for a Tabata class.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'ISO date string, e.g. "2026-07-04"',
          },
          class_name: {
            type: 'string',
            description: 'Class name, e.g. "Tabata". Defaults to "Tabata" if not specified.',
          },
          preferred_time: {
            type: 'string',
            description: 'Optional preferred time, e.g. "7:00 AM"',
          },
        },
        required: ['date', 'class_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_knowledge',
      description:
        'Add, update, or delete a fact in the home knowledge base. Use when the user explicitly asks to remember, update, or forget something.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'update', 'delete'] },
          id: {
            type: 'number',
            description: 'Fact ID — required for update and delete.',
          },
          subject: {
            type: 'string',
            description: 'The person or thing the fact is about.',
          },
          category: {
            type: 'string',
            enum: [
              'identity',
              'hobby',
              'health',
              'work',
              'schedule',
              'preference',
              'social',
              'home',
              'contact',
            ],
          },
          fact: {
            type: 'string',
            description: 'Complete third-person sentence, e.g. "Arlo dislikes broccoli."',
          },
        },
        required: ['action'],
      },
    },
  },
]

// When pre-search already injected facts, omit search_knowledge so the model
// doesn't call it redundantly. Offer it only when pre-search found nothing.
function buildTools(hasPreSearchHits: boolean): object[] {
  return hasPreSearchHits ? ACTION_TOOLS : [SEARCH_TOOL, ...ACTION_TOOLS]
}

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'search_knowledge': {
      const embedding = await getEmbedding(args.query as string)
      const results = await searchHomeKnowledgeRows(embedding)
      if (!results.length) return 'No matching facts found.'
      return results
        .map((r) => `[id:${r.id}] [${r.subject} / ${r.category}] ${r.fact}`)
        .join('\n')
    }

    case 'list_lights': {
      const lights = await getLightEntities()
      const available = lights.filter((l) => l.state !== 'unavailable')
      if (!available.length) return 'No smart lights are configured or available.'
      return available
        .map(
          (l) =>
            `${l.entity_id} (${l.friendly_name}): ${l.state}${l.brightness_pct !== undefined ? ` ${l.brightness_pct}%` : ''}`
        )
        .join('\n')
    }

    case 'get_calendar': {
      return await getCalendarEvents(args.person as string, args.days as number | undefined)
    }

    case 'get_doe_calendar': {
      return await getDOECalendar()
    }

    case 'add_calendar_event': {
      try {
        return await addCalendarEvent(
          args.title as string,
          args.start as string,
          args.end as string,
          args.description as string | undefined
        )
      } catch (err) {
        return `Failed to add event: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    case 'book_tabata_class': {
      if (!args.date) {
        return 'Cannot book: date is required. Ask the user to clarify.'
      }
      try {
        const res = await fetch('http://web-agents:3001/book-tabata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: args.date,
            className: args.class_name || 'Tabata',
            preferredTime: args.preferred_time,
          }),
        })
        const json = (await res.json()) as { success: boolean; message: string }
        return json.message ?? (json.success ? 'Booked.' : 'Booking failed.')
      } catch (err) {
        return `Booking service error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    case 'book_yoga_class': {
      if (!args.date) {
        return 'Cannot book: date is required. Ask the user to clarify.'
      }
      try {
        const res = await fetch('http://web-agents:3001/book-yoga', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: args.date,
            className: args.class_name || 'WeFlowHard',
            preferredTime: args.preferred_time,
          }),
        })
        const json = (await res.json()) as { success: boolean; message: string }
        return json.message ?? (json.success ? 'Booked.' : 'Booking failed.')
      } catch (err) {
        return `Booking service error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    case 'water_plants': {
      const result = await waterPlants()
      return result.summary
    }

    case 'control_light': {
      const cmd: LightCommand = {
        entity_ids: args.entity_ids as string[],
        action: args.action as 'turn_on' | 'turn_off',
      }
      if (args.brightness_pct !== undefined) cmd.brightness_pct = args.brightness_pct as number
      if (args.rgb_color) cmd.rgb_color = args.rgb_color as [number, number, number]
      if (args.kelvin) cmd.kelvin = args.kelvin as number
      const result = await controlLight(cmd)
      return result.summary
    }

    case 'update_knowledge': {
      const action = args.action as string
      if (action === 'add') {
        const embedding = await getEmbedding(args.fact as string)
        await createHomeKnowledge({
          input: {
            subject: args.subject as string,
            category: args.category as string,
            fact: args.fact as string,
            embedding,
          },
        })
        return `Added: "${args.fact}"`
      } else if (action === 'update') {
        const embedding = await getEmbedding(args.fact as string)
        await updateHomeKnowledge({
          id: args.id as number,
          input: {
            subject: args.subject as string,
            category: args.category as string,
            fact: args.fact as string,
            embedding,
          },
        })
        return `Updated fact ${args.id}: "${args.fact}"`
      } else if (action === 'delete') {
        await deleteHomeKnowledge({ id: args.id as number })
        return `Deleted fact ${args.id}.`
      }
      return 'Unknown action.'
    }

    default:
      return `Unknown tool: ${name}`
  }
}

// ---------------------------------------------------------------------------
// System prompt — lean by design, model fetches knowledge via search_knowledge
// ---------------------------------------------------------------------------

async function getRecentSessionSummaryLines(limit: number): Promise<string[]> {
  try {
    const rows = await getRecentChatSessionRows(limit)
    return rows
      .filter((r) => r.summary)
      .map((r) => {
        const date = r.startedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const who = r.personName ? ` (with ${r.personName})` : ''
        return `[${date}${who}]: ${r.summary}`
      })
  } catch {
    return []
  }
}

export async function buildSystemPrompt(personName: string | null): Promise<string> {
  const [summaries, users] = await Promise.all([
    getRecentSessionSummaryLines(3),
    db.user.findMany().catch(() => []),
  ])

  const sections: string[] = []

  sections.push(
    `You are Papu, a home robot assistant. Answer in one sentence. No emojis. If you don't have information to answer a question, say "I don't know" — never guess or invent facts. Never mention where your information came from. Never volunteer what you don't know. Do not suggest actions unless asked. Use tools — do not describe what you would do, just do it.\n\n` +
      `RULE: For any question about a person (their job, schedule, preferences, health, hobbies, contacts, or personal details), you MUST call search_knowledge before answering.\n\n` +
      `RULE: When asked to add or schedule a calendar event, call add_calendar_event. If the user doesn't provide a start time, ask for it. Infer a 1-hour duration if no end time is given.\n\n` +
      `RULE: NEVER tell the user that an action was completed (booked, added, updated, turned on/off, etc.) unless a tool returned a result in THIS conversation confirming it. The "Recent conversation history" section contains summaries of past sessions — they are records of what happened before, not proof that the current request succeeded. You MUST call the appropriate tool before confirming any action.\n\n` +
      `Examples of correct behavior:\n` +
      `Q: "where do I work?" → A: "You work at Meta."\n` +
      `Q: "what time is it?" → A: "It's 3:42 PM."\n` +
      `Q: "what are my hobbies?" → A: "You enjoy salsa dancing and yoga."\n` +
      `Q: "turn on the lights" → [call control_light, then say] "Done."\n` +
      `Q: "book me a yoga class at noon" → ask "What date?" then call book_yoga_class once you have it.\n` +
      `Q: "book me a yoga class on Friday at noon" → call book_yoga_class immediately.\n` +
      `NEVER say phrases like "based on the available information", "according to the provided details", "based on the knowledge base", "I don't have details about", or "you may want to contact". These are wrong:\n` +
      `WRONG: "Based on the available information, you work at Meta. You started working there in September 2025 according to the provided details."\n` +
      `RIGHT: "You work at Meta."`
  )

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'full',
    timeStyle: 'short',
  })
  sections.push(`The current date and time is ${now}.`)

  if (users.length > 0) {
    const peopleLines = users.map((u) => `- ${u.displayName} (${u.email})`).join('\n')
    sections.push(`== People who live here ==\n${peopleLines}`)
  }

  if (summaries.length > 0) {
    sections.push(`== Recent conversation history ==\n${summaries.join('\n')}`)
  }

  const seeing = personName
    ? `You are speaking with ${personName}. When they say "I", "me", or "my", they mean ${personName}.`
    : `I cannot identify who I am looking at right now.`
  sections.push(seeing)

  return sections.join('\n\n')
}

// ---------------------------------------------------------------------------
// Chat turn
// ---------------------------------------------------------------------------

type AnyMessage = {
  role: string
  content: string
  tool_calls?: OllamaToolCall[]
  tool_call_id?: string
}

const TOOL_NAMES = new Set([
  'water_plants',
  'list_lights',
  'control_light',
  'update_knowledge',
  'book_yoga_class',
  'book_tabata_class',
  'add_calendar_event',
])

function parseTextToolCall(content: string): OllamaToolCall | null {
  const match = content.trim().match(/^(\w+)\((\{[\s\S]*\})\)$/)
  if (!match) return null
  if (!TOOL_NAMES.has(match[1])) return null
  try {
    return {
      id: 'text-0',
      function: { name: match[1], arguments: JSON.parse(match[2]) },
    }
  } catch {
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
  const SYSTEM_CATEGORIES = new Set(['system', 'device', 'room', 'mqtt', 'access', 'ai', 'people'])
  const personalHits = knowledgeHits.filter((r) => !SYSTEM_CATEGORIES.has(r.category.toLowerCase()))

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
      await appendChatMessage({ sessionKey, role: 'assistant', content: response.content })
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
      logger.info({ args: tc.function.arguments, result }, `tool:${tc.function.name}`)
      messages.push({ role: 'tool', content: result, tool_call_id: tc.id })
    }
  }

  const fallback = await ollamaChat(messages)
  await appendChatMessage({ sessionKey, role: 'assistant', content: fallback })
  return fallback
}

// ---------------------------------------------------------------------------
// Session summarizer (fire-and-forget)
// ---------------------------------------------------------------------------

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
