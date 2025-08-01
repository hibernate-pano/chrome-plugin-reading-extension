# Chrome Extension Debugging Guide

## Issues Fixed

### 1. "process is not defined" Error

**Problem**: React and other libraries were trying to access `process.env.NODE_ENV` in the browser context.

**Solution**: Added `define` configuration to Vite config files:

```javascript
define: {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  'process.env': '{}'
}
```

### 2. "Could not establish connection. Receiving end does not exist." Error

**Problem**: Message type mismatch between background script and content script.

**Solution**:

- Background script was sending `TOGGLE_READER_MODE`
- Content script was listening for `TOGGLE_READING_MODE`
- Fixed by updating both to use `TOGGLE_READING_MODE`

## How to Test the Extension

1. **Load the Extension**:

   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

2. **Test the Extension**:

   - Open `test-extension.html` in Chrome
   - Click the extension icon in the toolbar
   - Check if reading mode toggles properly

3. **Debug Issues**:
   - Open Chrome DevTools (F12)
   - Check the Console tab for error messages
   - Check the Network tab for failed requests

## Common Issues and Solutions

### Extension Not Loading

- Check if the `dist` folder contains all necessary files
- Verify `manifest.json` is valid
- Check Chrome extension page for error messages

### Content Script Not Working

- Verify `contentShadcn.js` is in the correct location
- Check if the script is being injected (DevTools > Sources)
- Look for console errors in the page context

### Background Script Issues

- Check `background.js` is properly built
- Look for errors in the extension's background page console
- Verify message passing between content and background scripts

### Build Issues

- Run `npm run build` to rebuild the extension
- Check for TypeScript compilation errors
- Verify all Vite config files have the `define` configuration

## File Structure

```
dist/
├── manifest.json
├── src/
│   ├── background/
│   │   └── background.js
│   ├── content/
│   │   └── contentShadcn.js
│   └── popup/
│       └── popup.js
└── assets/
    ├── style.css
    └── popup.css
```

## Troubleshooting Steps

1. **Clear Extension Data**:

   - Go to `chrome://extensions/`
   - Find your extension and click "Remove"
   - Reload the extension

2. **Check Console Logs**:

   - Open DevTools on the test page
   - Look for extension-related messages
   - Check for any error messages

3. **Verify Message Passing**:

   - Background script should send: `{ action: 'TOGGLE_READING_MODE' }`
   - Content script should respond with status

4. **Test in Incognito Mode**:
   - Sometimes extensions behave differently in incognito mode
   - Check if the issue persists

## Development Commands

```bash
# Build the extension
npm run build

# Build individual components
npm run build:content-shadcn
npm run build:background
npm run build:popup

# Clean up build artifacts
npm run cleanup
```

## Key Files to Check

- `src/content/contentShadcn.ts` - Main content script
- `src/background/background.ts` - Background script
- `src/constants/index.ts` - Message type definitions
- `vite.content-shadcn.config.ts` - Content script build config
- `vite.background.config.ts` - Background script build config
- `public/manifest.json` - Extension manifest
