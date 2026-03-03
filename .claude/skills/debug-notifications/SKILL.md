---
name: debug-notifications
description: Debug Web Push notification issues
---

# Debug Push Notification Issues

## Common Issues

### "registration-token-not-registered"
- VAPID key mismatch between extension and server
- Solution: Clear subscription, re-register with correct keys

### "Unable to download all specified images"
- Icon URL is invalid or inaccessible
- Solution: Use `chrome.runtime.getURL('icons/icon128.png')`

### Second notification fails
- Service worker died before completing
- Solution: Ensure `event.waitUntil()` wraps all async work

### Subscription expires immediately
- Old subscription with different VAPID key
- Solution: Unsubscribe old, create new subscription

## Debug Steps

1. Open `chrome://extensions`
2. Click "service worker" link to open DevTools
3. Check Console for `[PopAI]` prefixed logs
4. Check Network tab for push-related requests
5. Use `chrome.storage.local.get(null, console.log)` to inspect storage
