export const schema = gql`
  type WateringEvent {
    id: Int!
    deviceId: String!
    timestamp: DateTime
    durationMs: Int!
    gallonsUsed: Float
    status: String
    startedBy: String
    action: String
    device: Device
  }

  type Query {
    wateringEvents(
      deviceId: String
      page: Int
      rows: Int
      order: String
    ): [WateringEvent!]! @requireAuth
    latestWateringEvents: [WateringEvent!]! @requireAuth
  }

  input CreateWateringEventInput {
    deviceId: String!
    durationMs: Int!
    action: String
    startedBy: String!
  }

  input UpdateWateringEventInput {
    durationMs: Int!
    status: String!
  }

  type WaterDeviceResult {
    eventId: Int!
    sent: Boolean!
    message: String!
  }

  type Mutation {
    createWateringEvent(input: CreateWateringEventInput!): WateringEvent!
      @requireAuth(roles: ["admin"])
    updateWateringEvent(
      id: Int!
      input: UpdateWateringEventInput!
    ): WateringEvent! @requireAuth
    waterDevice(deviceId: String!, durationSeconds: Int!): WaterDeviceResult!
      @requireAuth(roles: ["admin"])
  }
`
