import PhotoReactionsCell from 'src/components/PhotoReactionsCell'
import type { Photo } from 'src/pages/PhotoGalleryPage/types'

interface PhotoCardProps {
  photo: Photo
  reactions: string[]
}

const PhotoCard = ({ photo, reactions }: PhotoCardProps) => (
  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-lg transition hover:-translate-y-1 hover:border-blue-500">
    <img src={photo.url} className="h-full w-full object-cover" loading="lazy" alt="" />
    <PhotoReactionsCell photoFilename={photo.filename} reactions={reactions} />
  </div>
)

export default PhotoCard
