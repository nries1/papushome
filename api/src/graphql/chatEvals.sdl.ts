export const schema = gql`
  type ChatEval {
    id: Int!
    sessionKey: String!
    question: String!
    response: String!
    responseTimeMs: Int!
    quality: Boolean
    correctness: Boolean
    timestamp: DateTime!
  }

  enum ChatEvalRatingField {
    QUALITY
    CORRECTNESS
  }

  input CreateChatEvalInput {
    sessionKey: String!
    question: String!
    response: String!
    responseTimeMs: Int!
  }

  type Mutation {
    createChatEval(input: CreateChatEvalInput!): ChatEval! @requireAuth
    updateChatEvalRating(
      id: Int!
      field: ChatEvalRatingField!
      value: Boolean!
    ): ChatEval! @requireAuth
  }
`
