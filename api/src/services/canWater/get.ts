import type { QueryResolvers } from 'types/graphql'

import { context } from '@redwoodjs/context'

import type { CurrentUser } from 'src/lib/auth'
import { ADMIN_EMAILS } from 'src/lib/auth'

// Replaces the old GET /api/can-water route — computes whether the UI's
// water button should be enabled, and why not if it's disabled. This is
// deliberately left at plain @requireAuth rather than admin-gated: any
// authenticated user can ask "can I water?" and gets "Admin access
// required" back as one of the disabledReasons (same as the old route),
// rather than a hard 403 on the whole query. Tank level and the old
// 6-hour cooldown no longer disable the button -- watering is allowed at
// any time and any barrel fill.
export const canWater: NonNullable<QueryResolvers['canWater']> = async () => {
  const disabledReasons: string[] = []
  const currentUser = context.currentUser as CurrentUser | undefined

  if (!currentUser || !ADMIN_EMAILS.includes(currentUser.email)) {
    disabledReasons.push('Admin access required')
  }

  return { canWater: disabledReasons.length === 0, disabledReasons }
}
