# Issues
1. Sensor health chart displays nothing at https://papushome.us/plant-care
2. logs are noisy and it's not clear which service corresponds to which actual data. When I visit http://100.122.11.16:3030/d/logs-overview/logs-overview?orgId=1&refresh=30s&var-service=redwood I see grafana, loki, ollama, promtail, redwood, and redwood-db. It's hard to know which logs relate to graphql, mqtt, hardware, or the db
3. nginx.conf is still in the repo, but I think that is unused now right?
4. .env.example, and .env.defaults don't have any of the variables from .env that are needed to run the app
5. We've experimented with several models and landed on qwen2.5:7b because it offered the best balance of speed and accuracy. Llama 3.2 just din't follow prompt instructions closely enough. Gemma4 and qwen 3 were too big for my gpu.


# Follow-ups
1. Water tower firmware only publishes a `tank_reading` when the level changes ≥1.5% since the last report (`hardware/plant-node/src/sensor.h`, `tankMonitorTask()`). A healthy-but-idle tank (not being watered/drained) can go silent for weeks even though the sensor/WiFi/MQTT are all working fine — confirmed live on the Living Room tower (21+ day uptime, sensor reading correctly, just never crossing the threshold). This makes "idle" indistinguishable from "actually offline" in the Sensor Health chart. Consider having the device publish a periodic heartbeat reading (e.g. every Nth read regardless of change) so the dashboard can tell the difference.
2. Wyze bulb control (via the `wyzeapi` Home Assistant custom_component) was fully broken, from asking "why can't papu control my Wyze bulbs" down to four stacked bugs, all now fixed:
   - `homeassistant` service wasn't running at all — started it (no code change, just wasn't up).
   - `wyzeapi` crashed on import: cffi 2.1.0 vs. the image's compiled `_cffi_backend` 2.0.0 — a known upstream Home Assistant bug introduced in 2026.7.1, fixed in 2026.7.2. Fixed by pinning `docker-compose.yml`'s `homeassistant` image to `2026.7.2` instead of the floating `:stable` tag.
   - Even after that, Wyze cloud login failed with `SSLCertVerificationError` — this image's Alpine `ca-certificates` bundle is missing the classic "DigiCert Global Root CA" (only newer G2/G3 variants are present), which is what Wyze's cert chain terminates at. Fixed by fetching the real root cert from DigiCert's own `caIssuers` URL, verifying it's genuinely self-signed, and wiring a combined bundle (`homeassistant/ca-bundle.pem`, checked into the repo) into the container via `docker-compose.yml` (overrides the system cert path + `SSL_CERT_FILE`/`REQUESTS_CA_BUNDLE`).
   - Real bug, not hardware/env: `homeActions.ts`'s `controlLight()` treated any 200 OK from Home Assistant's `/api/services/light/*` as success, without checking whether an entity actually matched. HA doesn't error on an unknown `entity_id` — it silently no-ops with an empty response array. This let the chat assistant hallucinate `light.couch_lights` (real ones are `light.couch_1`/`light.couch_2`) and confidently report "Done, the couch lights are now on" while nothing happened. Fixed to check HA's response for real affected entities; verified the existing tool-calling loop then self-corrects on an honest failure (calls `list_lights`, retries with real IDs) with no prompt changes needed.

# Nice to have for marketing this as an open source project
1. Add more services to web-agents (book flights, buy from amazon, play and suggest music, etc.)
2. Working physical robot
3. High quality demo video
4. Onboarding UI flow for the robot (interview questions, model selection, service selection (e.g. mind-body, wyze, etc.))
5. Creating npm packages for the parts of the repo that are genuinely shipable as packages. (a) api, mqtt, and microcontroller networking. (b) Home robot code to let anyone install an npm package and launch and configure their own home robot
6. Media storage optimizations and thumbnbails for scalability in displaying on the frontend.
