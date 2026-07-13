import { useEffect, useState } from 'react'

// Replaces html/index.html and robot.html's direct browser->MQTT websocket
// connection (mqtt.js against ws://<host>:9001) with the API's own SSE
// endpoint (api/src/server.ts's /vision/stream route). The broker allows
// anonymous read/write to every topic, including the pump actuator command
// topic — fine for a trusted device on the local network, not for a browser
// tab. /vision/stream rides the same CF-Access auth as the rest of the API
// and is read-only. See redwoodmigration.md Diff 6 for the full rationale.
export interface TrackingFace {
  pan_delta: number
  tilt_delta: number
}

export interface ResultFace extends TrackingFace {
  name: string
  confidence: number
}

interface VisionStreamState {
  tracking: { faces: TrackingFace[] } | null
  result: { faces: ResultFace[] } | null
  connected: boolean
}

export function useVisionStream(): VisionStreamState {
  const [tracking, setTracking] = useState<VisionStreamState['tracking']>(null)
  const [result, setResult] = useState<VisionStreamState['result']>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const source = new EventSource(`${globalThis.RWJS_API_URL}/vision/stream`)

    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false)

    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { type?: string }
        if (data.type === 'tracking') setTracking(data as VisionStreamState['tracking'])
        else if (data.type === 'result') setResult(data as VisionStreamState['result'])
      } catch {
        // The `: connected` keepalive comment (and any other malformed
        // frame) has no `data:` field at all, so JSON.parse never even
        // runs for it in practice — this guards genuinely malformed data.
      }
    }

    return () => {
      source.close()
      setConnected(false)
    }
  }, [])

  return { tracking, result, connected }
}
