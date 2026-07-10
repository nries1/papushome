import { gql } from 'graphql-tag'

export const DEVICES_WITH_STATUS_QUERY = gql`
  query DevicesWithStatusQuery {
    devicesWithStatus {
      deviceId
      friendlyName
      deviceType
      config
      roomName
      roomDisplayName
      ipAddress
      lastBoot
      lastSeen
      healthy
      otaAvailable
      latestEnvReadings
      latestEnvTimestamp
      latestTankReading {
        rawValue
        gallons
        pctFull
        timestamp
      }
      latestPumpEvent {
        status
        action
        timestamp
      }
    }
  }
`

export const ROOMS_QUERY = gql`
  query RoomsForDeviceFormQuery {
    rooms {
      id
      name
      displayName
    }
  }
`

export const CREATE_DEVICE_MUTATION = gql`
  mutation CreateDeviceMutation($input: CreateDeviceInput!) {
    createDevice(input: $input) {
      id
      deviceId
    }
  }
`

export const UPDATE_DEVICE_CONFIG_MUTATION = gql`
  mutation UpdateDeviceConfigMutation($deviceId: String!, $patch: JSON!) {
    updateDeviceConfig(deviceId: $deviceId, patch: $patch)
  }
`
