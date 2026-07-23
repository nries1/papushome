// ---------------------------------------------------------------------------
// System-prompt construction. Split out of chatContext.ts (see
// production_ready.md's "chatContext.ts is a god-file" note) to separate
// prompt-building from tool dispatch/orchestration.
// ---------------------------------------------------------------------------

import { db } from 'src/lib/db'
import { moduleLogger } from 'src/lib/logger'
import { getRecentChatSessionRows } from 'src/services/chatSessions/get'

const logger = moduleLogger('chat')

async function getRecentSessionSummaryLines(limit: number): Promise<string[]> {
  try {
    const rows = await getRecentChatSessionRows(limit)
    return rows
      .filter((r) => r.summary)
      .map((r) => {
        const date = r.startedAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
        const who = r.personName ? ` (with ${r.personName})` : ''
        return `[${date}${who}]: ${r.summary}`
      })
  } catch (err) {
    logger.error({ err }, 'Failed to load recent session summaries')
    return []
  }
}

export async function buildSystemPrompt(
  personName: string | null
): Promise<string> {
  const [summaries, users] = await Promise.all([
    getRecentSessionSummaryLines(3),
    db.user.findMany().catch(() => []),
  ])

  const sections: string[] = []

  sections.push(
    `You are Papu, a home robot assistant. Answer in one sentence. No emojis. If you don't have information to answer a question, say "I don't know" — never guess or invent facts. Never mention where your information came from. Never volunteer what you don't know. Do not suggest actions unless asked. Use tools — do not describe what you would do, just do it.\n\n` +
      `RULE: For any question about a person (their job, schedule, preferences, health, hobbies, contacts, or personal details), you MUST call search_knowledge before answering.\n\n` +
      `RULE: When asked to add or schedule a calendar event, call add_calendar_event. If the user doesn't provide a start time, ask for it. Infer a 1-hour duration if no end time is given.\n\n` +
      `RULE: NEVER tell the user that an action was completed (booked, added, updated, turned on/off, etc.) unless a tool returned a result in THIS conversation confirming it. The "Recent conversation history" section contains summaries of past sessions — they are records of what happened before, not proof that the current request succeeded. You MUST call the appropriate tool before confirming any action. If a tool's result starts with "ERROR", the action FAILED — tell the user plainly that it didn't work and why. Never say an action succeeded and also mention an error or issue in the same reply — pick one, whichever the tool result actually says.\n\n` +
      `RULE: If asked who you are speaking with, who the user is, or anything that requires identifying the person by sight, answer ONLY based on the "You are speaking with" line below. If that line instead says you cannot identify who you're looking at, you MUST say so plainly (e.g. "I'm not sure who I'm looking at right now") — NEVER guess or infer an identity from the "People who live here" list, past conversation history, or a name mentioned elsewhere in this prompt. Knowing facts about a person is not the same as recognizing who is currently in front of you.\n\n` +
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
    const peopleLines = users
      .map((u) => `- ${u.displayName} (${u.email})`)
      .join('\n')
    sections.push(`== People who live here ==\n${peopleLines}`)
  }

  if (summaries.length > 0) {
    sections.push(`== Recent conversation history ==\n${summaries.join('\n')}`)
  }

  const seeing = personName
    ? `You are speaking with ${personName}. When they say "I", "me", or "my", they mean ${personName}.`
    : `I cannot identify who I am looking at right now. I do not know who this is, even if their name appears elsewhere in this prompt.`
  sections.push(seeing)

  return sections.join('\n\n')
}
