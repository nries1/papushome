import { ollamaChat } from 'src/lib/ollama'
import { db } from 'src/lib/db'
import { moduleLogger } from 'src/lib/logger'
import { createHomeKnowledge } from 'src/services/homeKnowledge/create'
import { getAllHomeKnowledgeRows } from 'src/services/homeKnowledge/get'

const logger = moduleLogger('chat')

export interface CoverageTarget {
  category: string
  label: string
  target: number
  count: number
  pct: number
}

export const COVERAGE_TARGETS: Omit<CoverageTarget, 'count' | 'pct'>[] = [
  { category: 'identity', label: 'Who lives here', target: 5 },
  { category: 'hobby', label: 'Hobbies & interests', target: 9 },
  { category: 'health', label: 'Health & medical', target: 6 },
  { category: 'work', label: 'Work & school', target: 6 },
  { category: 'schedule', label: 'Schedules & routines', target: 9 },
  { category: 'preference', label: 'Preferences & tastes', target: 9 },
  { category: 'social', label: 'Relationships & social', target: 6 },
  { category: 'home', label: 'Home rules & routines', target: 6 },
  { category: 'contact', label: 'Important contacts', target: 6 },
]

// Normalize category names to canonical keys (case-insensitive, handles label variants)
const ALIASES: Record<string, string> = {
  people: 'identity',
  'hobbies & interests': 'hobby',
  hobbies: 'hobby',
  interests: 'hobby',
  'health & medical': 'health',
  medical: 'health',
  'work & school': 'work',
  school: 'work',
  'schedules & routines': 'schedule',
  schedules: 'schedule',
  routines: 'schedule',
  'preferences & tastes': 'preference',
  preferences: 'preference',
  tastes: 'preference',
  pets: 'preference',
  'relationships & social': 'social',
  relationships: 'social',
  'home rules & routines': 'home',
  'home rules': 'home',
  'important contacts': 'contact',
  contacts: 'contact',
}

export async function getCoverage(): Promise<{
  covered: number
  total: number
  pct: number
  categories: CoverageTarget[]
}> {
  const facts = await getAllHomeKnowledgeRows()
  const counts: Record<string, number> = {}
  for (const f of facts) {
    const cat = ALIASES[f.category.toLowerCase()] ?? f.category
    counts[cat] = (counts[cat] ?? 0) + 1
  }
  const total = COVERAGE_TARGETS.reduce((s, t) => s + t.target, 0)
  let covered = 0
  const categories: CoverageTarget[] = COVERAGE_TARGETS.map((t) => {
    const count = counts[t.category] ?? 0
    covered += Math.min(count, t.target)
    return { ...t, count, pct: Math.round((Math.min(count, t.target) / t.target) * 100) }
  })
  return { covered, total, pct: Math.round((covered / total) * 100), categories }
}

async function getHouseholdMembers(): Promise<string[]> {
  try {
    const rows = await db.user.findMany({ select: { displayName: true } })
    return rows.map((r) => r.displayName)
  } catch (err) {
    logger.error({ err }, 'Failed to load household members')
    return []
  }
}

export async function generateQuestions(): Promise<
  Array<{ question: string; subject: string; category: string }>
