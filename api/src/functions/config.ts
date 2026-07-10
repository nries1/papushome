import type { APIGatewayEvent, Context } from 'aws-lambda'

// Replaces the old GET /api/config Express route — static, env-derived UI
// bootstrap config. Public (no auth, same as before): the web app needs
// this before it knows who's logged in.
const REACTIONS = ['🥹', '😂', '🥰', '❤️']

export const handler = async (_event: APIGatewayEvent, _context: Context) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reactions: REACTIONS,
      locationLabel: process.env.LOCATION_LABEL ?? 'Brooklyn, NY',
      aiPlaceholder: process.env.AI_PLACEHOLDER ?? 'RTX 2070 Online. How can I help?',
      mediaPathPrefix: process.env.MEDIA_URL_PREFIX ?? '/api/media',
    }),
  }
}
