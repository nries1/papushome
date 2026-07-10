import type { MutationResolvers } from 'types/graphql'

import { db } from 'src/lib/db'

export const createDevice: NonNullable<MutationResolvers['createDevice']> = ({
  input,
}) => {
  return db.device.create({ data: input })
}
