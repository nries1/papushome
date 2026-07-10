export const schema = gql`
  type CanWaterResult {
    canWater: Boolean!
    disabledReasons: [String!]!
  }

  type Query {
    canWater(deviceId: String): CanWaterResult! @requireAuth
  }
`
