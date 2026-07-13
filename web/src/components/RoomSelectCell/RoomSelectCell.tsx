import { useEffect } from 'react'

import type { PlantCareRoomsQuery, PlantCareRoomsQueryVariables } from 'types/graphql'

import type { CellFailureProps, CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

export const QUERY: TypedDocumentNode<PlantCareRoomsQuery, PlantCareRoomsQueryVariables> = gql`
  query PlantCareRoomsQuery {
    rooms {
      name
      displayName
      devices {
        deviceId
        deviceType
      }
    }
  }
`

export interface SelectedRoom {
  roomName: string
  roomDisplayName: string
  deviceId: string | null
}

interface RoomSelectPassthroughProps {
  onRoomSelected: (room: SelectedRoom) => void
}

const selectClass = 'rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200'

export const Loading = () => (
  <select disabled className={selectClass}>
    <option>Loading...</option>
  </select>
)

export const Empty = () => (
  <select disabled className={selectClass}>
    <option>No rooms configured</option>
  </select>
)

export const Failure = ({ error }: CellFailureProps<PlantCareRoomsQueryVariables>) => (
  <span className="text-sm text-dash-accent-red">Failed to load rooms: {error?.message}</span>
)

// The old REST endpoint (server/database/dao.ts's getRoomsWithDevices) only
// ever included `device_type = 'pump'` devices in each room's device list —
// the new generic `Room.devices` relation (Diff 1) returns every device
// type. Filtering here reproduces the old, correct-for-this-page behavior
// (every real room in this app has both a pump and an env sensor; picking
// devices[0] unfiltered would sometimes grab the sensor instead).
const findPumpDeviceId = (devices: PlantCareRoomsQuery['rooms'][number]['devices']) =>
  devices.find((d) => d.deviceType === 'pump')?.deviceId ?? null

export const Success = ({
  rooms,
  onRoomSelected,
}: CellSuccessProps<PlantCareRoomsQuery, PlantCareRoomsQueryVariables> & RoomSelectPassthroughProps) => {
  // Auto-select the first room on initial load, matching the old page's
  // `applyRoomSelection(select.options[0])` — intentionally only on mount,
  // not on every `rooms`/`onRoomSelected` identity change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const first = rooms[0]
    if (first) {
      onRoomSelected({
        roomName: first.name,
        roomDisplayName: first.displayName,
        deviceId: findPumpDeviceId(first.devices),
      })
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const room = rooms.find((r) => r.name === e.target.value)
    if (room) {
      onRoomSelected({
        roomName: room.name,
        roomDisplayName: room.displayName,
        deviceId: findPumpDeviceId(room.devices),
      })
    }
  }

  return (
    <select onChange={handleChange} className={selectClass}>
      {rooms.map((r) => (
        <option key={r.name} value={r.name}>
          {r.displayName}
        </option>
      ))}
    </select>
  )
}
