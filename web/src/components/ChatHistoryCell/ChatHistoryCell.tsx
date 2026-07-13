import { useEffect } from 'react'

import type { ChatHistoryQuery, ChatHistoryQueryVariables } from 'types/graphql'

import type { CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

export const QUERY: TypedDocumentNode<ChatHistoryQuery, ChatHistoryQueryVariables> = gql`
  query ChatHistoryQuery($sessionKey: String!) {
    chatSession(sessionKey: $sessionKey) {
      messages {
        role
        content
      }
    }
  }
`

export const beforeQuery = (props: { sessionKey: string }) => ({
  variables: { sessionKey: props.sessionKey },
  fetchPolicy: 'network-only' as const,
})

export interface ChatHistoryMessage {
  role: string
  content: string
}

interface ChatHistoryPassthroughProps {
  onHistory: (messages: ChatHistoryMessage[]) => void
}

// Headless, like DisplayNamesCell/LatestAiSummaryCell. Loading renders
// nothing and reports nothing — the page needs to wait for a definitive
// answer before deciding whether to show the greeting fallback (matches the
// old page's `loadSessionHistory().then(() => true).catch(() => false)`,
// which only resolves once, not while still in flight).
export const Loading = () => null

const reportEmpty = () => {
  const Reporter = ({ onHistory }: ChatHistoryPassthroughProps) => {
    useEffect(() => {
      onHistory([])
    }, [onHistory])
    return null
  }
  return Reporter
}

export const Failure = reportEmpty()
export const Empty = reportEmpty()

export const Success = ({
  chatSession,
  onHistory,
}: CellSuccessProps<ChatHistoryQuery, ChatHistoryQueryVariables> & ChatHistoryPassthroughProps) => {
  useEffect(() => {
    onHistory(chatSession?.messages ?? [])
  }, [chatSession, onHistory])
  return null
}
