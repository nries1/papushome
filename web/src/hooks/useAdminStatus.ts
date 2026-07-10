import { useEffect, useState } from 'react'

import { apiFetch } from 'src/lib/apiFetch'

interface AdminStatus {
  isAdmin: boolean
  email: string
  displayName: string
}

interface UseAdminStatusResult {
  isAdmin: boolean
  email: string | null
  displayName: string | null
  loading: boolean
}

// Wraps GET /admin-status (api/src/functions/adminStatus.ts). Returns
// isAdmin: false while loading or unauthenticated — callers should treat
// "not yet known" and "not an admin" the same way (hide the admin UI),
// same as the old pages did while the fetch was in flight.
export function useAdminStatus(): UseAdminStatusResult {
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    apiFetch<AdminStatus>('/adminStatus')
      .then((data) => {
        if (!cancelled) setStatus(data)
      })
      .catch(() => {
        if (!cancelled) setStatus(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return {
    isAdmin: status?.isAdmin ?? false,
    email: status?.email ?? null,
    displayName: status?.displayName ?? null,
    loading,
  }
}
