import type { LatestTemperatureQuery, LatestTemperatureQueryVariables } from 'types/graphql'

import type { CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

import Card from 'src/components/Card/Card'

export const QUERY: TypedDocumentNode<LatestTemperatureQuery, LatestTemperatureQueryVariables> = gql`
  query LatestTemperatureQuery($roomName: String) {
    latestEnvironmentReading(metric: "temperature_f", roomName: $roomName) {
      readings
    }
  }
`

export const beforeQuery = (props: { roomName: string | null }) => ({
  variables: { roomName: props.roomName },
  fetchPolicy: 'cache-and-network' as const,
})

interface Props {
  roomDisplayName: string
}

const renderCard = (value: string, roomDisplayName: string) => (
  <Card title="Environment">
    <div className="text-4xl font-bold text-dash-text-main">{value}°F</div>
    <p className="mt-1 text-sm text-dash-text-dim">{roomDisplayName} Temperature</p>
  </Card>
)

export const Loading = ({ roomDisplayName }: Props) => renderCard('—', roomDisplayName)
export const Failure = ({ roomDisplayName }: Props) => renderCard('—', roomDisplayName)

export const Success = ({
  latestEnvironmentReading,
  roomDisplayName,
}: CellSuccessProps<LatestTemperatureQuery, LatestTemperatureQueryVariables> & Props) => {
  const value = (latestEnvironmentReading?.readings as { value?: number } | null)?.value
  return renderCard(value != null ? value.toFixed(1) : '—', roomDisplayName)
}
