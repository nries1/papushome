import type { MutationResolvers } from 'types/graphql'

import { context } from '@redwoodjs/context'

import type { CurrentUser } from 'src/lib/auth'
import { db } from 'src/lib/db'

// userEmail from the authenticated request — see upsertPhotoReaction for why.
export const removePhotoReaction: NonNullable<
  MutationResolvers['removePhotoReaction']
> = async ({ photoFilename }) => {
  const userEmail = (context.currentUser as CurrentUser).email
  await db.photoReaction.deleteMany({ where: { photoFilename, userEmail } })
  return true
}
