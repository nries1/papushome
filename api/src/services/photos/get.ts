import fs from 'fs/promises'

import type { QueryResolvers } from 'types/graphql'

const UPLOAD_PATH = process.env.UPLOAD_PATH ?? ''
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif)$/i

const toPhoto = (filename: string) => ({
  filename,
  url: `/.redwood/functions/media?filename=${encodeURIComponent(filename)}`,
})

export const photos: NonNullable<QueryResolvers['photos']> = async ({
  limit,
}) => {
  try {
    const files = await fs.readdir(UPLOAD_PATH)
    const images = files.filter((f) => IMAGE_EXTENSIONS.test(f))
    const limited = limit ? images.slice(0, limit) : images
    return limited.map(toPhoto)
  } catch {
    return []
  }
}
