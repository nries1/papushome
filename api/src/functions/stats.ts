import type { APIGatewayEvent, Context } from 'aws-lambda'
import si from 'systeminformation'

import { getCurrentUserFromEvent } from 'src/lib/auth'
import { logger } from 'src/lib/logger'

// Replaces the old GET /api/stats Express route (host CPU/mem/temp via
// systeminformation). Requires CF auth (any authenticated user), matching
// the old route's position after authMiddleware.
export const handler = async (event: APIGatewayEvent, _context: Context) => {
  if (!getCurrentUserFromEvent(event)) {
    return { statusCode: 401, body: 'Access Denied: please log in via Cloudflare.' }
  }

  try {
    const [cpu, mem, temp] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.cpuTemperature(),
    ])
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cpu: Math.round(cpu.currentLoad),
        mem: Math.round((mem.active / mem.total) * 100),
        temp: temp.main ?? 'N/A',
      }),
    }
  } catch (err) {
    logger.warn({ err }, 'stats: failed to read host stats')
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Could not fetch stats' }),
    }
  }
}
