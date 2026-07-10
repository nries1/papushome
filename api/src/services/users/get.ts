import type { QueryResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const users: NonNullable<QueryResolvers['users']> = () => {
  return db.user.findMany({ orderBy: { email: 'asc' } })
}

export const user: NonNullable<QueryResolvers['user']> = ({ email }) => {
  return db.user.findUnique({ where: { email } })
}
