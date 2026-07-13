import { Metadata } from '@redwoodjs/web'

import DeviceHealthStatsCell from 'src/components/DeviceHealthStatsCell'
import { useHealth } from 'src/hooks/useHealth'
import { useHostStats } from 'src/hooks/useHostStats'
import DashboardLayout from 'src/layouts/DashboardLayout/DashboardLayout'

type DotStatus = 'ok' | 'stale' | 'offline'

const DOT_COLORS: Record<DotStatus, string> = {
  ok: 'bg-emerald-400',
  stale: 'bg-amber-400',
  offline: 'bg-red-500',
}

const formatAge = (ms: number | null) => {
  if (ms === null) return 'never'
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`
  return `${Math.round(ms / 60_000)}m ago`
}

const ServiceTile = ({ label, status, detail }: { label: string; status: DotStatus | null; detail: string }) => (
  <div className="flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <div className="ml-auto flex items-center gap-1.5">
        <div
          className={`h-2 w-2 rounded-full transition-colors duration-300 ${status ? DOT_COLORS[status] : 'bg-slate-600'}`}
        />
        <span className="text-[11px] text-slate-500">{detail}</span>
      </div>
    </div>
  </div>
)

const SystemHealthPage = () => {
  const { health } = useHealth()
  const { stats } = useHostStats()

  const aiStatus: DotStatus | null = !health
    ? null
    : health.visionWorker.status === 'ok' || health.publisher.status === 'ok'
      ? 'ok'
      : health.visionWorker.status === 'stale' || health.publisher.status === 'stale'
        ? 'stale'
        : 'offline'

  const workerAge = health?.visionWorker.lastSeenMs != null ? `worker ${formatAge(health.visionWorker.lastSeenMs)}` : null
  const framesAge = health?.publisher.lastSeenMs != null ? `frames ${formatAge(health.publisher.lastSeenMs)}` : null

  return (
    <>
      <Metadata title="System Health" description="Service status and diagnostics" />

      <DashboardLayout title="System Health">
        <div className="mb-6 grid grid-cols-3 gap-4">
          <ServiceTile label="API" status={health ? 'ok' : 'offline'} detail={health ? 'responding' : 'unreachable'} />
          <ServiceTile
            label="MQTT Broker"
            status={health ? (health.mqtt === 'ok' ? 'ok' : 'offline') : null}
            detail={health ? (health.mqtt === 'ok' ? 'connected' : 'offline') : ''}
          />
          <ServiceTile label="AI" status={aiStatus} detail={[workerAge, framesAge].filter(Boolean).join(' · ') || 'no activity'} />
        </div>

        <DeviceHealthStatsCell />

        <div className="mb-6 flex flex-col gap-6 rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
          <div>
            <div className="mb-2 flex items-end justify-between">
              <div>
                <span className="mb-1 block text-xs text-slate-400">CPU Load</span>
                <span className="font-mono text-2xl leading-none text-blue-400">{stats ? `${stats.cpu}%` : '--%'}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-bold uppercase text-slate-500">Server Temp</span>
                <span className="rounded bg-emerald-900/30 px-2 py-0.5 font-mono text-sm text-emerald-400">
                  {stats ? `${stats.temp}°C` : '--°C'}
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${stats?.cpu ?? 0}%` }} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-end justify-between">
              <span className="text-xs text-slate-400">Memory Usage</span>
              <span className="font-mono text-xl text-purple-400">{stats ? `${stats.mem}%` : '--%'}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
              <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${stats?.mem ?? 0}%` }} />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  )
}

export default SystemHealthPage
