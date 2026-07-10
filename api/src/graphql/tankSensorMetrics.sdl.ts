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

  type DailyStdDev {
    day: DateTime!
    dailyStdDev: Float!
  }

  type Query {
    tankSensorHealthMetrics(deviceId: String, days: Int): SensorHealthMetrics
      @requireAuth
    tankReadingDailyStdDev(deviceId: String, days: Int): [DailyStdDev!]!
      @requireAuth
  }
`
