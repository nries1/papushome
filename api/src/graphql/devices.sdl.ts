export const schema = gql`
  type Device {
    id: Int!
    deviceId: String!
    model: String!
    friendlyName: String!
    hardwareVersion: String!
    status: String!
    metadata: JSON!
    room: Room
    config: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Query {
    devices(page: Int, rows: Int, order: String): [Device!]! @requireAuth
    device(id: Int!): Device @requireAuth
  }

  input CreateDeviceInput {
    deviceId: String!
    model: String!
    friendlyName: String!
    hardwareVersion: String!
    roomId: Int
    config: JSON!
  }

  input UpdateDeviceInput {
    deviceId: String!
    model: String!
    friendlyName: String!
    hardwareVersion: String!
    roomId: Int
    config: JSON!
  }

  type Mutation {
    createDevice(input: CreateDeviceInput!): Device! @requireAuth(roles: ["admin"])
    updateDevice(id: Int!, input: UpdateDeviceInput!): Device!
      @requireAuth(roles: ["admin"])
    deleteDevice(id: Int!): Device! @requireAuth(roles: ["admin"])
  }
`
