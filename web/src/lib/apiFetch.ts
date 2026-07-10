// Thin wrapper for hitting plain Redwood Functions (api/src/functions/*.ts),
// which aren't GraphQL and so don't go through Apollo. Uses the same
// RWJS_API_URL global Redwood's own Apollo setup resolves the GraphQL
// endpoint from, so the api base stays consistent across both paths.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${globalThis.RWJS_API_URL}${path}`, {
    credentials: 'include',
    ...init,
  })

  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<T>
}
