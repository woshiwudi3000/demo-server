# Stock Scanner Server

Node.js/Express API server for Stock Scanner application, built with TypeScript and Vite.

## Features

- RESTful API endpoints
- Server-Sent Events (SSE) for real-time streaming
- Swagger API documentation
- Support for A股, 港股, and 美股 markets
- Batch analysis support
- Task status tracking
- TypeScript support with full type safety
- Vite build system for fast development and optimized production builds

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root:

```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0
NETWORK_IP=192.168.1.23
CORS_ORIGIN=*

# AI Service (Optional)
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

## Running

Development (with hot reload):
```bash
npm run dev
```

Development (frontend only):
```bash
npm run dev:frontend
```

Production build:
```bash
npm run build
```

Production start:
```bash
npm start
```

Preview production build:
```bash
npm run preview:server
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:3000/api-docs
- Health Check: http://localhost:3000/health

## API Endpoints

### System
- `GET /api/status` - Get server status
- `GET /api/system-info` - Get system information

### Stock Analysis
- `POST /api/validate-stock` - Validate stock code
- `POST /api/analyze` - Analyze single stock (non-streaming)
- `POST /api/analyze-stream` - Start streaming analysis
- `POST /api/batch-analyze` - Batch analyze stocks
- `POST /api/batch-analyze-stream` - Start batch streaming analysis
- `GET /api/task-status/:stock_code` - Get task status

### SSE
- `GET /api/sse?client_id=xxx` - SSE connection for real-time updates

## Architecture

The server is designed to be a lightweight API gateway. For actual stock analysis, it can:
1. Call the Python Flask service (if available)
2. Use external APIs
3. Implement analysis logic directly

## Project Structure

```
stock-scanner-server/
├── server/              # Backend server code (TypeScript)
│   ├── controllers/    # Request handlers
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── index.ts        # Server entry point
├── src/                # Frontend React code (TypeScript)
├── dist/               # Build output
└── package.json
```

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Build Tool**: Vite
- **API Documentation**: Swagger/OpenAPI
- **Real-time**: Server-Sent Events (SSE)

## Notes

- The current implementation includes mock analysis results
- In production, connect to the actual analysis service
- SSE connections are managed per client ID
- Tasks are tracked in memory (consider Redis for production)
- TypeScript provides full type safety across the codebase
