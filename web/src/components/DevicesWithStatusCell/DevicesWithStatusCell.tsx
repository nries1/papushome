import type {
  DevicesWithStatusQuery,
  DevicesWithStatusQueryVariables,
} from 'types/graphql'

import type {
  CellFailureProps,
  CellSuccessProps,
  TypedDocumentNode,
} from '@redwoodjs/web'

import DeviceCard from 'src/pages/DevicesPage/DeviceCard'
import DeviceConfigModal from 'src/pages/DevicesPage/DeviceConfigModal'
import type { DeviceWithStatus } from 'src/pages/DevicesPage/types'

export const QUERY: TypedDocumentNode<
  DevicesWithStatusQuery,
  DevicesWithStatusQueryVariables
> = gql`
  query DevicesWithStatusQuery {
    devicesWithStatus {
      deviceId
      friendlyName
      deviceType
      config
      roomName
      roomDisplayName
      ipAddress
      lastBoot
      lastSeen
      healthy
      otaAvailable
      latestEnvReadings
      latestEnvTimestamp
      latestTankReading {
        rawValue
        gallons
        pctFull
        timestamp
      }
      latestPumpEvent {
        status
        action
        timestamp
      }
    }
  }
`

const POLL_INTERVAL_MS = 30_000

export const beforeQuery = () => ({
  fetchPolicy: 'cache-and-network' as const,
  notifyOnNetworkStatusChange: true,
  pollInterval: POLL_INTERVAL_MS,
})

export const Loading = () => (
  <div className="py-16 text-center text-slate-400">Loading devices...</div>
)

export const Failure = ({
  error,
}: CellFailureProps<DevicesWithStatusQueryVariables>) => (
  <div className="py-16 text-center text-red-400">
    Failed to load devices. {error?.message}
  </div>
)

interface DevicesWithStatusPassthroughProps {
  isAdmin: boolean
  configDeviceId: string | null
  onEditCapacity: (deviceId: string) => void
  onCloseConfig: () => void
}

export const Empty = ({ isAdmin }: DevicesWithStatusPassthroughProps) => (
  <div className="py-16 text-center text-slate-400">
    No devices registered yet.{isAdmin && ' Add one with the button above.'}
  </div>
)

export const Success = ({
  devicesWithStatus,
  isAdmin,
  configDeviceId,
  onEditCapacity,
  onCloseConfig,
}: CellSuccessProps<DevicesWithStatusQuery, DevicesWithStatusQueryVariables> &
  DevicesWithStatusPassthroughProps) => {
  // config/latestEnvReadings come back typed as the generic JSON scalar
  // (Prisma.JsonValue); cast once here to the specific shape DeviceCard/
  // DeviceConfigModal actually expect, rather than at every field read.
  const devices = devicesWithStatus as unknown as DeviceWithStatus[]
  const configDevice =
    devices.find((d) => d.deviceId === configDeviceId) ?? null

  return (
    <>
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
      >
        {devices.map((d) => (
          <DeviceCard
            key={d.deviceId}
            device={d}
            isAdmin={isAdmin}
            onEditCapacity={onEditCapacity}
          />
        ))}
      </div>

      {configDevice && (
        <DeviceConfigModal device={configDevice} onClose={onCloseConfig} />
      )}
    </>
  )
}
