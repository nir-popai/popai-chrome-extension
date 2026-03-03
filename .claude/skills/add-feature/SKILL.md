---
name: add-feature
description: Guide for adding new features to the extension
---

# Add Feature to Extension

## Before Starting
1. Check if feature involves service worker or popup
2. Understand Chrome extension permission model
3. Review existing patterns in similar code

## Service Worker Changes (`src/background/index.ts`)
- All async operations MUST use `event.waitUntil()`
- Add message handlers via `chrome.runtime.onMessage`
- Use `chrome.storage.local` for persistence
- Test that SW doesn't die mid-operation

## Popup Changes (`src/popup/`)
- Keep state minimal - popup can close anytime
- Use `chrome.runtime.sendMessage()` for background communication
- Handle case where background script isn't ready

## After Changes
1. Run `pnpm build`
2. Fix any TypeScript errors
3. Reload extension in chrome://extensions
4. Test feature manually
5. Test that existing features still work

## Common Patterns

### Adding a message handler:
```typescript
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'YOUR_MESSAGE_TYPE') {
    // Handle async with promise
    yourAsyncFunction().then((result) => {
      sendResponse({ success: true, data: result })
    })
    return true // Keep channel open for async response
  }
})
```

### Storing data:
```typescript
await chrome.storage.local.set({ key: value })
const result = await chrome.storage.local.get('key')
```
