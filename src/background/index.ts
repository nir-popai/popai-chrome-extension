import { showNotification, type NotificationPayload } from '../lib/notification-handler'
import { config } from '../config/config'

// Service worker global scope type
declare const self: ServiceWorkerGlobalScope

let registrationPromise: Promise<string | null> | null = null

// Force immediate activation of new service worker versions
self.addEventListener('install', (event) => {
  console.log('[PopAI] Service worker installing...')
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  console.log('[PopAI] Service worker activating...')
  event.waitUntil(self.clients.claim())
})

chrome.runtime.onInstalled.addListener(() => {
  console.log('[PopAI] Extension installed')
})

chrome.runtime.onStartup.addListener(() => {
  console.log('[PopAI] Extension started')
})

// Convert base64 VAPID key to Uint8Array
function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Subscribe to Web Push using the Push API
async function registerPush(): Promise<string | null> {
  if (registrationPromise) {
    console.log('[PopAI] Registration already in progress')
    return registrationPromise
  }

  registrationPromise = (async () => {
    try {
      console.log('[PopAI] Registering with Web Push API...')
      console.log('[PopAI] VAPID Key:', config.firebase.vapidKey.substring(0, 20) + '...')

      // CRITICAL: Unsubscribe any existing subscription first
      // This is required when VAPID keys change - old subscriptions won't work with new keys
      const existingSubscription = await self.registration.pushManager.getSubscription()
      if (existingSubscription) {
        console.log('[PopAI] Unsubscribing existing subscription...')
        await existingSubscription.unsubscribe()
      }

      const applicationServerKey = urlB64ToUint8Array(config.firebase.vapidKey)

      // Subscribe to push with current VAPID key
      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      })

      console.log('[PopAI] Push subscription successful!')
      console.log('[PopAI] Subscription:', JSON.stringify(subscription))

      // Store the full subscription for the backend
      const subscriptionJson = subscription.toJSON()

      await chrome.storage.local.set({
        fcm_token: JSON.stringify(subscriptionJson),
        fcm_subscription: subscriptionJson,
        fcm_token_timestamp: Date.now(),
      })

      return JSON.stringify(subscriptionJson)
    } catch (error) {
      console.error('[PopAI] Push registration failed:', error)
      return null
    } finally {
      registrationPromise = null
    }
  })()

  return registrationPromise
}

// Handle subscription expiration/change - auto re-register
self.addEventListener('pushsubscriptionchange', (event: Event) => {
  console.log('[PopAI] Push subscription changed, re-registering...')
  const extendableEvent = event as ExtendableEvent
  extendableEvent.waitUntil(registerPush())
})

// Listen for push messages using Web Push API
self.addEventListener('push', (event: PushEvent) => {
  console.log('[PopAI] Push message received:', event)

  let data: any = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { body: event.data.text() }
    }
  }

  console.log('[PopAI] Push data:', data)

  const payload: NotificationPayload = {
    title: data.title || data.notification?.title || 'PopAI Notification',
    body: data.body || data.notification?.body || '',
    url: data.url || data.data?.url || undefined,
  }

  // CRITICAL: Use waitUntil to keep service worker alive until notification is shown
  event.waitUntil(showNotification(payload))
})

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  console.log('[PopAI] Notification clicked:', notificationId)

  const result = await chrome.storage.local.get(notificationId)
  const data = result[notificationId] as { url?: string } | undefined
  const url = data?.url

  if (url) {
    chrome.tabs.create({ url })
  }

  chrome.notifications.clear(notificationId)
})

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_TOKEN_INFO') {
    chrome.storage.local.get(['fcm_token', 'fcm_token_timestamp', 'fcm_device_id']).then((result) => {
      sendResponse({
        token: result.fcm_token || null,
        timestamp: result.fcm_token_timestamp || null,
        deviceId: result.fcm_device_id || null,
      })
    })
    return true
  }

  if (message.type === 'REGISTER_GCM') {
    registerPush().then((token) => {
      sendResponse({ token })
    })
    return true
  }

  if (message.type === 'UNSUBSCRIBE_PUSH') {
    self.registration.pushManager.getSubscription().then(async (subscription) => {
      if (subscription) {
        await subscription.unsubscribe()
        console.log('[PopAI] Unsubscribed from push')
      }
      sendResponse({ success: true })
    })
    return true
  }

  if (message.type === 'SHOW_NOTIFICATION') {
    const payload: NotificationPayload = {
      title: message.title || 'PopAI Notification',
      body: message.body || '',
      url: message.url,
    }
    showNotification(payload)
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'TEST_NOTIFICATION') {
    showNotification({
      title: 'Test Notification',
      body: 'This is a test notification from PopAI',
    })
    sendResponse({ success: true })
    return true
  }
})

export {}
