// Pluggable release logger for pio-flash-device (see scripts/device_flash.js
// --log-adapter). Records a hardware release in the `hardware_releases` table
// by running psql inside the `papushome-redwood-db-1` Postgres container.
//
// Best-effort by contract: pio-flash-device catches and warns on rejection
// rather than failing the flash, so throwing here (rather than swallowing the
// error ourselves) is what lets it report "could not log release" accurately.
//
// TODO: This logs via `docker exec` against a LOCAL `papushome-redwood-db-1`
// container, so releases flashed from a dev machine (where the DB doesn't
// run) are never recorded. To capture those, point this at the server's DB
// instead — e.g. an API endpoint or a remote psql connection (PGHOST/PGPORT)
// to the server.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

const sqlEscape = (s) => s.replace(/'/g, "''");

module.exports = async function logRelease({ version, model }) {
  const dbUser = process.env.REDWOOD_POSTGRES_USER || 'user';
  const dbName = process.env.REDWOOD_POSTGRES_DB || 'redwood_plants';

  const sql =
    'INSERT INTO hardware_releases (version_string, hardware_model, notes, uploaded_by) ' +
    `VALUES ('${sqlEscape(version)}', '${sqlEscape(model)}', 'Automated upload via flash script', 'nries1');`;

  console.log(`Logging release ${version} (${model}) to hardware_releases table...`);

  // No shell, so the SQL string is passed as a single argv element — avoids
  // cross-platform quoting issues. `docker` is a real .exe, found on PATH on
  // both platforms.
  const result = spawnSync(
    'docker',
    ['exec', 'papushome-redwood-db-1', 'psql', '-U', dbUser, '-d', dbName, '-c', sql],
    { stdio: 'inherit' }
  );

  if (result.error || result.status !== 0) {
    throw new Error('Docker/DB unavailable');
  }
};
