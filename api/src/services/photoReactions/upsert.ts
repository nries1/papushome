import type { MutationResolvers } from 'types/graphql'

import { context } from '@redwoodjs/context'

import type { CurrentUser } from 'src/lib/auth'
import { db } from 'src/lib/db'

// userEmail comes from the authenticated request, not client input — the
// old REST route derived it the same way (req.userEmail from the CF-Access
// header), and a client-suppliable userEmail would let anyone upsert a
// reaction as anyone else.
export const upsertPhotoReaction: NonNullable<
  MutationResolvers['upsertPhotoReaction']
> = ({ input: { photoFilename, reaction } }) => {
  const userEmail = (context.currentUser as CurrentUser).email
  return db.photoReaction.upsert({
    where: { photoFilename_userEmail: { photoFilename, userEmail } },
    update: { reaction, createdAt: new Date() },
    create: { photoFilename, userEmail, reaction },
  })
}
