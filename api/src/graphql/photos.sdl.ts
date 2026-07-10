export const schema = gql`
  type Photo {
    filename: String!
    url: String!
  }

  type Query {
    photos(limit: Int): [Photo!]! @requireAuth
  }

  input CreatePhotoInput {
    filename: String!
    dataBase64: String!
  }

  type Mutation {
    createPhoto(input: CreatePhotoInput!): Photo! @requireAuth(roles: ["admin"])
  }
`
