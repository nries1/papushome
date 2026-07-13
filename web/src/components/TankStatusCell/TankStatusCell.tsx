import type { TankStatusQuery, TankStatusQueryVariables } from 'types/graphql'

import type { CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

import Card from 'src/components/Card/Card'
import type { DeviceConfig } from 'src/pages/DevicesPage/types'

// deviceConfig(deviceId: String!) is non-null, unlike tankReadings' deviceId
// (nullable) — so this cell (and the page rendering it) requires a real
// device, rather than trying to make one query variable serve both a
// nullable and non-null argument position.
export const QUERY: TypedDocumentNode<TankStatusQuery, TankStatusQueryVariables> = gql`
  query TankStatusQuery($deviceId: String!) {
    tankReadings(deviceId: $deviceId, rows: 1) {
      gallons
    }
    deviceConfig(deviceId: $deviceId)
  }
`

export const beforeQuery = (props: { deviceId: string }) => ({
  variables: { deviceId: props.deviceId },
  fetchPolicy: 'cache-and-network' as const,
})

const DEFAULT_CAPACITY_GALLONS = 30

const renderCard = (gallons: string, capacity: number) => (
  <Card title="Water Tank Status">
    <div className="text-4xl font-bold text-dash-text-main">
      {gallons} <span className="text-lg font-normal text-dash-text-dim">/ {capacity}</span>
    </div>
    <p className="mt-1 text-sm text-dash-text-dim">Gallons Remaining</p>
  </Card>
)

export const Loading = () => renderCard('...', DEFAULT_CAPACITY_GALLONS)
export const Failure = () => renderCard('—', DEFAULT_CAPACITY_GALLONS)

export const Success = ({ tankReadings, deviceConfig }: CellSuccessProps<TankStatusQuery, TankStatusQueryVariables>) => {
  const capacity = (deviceConfig as DeviceConfig)?.tank_capacity_gallons ?? DEFAULT_CAPACITY_GALLONS
  const gallons = tankReadings[0]?.gallons
  return renderCard(gallons != null ? gallons.toFixed(1) : '—', capacity)
}
