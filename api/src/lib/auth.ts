import type { APIGatewayProxyEvent } from 'aws-lambda'

import { getEventHeader } from '@redwoodjs/api'
import { context } from '@redwoodjs/context'
import { AuthenticationError, ForbiddenError } from '@redwoodjs/graphql-server'

// Cloudflare Access sits in front of nginx/api and injects this header once
// the user has authenticated via SSO — there's no login flow inside this
// app and no token to decode. This is a straight port of the old Express
// authMiddleware (server/api/auth.ts): trust the header, gate admin-only
// mutations on ADMIN_EMAILS.
const CF_ACCESS_EMAIL_HEADER = 'cf-access-authenticated-user-email'

export const ADMIN_EMAILS = ['nries1@gmail.com', 'avalongoebel@gmail.com']

export interface CurrentUser {
  email: string
  roles: string[]
}

// Shared by the GraphQL context plugin below and by any plain Function
// (e.g. media.ts) that isn't part of the GraphQL pipeline and so never sees
// context.currentUser.
export function getCurrentUserFromEvent(
  event: APIGatewayProxyEvent | Request
): CurrentUser | null {
  const email = getEventHeader(event, CF_ACCESS_EMAIL_HEADER)?.toLowerCase()
  if (!email) return null
  return { email, roles: ADMIN_EMAILS.includes(email) ? ['admin'] : [] }
}

// Populates context.currentUser on every GraphQL request. Registered as an
// extraPlugin (see api/src/functions/graphql.ts) instead of passed as
// createGraphQLHandler's `getCurrentUser` option — that option only fires
// when the request carries an `auth-provider`/`Authorization` header, which
// is how Redwood's bearer-token auth providers (dbAuth, Netlify, etc.) work.
// Cloudflare Access sends neither of those; it just injects the email
// header directly, so context building can't be gated behind them here.
//
// Deliberately untyped: graphql-server's own extraPlugins: Plugin[] type is
// generic over the base Yoga context (no `event` field at the type level,
// even though it's always there at runtime — Redwood's own built-in auth
// plugin reads context.event the same way). Typing this against any
// graphql-yoga Plugin type — Redwood's nested copy or the top-level package
// — produces unsound contravariance errors either way, so this is left
// untyped rather than lying about the shape with a cast.
export const cfAccessAuthPlugin = {
  onContextBuilding({ context: ctx, extendContext }) {
    const currentUser = getCurrentUserFromEvent(ctx.event)
    if (currentUser) extendContext({ currentUser })
  },
}

export const isAuthenticated = (): boolean => {
  return !!context.currentUser
}

export const hasRole = ({ roles }: { roles?: string | string[] }): boolean => {
  if (!isAuthenticated()) return false
  if (!roles) return true
  const currentUserRoles = (context.currentUser as CurrentUser).roles
  const rolesToCheck = Array.isArray(roles) ? roles : [roles]
  return rolesToCheck.some((role) => currentUserRoles.includes(role))
}

// This is used by the requireAuth directive in ./api/src/directives/requireAuth
export const requireAuth = ({ roles }: { roles?: string | string[] } = {}) => {
  if (!isAuthenticated()) {
    throw new AuthenticationError('Access Denied: please log in via Cloudflare.')
  }
  if (roles && !hasRole({ roles })) {
    throw new ForbiddenError("You don't have access to do that.")
  }
}

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  return (context.currentUser as CurrentUser | undefined) ?? null
}
