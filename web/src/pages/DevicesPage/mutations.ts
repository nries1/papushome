import { gql } from 'graphql-tag'

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
