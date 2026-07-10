export const schema = gql`
  type User {
    email: String!
    displayName: String!
  }

  type Query {
    users: [User!]! @requireAuth
    user(email: String!): User @requireAuth
  }
`
