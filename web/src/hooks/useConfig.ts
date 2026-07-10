import { useEffect, useState } from 'react'

import { apiFetch } from 'src/lib/apiFetch'

interface AppConfig {
  reactions: string[]
  locationLabel: string
  aiPlaceholder: string
  mediaPathPrefix: string
}

// Wraps GET /config (api/src/functions/config.ts) — static, env-derived UI
// bootstrap config, public/no-auth.
export function useConfig(): { config: AppConfig | null; loading: boolean } {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    apiFetch<AppConfig>('/config')
      .then((data) => {
        if (!cancelled) setConfig(data)
      })
      .catch(() => {
        if (!cancelled) setConfig(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { config, loading }
}
