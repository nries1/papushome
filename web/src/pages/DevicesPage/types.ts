export interface LatestTankReading {
  rawValue: number
  gallons: number
  pctFull: number
  timestamp: string
}

export interface LatestPumpEvent {
  status: string
  action: string | null
  timestamp: string
}

export interface EnvReadings {
  temperature_f?: number
  humidity_pct?: number
  pressure_hpa?: number
  iaq?: number
  [key: string]: unknown
}

export interface DeviceConfig {
  tank_capacity_gallons?: number
  calibration_raw?: number
  calibration_gallons?: number
  [key: string]: unknown
}

export interface DeviceWithStatus {
  deviceId: string
  friendlyName: string
  deviceType: string
  config: DeviceConfig
  roomName: string | null
  roomDisplayName: string | null
  ipAddress: string | null
  lastBoot: string | null
  lastSeen: string | null
  healthy: boolean
  otaAvailable: boolean
  latestEnvReadings: EnvReadings | null
  latestEnvTimestamp: string | null
  latestTankReading: LatestTankReading | null
  latestPumpEvent: LatestPumpEvent | null
}

export interface Room {
  id: number
  name: string
  displayName: string
}
