export const schema = gql`
  type PhotoReaction {
    id: Int!
    photoFilename: String!
    userEmail: String!
    reaction: String!
    createdAt: DateTime
  }

  type PhotoReactionSummary {
    reaction: String!
    users: [String!]!
    count: Int!
  }

  type Query {
    photoReactions(photoFilename: String!): [PhotoReactionSummary!]!
      @requireAuth
  }

  input UpsertPhotoReactionInput {
    photoFilename: String!
    userEmail: String!
    reaction: String!
  }

  type Mutation {
    upsertPhotoReaction(input: UpsertPhotoReactionInput!): PhotoReaction!
      @requireAuth
    removePhotoReaction(photoFilename: String!, userEmail: String!): Boolean!
      @requireAuth
  }
`
