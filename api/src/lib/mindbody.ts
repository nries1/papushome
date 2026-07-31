// ---------------------------------------------------------------------------
// Mindbody Public API v6 client for booking classes. Replaces the old
// web-agents Playwright/Stagehand browser-automation service — see
// production_ready.md for why that approach was abandoned (reCAPTCHA
// Enterprise risk scoring, session-state fragility). This talks to Mindbody's
// documented REST API directly: issue a staff-level user token, search
// classes in a date window, match by name/time, then POST addclienttoclass.
// ---------------------------------------------------------------------------

import axios from 'axios'

import { moduleLogger } from 'src/lib/logger'

const logger = moduleLogger('mindbody')

const BASE_URL = 'https://api.mindbodyonline.com/public/v6'

export interface StudioConfig {
  siteId: string
  username: string
  password: string
  clientId?: string
  clientSearchText?: string
}

interface MindbodyClass {
  Id: number
  StartDateTime: string
  IsCanceled: boolean
  ClassDescription: { Name: string }
}

interface BookingResult {
  success: boolean
  message: string
}

class MindbodyApiError extends Error {}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new MindbodyApiError(`Missing required env var ${name}`)
  return value
}

// Studio-specific env vars fall back to the shared MINDBODY_* ones so a
// single sandbox login can drive every studio until each has its own
// Mindbody-issued production credentials.
export function studioConfig(prefix: string): StudioConfig {
  const pick = (suffix: string) =>
    process.env[`MINDBODY_${prefix}_${suffix}`] ||
    process.env[`MINDBODY_${suffix}`]

  const siteId = pick('SITE_ID')
  const username = pick('USERNAME')
  const password = pick('PASSWORD')
  if (!siteId)
    throw new MindbodyApiError(
      `Missing required env var MINDBODY_${prefix}_SITE_ID or MINDBODY_SITE_ID`
    )
  if (!username)
    throw new MindbodyApiError(
      `Missing required env var MINDBODY_${prefix}_USERNAME or MINDBODY_USERNAME`
    )
  if (!password)
    throw new MindbodyApiError(
      `Missing required env var MINDBODY_${prefix}_PASSWORD or MINDBODY_PASSWORD`
    )

  return {
    siteId,
    username,
    password,
    clientId: pick('CLIENT_ID') || undefined,
    clientSearchText: pick('CLIENT_SEARCH_TEXT') || undefined,
  }
}

// ---------------------------------------------------------------------------
// Low-level request helper — attaches API-Key/SiteId/Authorization headers
// and normalizes Mindbody's `{Error: {Message, Code}}` error body into a
// thrown MindbodyApiError with a readable message.
// ---------------------------------------------------------------------------

