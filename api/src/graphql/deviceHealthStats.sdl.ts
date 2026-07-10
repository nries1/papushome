export const schema = gql`
  type DeviceHealthStats {
    deviceId: String!
    friendlyName: String!
    deviceType: String!
    roomDisplayName: String
    envReadings7d: Int!
    tankReadings7d: Int!
    wateringTotal7d: Int!
    wateringComplete7d: Int!
    wateringErrors7d: Int!
    deviceLogErrors7d: Int!
  }

  type Query {
    deviceHealthStats: [DeviceHealthStats!]! @requireAuth
  }
`
