const STORAGE_KEYS = {
  TOKEN: 'fcm_token',
  DEVICE_ID: 'fcm_device_id',
  TOKEN_TIMESTAMP: 'fcm_token_timestamp',
}

export async function getFCMToken(): Promise<string | null> {
  // Always request fresh registration - the background script handles unsubscribe/resubscribe
  console.log('[FCM] Requesting fresh token from background script...')
  try {
    const response = await chrome.runtime.sendMessage({ type: 'REGISTER_GCM' })
    if (response?.token) {
      console.log('[FCM] Token received from background script')
      return response.token
    }
    console.error('[FCM] Background script returned no token')
    return null
  } catch (error) {
    console.error('[FCM] Error requesting token from background:', error)
    return null
  }
}

export async function getStoredToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.TOKEN)
  return (result[STORAGE_KEYS.TOKEN] as string) || null
}

export async function getDeviceId(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.DEVICE_ID)
  const existing = result[STORAGE_KEYS.DEVICE_ID] as string | undefined
  if (existing) {
    return existing
  }

  const deviceId = crypto.randomUUID()
  await chrome.storage.local.set({ [STORAGE_KEYS.DEVICE_ID]: deviceId })
  return deviceId
}

export async function getTokenInfo(): Promise<{
  token: string | null
  timestamp: number | null
  deviceId: string
}> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.TOKEN,
    STORAGE_KEYS.TOKEN_TIMESTAMP,
    STORAGE_KEYS.DEVICE_ID,
  ])

  return {
    token: (result[STORAGE_KEYS.TOKEN] as string) || null,
    timestamp: (result[STORAGE_KEYS.TOKEN_TIMESTAMP] as number) || null,
    deviceId: (result[STORAGE_KEYS.DEVICE_ID] as string) || (await getDeviceId()),
  }
}

export async function clearToken(): Promise<void> {
  // Clear storage
  await chrome.storage.local.remove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.TOKEN_TIMESTAMP])

  // Also unsubscribe from push manager via background script
  try {
    await chrome.runtime.sendMessage({ type: 'UNSUBSCRIBE_PUSH' })
    console.log('[FCM] Token cleared and unsubscribed from push')
  } catch (error) {
    console.log('[FCM] Token cleared from storage (unsubscribe may have failed)')
  }
}

export async function setupForegroundMessageHandler(
  _onNotification: (payload: { title: string; body: string; url?: string }) => void
): Promise<void> {
  // For chrome.gcm, messages are handled in the background script
  // This is a no-op for the popup, but we keep the interface consistent
  console.log('[FCM] Foreground handler setup (messages handled by background)')
}
