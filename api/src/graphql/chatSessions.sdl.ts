export const schema = gql`
  type ChatSession {
    id: Int!
    sessionKey: String!
    startedAt: DateTime!
    endedAt: DateTime
    summary: String
    personName: String
    messages: [ChatMessage!]!
  }

  type ChatMessage {
    id: Int!
    sessionId: Int!
    role: String!
    content: String!
    timestamp: DateTime!
    session: ChatSession!
  }

  type Query {
    chatSession(sessionKey: String!): ChatSession @requireAuth
    recentChatSessions(limit: Int): [ChatSession!]! @requireAuth
  }

  input CreateChatSessionInput {
    sessionKey: String!
    personName: String
  }

  type Mutation {
    createChatSession(input: CreateChatSessionInput!): ChatSession! @requireAuth
    setChatSessionSummary(sessionKey: String!, summary: String!): ChatSession!
      @requireAuth
    appendChatMessage(
      sessionKey: String!
      role: String!
      content: String!
    ): ChatMessage! @requireAuth
  }
`
