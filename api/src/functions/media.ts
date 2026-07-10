import fs from 'fs/promises'
import path from 'path'

import type { APIGatewayEvent, Context } from 'aws-lambda'

import { getCurrentUserFromEvent } from 'src/lib/auth'

// Serves one image from UPLOAD_PATH by filename, replacing the old
// `GET /api/media/:filename` Express route. Not wired into the GraphQL
// schema on purpose — this returns raw image bytes, which GraphQL isn't a
// good fit for; <img src> tags hit this endpoint directly instead.
//
// This is a plain Function rather than a GraphQL resolver, so @requireAuth
// never applies to it automatically — it needs its own guard, matching the
// old Express app's authMiddleware (any authenticated Cloudflare Access
// user, not admin-only, same as the old /api/media/:filename route).

const UPLOAD_PATH = process.env.UPLOAD_PATH ?? ''

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
}

export const handler = async (event: APIGatewayEvent, _context: Context) => {
  if (!getCurrentUserFromEvent(event)) {
    return { statusCode: 401, body: 'Access Denied: please log in via Cloudflare.' }
  }

  const filename = path.basename(event.queryStringParameters?.filename ?? '')
  const mimeType = MIME_TYPES[path.extname(filename).toLowerCase()]

  if (!filename || !mimeType) {
    return { statusCode: 400, body: 'Invalid filename' }
  }

  try {
    const data = await fs.readFile(path.join(UPLOAD_PATH, filename))
    return {
      statusCode: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600',
      },
      body: data.toString('base64'),
      isBase64Encoded: true,
    }
  } catch {
    return { statusCode: 404, body: 'Not found' }
  }
}
