# TraceForge.baseline Web UI

Browser-based interface for inspecting LLM traces and creating tests.

## Architecture

- **Backend:** Fastify API server (port 3001)
- **Frontend:** React + Vite + TailwindCSS (dev port 5173)

## Features

### Trace Timeline (Home Page)
- Real-time list of all captured traces
- Auto-refresh every 5 seconds
- Filter by endpoint or model
- Click to view details

### Trace Detail Page
- Full request/response inspection
- Formatted JSON display
- Metadata (duration, tokens, status)
- "Save as Test" button

### API Endpoints

- `GET /api/traces` - List all traces
- `GET /api/traces/:id` - Get single trace
- `POST /api/tests` - Create test from trace
- `GET /api/tests` - List all tests
- `GET /api/config` - Get configuration
- `GET /health` - Health check

## Development

### Start API Server

```bash
cd packages/web
npx tsx server/index.ts
```

API runs on http://localhost:3001

### Start Frontend (Vite Dev Server)

```bash
cd packages/web
npx vite
```

Frontend runs on http://localhost:5173 with hot reload

### Both Together

```bash
cd packages/web
npm run dev
```

This starts both the API server and Vite dev server concurrently.

## Production Build

```bash
# Build frontend
npm run build

# This creates:
# - dist/client/ - React production build
# - dist/server/ - Compiled API server

# Start production server
NODE_ENV=production npm start
```

In production mode:
- API serves static React files from `dist/client/`
- Everything runs on http://localhost:3001
- SPA routing handled via fallback to `index.html`

## Configuration

Set via environment variables:

```bash
# Port for web server (default: 3001)
export WEB_PORT=3001

# Production mode
export NODE_ENV=production
```

## Tech Stack

### Backend
- Fastify v4 - Fast web framework
- @fastify/cors - CORS support
- @fastify/static - Serve static files
- YAML - Parse YAML test files
- pino-pretty - Pretty logs

### Frontend
- React 18 - UI framework
- React Router - Client-side routing
- Vite - Fast build tool
- TailwindCSS - Utility-first CSS
- TypeScript - Type safety

## File Structure

```
packages/web/
├── server/
│   └── index.ts              # Fastify API server
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root component with routing
│   ├── index.css             # Global styles (TailwindCSS)
│   ├── api/
│   │   └── client.ts         # API fetch wrappers
│   └── components/
│       ├── Header.tsx        # Navigation header
│       ├── TraceList.tsx     # Timeline view
│       └── TraceDetail.tsx   # Trace inspector
├── index.html                # HTML template
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # TailwindCSS config
├── postcss.config.js         # PostCSS config
├── tsconfig.json             # TypeScript (frontend)
└── tsconfig.server.json      # TypeScript (backend)
```

## API Usage Examples

### List Traces

```bash
curl http://localhost:3001/api/traces
```

Response:
```json
{
  "traces": [
    {
      "id": "uuid",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "endpoint": "/v1/chat/completions",
      "request": { ... },
      "response": { ... },
      "metadata": {
        "duration_ms": 1234,
        "tokens_used": 100,
        "model": "gpt-3.5-turbo",
        "status": "success"
      }
    }
  ],
  "total": 1
}
```

### Create Test

```bash
curl -X POST http://localhost:3001/api/tests \
  -H "Content-Type: application/json" \
  -d '{
    "traceId": "trace-uuid",
    "name": "My Test",
    "description": "Test description"
  }'
```

Response:
```json
{
  "test": { ... },
  "filename": "test-uuid.yaml",
  "message": "Test created successfully"
}
```

## Styling

Uses TailwindCSS with dark mode by default:

- Background: `bg-gray-900`
- Text: `text-gray-100`
- Cards: `bg-gray-800`
- Borders: `border-gray-700`
- Primary: `bg-blue-600`
- Success: `bg-green-600`
- Error: `bg-red-600`

## Error Handling

All API endpoints return appropriate HTTP status codes:

- `200 OK` - Success
- `201 Created` - Test created
- `400 Bad Request` - Invalid input
- `404 Not Found` - Trace/test not found
- `500 Internal Server Error` - Server error

Frontend displays user-friendly error messages with retry buttons.

## Performance

- Frontend auto-refreshes every 5 seconds
- Traces sorted by timestamp (newest first)
- JSON parsing done server-side
- Minimal bundle size with Vite
- Dark mode reduces eye strain

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires JavaScript enabled and ES2022 support.
