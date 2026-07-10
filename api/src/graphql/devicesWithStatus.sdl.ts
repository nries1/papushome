export const schema = gql`
  type LatestTankReading {
    rawValue: Int!
    gallons: Float!
    pctFull: Float!
    timestamp: DateTime!
  }

  type LatestPumpEvent {
    status: String!
    action: String
    timestamp: DateTime!
  }

  type DeviceWithStatus {
    deviceId: String!
    friendlyName: String!
    deviceType: String!
    config: JSON!
    roomName: String
    roomDisplayName: String
    ipAddress: String
    lastBoot: DateTime
    lastSeen: DateTime
    healthy: Boolean!
    otaAvailable: Boolean!
    latestEnvReadings: JSON
    latestEnvTimestamp: DateTime
    latestTankReading: LatestTankReading
    latestPumpEvent: LatestPumpEvent
  }

  type Query {
    devicesWithStatus: [DeviceWithStatus!]! @requireAuth
  }
`
