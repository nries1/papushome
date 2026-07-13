import type { PhotosQuery, PhotosQueryVariables } from 'types/graphql'

import type {
  CellFailureProps,
  CellSuccessProps,
  TypedDocumentNode,
} from '@redwoodjs/web'

import PhotoCard from 'src/components/PhotoCard'

export const QUERY: TypedDocumentNode<PhotosQuery, PhotosQueryVariables> = gql`
  query PhotosQuery($limit: Int) {
    photos(limit: $limit) {
      filename
      url
    }
  }
`

export const beforeQuery = (props: { limit?: number }) => ({
  variables: { limit: props.limit },
  fetchPolicy: 'cache-and-network' as const,
})

export const Loading = () => (
  <div className="py-16 text-center text-slate-400">Loading photos...</div>
)

export const Empty = () => (
  <div className="py-16 text-center text-slate-400">No photos yet.</div>
)

export const Failure = ({ error }: CellFailureProps<PhotosQueryVariables>) => (
  <div className="py-16 text-center text-red-400">
    Failed to load photos. {error?.message}
  </div>
)

interface PhotosPassthroughProps {
  reactions: string[]
}

export const Success = ({
  photos,
  reactions,
}: CellSuccessProps<PhotosQuery, PhotosQueryVariables> &
  PhotosPassthroughProps) => (
  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
    {photos.map((photo) => (
      <PhotoCard key={photo.filename} photo={photo} reactions={reactions} />
    ))}
  </div>
)
