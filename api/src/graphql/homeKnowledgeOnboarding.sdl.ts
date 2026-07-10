export const schema = gql`
  type HomeKnowledgeCoverageCategory {
    category: String!
    label: String!
    target: Int!
    count: Int!
    pct: Int!
  }

  type HomeKnowledgeCoverage {
    covered: Int!
    total: Int!
    pct: Int!
    categories: [HomeKnowledgeCoverageCategory!]!
  }

  type HomeKnowledgeQuestion {
    question: String!
    subject: String!
    category: String!
  }

  type HomeKnowledgeAnswerFact {
    subject: String!
    category: String!
    fact: String!
  }

  type ProcessHomeKnowledgeAnswersResult {
    saved: Int!
    facts: [HomeKnowledgeAnswerFact!]!
  }

  type Query {
    homeKnowledgeCoverage: HomeKnowledgeCoverage! @requireAuth
  }

  input HomeKnowledgeAnswerPairInput {
    question: String!
    subject: String!
    category: String!
    answer: String!
  }

  type Mutation {
    generateHomeKnowledgeQuestions: [HomeKnowledgeQuestion!]! @requireAuth
    processHomeKnowledgeAnswers(
      pairs: [HomeKnowledgeAnswerPairInput!]!
    ): ProcessHomeKnowledgeAnswersResult! @requireAuth
  }
`
