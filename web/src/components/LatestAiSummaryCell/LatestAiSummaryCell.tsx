import { useEffect } from 'react'

import type { LatestAiSummaryQuery, LatestAiSummaryQueryVariables } from 'types/graphql'

import type { CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

export const QUERY: TypedDocumentNode<LatestAiSummaryQuery, LatestAiSummaryQueryVariables> = gql`
  query LatestAiSummaryQuery {
    latestAiSummary {
      summary
    }
  }
`

// A "headless" cell — HomePage needs the summary text fed into its own
// speech-bubble state machine (mixed with the config placeholder fallback,
// greeting overrides, truncation), not rendered as a standalone UI region,
// so every state just reports up via a callback and renders nothing.
interface SummaryPassthroughProps {
  onSummary: (summary: string | null) => void
}

const report = (summary: string | null) => {
  const Reporter = ({ onSummary }: SummaryPassthroughProps) => {
    useEffect(() => {
      onSummary(summary)
    }, [onSummary])
    return null
  }
  return Reporter
}

export const Loading = report(null)
export const Empty = report(null)
export const Failure = report(null)

export const Success = ({
  latestAiSummary,
  onSummary,
}: CellSuccessProps<LatestAiSummaryQuery, LatestAiSummaryQueryVariables> & SummaryPassthroughProps) => {
  useEffect(() => {
    onSummary(latestAiSummary?.summary ?? null)
  }, [latestAiSummary, onSummary])
  return null
}
