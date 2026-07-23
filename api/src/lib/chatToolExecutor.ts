// ---------------------------------------------------------------------------
// Tool executor — dispatches a tool call named by the model to the real
// implementation and returns the string result fed back to it. Split out of
// chatContext.ts (see production_ready.md's "chatContext.ts is a god-file"
// note) to separate dispatch from orchestration/prompt-building.
// ---------------------------------------------------------------------------

import {
  getCalendarEvents,
  getDOECalendar,
  addCalendarEvent,
} from 'src/lib/calendar'
import {
  waterPlants,
  getLightEntities,
  controlLight,
} from 'src/lib/homeActions'
import type { LightCommand } from 'src/lib/homeActions'
import { moduleLogger } from 'src/lib/logger'
import { getEmbedding } from 'src/lib/ollama'
import { createHomeKnowledge } from 'src/services/homeKnowledge/create'
import { deleteHomeKnowledge } from 'src/services/homeKnowledge/delete'
import { searchHomeKnowledgeRows } from 'src/services/homeKnowledge/get'
import { updateHomeKnowledge } from 'src/services/homeKnowledge/update'

const logger = moduleLogger('chat')

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    return await executeToolInner(name, args)
  } catch (err) {
    // Without this, an unhandled throw here (e.g. the DB or Ollama's embedding
    // endpoint being down) propagates out of runChatTurn entirely — the
    // mutation 500s with no relayable text, and the user's turn is silently
    // dropped (no assistant reply ever gets appended to history). Several
    // tools below already caught their own known failure modes (booking, HA
    // light control, calendar) per production_ready.md Issue #8; this catches
    // the rest (search_knowledge, water_plants, update_knowledge) uniformly
    // so no tool can take down the whole turn.
    const message = err instanceof Error ? err.message : String(err)
    logger.error({ err, tool: name, args }, `Tool "${name}" threw`)
    return `Tool "${name}" failed: ${message}`
  }
}

async function executeToolInner(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
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
      if (!available.length)
        return 'No smart lights are configured or available.'
      return available
        .map(
          (l) =>
            `${l.entity_id} (${l.friendly_name}): ${l.state}${l.brightness_pct !== undefined ? ` ${l.brightness_pct}%` : ''}`
        )
        .join('\n')
    }

    case 'get_calendar': {
      return await getCalendarEvents(
        args.person as string,
        args.days as number | undefined
      )
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
        if (json.success) return json.message ?? 'Booked.'
        const failMessage = json.message ?? 'Booking failed.'
        return failMessage.startsWith('ERROR') ? failMessage : `ERROR: ${failMessage}`
      } catch (err) {
        return `ERROR: Booking service error: ${err instanceof Error ? err.message : String(err)}`
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
        if (json.success) return json.message ?? 'Booked.'
        const failMessage = json.message ?? 'Booking failed.'
        return failMessage.startsWith('ERROR') ? failMessage : `ERROR: ${failMessage}`
      } catch (err) {
        return `ERROR: Booking service error: ${err instanceof Error ? err.message : String(err)}`
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
      if (args.brightness_pct !== undefined)
        cmd.brightness_pct = args.brightness_pct as number
      if (args.rgb_color)
        cmd.rgb_color = args.rgb_color as [number, number, number]
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
