#!/usr/bin/env bash
# Pull the latest code and redeploy the redwood service.
# Run from the laptop as: ssh <server> 'cd ~/papushome && ./deploy.sh'
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Building redwood image"
docker compose build redwood

echo "==> Starting redwood (also starts redwood-db if it isn't running)"
docker compose up -d redwood

echo "==> Pruning dangling images"
docker image prune -f

echo "==> Deployed. Recent logs:"
docker compose logs --tail=50 redwood
