import { Pool } from 'pg';

// web-agents isn't part of the main Redwood app's Prisma-managed build (it's
// a separate, independently-deployed Node service — see package.json), but
// shares the same redwood-db Postgres instance over the compose network.
// Table itself is defined in api/db/schema.prisma (WebAgentSession) so the
// schema still has one source of truth; this is just a plain client for the
// one table this service actually needs to touch.
const pool = new Pool({
  host: process.env.REDWOOD_DB_HOST ?? 'redwood-db',
  port: Number(process.env.REDWOOD_DB_PORT ?? 5432),
  user: process.env.REDWOOD_POSTGRES_USER,
  password: process.env.REDWOOD_POSTGRES_PASSWORD,
  database: process.env.REDWOOD_POSTGRES_DB,
});

export default pool;
