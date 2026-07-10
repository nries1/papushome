import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const updateDevice: NonNullable<MutationResolvers['updateDevice']> = ({
  id,
  input,
}) => {
  return db.device.update({ where: { id }, data: input })
}
