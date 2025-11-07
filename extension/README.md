# OTP Extension

A Chrome extension that automatically detects and fills OTP (One-Time Password) input fields by polling a server for OTP codes received from your phone.

## Building and Installation

### Prerequisites
- [Bun](https://bun.sh) runtime installed
- Environment variables configured (see `.env` file in project root)

### Build Steps

1. Install dependencies:
```bash
bun install
```

2. Build the extension:
```bash
bun run build
```

This compiles TypeScript files, processes environment variables, and copies static assets to the `dist/` directory.

3. Load in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

### Development Mode

For hot-reload during development:
```bash
bun run dev
```

## How It Works

The extension consists of three main components working together to deliver OTPs seamlessly:

### 1. Content Script (`content.ts`)
- Runs on all web pages
- Monitors the DOM for OTP input fields using selectors:
  - `input[autocomplete="one-time-code"]`
  - Inputs with "otp" or "code" in name/id attributes
- Uses `MutationObserver` to detect dynamically added input fields
- Automatically requests and fills OTP when detected

### 2. Service Worker (`service-worker.ts`)
- Background script that manages OTP lifecycle
- **Polling mechanism**: Continuously polls the server endpoint (`GET /otp`) with configurable intervals
- **Caching**: Stores received OTPs in `chrome.storage.local` with a 30-second TTL
- **Request handling**: 
  - Waits up to 25 seconds for an OTP
  - Makes requests every 600ms during the wait period
  - Times out individual requests after 10 seconds
- **Message handling**: Responds to `GET_OTP` and `CLEAR_OTP` messages from content scripts and popup

### 3. Popup UI (`popup/`)
- Displays the current OTP code
- Shows remaining time before expiration
- Provides copy-to-clipboard functionality
- Refresh button to clear cache and request a new OTP

### Authentication Flow
The service worker includes the `EXTENSION_TOKEN` in the `Authorization` header when polling the server, ensuring only authorized extensions can retrieve OTPs. The server validates this bearer token before allowing access to the OTP endpoint.

### OTP Lifecycle
1. Content script detects OTP input field
2. Sends `GET_OTP` message to service worker
3. Service worker checks local cache (30s TTL)
4. If expired or missing, polls server with timeout budget
5. Returns OTP to content script
6. Content script auto-fills the input field
7. OTP expires after 30 seconds and is cleared from cache
