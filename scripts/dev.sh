#!/bin/bash

# Exit on error
set -e

echo "🔨 Building Docker containers..."
docker-compose build

echo "🚀 Starting all services..."
docker-compose up -d

echo "📊 Streaming logs (press Ctrl+C to stop viewing logs, containers will continue running)..."
docker-compose logs -f

# To stop all containers when script is terminated:
# trap "echo '🛑 Stopping all services...'; docker-compose down" EXIT
