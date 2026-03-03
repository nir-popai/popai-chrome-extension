# PopAI Chrome Extension

Chrome MV3 extension for receiving Web Push notifications from PopAI backend.

## Tech Stack
- Chrome Extension Manifest V3
- TypeScript + Vite (with @crxjs/vite-plugin)
- React 19 for popup UI
- Web Push API for notifications (NOT Firebase SDK)
- AWS Cognito for authentication

## Commands
- `pnpm build` - Build extension (runs tsc first)
- `pnpm dev` - Development mode with hot reload

## Development Workflow
1. Make changes to source in `src/`
2. Run `pnpm build`
3. Go to `chrome://extensions` and reload the extension
4. Test in browser

## Architecture

### Service Worker (`src/background/index.ts`)
- Handles Web Push subscription lifecycle
- Receives push messages and shows notifications
- Must use `event.waitUntil()` for async operations

### Popup (`src/popup/`)
- React app for user authentication and notification management
- Communicates with background via `chrome.runtime.sendMessage()`

### Key Files
- `src/config/config.ts` - VAPID key and AWS config
- `src/lib/notification-handler.ts` - Chrome notification display
- `src/lib/firebase.ts` - FCM token management (name is legacy)
- `src/lib/auth.ts` - AWS Cognito authentication

## Critical Gotchas (Learn from Past Mistakes!)

### Web Push Subscriptions
- Subscriptions are cryptographically bound to the VAPID key used at creation
- MUST unsubscribe old subscription before creating new one when keys change
- Always use `event.waitUntil()` in push event handler to keep SW alive

### Notification Icons
- `chrome.notifications.create()` requires `iconUrl`
- Use `chrome.runtime.getURL()` for local icons
- Base64 data URLs cause "Unable to download images" errors
- External URLs may also fail - use bundled icons only

### Service Worker Lifecycle
- Add `skipWaiting()` in install event for immediate updates
- Add `clients.claim()` in activate event to take control
- Service worker can die mid-operation without `waitUntil()`

### VAPID Keys
- Public key goes in extension config
- Private key stays on server only
- Current keys are in `src/config/config.ts`

## Testing Notifications
```javascript
const webpush = require('web-push');
webpush.setVapidDetails(
  'mailto:nir.m@popai.health',
  'BBg7hqevRuPFHH8y4weq2YhF6za9AudqnrelSk8Wf29gyxpqkd-P5NNtSjtms-c2pVAX9nsnESwoOtjjBHy1VyE',
  'u5aRApLlqGMkGE5Gu7ap84TygIOMoc72OMOkxyalHE0'
);
// Use subscription JSON from chrome storage
```
