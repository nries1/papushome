import type { APIGatewayEvent, Context } from 'aws-lambda'

import { ADMIN_EMAILS, getCurrentUserFromEvent } from 'src/lib/auth'
import { user } from 'src/services/users/get'

// Replaces the old GET /api/admin-status Express route. Requires CF auth
// (any authenticated user, not admin-only — this route is how the UI finds
// out whether the current user *is* an admin, so it can't itself require
// the admin role).
export const handler = async (event: APIGatewayEvent, _context: Context) => {
  const currentUser = getCurrentUserFromEvent(event)
  if (!currentUser) {
    return { statusCode: 401, body: 'Access Denied: please log in via Cloudflare.' }
  }

  const record = await user({ email: currentUser.email })
  const userId = currentUser.email.split('@')[0]

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isAdmin: ADMIN_EMAILS.includes(currentUser.email),
      email: currentUser.email,
      displayName: record?.displayName ?? userId,
    }),
  }
}
