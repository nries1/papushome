export const schema = gql`
  type Room {
    id: Int!
    name: String!
    displayName: String!
    devices: [Device!]!
  }

  type Query {
    rooms: [Room!]! @requireAuth
    room(id: Int!): Room @requireAuth
  }
`
