import { Amplify } from 'aws-amplify'
import { signIn as amplifySignIn, signOut as amplifySignOut, fetchAuthSession } from 'aws-amplify/auth'
import { config } from '../config/config'

// Configure Amplify once with Auth and API
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: config.aws.cognito.userPoolId,
      userPoolClientId: config.aws.cognito.userPoolClientId,
    },
  },
  API: {
    GraphQL: {
      endpoint: config.api.graphqlEndpoint,
      region: config.aws.region,
      defaultAuthMode: 'userPool',
    },
  },
})

const STORAGE_KEYS = {
  USER_EMAIL: 'auth_user_email',
}

export interface AuthUser {
  email: string
  idToken: string
  accessToken: string
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  try {
    const result = await amplifySignIn({
      username: email,
      password: password,
    })

    if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      throw new Error('Password change required. Please sign in via the web app first.')
    }

    if (!result.isSignedIn) {
      throw new Error('Sign in failed')
    }

    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken?.toString()
    const accessToken = session.tokens?.accessToken?.toString()

    if (!idToken || !accessToken) {
      throw new Error('Failed to get tokens')
    }

    await chrome.storage.local.set({ [STORAGE_KEYS.USER_EMAIL]: email })

    return {
      email,
      idToken,
      accessToken,
    }
  } catch (error: any) {
    if (error.name === 'NotAuthorizedException') {
      throw new Error('Incorrect username or password')
    }
    if (error.name === 'UserNotFoundException') {
      throw new Error('User not found')
    }
    throw error
  }
}

export async function signOut(): Promise<void> {
  try {
    await amplifySignOut()
  } catch {
    // Ignore errors
  }
  await chrome.storage.local.remove([STORAGE_KEYS.USER_EMAIL])
}

export async function getCurrentSession(): Promise<AuthUser | null> {
  try {
    const session = await fetchAuthSession()

    if (!session.tokens?.idToken) {
      return null
    }

    const idToken = session.tokens.idToken
    const email = (idToken.payload.email as string) || ''

    return {
      email,
      idToken: idToken.toString(),
      accessToken: session.tokens.accessToken?.toString() || '',
    }
  } catch {
    return null
  }
}

export async function getStoredEmail(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.USER_EMAIL)
  return (result[STORAGE_KEYS.USER_EMAIL] as string) || null
}
