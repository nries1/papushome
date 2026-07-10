import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const upsertPhotoReaction: NonNullable<
  MutationResolvers['upsertPhotoReaction']
> = ({ input: { photoFilename, userEmail, reaction } }) => {
  return db.photoReaction.upsert({
    where: { photoFilename_userEmail: { photoFilename, userEmail } },
    update: { reaction, createdAt: new Date() },
    create: { photoFilename, userEmail, reaction },
  })
}
