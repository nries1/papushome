export const schema = gql`
  type TankReading {
    id: Int!
    deviceId: String
    gallons: Float
    timestamp: DateTime
    rawValue: Int
    pctFull: Int
    device: Device
  }

  type Query {
    tankReadings(deviceId: String, rows: Int): [TankReading!]! @requireAuth
    latestTankReadings: [TankReading!]! @requireAuth
  }

  input CreateTankReadingInput {
    deviceId: String!
    gallons: Float!
    rawValue: Int!
    pctFull: Int!
  }

  type Mutation {
    createTankReading(input: CreateTankReadingInput!): TankReading! @requireAuth
  }
`
