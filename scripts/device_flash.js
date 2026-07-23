#!/usr/bin/env node
// Usage: node scripts/device_flash.js --project <name> --fqbn <fqbn> --model <name> [...]
//
// Thin repo-specific wrapper around the pio-flash-cli package's pio-flash-device
// bin (upload -> log release -> monitor): resolves --project <name> to
// --dir hardware/<name> (same convention as scripts/flash.js) and points
// release logging at this repo's Postgres adapter instead of the package's
// zero-infra default (a local hardware_releases.jsonl file).

const path = require('path');
const { spawnSync } = require('child_process');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : null;
}

const project = arg('--project');
if (!project) {
  console.error('Usage: device_flash.js --project <name> --fqbn <fqbn> --model <name> ...');
  process.exit(1);
}

const projectDir = path.resolve(__dirname, '..', 'hardware', project);
const adapterPath = path.join(__dirname, 'postgres_release_adapter.js');

const passthrough = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--project') {
    i++; // drop the pair, replaced below by --dir
    continue;
  }
  passthrough.push(argv[i]);
}

const cli = require.resolve('pio-flash-cli/bin/pio-flash-device.js');
const result = spawnSync(
  process.execPath,
  [cli, '--dir', projectDir, '--log-adapter', adapterPath, ...passthrough],
  { stdio: 'inherit' }
);
process.exit(result.status ?? 0);
