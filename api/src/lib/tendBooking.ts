// ---------------------------------------------------------------------------
// Dental booking via tend-mcp (github.com/nries1/tend-mcp), imported here as
// a plain library — not spawned as an MCP server/subprocess. papu's chat
// loop runs on Ollama, which has no MCP client, so going through the MCP
// protocol layer just to immediately unwrap it back into a local function
// call would add a subprocess for no benefit to this one consumer. Same
// reasoning, same shape as mindbody.ts.
//
// tend-mcp is a pure-ESM package; this api workspace compiles to CommonJS
// (RedwoodJS convention). Under Node16/NodeNext module resolution, tsc
// rejects *any* static reference to an ESM-only module from a CJS file —
// including type-only imports and inline `import('tend-mcp').X` type
// queries, not just value imports — so the runtime binding is loaded via
// dynamic import() inside getClient(), and the shape used elsewhere in this
// file is a local structural type instead of importing TendClient's type
// directly (kept in sync by hand with tend-mcp's actual return shapes).
// ---------------------------------------------------------------------------

import { moduleLogger } from 'src/lib/logger'

const logger = moduleLogger('tend')

const DEFAULT_STUDIO = process.env.TEND_STUDIO || 'park-slope'
const DEFAULT_SERVICE = 'CLNCHK' // routine cleaning/exam — this household's usual visit type

interface Appointment {
  id: string
  status?: string
  serviceType: string
  studio: string
  startsAt: string
  endsAt: string
}

interface TimeSlot {
  operatoryId: string
  providerId: string
  startsAt: string
  endsAt: string
}

interface DentalClient {
  listAppointments(): Promise<Appointment[]>
  searchAvailability(params: {
    studio: string
    service: string
    startsAt: string
    endsAt: string
  }): Promise<TimeSlot[]>
  bookAppointment(params: {
    studio: string
    service: string
    startsAt: string
    endsAt: string
    operatoryId: string
    providerId: string
  }): Promise<Appointment>
}

let cachedClient: DentalClient | null = null
async function getClient(): Promise<DentalClient> {
  if (!cachedClient) {
    const { TendClient, configFromEnv } = await import('tend-mcp')
    cachedClient = new TendClient(configFromEnv())
  }
  return cachedClient
}

// Parses "7:00 PM" / "19:00" into minutes since midnight, or null.
function parseTimeOfDay(text: string): number | null {
  const match = text.match(/(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  const meridiem = match[3]?.toLowerCase()
  if (meridiem === 'pm' && hour !== 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  return hour * 60 + minute
}

function isoTimeOfDay(iso: string): number {
  const match = iso.match(/T(\d{2}):(\d{2})/)
  if (!match) return 0
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

function formatTime(iso: string): string {
  const minutes = isoTimeOfDay(iso)
  const hour24 = Math.floor(minutes / 60)
  const minute = minutes % 60
  const meridiem = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`
}

export async function listDentalAppointments(): Promise<string> {
  try {
    const client = await getClient()
    const appointments = await client.listAppointments()
    const upcoming = appointments
      .filter((a) => new Date(a.startsAt).getTime() > Date.now())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    if (!upcoming.length) return 'No upcoming dental appointments.'
    return upcoming
      .map(
        (a) =>
          `${a.startsAt.slice(0, 10)} at ${formatTime(a.startsAt)} — ${a.serviceType} at ${a.studio}`
      )
      .join('\n')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error({ err }, 'Failed to list dental appointments')
    return `ERROR: ${message}`
  }
}

export async function bookDentalAppointment(
  date: string,
  service = DEFAULT_SERVICE,
  preferredTime?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const client = await getClient()
    const slots = await client.searchAvailability({
      studio: DEFAULT_STUDIO,
      service,
      startsAt: `${date}T00:00:00`,
      endsAt: `${date}T23:59:59`,
    })
    if (!slots.length) {
      return {
        success: false,
        message: `ERROR: No available dental appointments on ${date}.`,
      }
    }

    const preferredMinutes = preferredTime
      ? parseTimeOfDay(preferredTime)
      : null
    const sorted = [...slots].sort((a, b) =>
      preferredMinutes !== null
        ? Math.abs(isoTimeOfDay(a.startsAt) - preferredMinutes) -
          Math.abs(isoTimeOfDay(b.startsAt) - preferredMinutes)
        : a.startsAt.localeCompare(b.startsAt)
    )
    const slot = sorted[0]

    const appointment = await client.bookAppointment({
      studio: DEFAULT_STUDIO,
      service,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      operatoryId: slot.operatoryId,
      providerId: slot.providerId,
    })

    return {
      success: true,
      message: `Booked a dental appointment (${appointment.serviceType}) at ${DEFAULT_STUDIO} on ${date} at ${formatTime(appointment.startsAt)}.`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error({ err, date, service, preferredTime }, 'Dental booking failed')
    return { success: false, message: `ERROR: ${message}` }
  }
}
