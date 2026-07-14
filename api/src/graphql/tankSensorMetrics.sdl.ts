export const schema = gql`
  type SensorHealthMetrics {
    totalCount: Int!
    minValue: Int!
    maxValue: Int!
    meanValue: Float!
    stdDev: Float!
    medianValue: Float!
    modeValue: Int!
  }

  type ReadingStdDev {
    timestamp: DateTime!
    rollingStdDev: Float!
  }

  type Query {
    tankSensorHealthMetrics(deviceId: String, days: Int): SensorHealthMetrics
      @requireAuth
    tankReadingRollingStdDev(deviceId: String, days: Int): [ReadingStdDev!]!
      @requireAuth
  }
`
