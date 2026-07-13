import { useEffect } from 'react'

import type { DisplayNamesQuery, DisplayNamesQueryVariables } from 'types/graphql'

import type { CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

export const QUERY: TypedDocumentNode<DisplayNamesQuery, DisplayNamesQueryVariables> = gql`
  query DisplayNamesQuery {
    users {
      email
      displayName
    }
  }
`

export interface DisplayUser {
  email: string
  displayName: string
}

// Headless — same pattern as LatestAiSummaryCell. RobotPage needs this as a
// lookup table (resolve a face-recognition name to a nicer display name),
// not as a rendered region.
interface UsersPassthroughProps {
  onUsers: (users: DisplayUser[]) => void
}

const report = (users: DisplayUser[]) => {
  const Reporter = ({ onUsers }: UsersPassthroughProps) => {
    useEffect(() => {
      onUsers(users)
    }, [onUsers])
    return null
  }
  return Reporter
}

export const Loading = () => null
export const Empty = report([])
export const Failure = report([])

export const Success = ({
  users,
  onUsers,
}: CellSuccessProps<DisplayNamesQuery, DisplayNamesQueryVariables> & UsersPassthroughProps) => {
  useEffect(() => {
    onUsers(users)
  }, [users, onUsers])
  return null
}
