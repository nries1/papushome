#!/bin/bash
# Enroll a face and (optionally) register a Cloudflare-Access display name.
# Usage: ./scripts/enroll_face.sh <name> <photos-dir> [email]
#   name       — face-recognition label (e.g. nico). This becomes the `name`
#                field in robot/vision/result, which flows straight through
#                to `personName` in chat — so use the friendly name people
#                should be addressed by, not an internal userId.
#   photos-dir — path to a directory of photos (jpg/png)
#   email      — optional. Only needed if this person also logs into the
#                dashboard via Cloudflare Access: maps their CF email to a
#                display name shown by adminStatus (api/src/functions/adminStatus.ts).
#                Unrelated to face recognition — the `users` table isn't
#                consulted anywhere in the vision/chat pipeline.

set -e

NAME=$1
PHOTOS=$2
EMAIL=$3

if [ -z "$NAME" ] || [ -z "$PHOTOS" ]; then
  echo "Usage: ./scripts/enroll_face.sh <name> <photos-dir> [email]"
  echo ""
  echo "  name       — face-recognition label / display name (e.g. nico)"
  echo "  photos-dir — directory of photos to enroll from"
  echo "  email      — optional: Cloudflare Access email, for the dashboard admin display name"
  exit 1
fi

echo "Enrolling face for '$NAME' from $PHOTOS ..."
.venv/bin/python robot-vision-publisher/learn_face.py "$NAME" \
  --broker 100.122.11.16 --port 1883 --images "$PHOTOS"

if [ -n "$EMAIL" ]; then
  echo "Registering dashboard display name for '$EMAIL' ..."
  docker compose exec -T redwood-db psql -U user -d redwood_plants -c \
    "INSERT INTO users (email, display_name) VALUES ('$EMAIL', '$NAME') ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name;"
fi

echo "Done. '$NAME' enrolled."
