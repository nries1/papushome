import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const deleteDevice: NonNullable<MutationResolvers['deleteDevice']> = ({
  id,
}) => {
  return db.device.delete({ where: { id } })
}
