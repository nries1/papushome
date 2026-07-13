import { gql } from 'graphql-tag'

export const UPDATE_CHAT_EVAL_RATING_MUTATION = gql`
  mutation UpdateChatEvalRatingMutation($id: Int!, $field: ChatEvalRatingField!, $value: Boolean!) {
    updateChatEvalRating(id: $id, field: $field, value: $value) {
      id
    }
  }
`
