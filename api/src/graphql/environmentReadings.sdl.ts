export const schema = gql`
  type EnvironmentReading {
    id: BigInt!
    deviceId: String!
    readings: JSON!
    timestamp: DateTime!
    roomId: Int
    room: Room
    device: Device
  }

  type Query {
    latestEnvironmentReading(
      metric: String!
      roomName: String
    ): EnvironmentReading @requireAuth
  }

  input CreateEnvironmentReadingInput {
    deviceId: String!
    roomId: Int
    readings: JSON!
  }

  type Mutation {
    createEnvironmentReading(
      input: CreateEnvironmentReadingInput!
    ): EnvironmentReading! @requireAuth
  }
`
