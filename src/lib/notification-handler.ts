export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  url?: string
}

export async function showNotification(payload: NotificationPayload): Promise<string> {
  const notificationId = `popai-${Date.now()}`

  await chrome.notifications.create(notificationId, {
    type: 'basic',
    title: payload.title,
    message: payload.body,
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    priority: 2,
    requireInteraction: true,
  })

  if (payload.url) {
    await chrome.storage.local.set({
      [notificationId]: { url: payload.url },
    })
  }

  await storeNotification(notificationId, payload)

  return notificationId
}

export type StoredNotification = NotificationPayload & { id: string; timestamp: number }

async function storeNotification(id: string, payload: NotificationPayload): Promise<void> {
  const result = await chrome.storage.local.get('notifications')
  const notifications: StoredNotification[] = (result.notifications as StoredNotification[]) || []

  notifications.unshift({
    id,
    ...payload,
    timestamp: Date.now(),
  })

  // Keep only the last 50 notifications
  const trimmed = notifications.slice(0, 50)

  await chrome.storage.local.set({ notifications: trimmed })
}

export async function getNotifications(): Promise<StoredNotification[]> {
  const result = await chrome.storage.local.get('notifications')
  return (result.notifications as StoredNotification[]) || []
}

export async function clearNotifications(): Promise<void> {
  await chrome.storage.local.set({ notifications: [] })
}
