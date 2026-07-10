export const schema = gql`
  type DevicePresence {
    deviceId: String!
    ipAddress: String
    lastBoot: DateTime!
  }

  type Mutation {
    upsertDevicePresence(deviceId: String!, ipAddress: String!): DevicePresence!
      @requireAuth
  }
`
