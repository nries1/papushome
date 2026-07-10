import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

// Mirrors the old `ON CONFLICT (session_key) DO NOTHING` — if the session
// already exists, leave it untouched rather than overwriting personName.
export const createChatSession: NonNullable<
  MutationResolvers['createChatSession']
> = ({ input: { sessionKey, personName } }) => {
  return db.chatSession.upsert({
    where: { sessionKey },
    create: { sessionKey, personName },
    update: {},
  })
}
