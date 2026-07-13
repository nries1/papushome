import type { DeviceHealthStatsQuery, DeviceHealthStatsQueryVariables } from 'types/graphql'

import type { CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

export const QUERY: TypedDocumentNode<DeviceHealthStatsQuery, DeviceHealthStatsQueryVariables> = gql`
  query DeviceHealthStatsQuery {
    deviceHealthStats {
      deviceId
      friendlyName
      deviceType
      roomDisplayName
      envReadings7d
      tankReadings7d
      wateringTotal7d
      wateringComplete7d
      wateringErrors7d
      deviceLogErrors7d
    }
  }
`

const POLL_INTERVAL_MS = 60_000

export const beforeQuery = () => ({
  fetchPolicy: 'cache-and-network' as const,
  pollInterval: POLL_INTERVAL_MS,
})

const shellClass = 'mb-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50'

export const Loading = () => (
  <div className={shellClass}>
    <div className="border-b border-slate-700 px-5 py-4">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Device Health · 7d</span>
    </div>
    <div className="p-6 text-center text-xs text-slate-600">Loading…</div>
  </div>
)

export const Empty = () => (
  <div className={shellClass}>
    <div className="border-b border-slate-700 px-5 py-4">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Device Health · 7d</span>
    </div>
    <div className="p-6 text-center text-xs text-slate-600">No devices found.</div>
  </div>
)

const fmtCount = (n: number) => (n > 0 ? n.toLocaleString() : <span className="text-slate-700">—</span>)

const WateringCell = ({
  total,
  complete,
  errors,
}: {
  total: number
  complete: number
  errors: number
}) => {
  if (total === 0) return <span className="text-slate-700">—</span>
  const blocked = total - complete - errors
  return (
    <>
      <span className="text-emerald-400">{complete} ok</span>
      {blocked > 0 && <span className="ml-2 text-amber-400">{blocked} blocked</span>}
      {errors > 0 && <span className="ml-2 text-red-400">{errors} err</span>}
    </>
  )
}

export const Success = ({
  deviceHealthStats,
}: CellSuccessProps<DeviceHealthStatsQuery, DeviceHealthStatsQueryVariables>) => (
  <div className={shellClass}>
    <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Device Health · 7d</span>
    </div>
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-700 text-[10px] uppercase tracking-widest text-slate-500">
          <th className="px-5 py-3 text-left">Device</th>
          <th className="px-5 py-3 text-right">Env Readings</th>
          <th className="px-5 py-3 text-right">Tank Readings</th>
          <th className="px-5 py-3 text-right">Watering</th>
          <th className="px-5 py-3 text-right">Dev Errors</th>
        </tr>
      </thead>
      <tbody>
        {deviceHealthStats.map((d) => (
          <tr key={d.deviceId} className="border-b border-slate-700/50 transition hover:bg-slate-700/20">
            <td className="px-5 py-3 text-slate-300">
              {d.friendlyName || d.deviceId}
              {d.roomDisplayName && <div className="mt-0.5 text-slate-600">{d.roomDisplayName}</div>}
            </td>
            <td className="px-5 py-3 text-right font-mono text-slate-300">{fmtCount(d.envReadings7d)}</td>
            <td className="px-5 py-3 text-right font-mono text-slate-300">{fmtCount(d.tankReadings7d)}</td>
            <td className="px-5 py-3 text-right">
              <WateringCell total={d.wateringTotal7d} complete={d.wateringComplete7d} errors={d.wateringErrors7d} />
            </td>
            <td className="px-5 py-3 text-right font-mono">
              {d.deviceLogErrors7d > 0 ? (
                <span className="text-red-400">{d.deviceLogErrors7d}</span>
              ) : (
                <span className="text-slate-600">0</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
