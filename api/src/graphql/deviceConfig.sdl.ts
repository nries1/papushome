export const schema = gql`
  type Query {
    deviceConfig(deviceId: String!): JSON! @requireAuth
  }

  type Mutation {
    updateDeviceConfig(deviceId: String!, patch: JSON!): JSON!
      @requireAuth(roles: ["admin"])
  }
`
