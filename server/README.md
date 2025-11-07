# OTP Server

A lightweight Hono-based server that acts as a bridge between your phone and browser extension, securely routing OTP codes using a pub-sub message bus.

## Framework & Architecture

Built with:
- **[Hono](https://hono.dev)**: Fast, lightweight web framework
- **[Bun](https://bun.sh)**: JavaScript runtime and bundler
- **TypeScript**: Type-safe development

## Request Handling

The server exposes two main endpoints:

### `POST /otp` - Phone Submission
Receives OTP codes from your phone via iOS Shortcuts.

**Authentication**: Bearer token (`PHONE_AUTH_TOKEN`)
```typescript
Headers: { Authorization: "Bearer <PHONE_AUTH_TOKEN>" }
Body: { otp: "123456" }
```

**Flow**:
1. Request authenticated via `phoneAuth` middleware (validates bearer token)
2. OTP payload validated with Zod schema
3. Location hash extracted from headers
4. Server waits up to 25 seconds for a subscriber (browser extension) to connect
5. OTP published to the message bus with location-specific channel
6. Returns `200 OK` on success

### `GET /otp` - Extension Polling
Long-polling endpoint for browser extensions to retrieve OTPs.

**Authentication**: Bearer token (`EXTENSION_TOKEN`)
```typescript
Headers: { Authorization: "Bearer <EXTENSION_TOKEN>" }
Query params: { locationHash: "<hash>" }
```

**Flow**:
1. Request authenticated via `extensionAuth` middleware (validates bearer token)
2. Subscribes to location-specific channel on message bus
3. Waits up to 60 seconds for OTP to be published
4. Returns OTP text on success, `204 No Content` on timeout

## Authentication & Security

### Token Authentication
The server uses a unified token authentication middleware that validates bearer tokens for both phone and extension requests.

**Extension Authentication** (`EXTENSION_TOKEN`):
- Validates `Authorization: Bearer <EXTENSION_TOKEN>` header
- Ensures only authorized browser extensions can retrieve OTPs
- Simple, reusable bearer token validation

**Phone Authentication** (`PHONE_AUTH_TOKEN`):
- Validates `Authorization: Bearer <PHONE_AUTH_TOKEN>` header
- Ensures only trusted iOS Shortcuts can submit OTPs
- Uses the same authentication mechanism as extension validation

Both authentication middlewares are created from a shared `tokenAuth` factory function, ensuring consistent security validation across all endpoints.

### Location Hashing
The `locationHash` middleware provides regional validation:

1. **IP Extraction**: Gets client IP from connection info or `X-Forwarded-For` header
2. **Geolocation Lookup**: Queries `free.freeipapi.com` for location data
3. **Hash Generation**: Creates deterministic hash from `country|region|city`
4. **Channel Isolation**: Uses hash as message bus channel identifier

**Security Benefits**:
- OTPs are isolated by geographic region
- Prevents cross-region OTP interception
- Adds defense-in-depth layer to token authentication

## The Message Bus

The OTP Bus is a custom in-memory pub-sub system coordinating OTP delivery between phones and extensions.

### Components

**`OTPBus` (`otp-bus.ts`)**
- Manages channel-based subscriptions
- Publishes OTPs to all subscribers on a channel
- Implements `subscribeOnce()` with timeout handling
- Tracks subscriber presence for coordination

**`WaitForSubscriber` (`wait-for-sub.ts`)**
- Allows publishers to wait for subscribers
- Prevents race conditions where phone sends OTP before extension subscribes
- Resolves instantly if subscriber already exists
- Times out gracefully to avoid blocking

### Key Features
- **Channel-based isolation**: Each `locationHash` gets its own channel
- **One-time consumption**: `subscribeOnce()` auto-unsubscribes after receiving OTP
- **Graceful timeouts**: Both publisher and subscriber have configurable timeout budgets
- **Race condition handling**: Publisher waits for subscriber to connect before sending

## Running the Server

### Development
```bash
bun run dev
```
Starts server with hot-reload on file changes.

### Production
```bash
bun run src/index.ts
```

### Environment Variables
Required in `.env` file:
```
PHONE_AUTH_TOKEN=<your-phone-token>
EXTENSION_TOKEN=<your-extension-token>
```
