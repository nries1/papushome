export const schema = gql`
  type SendChatMessageResult {
    reply: String!
    evalId: Int
  }

  type Query {
    chatSystemPrompt(person: String): String! @requireAuth
  }

  type Mutation {
    sendChatMessage(
      sessionKey: String
      message: String!
      personName: String
      system: String
    ): SendChatMessageResult! @requireAuth
    startChatSession(
      sessionKey: String!
      personName: String
      prevSessionKey: String
    ): ChatSession! @requireAuth
  }
`