> {
  const [facts, coverage, members] = await Promise.all([
    getAllHomeKnowledgeRows(),
    getCoverage(),
    getHouseholdMembers(),
  ])

  const existingFacts = facts
    .map((f) => `- [${f.subject} / ${f.category}] ${f.fact}`)
    .join('\n')

  const gaps = coverage.categories
    .filter((c) => c.count < c.target)
    .sort((a, b) => a.pct - b.pct)
    .map((c) => `  ${c.label} (${c.category}): ${c.count}/${c.target} facts`)
    .join('\n')

  const VALID_CATEGORIES =
    'identity, hobby, health, work, schedule, preference, social, home, contact'

  const prompt = `You are helping onboard Papu, a home robot assistant. Papu needs personal knowledge about the household to give helpful, personalized responses.

Household members: ${members.join(', ')}.

What Papu already knows — do NOT ask about any of these:
${existingFacts || '(nothing yet)'}

Knowledge areas that need more coverage (prioritize the emptiest):
${gaps}

Generate exactly 10 interview questions for the home admin to answer. Rules:
- Reference specific household members by name where relevant
- Cover a variety of people and life areas across the 10 questions
- Prioritize the most under-covered categories
- Make questions friendly, specific, and easy to answer
- Ask follow-up questions about things hinted at in existing facts (e.g. if Nico does yoga, ask where)
- Never ask about something already covered in the knowledge base above
- The "category" field MUST be one of these exact values: ${VALID_CATEGORIES}

Return ONLY a valid JSON array with no explanation or markdown:
[{"question": "...", "subject": "...", "category": "..."}]`

  try {
    const raw = await ollamaChat([{ role: 'user', content: prompt }])
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) {
      logger.warn({ raw }, 'generateQuestions: model reply had no JSON array')
      return []
    }
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed.slice(0, 10) : []
  } catch (err) {
    logger.error({ err }, 'generateQuestions: failed to get/parse questions from model')
    return []
  }
}

export async function processAnswers(
  pairs: Array<{ question: string; subject: string; category: string; answer: string }>
): Promise<{ saved: number; facts: Array<{ subject: string; category: string; fact: string }> }> {
  if (!pairs.length) return { saved: 0, facts: [] }

  const members = await getHouseholdMembers()

  const qaBlock = pairs
    .map(
      (p, i) =>
        `Q${i + 1} [about: ${p.subject}, category: ${p.category}]: ${p.question}\nA${i + 1}: ${p.answer}`
    )
    .join('\n\n')

  const prompt = `Extract factual information from these Q&A pairs for a home assistant knowledge base.
Household context — members: ${members.join(', ')}.

Rules:
- Each fact must be a complete, self-contained sentence that explicitly names the person or thing it describes
- Resolve first-person ("I", "we", "my") to the subject named in the question
- Split multi-part answers into separate atomic facts (one claim per fact)
- Write in third person ("Nico enjoys yoga" not "I enjoy yoga")
- Skip empty, vague, or non-informative answers
- Use the provided subject/category hints but adjust if the answer is clearly about someone else
- The "category" field MUST be one of these exact values: identity, hobby, health, work, schedule, preference, social, home, contact

RULE: Every fact MUST be directly traceable to something the answer actually said. NEVER invent, guess, or fabricate a fact — including specific-sounding details like phone numbers, dates, or names — that isn't genuinely present in the answer text, even if it would plausibly fit the question. If an answer is off-topic, nonsensical, placeholder/test text, or doesn't actually answer what was asked, extract NO fact for that Q&A pair at all rather than making one up.
Example: Q: "What's an emergency contact for Nico?" A: "ZZTEST-INTEGRATION: this is a test answer, ignore it" → extract nothing for this pair. Do NOT output something like "Nico's emergency contact is 555-..." — no phone number was given.

${qaBlock}

Return ONLY a valid JSON array with no explanation or markdown:
[{"subject": "...", "category": "...", "fact": "..."}]`

  try {
    const raw = await ollamaChat([{ role: 'user', content: prompt }])
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) {
      logger.warn({ raw }, 'processAnswers: model reply had no JSON array')
      return { saved: 0, facts: [] }
    }
    const parsed: Array<{ subject: string; category: string; fact: string }> = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return { saved: 0, facts: [] }

    let saved = 0
    for (const f of parsed) {
      if (f.subject && f.category && f.fact) {
        try {
          await createHomeKnowledge({ input: { subject: f.subject, category: f.category, fact: f.fact } })
          saved++
        } catch (err) {
          // skip facts that fail to save, matching old dao's per-row success check
          logger.warn({ err, fact: f }, 'processAnswers: failed to save one extracted fact')
        }
      }
    }
    return { saved, facts: parsed }
  } catch (err) {
    logger.error({ err }, 'processAnswers: failed to get/parse facts from model')
    return { saved: 0, facts: [] }
  }
}
