import { gql } from 'graphql-tag'

export const CREATE_PHOTO_MUTATION = gql`
  mutation CreatePhotoMutation($input: CreatePhotoInput!) {
    createPhoto(input: $input) {
      filename
      url
    }
  }
`
