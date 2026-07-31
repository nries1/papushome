#!/usr/bin/env node
// Usage: node scripts/device_flash.js --project <name> --fqbn <fqbn> --model <name> [...]
//
// Full flash flow (upload -> log release -> wait for reboot -> monitor) for
// this repo's hardware/<project> layout, logging releases to this repo's
// Postgres adapter. Inlined here rather than delegated to pio-flash-cli's
// pio-flash-device bin: as of pio-flash-cli 0.2.0 that bin was dropped from
// the published package (moved to an unpublished contrib/ script upstream),
// so this file is now the reference implementation of that flow for this repo.

const path = require('path');
const net = require('net');
const { spawnSync } = require('child_process');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : fallback;
}

const project = arg('--project');
if (!project) {
  console.error('Usage: device_flash.js --project <name> --fqbn <fqbn> --model <name> ...');
  process.exit(1);
}

const model = arg('--model');
if (!model) {
  console.error('device_flash.js: --model is required');
  process.exit(1);
}

const version = arg('--version') || `v1.0.${Math.floor(Date.now() / 1000)}`;
const projectDir = path.resolve(__dirname, '..', 'hardware', project);
const logRelease = require('./postgres_release_adapter.js');

// Only --project/--model/--version are ours; everything else (--fqbn, --name,
// --define, --port, --serial, --transport, --host, --env) forwards to
// pio-flash untouched.
const passthrough = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--project' || argv[i] === '--model' || argv[i] === '--version') {
    i++; // drop the pair
    continue;
  }
  passthrough.push(argv[i]);
}

const cli = require.resolve('pio-flash-cli/bin/pio-flash.js');

function run(target) {
  const result = spawnSync(
    process.execPath,
    [cli, '--dir', projectDir, '--target', target, ...passthrough],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function tcpReachable(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

// Serial (native USB) boards just need a moment to re-enumerate their CDC
// port after reset — a fixed delay is enough. OTA boards drop off Wi-Fi
// entirely and take longer (and variably so) to reboot, reconnect, and
// re-register mDNS, so a fixed delay there either wastes time or isn't long
// enough. Poll the telnet monitor port instead of guessing.
async function waitForReboot() {
  const transport = arg('--transport') || 'serial';
  const host = transport === 'ota' ? (arg('--host') || (arg('--name') ? `${arg('--name')}.local` : null)) : null;

  if (host) {
    console.log(`Waiting for ${host} to come back online...`);
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (await tcpReachable(host, 23, 2000)) {
        console.log(`${host} is back online.`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.warn(`${host} did not come back online within 30s — attempting monitor anyway.`);
    return;
  }

  console.log('Waiting for device to reboot...');
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

(async () => {
  run('upload');

  const release = { version, model, timestamp: new Date().toISOString() };
  try {
    await logRelease(release);
  } catch (e) {
    console.warn(`⚠  Could not log release: ${e.message} — continuing anyway.`);
  }

  await waitForReboot();

  run('monitor');
})();
