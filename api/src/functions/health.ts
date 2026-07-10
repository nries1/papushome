import type { APIGatewayEvent, Context } from 'aws-lambda'

import { serviceStatus } from 'src/lib/mqtt'

// Replaces the old GET /api/health Express route. Public (no auth, same as
// before) — used for uptime/liveness checks, not user-facing data, so a
// plain Function rather than a GraphQL query.
export const handler = async (_event: APIGatewayEvent, _context: Context) => {
  const now = Date.now()
  const staleMs = 30_000
  const serviceAge = (d: Date | null) => (d ? now - d.getTime() : null)
  const serviceState = (d: Date | null) =>
    d === null ? 'offline' : now - d.getTime() < staleMs ? 'ok' : 'stale'

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api: 'ok',
      mqtt: serviceStatus.mqttConnected ? 'ok' : 'offline',
      visionWorker: {
        status: serviceState(serviceStatus.lastVisionResult),
        lastSeenMs: serviceAge(serviceStatus.lastVisionResult),
      },
      publisher: {
        status: serviceState(serviceStatus.lastPublisherFrame),
        lastSeenMs: serviceAge(serviceStatus.lastPublisherFrame),
      },
    }),
  }
}
