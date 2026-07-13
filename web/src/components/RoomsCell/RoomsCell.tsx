import type { RoomsForDeviceFormQuery, RoomsForDeviceFormQueryVariables } from 'types/graphql'

import type { CellFailureProps, CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

import Modal from 'src/components/Modal/Modal'
import AddDeviceModal from 'src/pages/DevicesPage/AddDeviceModal'

export const QUERY: TypedDocumentNode<RoomsForDeviceFormQuery, RoomsForDeviceFormQueryVariables> = gql`
  query RoomsForDeviceFormQuery {
    rooms {
      id
      name
      displayName
    }
  }
`

interface RoomsPassthroughProps {
  onClose: () => void
}

// Loading/Failure still render the modal shell (rather than nothing) so
// clicking "+ Add Device" gives immediate feedback instead of a silent
// pause while the tiny rooms list loads.
export const Loading = ({ onClose }: RoomsPassthroughProps) => (
  <Modal title="Add Device" onClose={onClose}>
    <div className="py-4 text-center text-sm text-slate-400">Loading rooms...</div>
  </Modal>
)

export const Failure = ({ error, onClose }: CellFailureProps<RoomsForDeviceFormQueryVariables> & RoomsPassthroughProps) => (
  <Modal title="Add Device" onClose={onClose}>
    <div className="py-4 text-center text-sm text-red-400">Failed to load rooms: {error?.message}</div>
  </Modal>
)

export const Success = ({
  rooms,
  onClose,
}: CellSuccessProps<RoomsForDeviceFormQuery, RoomsForDeviceFormQueryVariables> & RoomsPassthroughProps) => (
  <AddDeviceModal rooms={rooms} onClose={onClose} />
)
