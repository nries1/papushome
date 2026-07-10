import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const removePhotoReaction: NonNullable<
  MutationResolvers['removePhotoReaction']
> = async ({ photoFilename, userEmail }) => {
  await db.photoReaction.deleteMany({ where: { photoFilename, userEmail } })
  return true
}
