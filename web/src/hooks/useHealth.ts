import { useEffect, useState } from 'react'

import { apiFetch } from 'src/lib/apiFetch'

export interface HealthStatus {
  api: string
  mqtt: string
  visionWorker: { status: 'ok' | 'stale' | 'offline'; lastSeenMs: number | null }
  publisher: { status: 'ok' | 'stale' | 'offline'; lastSeenMs: number | null }
}

const POLL_INTERVAL_MS = 15_000

// Wraps GET /health (api/src/functions/health.ts), public/no-auth. `health`
// is null both while loading and if the fetch itself fails outright —
// callers should treat those the same as "can't tell", same as the old
// page's catch block only knew how to force the API tile to offline.
export function useHealth(): { health: HealthStatus | null } {
  const [health, setHealth] = useState<HealthStatus | null>(null)

  useEffect(() => {
    let cancelled = false

    const poll = () => {
      apiFetch<HealthStatus>('/health')
        .then((data) => {
          if (!cancelled) setHealth(data)
        })
        .catch(() => {
          if (!cancelled) setHealth(null)
        })
    }

    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return { health }
}
