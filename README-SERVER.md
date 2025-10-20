# Tealium Sandbox Server Setup

This document explains how to run the Tealium Sandbox with secure API integration.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Open in Browser
```
http://localhost:3000
```

## How It Works

### Security Features
- **API keys never exposed to browser** - All API calls go through the server
- **Session-based authentication** - Temporary session IDs instead of storing tokens
- **Automatic cleanup** - Expired sessions are automatically removed
- **No CORS issues** - Server-side API calls bypass browser restrictions

### Architecture
```
Browser → Server → Tealium API
   ↓         ↓         ↓
Client   Proxy    Secure
```

1. **Browser** sends API key to server
2. **Server** authenticates with Tealium API (server-side)
3. **Server** stores session and returns session ID
4. **Browser** uses session ID for subsequent API calls
5. **Server** proxies requests to Tealium API with stored credentials

## API Endpoints

### Authentication
```
POST /api/auth
Body: { "apiKey": "your-api-key" }
Response: { "success": true, "sessionId": "abc123", "hostname": "api.tealiumiq.com" }
```

### Profile Fetch
```
GET /api/profile/{account}/{profile}?sessionId={sessionId}&version={version}
Response: { /* Tealium profile data */ }
```

### Health Check
```
GET /api/health
Response: { "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

## Development

### With Auto-reload
```bash
npm run dev
```

### Environment Variables
- `PORT` - Server port (default: 3000)

## Production Deployment

### Option 1: Heroku
1. Create Heroku app
2. Set environment variables
3. Deploy with Git

### Option 2: Railway
1. Connect GitHub repository
2. Auto-deploy on push

### Option 3: Vercel
1. Import project
2. Configure serverless functions

## Security Notes

- API keys are stored in server memory only
- Sessions expire automatically
- No persistent storage of credentials
- All API calls are server-side only

## Troubleshooting

### Server won't start
- Check if port 3000 is available
- Verify Node.js version (>=14.0.0)
- Run `npm install` to ensure dependencies

### API calls fail
- Check server logs for detailed errors
- Verify Tealium API key is correct
- Ensure server is running on correct port

### CORS errors
- This server setup eliminates CORS issues
- If you see CORS errors, ensure you're using the server version
- Static GitHub Pages version will have CORS limitations
