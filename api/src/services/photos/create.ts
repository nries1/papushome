import fs from 'fs/promises'
import path from 'path'

import type { MutationResolvers } from 'types/graphql'

const UPLOAD_PATH = process.env.UPLOAD_PATH ?? ''
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif)$/i

// Mirrors the old multer upload's `Date.now() + '-' + originalname` naming,
// but unlike the old route, sanitizes the incoming name via `path.basename`
// before using it — the old code trusted `file.originalname` as-is.
export const createPhoto: NonNullable<
  MutationResolvers['createPhoto']
> = async ({ input: { filename, dataBase64 } }) => {
  const originalName = path.basename(filename)
  if (!IMAGE_EXTENSIONS.test(originalName)) {
    throw new Error('Only jpg, jpeg, png, and gif files are accepted')
  }

  const storedFilename = `${Date.now()}-${originalName}`
  const buffer = Buffer.from(dataBase64, 'base64')
  await fs.writeFile(path.join(UPLOAD_PATH, storedFilename), buffer)

  return {
    filename: storedFilename,
    url: `/.redwood/functions/media?filename=${encodeURIComponent(storedFilename)}`,
  }
}
