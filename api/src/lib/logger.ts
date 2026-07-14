import { createLogger } from '@redwoodjs/api/logger'

/**
 * Creates a logger with RedwoodLoggerOptions
 *
 * These extend and override default LoggerOptions,
 * can define a destination like a file or other supported pino log transport stream,
 * and sets whether or not to show the logger configuration settings (defaults to false)
 *
 * @param RedwoodLoggerOptions
 *
 * RedwoodLoggerOptions have
 * @param {options} LoggerOptions - defines how to log, such as redaction and format
 * @param {string | DestinationStream} destination - defines where to log, such as a transport stream or file
 * @param {boolean} showConfig - whether to display logger configuration on initialization
 */
export const logger = createLogger({})

// Tags every log line from a subsystem with a `module` field, so Loki can
// label/filter on it (see observability/promtail-config.yml) independently
// of the `service` label — which only identifies the container (`redwood`),
// not which of GraphQL/MQTT/chat logic inside it produced a given line.
export const moduleLogger = (module: string) => logger.child({ module })
