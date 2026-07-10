import type {
  MutationResolvers,
  ChatMessageRelationResolvers,
} from 'types/graphql'

import { db } from 'src/lib/db'

export const appendChatMessage: NonNullable<
  MutationResolvers['appendChatMessage']
> = ({ sessionKey, role, content }) => {
  return db.chatMessage.create({
    data: {
      role,
      content,
      session: { connect: { sessionKey } },
    },
  })
}

export const ChatMessage: ChatMessageRelationResolvers = {
  session: (_args, { root }) =>
    db.chatMessage.findUnique({ where: { id: root.id } }).session(),
}
