import { config } from '../config/config'

const SAVE_FCM_TOKEN_MUTATION = `
  mutation SaveFcmToken($input: SaveFcmTokenInput!) {
    saveFcmToken(input: $input) {
      user_email
      fcm_token
      device_id
      updated_at
      error_message
    }
  }
`

const DELETE_FCM_TOKEN_MUTATION = `
  mutation DeleteFcmToken($input: DeleteFcmTokenInput!) {
    deleteFcmToken(input: $input) {
      user_email
      device_id
      deleted
      error_message
    }
  }
`

async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  idToken: string
): Promise<T> {
  console.log('[API] Making GraphQL request to:', config.api.graphqlEndpoint)
  console.log('[API] Token length:', idToken?.length)

  // Try without Bearer prefix - AppSync Cognito auth typically expects just the token
  const response = await fetch(config.api.graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': idToken,
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await response.json()
  console.log('[API] Response status:', response.status)
  console.log('[API] Response:', JSON.stringify(json).substring(0, 200))

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} - ${JSON.stringify(json)}`)
  }

  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message)
  }

  return json.data as T
}

export interface SaveFcmTokenInput {
  user_email: string
  fcm_token: string
  device_id: string
}

export interface SaveFcmTokenResult {
  user_email: string
  fcm_token: string
  device_id: string
  updated_at: string
  error_message?: string | null
}

export async function saveFcmToken(
  input: SaveFcmTokenInput,
  idToken: string
): Promise<SaveFcmTokenResult> {
  const data = await graphqlRequest<{ saveFcmToken: SaveFcmTokenResult }>(
    SAVE_FCM_TOKEN_MUTATION,
    { input },
    idToken
  )
  return data.saveFcmToken
}

export interface DeleteFcmTokenInput {
  user_email: string
  device_id: string
}

export interface DeleteFcmTokenResult {
  user_email: string
  device_id: string
  deleted: boolean
  error_message?: string | null
}

export async function deleteFcmToken(
  input: DeleteFcmTokenInput,
  idToken: string
): Promise<DeleteFcmTokenResult> {
  const data = await graphqlRequest<{ deleteFcmToken: DeleteFcmTokenResult }>(
    DELETE_FCM_TOKEN_MUTATION,
    { input },
    idToken
  )
  return data.deleteFcmToken
}
