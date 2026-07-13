import { useState } from 'react'

import { Metadata } from '@redwoodjs/web'

import DevicesWithStatusCell from 'src/components/DevicesWithStatusCell'
import RoomsCell from 'src/components/RoomsCell'
import { useAdminStatus } from 'src/hooks/useAdminStatus'
import DashboardLayout from 'src/layouts/DashboardLayout/DashboardLayout'

const DevicesPage = () => {
  const { isAdmin } = useAdminStatus()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [configDeviceId, setConfigDeviceId] = useState<string | null>(null)

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
        <DevicesWithStatusCell
          isAdmin={isAdmin}
          configDeviceId={configDeviceId}
          onEditCapacity={setConfigDeviceId}
          onCloseConfig={() => setConfigDeviceId(null)}
        />
      </DashboardLayout>

      {addModalOpen && <RoomsCell onClose={() => setAddModalOpen(false)} />}
    </>
  )
}

export default DevicesPage
