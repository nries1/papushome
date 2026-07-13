# Setup Guide

## Prerequisites

- [Docker + Docker Compose](https://docs.docker.com/get-docker/)
- [Node.js 20.x](https://nodejs.org/) + [Yarn 4 via Corepack](https://yarnpkg.com/getting-started/install) — for local development and npm/yarn scripts
- [PlatformIO CLI](https://docs.platformio.org/en/latest/core/installation/) — for flashing firmware (`pip install platformio`)
- [arduino-cli](https://arduino.github.io/arduino-cli/latest/installation/) — for port detection during flashing

## 1. Clone & configure

```bash
git clone git@github.com:nries1/papushome.git
cd papushome
corepack enable
yarn install
```

Copy the environment templates and fill in your values:

```bash
cp .env.example .env
cp hardware/lib/shared/config.h.example hardware/lib/shared/config.h
```

Edit `.env` — at minimum set `POSTGRES_PASSWORD`, `REDWOOD_POSTGRES_USER`/`REDWOOD_POSTGRES_PASSWORD`/`REDWOOD_POSTGRES_DB` (these back the RedwoodJS app's database and are **not** pre-filled in `.env.example` — see the note below), `DISPLAY_TOKEN`, and `ZIP_CODE`.

Edit `config.h` — set your WiFi credentials, server IP, and the same `DISPLAY_TOKEN` you put in `.env`.

> **Note:** `DISPLAY_TOKEN` must match in both files. Generate one with `openssl rand -hex 24`.
>
> **Note:** `REDWOOD_POSTGRES_*` values only matter on **first** startup of the `redwood-db` container — Postgres bakes them into the data volume the first time it initializes. If you ever lose track of them after the volume already exists, changing `.env` won't fix a mismatch; you'd need the original values or to recover them from inside the running container (`docker compose exec redwood-db psql -U <existing-role> ...`).

## 2. Start the server stack

```bash
docker compose up -d
```

This starts: the RedwoodJS app (`redwood`, port 80 — API + web in one process), `redwood-db` (Postgres 15 + pgvector), `mqtt-broker`, `homeassistant`, and `web-agents`. Database migrations apply automatically on container start.

The dashboard will be available at `http://YOUR_SERVER_IP`.

**With a GPU (for robot vision, LLM, and TTS):**

```bash
docker compose --profile gpu up -d
```

This additionally starts the Ollama LLM server, the kokoro TTS server, and the face recognition worker. Requires an NVIDIA GPU with the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

## 3. Local development (optional)

To run the RedwoodJS app directly on your machine instead of in Docker (hot reload, etc.):

```bash
yarn rw dev
```

This starts the web side (port 8910) and the API side (port 8911) separately, watching for changes. Point `DATABASE_URL` in `.env` at `redwood-db`'s published port (`5433`) for this to work against the same Postgres instance Docker uses, or run a local Postgres of your own.

To create/apply a new Prisma migration during development:

```bash
yarn rw prisma migrate dev
```

(`yarn migrate` is a shortcut for the same thing.) In production, migrations are applied automatically via `yarn rw prisma migrate deploy` when the `redwood` container starts — you don't run this manually against the server.

## 4. Deploying

```bash
npm run deploy         # run locally on the server: git pull + docker compose build + up
npm run deploy:remote  # from your laptop: ssh to $SSH_IP in .env, then run the above
```

## 5. Flash the hardware

Connect an ESP32 board via USB, then invoke the flashing scripts directly (there are no `npm run hw:*` shortcuts wired up in this repo yet — the scripts themselves live in `scripts/`):

```bash
# Plant node (Adafruit Metro ESP32-S3)
node scripts/device_flash.js --project plant-node --fqbn esp32:esp32:adafruit_metro_esp32s3 --model "Adafruit Metro ESP32-S3"

# Environment sensor (ESP32-C3 Super Mini)
node scripts/device_flash.js --project environment-sensor --fqbn esp32:esp32:nologo_esp32c3_super_mini --model "Nologo ESP32-C3 Super Mini"

# RGB display (ESP32-S3)
node scripts/device_flash.js --project rgb-display --fqbn esp32:esp32:esp32s3 --model "RGB Display ESP32-S3"
```

To see what boards are connected:

```bash
arduino-cli board list
```

To monitor serial output instead of flashing:

```bash
node scripts/flash.js --project plant-node --fqbn esp32:esp32:adafruit_metro_esp32s3 --target monitor
```

Or monitor over OTA/mDNS instead of a USB serial connection:

```bash
node scripts/flash.js --project plant-node --fqbn esp32:esp32:adafruit_metro_esp32s3 --target monitor --transport ota --name <device>
```

(OTA requires `avahi-daemon` on Linux to resolve `<device>.local` — see the main project docs.)

## 6. Enroll faces (robot vision, optional)

From the machine with the webcam or the photos, use `scripts/enroll_face.sh` to train the face recognition model:

```bash
./scripts/enroll_face.sh <name> /path/to/photos/ [email]
```

- **name** — the face-recognition label (e.g. `nico`). This becomes the `name` field in `robot/vision/result` and flows straight through to `personName` in chat, so use the name the robot should actually address this person by — not an internal userId.
- **photos dir** — a directory of jpg/png photos of that person (10–30 photos recommended).
- **email** — optional. Only relevant if this person also logs into the dashboard via Cloudflare Access: maps their CF-authenticated email to a display name for the admin UI (`adminStatus`). This is a completely separate concern from face recognition — the `users` table it writes to isn't read anywhere in the vision/chat pipeline.

Example:

```bash
./scripts/enroll_face.sh nico ~/photos/nico/ nries1@gmail.com
```

To enroll from the live webcam instead of photos:

```bash
python robot-vision-publisher/learn_face.py "nries1" --broker <server-ip>
```

Start publishing webcam frames to the vision pipeline:

```bash
python robot-vision-publisher/publisher.py --broker <server-ip> --show-results
```

## Troubleshooting

**Board not detected during flash:** Run `arduino-cli board list` and verify it recognizes the board. The board FQBN must match what's passed to `device_flash.js`. Some community boards (like the ESP32-C3 Super Mini) require installing third-party board definitions first: `arduino-cli core install esp32:esp32`.

**Database connection errors (`redwood` container crash-looping with a Prisma `P1010` "denied access" error):** This means `REDWOOD_POSTGRES_USER`/`PASSWORD`/`DB` in `.env` don't match what the `redwood-db` volume was actually initialized with. Since these vars aren't in `.env.example`, it's easy for them to go missing or drift — and unlike a fresh setup, you can't just pick new values once the volume already has data (Postgres only applies `POSTGRES_*` env vars on first init of an empty data directory). If you don't know the original credentials, you can often recover them without data loss: any role that already exists in the database will authenticate over the local Docker network without you needing to touch pg_hba — the trick is finding a role name that exists (try values matching the legacy `db` service's credentials first, as they're sometimes reused). Once logged in, `\du` and `\l` will show you the real role and database names to put back into `.env`.

**GPU services not starting:** Ensure the NVIDIA Container Toolkit is installed and `docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi` works before starting with `--profile gpu`.
