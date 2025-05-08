# Development Guide

This document provides guidelines and instructions for setting up a development environment for the Face Recognition Platform.

## Local Development Environment

### Prerequisites

- Node.js 18.0.0+
- Python 3.12+
- MongoDB 6.0+
- Docker and Docker Compose (for containerized development)
- Git

### Environment Setup

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/face-recognition-platform.git
cd face-recognition-platform
```

2. **Set up environment variables**

Create the following `.env` files:

- Root `.env`:

```
MONGODB_URI=mongodb://localhost:27017/face-recognition
NODE_ENV=development
LOGGING_LEVEL=debug
```

- Frontend `.env` (in `apps/frontend`):

```
VITE_API_URL=http://localhost:3001/api
VITE_WEBSOCKET_URL=ws://localhost:3001/ws
```

- RAG Engine `.env` (in `services/rag-engine`):

```
OPENAI_API_KEY=your_openai_api_key
```

### Frontend Development

```bash
cd apps/frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### Backend Development

```bash
cd apps/backend
npm install
npm run dev
```

The backend will be available at `http://localhost:3001`.

### Face Recognition Service Development

   ```bash
   cd services/face-registration
   # Create a virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -e .
   # Start the service
   python main.py
   ```

The face recognition service will be available at `http://localhost:8000`.

### RAG Engine Development

   ```bash
   cd services/rag-engine
   # Create a virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   # Start the service
   python app.py
   ```

4. **Using Docker for Development**

   For a containerized development environment:

   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

## Code Structure

```
.
├── apps/                      # Application code
│   ├── backend/               # Node.js backend service
│   │   ├── routes/            # API routes
│   │   ├── utils/             # Utility functions
│   │   └── ws/                # WebSocket server
│   └── frontend/              # React.js frontend
│       ├── src/
│       │   ├── components/    # React components
│       │   ├── context/       # React context providers
│       │   ├── pages/         # Page components
│       │   └── services/      # API services
├── database/                  # Database schemas and migrations
├── docs/                      # Documentation
├── logs/                      # Application logs
├── scripts/                   # Utility scripts
└── services/                  # Microservices
    ├── face-registration/     # Face recognition service
    └── rag-engine/            # RAG engine for Q&A
```

## Development Workflow

### Branching Strategy

We follow the Git Flow branching strategy:

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features and enhancements
- `bugfix/*` - Bug fixes
- `release/*` - Release preparation
- `hotfix/*` - Urgent production fixes

### Commit Conventions

We use Conventional Commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`

Example: `feat(frontend): add face registration component`

### Pull Request Process

1. Create a feature/bugfix branch from `develop`
2. Implement changes and write tests
3. Ensure all tests pass and linting is clean
4. Submit PR against the `develop` branch
5. Request review from at least one team member
6. Address review comments
7. PR will be merged once approved

## Code Style and Linting

### JavaScript/TypeScript

We use ESLint with Prettier for consistent code style:

```bash
# Frontend
cd apps/frontend
npm run lint

# Backend
cd apps/backend
npm run lint
```

### Python

We use Black and flake8 for Python code formatting and linting:

```bash
# Face Recognition Service
cd services/face-registration
black .
flake8

# RAG Engine
cd services/rag-engine
black .
flake8
```

## Testing

Run tests for each component:

```bash
# Frontend tests
cd apps/frontend
npm test

# Backend tests
cd apps/backend
npm test

# Face Recognition Service tests
cd services/face-registration
pytest

# RAG Engine tests
cd services/rag-engine
pytest
```

## Database Management

### MongoDB Setup

For local development, either:

1. Use the MongoDB container:

```bash
docker-compose up -d mongodb
```

2. Install MongoDB locally:
   - [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

### Accessing the Database

- GUI: MongoDB Compass
- CLI: `mongosh mongodb://localhost:27017/face-recognition`

## Development Utilities

### Available Scripts

- `scripts/dev.sh`: Start all services in development mode
- `scripts/test-all.sh`: Run all test suites
- `scripts/clean.sh`: Clean temporary files and build artifacts

## Troubleshooting

### Common Issues

1. **WebSocket Connection Issues**

   - Verify that the WebSocket server is running
   - Check for CORS configuration issues
   - Check browser console for connection errors

2. **Face Recognition Errors**

   - Ensure proper lighting for webcam
   - Verify that face image quality is sufficient
   - Check logs for encoding errors

3. **Database Connection Issues**
   - Verify MongoDB connection string
   - Check that MongoDB is running
   - Verify network connectivity

For more detailed troubleshooting, refer to the logs in the `logs/` directory.


## API Development

### Adding a New Endpoint

1. Create a route file in the appropriate directory
2. Define the endpoint handler
3. Register the route in the main application
4. Add validation using Joi
5. Document the endpoint using Swagger annotations
6. Write tests for the new endpoint

### WebSocket Event Development

1. Define the event in `ws/server.js`
2. Implement the handler logic
3. Register event listeners
4. Document the event in the WebSocket API documentation
5. Test the event using a WebSocket client

## Build and Package

### Building for Production

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build frontend
```

### Local Production Preview

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```
