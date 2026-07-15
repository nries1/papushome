#!/usr/bin/env node
// Usage: node scripts/log_release.js [--version <v>] [--model <name>]
//
// Records a hardware release in the `hardware_releases` table by running psql
// inside the `papushome-redwood-db-1` Postgres container. Cross-platform
// replacement for the old log_release.sh, so the `*:flash` npm scripts behave
// identically on Windows and macOS.
//
// Logging is best-effort: if Docker or the DB isn't reachable (e.g. flashing
// from a laptop that isn't the server), it warns and exits 0 so a successful
// upload can still proceed to the serial monitor.
//
// TODO: This logs via `docker exec` against a LOCAL `papushome-redwood-db-1`
// container, so releases flashed from a dev machine (where the DB doesn't run)
// are never recorded. To capture those, point this at the server's DB instead
// — e.g. an API endpoint or a remote psql connection (PGHOST/PGPORT) to the
// server.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : fallback;
}

// Load REDWOOD_POSTGRES_* from .env without adding a dotenv dependency to this
// standalone script — real env vars (if already set) still win.
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2] ? match[2].replace(/^['"]|['"]$/g, '') : '';
    }
  }
}

const dbUser = process.env.REDWOOD_POSTGRES_USER || 'user';
const dbName = process.env.REDWOOD_POSTGRES_DB || 'redwood_plants';

const version = arg('--version') || `v1.0.${Math.floor(Date.now() / 1000)}`;
const model   = arg('--model') || 'Unknown ESP32';

const sqlEscape = (s) => s.replace(/'/g, "''");

const sql =
  'INSERT INTO hardware_releases (version_string, hardware_model, notes, uploaded_by) ' +
  `VALUES ('${sqlEscape(version)}', '${sqlEscape(model)}', 'Automated upload via flash script', 'nries1');`;

console.log(`Logging release ${version} (${model}) to hardware_releases table...`);

// No shell, so the SQL string is passed as a single argv element — avoids
// cross-platform quoting issues. `docker` is a real .exe, found on PATH on both
// platforms. Dropped the old `-it` flags: no TTY is needed for a one-off `-c`.
const result = spawnSync(
  'docker',
  ['exec', 'papushome-redwood-db-1', 'psql', '-U', dbUser, '-d', dbName, '-c', sql],
  { stdio: 'inherit' }
);

if (result.error || result.status !== 0) {
  console.warn('⚠  Could not log release (Docker/DB unavailable?) — continuing anyway.');
}
process.exit(0);
