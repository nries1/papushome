import { createServer } from '@redwoodjs/api-server'

import { logger } from 'src/lib/logger'
import { visionListeners } from 'src/lib/mqtt'

// Replaces the old GET /api/vision/stream Express route (SSE). SSE needs to
// hold the raw HTTP response open and write to it later, which Redwood's
// Lambda-style Function handlers can't do — they return one response and
// terminate. So this is registered as a plain Fastify route via
// configureApiServer instead of a Function, reusing mqtt.ts's
// visionListeners (already ported, already broadcasts robot/vision/result
// messages to whatever's in that Set).
//
// Only takes effect under `yarn rw serve` (production/docker-compose) —
// `yarn rw dev` uses its own dev-mode bootstrap that never invokes this
// file at all (see api/src/functions/graphql.ts's comment on the same
// dev/serve split, which is why mqtt.ts's connection is triggered from a
// side-effect import there instead of from here). There is currently no
// way to exercise this specific route with `yarn rw dev`, only in the
// deployed container.
async function main() {
  const server = await createServer({
    logger,
    configureApiServer: (server) => {
      server.get('/vision/stream', (request, reply) => {
        // Not reusing getCurrentUserFromEvent (src/lib/auth) here — it's
        // typed for APIGatewayProxyEvent/Fetch Request (the shapes
        // Functions and the GraphQL handler see), not a Fastify request.
        // Same header, same lowercasing, just extracted locally rather
        // than fighting a cross-runtime type mismatch for one route.
        const raw = request.headers['cf-access-authenticated-user-email']
        const email = (Array.isArray(raw) ? raw[0] : raw)?.toLowerCase()
        if (!email) {
          reply.code(401).send('Access Denied: please log in via Cloudflare.')
          return
        }

        // hijack() tells Fastify to stop managing this response — without
        // it, Fastify still expects the handler to call reply.send(), and
        // holds the response open forever waiting for that. flushHeaders()
        // (also in the old Express route) is required too: writeHead()
        // alone doesn't push headers to the socket, Node buffers them
        // until the first body write or end() — confirmed by testing
        // (headers never arrived at the client without it).
        reply.hijack()
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        })
        reply.raw.flushHeaders()
        // Not in the old route — an immediate SSE comment line (ignored by
        // EventSource clients, per spec) so the client confirms the stream
        // is live right away instead of waiting for the first real
        // robot/vision/result message, which could be a long wait.
        reply.raw.write(': connected\n\n')
        visionListeners.add(reply.raw)
        request.raw.on('close', () => visionListeners.delete(reply.raw))
      })
    },
  })

  await server.start()
}

main()
