import { useState } from 'react'

import { useQuery } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import DashboardLayout from 'src/layouts/DashboardLayout/DashboardLayout'
import { useAdminStatus } from 'src/hooks/useAdminStatus'

import AddDeviceModal from './AddDeviceModal'
import DeviceCard from './DeviceCard'
import DeviceConfigModal from './DeviceConfigModal'
import { DEVICES_WITH_STATUS_QUERY, ROOMS_QUERY } from './queries'
import type { DeviceWithStatus, Room } from './types'

const POLL_INTERVAL_MS = 30_000

const DevicesPage = () => {
  const { isAdmin } = useAdminStatus()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [configDeviceId, setConfigDeviceId] = useState<string | null>(null)

  const { data, loading, error, refetch } = useQuery<{ devicesWithStatus: DeviceWithStatus[] }>(
    DEVICES_WITH_STATUS_QUERY,
    { pollInterval: POLL_INTERVAL_MS },
  )

  const { data: roomsData } = useQuery<{ rooms: Room[] }>(ROOMS_QUERY, { skip: !addModalOpen })

  const devices = data?.devicesWithStatus ?? []
  const configDevice = devices.find((d) => d.deviceId === configDeviceId) ?? null

  return (
    <>
      <Metadata title="Devices" description="Device inventory and status" />

      <DashboardLayout
        title="Devices"
        actions={
          isAdmin && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="bg-sky-400 hover:opacity-85 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl transition"
            >
              + Add Device
            </button>
          )
        }
      >
        {loading && !data && <div className="text-center text-slate-400 py-16">Loading devices...</div>}
        {error && <div className="text-center text-red-400 py-16">Failed to load devices.</div>}

        {!loading && !error && devices.length === 0 && (
          <div className="text-center text-slate-400 py-16">
            No devices registered yet.{isAdmin && ' Add one with the button above.'}
          </div>
        )}

        {devices.length > 0 && (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {devices.map((d) => (
              <DeviceCard key={d.deviceId} device={d} isAdmin={isAdmin} onEditCapacity={setConfigDeviceId} />
            ))}
          </div>
        )}
      </DashboardLayout>

      {addModalOpen && (
        <AddDeviceModal
          rooms={roomsData?.rooms ?? []}
          onClose={() => setAddModalOpen(false)}
          onCreated={() => refetch()}
        />
      )}

      {configDevice && (
        <DeviceConfigModal
          device={configDevice}
          onClose={() => setConfigDeviceId(null)}
          onSaved={() => refetch()}
        />
      )}
    </>
  )
}

export default DevicesPage
