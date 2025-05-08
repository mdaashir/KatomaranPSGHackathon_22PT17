# Backend Service

Node.js backend service for the Face Recognition Platform (2025).

## Features

- RESTful API for user management and system configuration
- WebSocket server for real-time communication
- Bridge between frontend and AI services
- Authentication and authorization (JWT)
- MongoDB integration for data persistence
- Metrics and logging for observability

## Tech Stack

- Node.js 18+
- Express for REST API
- ws for WebSocket server
- MongoDB driver
- JWT authentication
- Winston for logging

## API Documentation

API documentation is available at http://localhost:3001/api-docs

## WebSocket Protocol

See [WebSocket API Documentation](../../docs/WEBSOCKET.md)

## Development

```bash
cd apps/backend
npm install
npm run dev
```

## Testing

```bash
npm test
```

## Linting

```bash
npm run lint
```

## Environment Variables

See [DEPLOYMENT.md](../../docs/DEPLOYMENT.md) for required environment variables.
