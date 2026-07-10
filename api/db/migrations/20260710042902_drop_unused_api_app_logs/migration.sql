-- Drop api_logs/app_logs: our own operational-logging tables from the old
-- Express app. Nothing in the Redwood api/ workspace has ever written to
-- them (Redwood's built-in pino logger, writing structured JSON to stdout,
-- replaced this pattern in every ported diff instead) -- see
-- redwoodmigration.md's "Diff 7 -- Logging decision" for the full context.
-- device_logs is untouched: that's real IoT device telemetry, a different
-- thing entirely, and is still actively written by api/src/lib/mqtt.ts.
DROP TABLE "api_logs";
DROP TABLE "app_logs";
