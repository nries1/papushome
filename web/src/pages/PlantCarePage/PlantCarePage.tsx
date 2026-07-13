import { useState } from 'react'

import { Metadata } from '@redwoodjs/web'

import Card from 'src/components/Card/Card'
import CanWaterCell from 'src/components/CanWaterCell'
import EnvironmentTempCell from 'src/components/EnvironmentTempCell'
import RoomSelectCell from 'src/components/RoomSelectCell'
import type { SelectedRoom } from 'src/components/RoomSelectCell'
import SensorHealthCell from 'src/components/SensorHealthCell'
import TankStatusCell from 'src/components/TankStatusCell'
import WateringHistoryCell from 'src/components/WateringHistoryCell'
import DashboardLayout from 'src/layouts/DashboardLayout/DashboardLayout'

const PlantCarePage = () => {
  const [room, setRoom] = useState<SelectedRoom | null>(null)

  return (
    <>
      <Metadata title="Plant Care" description="Watering, moisture, and tank levels" />

      <DashboardLayout title="Plant Care" actions={<RoomSelectCell onRoomSelected={setRoom} />}>
        {room && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
            <EnvironmentTempCell roomName={room.roomName} roomDisplayName={room.roomDisplayName} />

            {room.deviceId ? (
              <>
                <TankStatusCell deviceId={room.deviceId} />
                <CanWaterCell deviceId={room.deviceId} />
              </>
            ) : (
              <Card title="Water Tank Status">
                <p className="text-sm text-dash-text-dim">No pump device in this room.</p>
              </Card>
            )}

            <SensorHealthCell deviceId={room.deviceId} />
            <WateringHistoryCell deviceId={room.deviceId} />
          </div>
        )}
      </DashboardLayout>
    </>
  )
}

export default PlantCarePage
