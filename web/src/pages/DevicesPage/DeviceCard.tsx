import { relativeTime } from 'src/lib/format'

import type { DeviceWithStatus } from './types'

const TYPE_LABELS: Record<string, string> = {
  env_sensor: 'Environment Sensor',
  environment_sensor: 'Environment Sensor',
  pump: 'Water Pump Node',
  rgb_display: 'RGB Display',
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={`text-[0.65rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}
    >
      {children}
    </span>
  )
}

function fmt1(v: number | null | undefined) {
  return v != null ? Number(v).toFixed(1) : '—'
}

function EnvReadingsSection({ device }: { device: DeviceWithStatus }) {
  const r = device.latestEnvReadings
  if (!r) return null
  return (
    <div className="mt-3 pt-3 border-t border-slate-800">
      <div className="text-[0.68rem] uppercase tracking-wide text-slate-500 mb-2">
        Last Reading — <span className="font-normal">{relativeTime(device.latestEnvTimestamp)}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[0.82rem]">
        <div>
          <span className="text-slate-500">Temp</span> <span>{fmt1(r.temperature_f)}°F</span>
        </div>
        <div>
          <span className="text-slate-500">Humidity</span> <span>{fmt1(r.humidity_pct)}%</span>
        </div>
        <div>
          <span className="text-slate-500">Pressure</span> <span>{fmt1(r.pressure_hpa)} hPa</span>
        </div>
        <div>
          <span className="text-slate-500">IAQ</span> <span>{fmt1(r.iaq)}</span>
        </div>
      </div>
    </div>
  )
}

function PumpReadingsSection({
  device,
  isAdmin,
  onEditCapacity,
}: {
  device: DeviceWithStatus
  isAdmin: boolean
  onEditCapacity: () => void
}) {
  const { latestTankReading: tank, latestPumpEvent: pump } = device
  const tankCapacity = device.config?.tank_capacity_gallons ?? 30

  const capacityRow = (
    <div className="mt-2.5 pt-2.5 border-t border-slate-800 flex items-center gap-2 text-[0.8rem] text-slate-400">
      <span>
        Tank size: <strong className="text-white">{tankCapacity} gal</strong>
      </span>
      {isAdmin && (
        <button
          onClick={onEditCapacity}
          className="text-blue-400 text-xs px-1.5 py-0.5 rounded opacity-70 hover:opacity-100 transition"
        >
          Edit
        </button>
      )}
    </div>
  )

  if (!tank && !pump) return capacityRow

  const pct = tank ? Math.round(tank.pctFull) : 0
  const gallons = tank ? ((tank.pctFull / 100) * tankCapacity).toFixed(1) : null
  const barColor = pct > 30 ? 'bg-emerald-400' : pct > 10 ? 'bg-amber-400' : 'bg-red-400'
  const statusColor = pump?.status === 'complete'
    ? 'text-emerald-400'
    : pump?.status?.startsWith('BLOCKED')
      ? 'text-red-400'
      : 'text-slate-400'

  return (
    <>
      <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {tank && (
          <div>
            <div className="text-[0.68rem] uppercase tracking-wide text-slate-500 mb-1">Water Level</div>
            <div className="text-[0.9rem]">
              {gallons} gal <span className="text-slate-500">({pct}%)</span>
            </div>
            <div className="mt-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="text-[0.7rem] text-slate-500 mt-0.5">{relativeTime(tank.timestamp)}</div>
          </div>
        )}
        {pump && (
          <div>
            <div className="text-[0.68rem] uppercase tracking-wide text-slate-500 mb-1">Last Pump Event</div>
            <div className={`text-[0.9rem] ${statusColor}`}>{pump.status ?? '—'}</div>
            <div className="text-[0.7rem] text-slate-500 mt-0.5">{relativeTime(pump.timestamp)}</div>
          </div>
        )}
      </div>
      {capacityRow}
    </>
  )
}

export default function DeviceCard({
  device,
  isAdmin,
  onEditCapacity,
}: {
  device: DeviceWithStatus
  isAdmin: boolean
  onEditCapacity: (deviceId: string) => void
}) {
  const typeLabel = TYPE_LABELS[device.deviceType] ?? device.deviceType ?? '—'
  const isEnv = device.deviceType === 'env_sensor' || device.deviceType === 'environment_sensor'
  const isPump = device.deviceType === 'pump'

  return (
    <div className="bg-slate-800/70 border border-white/10 hover:border-blue-400 hover:-translate-y-0.5 rounded-2xl p-5 transition">
      <div className="flex items-start justify-between gap-2.5 mb-3">
        <div>
          <p className="text-[1.1rem] font-semibold text-white m-0 leading-tight">{device.friendlyName}</p>
          <p className="text-[0.7rem] uppercase tracking-wide text-slate-500 mt-0.5">{typeLabel}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {device.healthy ? (
            <Badge className="bg-emerald-400/15 text-emerald-400 border border-emerald-400/30">Online</Badge>
          ) : (
            <Badge className="bg-red-400/15 text-red-400 border border-red-400/30">Offline</Badge>
          )}
          {device.otaAvailable && (
            <Badge className="bg-sky-400/15 text-sky-400 border border-sky-400/30">OTA</Badge>
          )}
        </div>
      </div>

      <div className="mb-2">
        {device.healthy ? (
          <Badge className="bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">Healthy</Badge>
        ) : (
          <Badge className="bg-amber-400/10 text-amber-400 border border-amber-400/20">No recent logs</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-3 text-[0.82rem]">
        <div>
          <label className="block text-[0.68rem] uppercase tracking-wide text-slate-500 mb-0.5">Room</label>
          <span className="text-white break-all">{device.roomDisplayName ?? device.roomName ?? '—'}</span>
        </div>
        <div>
          <label className="block text-[0.68rem] uppercase tracking-wide text-slate-500 mb-0.5">Device ID</label>
          <span className="text-white break-all">{device.deviceId}</span>
        </div>
        <div>
          <label className="block text-[0.68rem] uppercase tracking-wide text-slate-500 mb-0.5">IP Address</label>
          <span className="text-white break-all">{device.ipAddress ?? <span className="text-slate-500">—</span>}</span>
        </div>
        <div>
          <label className="block text-[0.68rem] uppercase tracking-wide text-slate-500 mb-0.5">Last Boot</label>
          <span
            className="text-white break-all"
            title={device.lastBoot ? new Date(device.lastBoot).toLocaleString() : ''}
          >
            {relativeTime(device.lastBoot)}
          </span>
        </div>
        <div>
          <label className="block text-[0.68rem] uppercase tracking-wide text-slate-500 mb-0.5">Last Seen</label>
          <span
            className="text-white break-all"
            title={device.lastSeen ? new Date(device.lastSeen).toLocaleString() : ''}
          >
            {relativeTime(device.lastSeen)}
          </span>
        </div>
      </div>

      {isEnv && <EnvReadingsSection device={device} />}
      {isPump && (
        <PumpReadingsSection device={device} isAdmin={isAdmin} onEditCapacity={() => onEditCapacity(device.deviceId)} />
      )}
    </div>
  )
}
