# Face Recognition Platform

A production-level face recognition platform with real-time AI Q&A capabilities using RAG (Retrieval-Augmented Generation).

## Features

- **Face Registration**: Register new users with their face images
- **Real-time Face Recognition**: Identify registered users through webcam
- **AI-powered Q&A**: Ask questions about recognized individuals and receive intelligent responses
- **Admin Dashboard**: Manage registered users and system settings
- **WebSocket Integration**: Real-time notifications and updates
- **Secure API**: JWT authentication and authorization
- **High Performance**: Optimized for production workloads
- **Scalable Architecture**: Microservices design for horizontal scaling
- **Comprehensive Monitoring**: Integrated logging and metrics collection
- **Cross-Platform Support**: Works on desktop and mobile browsers

## Architecture

This monorepo contains the following components:

- **Frontend**: React.js application for user interface
- **Backend**: Node.js server for REST APIs and WebSocket communication
- **AI Services**:
  - Face Recognition: Python-based face encoding and matching
  - RAG Engine: LangChain + FAISS + OpenAI for intelligent Q&A
- **Database**: MongoDB schemas and connection configurations
- **Logs**: Structured JSON logs for face registration and recognition events
- **Scripts**: Utility scripts for development, deployment, and maintenance
- **Docs**: Architecture diagrams and technical documentation

## System Requirements (2025)

- Docker and Docker Compose (v2.0.0+)
- Node.js 18.0.0+ (for local development)
- Python 3.12+ (for local development of AI services)
- MongoDB 6.0+ (for local development without Docker)
- 8GB+ RAM recommended for running all services
- CUDA-capable GPU recommended but not required
- Windows, macOS, or Linux supported

## Quick Start

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/face-recognition-platform.git
cd face-recognition-platform
```

2. **Set up environment variables**

```bash
# Copy the example environment files
cp .env.example .env
cp apps/frontend/.env.example apps/frontend/.env
cp services/rag-engine/.env.example services/rag-engine/.env
```

3. **Start the services with Docker**

```bash
docker-compose up -d
```

4. **Access the application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Face Recognition Service: http://localhost:8000
- RAG Engine API: http://localhost:8080

## Production Deployment

For production deployment, we recommend:

1. Using container orchestration (Kubernetes, AWS ECS, etc.)
2. Setting up proper SSL/TLS certificates
3. Implementing a CDN for frontend assets
4. Configuring database replication and backups
5. Setting up monitoring and alerting

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed production deployment instructions.

## Documentation

- [Development Guide](./docs/DEVELOPMENT.md) - Detailed development instructions
- [Deployment Guide](./docs/DEPLOYMENT.md) - Deployment instructions for various environments
- [Security Guide](./docs/SECURITY.md) - Security best practices and considerations
- [Testing Guide](./docs/TESTING.md) - Comprehensive testing procedures
- [Operations Guide](./docs/OPERATIONS.md) - Operation and maintenance procedures
- [API Documentation](./docs/API.md) - REST API documentation
- [WebSocket API](./docs/WEBSOCKET.md) - WebSocket protocol documentation

## API Documentation

API documentation is available at:

- REST API: http://localhost:3001/api-docs
- WebSocket API: See [WebSocket API Documentation](./docs/WEBSOCKET.md)

## Performance Metrics (2025)

- Face Recognition: 250ms average response time
- RAG Engine: ~1.5s average response time
- WebSocket latency: <50ms
- System can handle up to 100 concurrent users with recommended hardware

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

See [Contributing Guide](./docs/CONTRIBUTING.md) for details on the development workflow and how to contribute.