async function mindbodyRequest<T>(
  config: StudioConfig,
  method: 'GET' | 'POST',
  path: string,
  opts: {
    accessToken?: string
    params?: Record<string, unknown>
    body?: unknown
  } = {}
): Promise<T> {
  const apiKey = requireEnv('MINDBODY_API_KEY')
  try {
    const res = await axios.request<T>({
      method,
      url: `${BASE_URL}${path}`,
      params: opts.params,
      data: opts.body,
      timeout: 10_000,
      headers: {
        'API-Key': apiKey,
        SiteId: config.siteId,
        ...(opts.accessToken
          ? { Authorization: `Bearer ${opts.accessToken}` }
          : {}),
        'Content-Type': 'application/json',
      },
    })
    return res.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const mbMessage = err.response?.data?.Error?.Message
      throw new MindbodyApiError(mbMessage || err.message)
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Token cache — tokens are valid ~24h server-side, but we refresh well
// before that. Keyed by siteId+username since one process may hold tokens
// for multiple studios.
// ---------------------------------------------------------------------------

const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>()

async function getAccessToken(config: StudioConfig): Promise<string> {
  const key = `${config.siteId}:${config.username}`
  const cached = tokenCache.get(key)
  if (cached && cached.expiresAt > Date.now() + 60_000)
    return cached.accessToken

  const res = await mindbodyRequest<{ AccessToken: string; Expires: string }>(
    config,
    'POST',
    '/usertoken/issue',
    { body: { Username: config.username, Password: config.password } }
  )
  tokenCache.set(key, {
    accessToken: res.AccessToken,
    expiresAt: new Date(res.Expires).getTime(),
  })
  return res.AccessToken
}

// ---------------------------------------------------------------------------
// Client (the person being booked) resolution — an explicit clientId wins;
// otherwise search by name/email text and cache the first hit.
// ---------------------------------------------------------------------------

const clientIdCache = new Map<string, string>()

async function resolveClientId(
  config: StudioConfig,
  accessToken: string
): Promise<string> {
  if (config.clientId) return config.clientId

  if (!config.clientSearchText) {
    throw new MindbodyApiError(
      'No client configured to book — set MINDBODY_CLIENT_ID or MINDBODY_CLIENT_SEARCH_TEXT'
    )
  }

  const cacheKey = `${config.siteId}:${config.clientSearchText}`
  const cached = clientIdCache.get(cacheKey)
  if (cached) return cached

  const res = await mindbodyRequest<{ Clients: Array<{ Id: string }> }>(
    config,
    'GET',
    '/client/clients',
    {
      accessToken,
      params: {
        'request.searchText': config.clientSearchText,
        'request.limit': 5,
      },
    }
  )
  const clientId = res.Clients?.[0]?.Id
  if (!clientId) {
    throw new MindbodyApiError(
      `No Mindbody client found matching "${config.clientSearchText}"`
    )
  }
  clientIdCache.set(cacheKey, clientId)
  return clientId
}

// ---------------------------------------------------------------------------
// Class search + name/time matching
// ---------------------------------------------------------------------------

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function nameMatchScore(query: string, candidate: string): number {
  const q = normalize(query)
  const c = normalize(candidate)
  if (!q) return 0
  if (q === c) return 100
  if (c.startsWith(q) || q.startsWith(c)) return 80
  if (c.includes(q)) return 60
  const qWords = new Set(q.split(' '))
  const cWords = c.split(' ')
  const overlap = cWords.filter((w) => qWords.has(w)).length
  return overlap > 0 ? (overlap / qWords.size) * 40 : 0
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

// StartDateTime comes back as a local (site timezone) wall-clock string like
// "2026-08-01T06:20:00" with no offset — parse the time-of-day directly
// instead of going through Date(), which would reinterpret it in server-local
// time and shift the hour.
function classTimeOfDay(startDateTime: string): number {
  const match = startDateTime.match(/T(\d{2}):(\d{2})/)
  if (!match) return 0
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

function formatClassTime(startDateTime: string): string {
  const minutes = classTimeOfDay(startDateTime)
  const hour24 = Math.floor(minutes / 60)
  const minute = minutes % 60
  const meridiem = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`
}

async function findClass(
  config: StudioConfig,
  accessToken: string,
  params: { date: string; classNameQuery: string; preferredTime?: string }
): Promise<MindbodyClass | null> {
  const res = await mindbodyRequest<{ Classes: MindbodyClass[] }>(
    config,
    'GET',
    '/class/classes',
    {
      accessToken,
      params: {
        'request.startDateTime': `${params.date}T00:00:00`,
        'request.endDateTime': `${params.date}T23:59:59`,
        'request.limit': 100,
      },
    }
  )

  const candidates = (res.Classes || [])
    .filter((c) => !c.IsCanceled)
    .map((c) => ({
      class: c,
      score: nameMatchScore(params.classNameQuery, c.ClassDescription.Name),
    }))
    .filter((c) => c.score > 0)

  if (!candidates.length) return null

  const topScore = Math.max(...candidates.map((c) => c.score))
  const topMatches = candidates.filter((c) => c.score === topScore)

  const preferredMinutes = params.preferredTime
    ? parseTimeOfDay(params.preferredTime)
    : null
  if (preferredMinutes !== null) {
    topMatches.sort(
      (a, b) =>
        Math.abs(classTimeOfDay(a.class.StartDateTime) - preferredMinutes) -
        Math.abs(classTimeOfDay(b.class.StartDateTime) - preferredMinutes)
    )
  } else {
    topMatches.sort((a, b) =>
      a.class.StartDateTime.localeCompare(b.class.StartDateTime)
    )
  }

  return topMatches[0].class
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

interface AddClientToClassResponse {
  Visit?: { Action?: string; WaitlistEntryId?: number | null }
}

export async function bookMindbodyClass(
  config: StudioConfig,
  params: { date: string; classNameQuery: string; preferredTime?: string }
): Promise<BookingResult> {
  try {
    const accessToken = await getAccessToken(config)
    const clientId = await resolveClientId(config, accessToken)
    const cls = await findClass(config, accessToken, params)
    if (!cls) {
      return {
        success: false,
        message: `ERROR: No "${params.classNameQuery}" class found on ${params.date}.`,
      }
    }

    const res = await mindbodyRequest<AddClientToClassResponse>(
      config,
      'POST',
      '/class/addclienttoclass',
      {
        accessToken,
        body: {
          ClientId: clientId,
          ClassId: cls.Id,
          Test: false,
          RequirePayment: false,
          SendEmail: true,
        },
      }
    )

    const visit = res.Visit
    const when = `${cls.ClassDescription.Name} at ${formatClassTime(cls.StartDateTime)} on ${params.date}`

    if (visit?.WaitlistEntryId) {
      return { success: true, message: `Added to the waitlist for ${when}.` }
    }
    if (visit?.Action === 'Added' || visit?.Action === 'Updated') {
      return { success: true, message: `Booked ${when}.` }
    }

    logger.warn({ visit, classId: cls.Id }, 'Booking not confirmed')
    return {
      success: false,
      message: `ERROR: Booking for ${when} was not confirmed (status: ${visit?.Action ?? 'unknown'}).`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error({ err, params }, 'Mindbody booking failed')
    return { success: false, message: `ERROR: ${message}` }
  }
}

export async function bookYogaClass(
  date: string,
  className: string,
  preferredTime?: string
): Promise<BookingResult> {
  return bookMindbodyClass(studioConfig('Y7'), {
    date,
    classNameQuery: className,
    preferredTime,
  })
}

export async function bookTabataClass(
  date: string,
  className: string,
  preferredTime?: string
): Promise<BookingResult> {
  return bookMindbodyClass(studioConfig('TABATA'), {
    date,
    classNameQuery: className,
    preferredTime,
  })
}
