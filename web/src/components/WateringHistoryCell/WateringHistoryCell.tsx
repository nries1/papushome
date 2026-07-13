import type { WateringHistoryQuery, WateringHistoryQueryVariables } from 'types/graphql'

import type { CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

import Card from 'src/components/Card/Card'

export const QUERY: TypedDocumentNode<WateringHistoryQuery, WateringHistoryQueryVariables> = gql`
  query WateringHistoryQuery($deviceId: String) {
    wateringEvents(deviceId: $deviceId, page: 0, rows: 10, order: "DESC") {
      id
      deviceId
      timestamp
      durationMs
      status
    }
  }
`

export const beforeQuery = (props: { deviceId: string | null }) => ({
  variables: { deviceId: props.deviceId },
  fetchPolicy: 'cache-and-network' as const,
})

export const Loading = () => (
  <Card title="Recent Watering History" className="[grid-column:1/-1]">
    <p className="text-sm text-dash-text-dim">Loading...</p>
  </Card>
)

export const Empty = () => (
  <>
    <Card title="Last Watering">
      <p className="text-sm text-dash-text-dim">No watering history available yet.</p>
    </Card>
    <Card title="Recent Watering History" className="[grid-column:1/-1]">
      <p className="text-sm text-dash-text-dim">No watering history available yet.</p>
    </Card>
  </>
)

export const Success = ({ wateringEvents }: CellSuccessProps<WateringHistoryQuery, WateringHistoryQueryVariables>) => {
  // The old page's equivalent check compared against 'COMPLETE' (uppercase)
  // — real status values are lowercase ('complete'/'requested'/
  // 'BLOCKED_LOW_WATER', confirmed against real data), so that check never
  // actually matched and always silently fell back to the most recent event
  // regardless of status. Fixed here to the real value.
  const latestComplete = wateringEvents.find((e) => e.status === 'complete') ?? wateringEvents[0]

  return (
    <>
      <Card title="Last Watering">
        <p className="text-sm text-dash-text-dim">
          Completed:{' '}
          <strong className="text-dash-text-main">
            {latestComplete.timestamp ? new Date(latestComplete.timestamp).toLocaleString() : 'Unknown time'}
          </strong>
          <br />
          Duration:{' '}
          <strong className="text-dash-text-main">
            {latestComplete.durationMs ? `${latestComplete.durationMs / 1000}s` : 'Unknown'}
          </strong>
        </p>
      </Card>

      <Card title="Recent Watering History" className="[grid-column:1/-1]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-dash-text-dim">
              <th className="pb-2">Date/Time</th>
              <th className="pb-2">Device</th>
              <th className="pb-2">Duration</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {wateringEvents.map((e) => (
              <tr key={e.id} className="border-t border-slate-800">
                <td className="py-1.5">{e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}</td>
                <td className="py-1.5">{e.deviceId}</td>
                <td className="py-1.5">{e.durationMs ? `${e.durationMs / 1000}s` : '—'}</td>
                <td className="py-1.5">{e.status ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
