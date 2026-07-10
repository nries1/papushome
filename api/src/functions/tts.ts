import axios from 'axios'
import type { APIGatewayEvent, Context } from 'aws-lambda'

import { getCurrentUserFromEvent } from 'src/lib/auth'

// Replaces the old POST /api/tts Express route (Kokoro TTS proxy, returns
// raw audio/mpeg bytes — same reasoning as media.ts for why this is a
// plain Function rather than a GraphQL mutation). Requires CF auth (any
// authenticated user), matching the old route's position after
// authMiddleware.

const KOKORO_URL = process.env.KOKORO_URL || 'http://kokoro:8880'
const TTS_VOICE = process.env.TTS_VOICE || 'af_bella'

export const handler = async (event: APIGatewayEvent, _context: Context) => {
  if (!getCurrentUserFromEvent(event)) {
    return { statusCode: 401, body: 'Access Denied: please log in via Cloudflare.' }
  }

  let text: string | undefined
  let voice: string | undefined
  try {
    const body = JSON.parse(event.body ?? '{}') as { text?: string; voice?: string }
    text = body.text
    voice = body.voice
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  if (!text?.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'text is required' }) }
  }

  try {
    const ttsRes = await axios.post(
      `${KOKORO_URL}/v1/audio/speech`,
      { model: 'kokoro', input: text.trim(), voice: voice || TTS_VOICE, response_format: 'mp3', speed: 1.0 },
      { responseType: 'arraybuffer', timeout: 20000 }
    )
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
      body: Buffer.from(ttsRes.data as ArrayBuffer).toString('base64'),
      isBase64Encoded: true,
    }
  } catch {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'TTS service unavailable' }),
    }
  }
}
