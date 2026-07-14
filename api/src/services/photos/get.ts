import fs from 'fs/promises'

import type { QueryResolvers } from 'types/graphql'

import { moduleLogger } from 'src/lib/logger'

const logger = moduleLogger('graphql')

const UPLOAD_PATH = process.env.UPLOAD_PATH ?? ''
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif)$/i

const toPhoto = (filename: string) => ({
  filename,
  // Bare path, matching how api/src/server.ts actually mounts Functions in
  // this app's single-process deploy (see redwood.toml's apiUrl comment) —
  // not the "/.redwood/functions" prefix that assumes a rewrite proxy in
  // front, which this app doesn't have.
  url: `/media?filename=${encodeURIComponent(filename)}`,
})

export const photos: NonNullable<QueryResolvers['photos']> = async ({
  limit,
}) => {
  try {
    const files = await fs.readdir(UPLOAD_PATH)
    const images = files.filter((f) => IMAGE_EXTENSIONS.test(f))
    const limited = limit ? images.slice(0, limit) : images
    return limited.map(toPhoto)
  } catch (err) {
    logger.error({ err, UPLOAD_PATH }, 'Failed to read photos directory')
    return []
  }
}
