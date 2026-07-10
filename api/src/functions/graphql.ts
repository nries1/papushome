import { createGraphQLHandler } from '@redwoodjs/graphql-server'

import directives from 'src/directives/**/*.{js,ts}'
import sdls from 'src/graphql/**/*.sdl.{js,ts}'
import services from 'src/services/**/*.{js,ts}'

import { cfAccessAuthPlugin } from 'src/lib/auth'
import { db } from 'src/lib/db'
import { logger } from 'src/lib/logger'
// Side-effect imports: connect the MQTT client and kick off the hourly AI
// summary job when the api process boots. This file is loaded in both
// `yarn rw dev api` and `yarn rw serve api` (including via a custom
// api/src/server.ts), unlike server.ts which only runs under `serve` — so
// this is the one place guaranteed to run in both.
import 'src/lib/mqtt'
import 'src/lib/aiSummaryService'

export const handler = createGraphQLHandler({
  loggerConfig: { logger, options: {} },
  directives,
  sdls,
  services,
  extraPlugins: [cfAccessAuthPlugin],
  onException: () => {
    // Disconnect from your database with an unhandled exception.
    db.$disconnect()
  },
})
