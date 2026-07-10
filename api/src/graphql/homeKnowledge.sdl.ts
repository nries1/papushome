export const schema = gql`
  type HomeKnowledge {
    id: Int!
    subject: String!
    category: String!
    fact: String!
    updatedAt: DateTime!
  }

  type Query {
    homeKnowledge: [HomeKnowledge!]! @requireAuth
    searchHomeKnowledge(embedding: [Float!]!): [HomeKnowledge!]! @requireAuth
  }

  input CreateHomeKnowledgeInput {
    subject: String!
    category: String!
    fact: String!
    embedding: [Float!]
  }

  input UpdateHomeKnowledgeInput {
    subject: String!
    category: String!
    fact: String!
    embedding: [Float!]
  }

  type Mutation {
    createHomeKnowledge(input: CreateHomeKnowledgeInput!): HomeKnowledge!
      @requireAuth
    updateHomeKnowledge(id: Int!, input: UpdateHomeKnowledgeInput!): HomeKnowledge!
      @requireAuth
    deleteHomeKnowledge(id: Int!): HomeKnowledge! @requireAuth
  }
`
