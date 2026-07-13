import { useEffect, useState } from 'react'

import { apiFetch } from 'src/lib/apiFetch'

export interface HostStats {
  cpu: number
  mem: number
  temp: number | string
}

const POLL_INTERVAL_MS = 3000

// Wraps GET /stats (api/src/functions/stats.ts), CF-auth required.
export function useHostStats(): { stats: HostStats | null } {
  const [stats, setStats] = useState<HostStats | null>(null)

  useEffect(() => {
    let cancelled = false

    const poll = () => {
      apiFetch<HostStats>('/stats')
        .then((data) => {
          if (!cancelled) setStats(data)
        })
        .catch(() => {
          if (!cancelled) setStats(null)
        })
    }

    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return { stats }
}
