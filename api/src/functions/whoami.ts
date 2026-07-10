import type { APIGatewayEvent, Context } from 'aws-lambda'

import { getCurrentUserFromEvent } from 'src/lib/auth'

// Replaces the old GET /api/whoami Express route. Requires CF auth (any
// authenticated user) — the old route's 'anonymous' fallback was dead code
// in practice, since it sat behind authMiddleware, which already 401s
// before the handler runs if the header is missing. Same guard here,
// explicit rather than implicit.
export const handler = async (event: APIGatewayEvent, _context: Context) => {
  const currentUser = getCurrentUserFromEvent(event)
  if (!currentUser) {
    return { statusCode: 401, body: 'Access Denied: please log in via Cloudflare.' }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: currentUser.email }),
  }
}
