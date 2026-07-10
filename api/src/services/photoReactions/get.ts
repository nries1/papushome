import type { QueryResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const photoReactions: NonNullable<
  QueryResolvers['photoReactions']
> = async ({ photoFilename }) => {
  const rows = await db.photoReaction.findMany({ where: { photoFilename } })
  if (rows.length === 0) return []

  const emails = [...new Set(rows.map((r) => r.userEmail))]
  const users = await db.user.findMany({ where: { email: { in: emails } } })
  const displayNameByEmail = new Map(users.map((u) => [u.email, u.displayName]))

  const grouped = new Map<string, string[]>()
  for (const row of rows) {
    const displayName =
      displayNameByEmail.get(row.userEmail) ?? row.userEmail.split('@')[0]
    const list = grouped.get(row.reaction) ?? []
    list.push(displayName)
    grouped.set(row.reaction, list)
  }

  return Array.from(grouped.entries()).map(([reaction, users]) => ({
    reaction,
    users,
    count: users.length,
  }))
}
