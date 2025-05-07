FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for face_recognition
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libsm6 \
    libxext6 \
    libxrender-dev &&
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml .
COPY uv.lock .

# Install face_recognition and other dependencies
RUN pip install --no-cache-dir face_recognition fastapi uvicorn numpy pydantic requests

# Copy application code
COPY . .

# Create data directory if not exists
RUN mkdir -p data

# Expose the port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
