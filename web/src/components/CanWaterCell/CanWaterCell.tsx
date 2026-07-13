import { useState } from 'react'

import type { CanWaterQuery, CanWaterQueryVariables } from 'types/graphql'

import { useMutation } from '@redwoodjs/web'
import type { CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

import Card from 'src/components/Card/Card'

export const QUERY: TypedDocumentNode<CanWaterQuery, CanWaterQueryVariables> = gql`
  query CanWaterQuery($deviceId: String) {
    canWater(deviceId: $deviceId) {
      canWater
      disabledReasons
    }
  }
`

export const beforeQuery = (props: { deviceId: string | null }) => ({
  variables: { deviceId: props.deviceId },
  fetchPolicy: 'cache-and-network' as const,
})

const WATER_DEVICE_MUTATION = gql`
  mutation WaterDeviceMutation($deviceId: String!, $durationSeconds: Int!) {
    waterDevice(deviceId: $deviceId, durationSeconds: $durationSeconds) {
      message
    }
  }
`

// The old page let the client set this to anything 10-90 with no server
// bound; waterDevice (Diff 4) actually clamps 5-120 server-side, deliberate
// hardening since this triggers a real pump. Matching the UI's bounds to
// what the server really enforces rather than showing the old, no-longer-
// accurate 10-90 range.
const MIN_SECONDS = 5
const MAX_SECONDS = 120
const DEFAULT_SECONDS = 10

const inputClass = 'w-[70px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-slate-200'

export const Loading = () => (
  <Card title="Manual Override">
    <p className="text-sm text-dash-text-dim">Checking eligibility...</p>
  </Card>
)

export const Failure = () => (
  <Card title="Manual Override">
    <span className="text-sm text-dash-accent-red">Failed to check watering eligibility.</span>
  </Card>
)

interface Props {
  deviceId: string
}

export const Success = ({
  canWater: canWaterResult,
  deviceId,
}: CellSuccessProps<CanWaterQuery, CanWaterQueryVariables> & Props) => {
  const [duration, setDuration] = useState(DEFAULT_SECONDS)
  const [message, setMessage] = useState<string | null>(null)

  const [waterDevice, { loading }] = useMutation(WATER_DEVICE_MUTATION, {
    refetchQueries: ['CanWaterQuery', 'WateringHistoryQuery'],
    onCompleted: (data) => setMessage(data.waterDevice.message),
    onError: (err) => setMessage(err.message),
  })

  const disabled = !canWaterResult.canWater || loading

  return (
    <Card title="Manual Override">
      <label htmlFor="water-duration" className="mr-2 text-sm text-dash-text-dim">
        Duration (seconds):
      </label>
      <input
        id="water-duration"
        type="number"
        min={MIN_SECONDS}
        max={MAX_SECONDS}
        step={5}
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value))}
        className={`${inputClass} mr-2`}
      />
      <button
        disabled={disabled}
        title={canWaterResult.disabledReasons.join('\n')}
        onClick={() => {
          const clamped = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, duration))
          waterDevice({ variables: { deviceId, durationSeconds: clamped } })
        }}
        className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Watering…' : 'WATER NOW'}
      </button>
      {message && <p className="mt-2 text-sm text-dash-text-dim">{message}</p>}
    </Card>
  )
}
