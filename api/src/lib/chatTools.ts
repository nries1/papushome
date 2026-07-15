// ---------------------------------------------------------------------------
// Tool schema definitions — the JSON-schema tool list exposed to Ollama's
// tool-calling API. Split out of chatContext.ts (see production_ready.md's
// "chatContext.ts is a god-file" note) so schema changes don't require
// touching dispatch/orchestration code and vice versa.
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
            description:
              'Start datetime in ISO 8601, e.g. "2026-07-04T18:00:00".',
          },
          end: {
            type: 'string',
            description:
              'End datetime in ISO 8601, e.g. "2026-07-04T19:00:00".',
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
            description:
              'Class name, e.g. "Tabata". Defaults to "Tabata" if not specified.',
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
            description:
              'Complete third-person sentence, e.g. "Arlo dislikes broccoli."',
          },
        },
        required: ['action'],
      },
    },
  },
]

// When pre-search already injected facts, omit search_knowledge so the model
// doesn't call it redundantly. Offer it only when pre-search found nothing.
export function buildTools(hasPreSearchHits: boolean): object[] {
  return hasPreSearchHits ? ACTION_TOOLS : [SEARCH_TOOL, ...ACTION_TOOLS]
}

// Names the model is allowed to invoke via the qwen2.5:7b text-format
// fallback — see parseTextToolCall in chatContext.ts.
export const TOOL_NAMES = new Set([
  'water_plants',
  'list_lights',
  'control_light',
  'update_knowledge',
  'book_yoga_class',
  'book_tabata_class',
  'add_calendar_event',
])
