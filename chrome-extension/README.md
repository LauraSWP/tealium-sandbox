# Tealium Sandbox API Connector

Chrome extension that enables secure Tealium API v3 access for the Tealium Sandbox tool.

## What it Does
- Eliminates CORS issues with Tealium API
- Securely handles API authentication
- Stores credentials only in memory (cleared when browser closes)
- Works seamlessly with GitHub Pages deployment

## Installation

1. Download `tealium-sandbox-connector.zip`
2. Extract to a folder
3. Open Chrome: `chrome://extensions/`
4. Enable "Developer mode" (top right toggle)
5. Click "Load unpacked"
6. Select the extracted folder
7. Done! Refresh Tealium Sandbox

## Usage
Once installed, the extension automatically connects when you visit:
https://lauraswp.github.io/tealium-sandbox/

Look for the green "Extension: Connected" indicator.

## Permissions
- **storage**: Session management
- **host_permissions**: Access Tealium API endpoints

## Temporary Solution
This extension is a temporary solution. In the future, Tealium Sandbox will be integrated directly into Tealium Tools, eliminating the need for a separate extension.

## Troubleshooting
- **Extension not detected**: Refresh the page after installation
- **API calls fail**: Check Chrome DevTools console for errors
- **Session expired**: Re-enter your API key

## Support
Contact: Tealium Sandbox Team

