#!/usr/bin/env node
// Usage: node scripts/flash.js --project <name> --fqbn <fqbn>
//          [--target upload|monitor] [--transport serial|ota]
//          [--name <device>] [--room <room>] [--port <COMx>] [--host <hostname>]
//
// Thin repo-specific wrapper around the pio-flash-cli package (github.com/nries1/pio-flash-cli,
// a separate repo — see package.json's "pio-flash-cli" dependency): that package knows
// nothing about this repo's hardware/<project> layout, only a --dir <path>, so this
// resolves --project <name> to that directory and delegates.

const path = require('path');
const { spawnSync } = require('child_process');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : null;
}

const project = arg('--project');
if (!project) {
  console.error('Usage: flash.js --project <name> --fqbn <fqbn> [--target upload|monitor] ...');
  process.exit(1);
}

const projectDir = path.resolve(__dirname, '..', 'hardware', project);

const passthrough = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--project') {
    i++; // drop the pair, replaced below by --dir
    continue;
  }
  passthrough.push(argv[i]);
}

const cli = require.resolve('pio-flash-cli/bin/pio-flash.js');
const result = spawnSync(process.execPath, [cli, '--dir', projectDir, ...passthrough], {
  stdio: 'inherit',
});
process.exit(result.status ?? 0);
