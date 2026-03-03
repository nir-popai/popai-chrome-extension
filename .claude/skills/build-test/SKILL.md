---
name: build-test
description: Build the extension and guide testing
---

# Build and Test Extension

1. Run `pnpm build` to compile TypeScript and bundle with Vite
2. Check for any TypeScript errors in output
3. If build succeeds, instruct user:
   - Go to `chrome://extensions`
   - Enable Developer mode (toggle in top right)
   - Click "Reload" on PopAI Notifications extension
   - Click extension icon to open popup
   - Test the specific feature that was changed
