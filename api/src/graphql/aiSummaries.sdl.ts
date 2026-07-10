export const schema = gql`
  type AiSummary {
    id: Int!
    summary: String!
    timestamp: DateTime!
  }

  type Query {
    latestAiSummary: AiSummary @requireAuth
  }

  input CreateAiSummaryInput {
    summary: String!
  }

  type Mutation {
    createAiSummary(input: CreateAiSummaryInput!): AiSummary! @requireAuth
  }
`
