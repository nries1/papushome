import type { SensorHealthQuery, SensorHealthQueryVariables } from 'types/graphql'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

import Card from 'src/components/Card/Card'

export const QUERY: TypedDocumentNode<SensorHealthQuery, SensorHealthQueryVariables> = gql`
  query SensorHealthQuery($deviceId: String, $days: Int) {
    tankSensorHealthMetrics(deviceId: $deviceId, days: $days) {
      totalCount
      minValue
      maxValue
      meanValue
      stdDev
      medianValue
      modeValue
    }
    tankReadingDailyStdDev(deviceId: $deviceId, days: $days) {
      day
      dailyStdDev
    }
  }
`

const DAYS = 7
const JITTER_TARGET = 12

export const beforeQuery = (props: { deviceId: string | null }) => ({
  variables: { deviceId: props.deviceId, days: DAYS },
  fetchPolicy: 'cache-and-network' as const,
})

export const Loading = () => (
  <Card title="Sensor Health (7-Day Stability)" className="[grid-column:span_2]">
    <p className="text-sm text-dash-text-dim">Loading...</p>
  </Card>
)

export const Success = ({
  tankSensorHealthMetrics: metrics,
  tankReadingDailyStdDev: history,
}: CellSuccessProps<SensorHealthQuery, SensorHealthQueryVariables>) => {
  const chartData = history.map((h) => ({ day: h.day.slice(0, 10), jitter: h.dailyStdDev }))

  return (
    <Card title="Sensor Health (7-Day Stability)" className="[grid-column:span_2]">
      <div className="flex gap-5">
        <div className="flex-1" style={{ height: 220 }}>
          {chartData.length < 2 ? (
            <div className="flex h-full items-center justify-center text-sm text-dash-text-dim">
              {chartData.length === 0
                ? 'No readings in the last 7 days.'
                : 'Not enough readings yet to plot a trend (only 1 day with data).'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Line
                  type="monotone"
                  dataKey="jitter"
                  name="Standard Deviation (Jitter)"
                  stroke="#4a90e2"
                  fill="rgba(74, 144, 226, 0.1)"
                  dot={{ r: 3, fill: '#4a90e2', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="min-w-[150px] text-[0.85rem] leading-relaxed text-dash-text-dim">
          <strong className="text-dash-text-main">Distribution Stats:</strong>
          <br />
          Mean: {metrics ? metrics.meanValue.toFixed(2) : '-'}
          <br />
          Median: {metrics?.medianValue ?? '-'}
          <br />
          Mode: {metrics?.modeValue ?? '-'}
          <br />
          Min/Max: {metrics?.minValue ?? '-'} / {metrics?.maxValue ?? '-'}
          <br />
          <strong className="text-dash-text-main">Std Dev (Jitter):</strong>{' '}
          <span className={metrics && metrics.stdDev < JITTER_TARGET ? 'text-dash-accent-green' : 'text-dash-accent-red'}>
            {metrics ? metrics.stdDev.toFixed(2) : '-'}
          </span>
        </div>
      </div>

      <p className="mt-2.5 text-xs text-slate-500">*Target Jitter: &lt; {JITTER_TARGET}.0 (Lower is better)</p>

      {/* Old page's "readings this week" line lived in the Tank Status
          card even though its data always came from this same fetch —
          moved here, next to the data it actually belongs to. */}
      <div className="mt-3 border-t border-slate-800 pt-3 text-sm text-dash-text-dim">
        <strong className="text-dash-text-main">{metrics?.totalCount ?? 0}</strong> readings this week
      </div>
    </Card>
  )
}
