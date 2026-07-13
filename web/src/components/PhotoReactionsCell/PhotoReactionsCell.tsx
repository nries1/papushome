import { useRef, useState } from 'react'

import type { PhotoReactionsQuery, PhotoReactionsQueryVariables } from 'types/graphql'

import { useMutation } from '@redwoodjs/web'
import type { CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

export const QUERY: TypedDocumentNode<PhotoReactionsQuery, PhotoReactionsQueryVariables> = gql`
  query PhotoReactionsQuery($photoFilename: String!) {
    photoReactions(photoFilename: $photoFilename) {
      reaction
      users
      count
    }
  }
`

export const beforeQuery = (props: { photoFilename: string }) => ({
  variables: { photoFilename: props.photoFilename },
  fetchPolicy: 'cache-and-network' as const,
})

const UPSERT_PHOTO_REACTION_MUTATION = gql`
  mutation UpsertPhotoReactionMutation($input: UpsertPhotoReactionInput!) {
    upsertPhotoReaction(input: $input) {
      id
    }
  }
`

const DEFAULT_REACTIONS = ['🥹', '😂', '🥰', '❤️']
const LONG_PRESS_MS = 450

// No visible reaction badges until the query resolves — matches the old
// page's populate-after-fetch behavior (createReactionOverlay() started
// with an empty counts container, filled in once refreshReactions() came
// back). No Empty export either: zero reactions is just Success with an
// empty list, not a distinct state worth its own UI.
export const Loading = () => null
export const Failure = () => null

interface PhotoReactionsPassthroughProps {
  photoFilename: string
  reactions: string[]
}

// Ported from html/photo-gallery.html's createReactionOverlay()/
// refreshReactions()/sendReaction(). userEmail is not a mutation argument
// (see api/src/services/photoReactions/upsert.ts) — the server derives it
// from the authenticated request, so this component never needs its own
// user's email.
export const Success = ({
  photoReactions,
  photoFilename,
  reactions,
}: CellSuccessProps<PhotoReactionsQuery, PhotoReactionsQueryVariables> & PhotoReactionsPassthroughProps) => {
  const [pickerOpen, setPickerOpen] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [upsertReaction] = useMutation(UPSERT_PHOTO_REACTION_MUTATION, {
    refetchQueries: [{ query: QUERY, variables: { photoFilename } }],
  })

  const tooltip =
    photoReactions.flatMap((s) => s.users.map((u) => `${s.reaction}  ${u}`)).join('\n') || 'Be the first to react'

  const react = (reaction: string) => {
    upsertReaction({ variables: { input: { photoFilename, reaction } } })
  }

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const handleMouseDown = () => {
    pressTimer.current = setTimeout(() => setPickerOpen(true), LONG_PRESS_MS)
  }

  // Matches the old page's behavior exactly, including its one quirk: a
  // long press that opens the picker still fires this quick-react click
  // right after (mousedown+mouseup on the same element always dispatches
  // a click too) — the default reaction gets saved, then the picker lets
  // you immediately override it. Not "fixed" here since it's harmless and
  // faithfully reproducing the old page's actual behavior, not a guess.
  const handleClick = () => {
    clearPressTimer()
    react(reactions[0] ?? DEFAULT_REACTIONS[0])
  }

  return (
    <div
      title={tooltip}
      onMouseDown={handleMouseDown}
      onMouseUp={clearPressTimer}
      onMouseLeave={clearPressTimer}
      onClick={handleClick}
      className="absolute bottom-2 right-2 flex cursor-pointer items-center gap-2 rounded-xl bg-black/60 p-1 text-sm"
    >
      <div className="flex items-center gap-1">
        {photoReactions.map((s) => (
          <span key={s.reaction} className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5">
            {s.reaction} {s.count}
          </span>
        ))}
      </div>

      {pickerOpen && (
        <div
          className="absolute bottom-10 right-0 flex gap-2 rounded-xl border border-slate-600 bg-slate-800 p-2"
          onClick={(e) => e.stopPropagation()}
        >
          {reactions.map((r) => (
            <button
              key={r}
              className="p-1 text-lg"
              onClick={() => {
                react(r)
                setPickerOpen(false)
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
