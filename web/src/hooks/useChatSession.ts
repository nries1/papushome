import { useEffect, useState } from 'react'

import { useMutation } from '@redwoodjs/web'

const START_CHAT_SESSION_MUTATION = gql`
  mutation StartChatSessionMutation($sessionKey: String!, $prevSessionKey: String) {
    startChatSession(sessionKey: $sessionKey, prevSessionKey: $prevSessionKey) {
      id
    }
  }
`

const SESSION_STORAGE_KEY = 'papu-session-key'
const LAST_SESSION_STORAGE_KEY = 'papu-last-session-key'

// Ported from robot.html's initSession(): one session per browser tab
// (sessionStorage), with the previous tab's session key kept in
// localStorage so the server can summarize it once this new one starts.
export function useChatSession(): { sessionKey: string | null } {
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [startChatSession] = useMutation(START_CHAT_SESSION_MUTATION)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const existing = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (existing) {
        if (!cancelled) setSessionKey(existing)
        return
      }

      const newKey = crypto.randomUUID()
      sessionStorage.setItem(SESSION_STORAGE_KEY, newKey)
      const prevSessionKey = localStorage.getItem(LAST_SESSION_STORAGE_KEY)
      localStorage.setItem(LAST_SESSION_STORAGE_KEY, newKey)

      try {
        await startChatSession({ variables: { sessionKey: newKey, prevSessionKey } })
      } catch {
        // Matches the old page's swallowed fetch failure — still proceed
        // with the locally-generated key so the rest of the page isn't
        // blocked on this succeeding.
      }
      if (!cancelled) setSessionKey(newKey)
    }

    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { sessionKey }
}
