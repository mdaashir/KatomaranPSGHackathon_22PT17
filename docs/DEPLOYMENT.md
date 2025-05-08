# Deployment Guide

This document provides detailed instructions for deploying the Face Recognition Platform to various environments.

## Table of Contents

- [Deployment Requirements](#deployment-requirements)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Provider Deployments](#cloud-provider-deployments)
  - [AWS Deployment](#aws-deployment)
  - [Azure Deployment](#azure-deployment)
  - [Google Cloud Deployment](#google-cloud-deployment)
- [Scaling Considerations](#scaling-considerations)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring Setup](#monitoring-setup)
- [Backup and Recovery](#backup-and-recovery)
- [CI/CD Pipeline](#cicd-pipeline)

## Deployment Requirements

### Minimum Production Requirements

- 4 vCPU cores
- 8GB RAM
- 50GB SSD storage
- 100Mbps network bandwidth
- Docker Engine 20.10+ or Kubernetes 1.22+
- MongoDB 6.0+ (can be external)
- SSL/TLS certificates

### Recommended Production Requirements

- 8 vCPU cores
- 16GB RAM
- 100GB SSD storage
- 1Gbps network bandwidth
- CUDA-capable GPU for face recognition service
- MongoDB 6.0+ with replication
- Redis for caching (optional)
- CDN for static assets
- Load balancer with SSL termination

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# General
ENVIRONMENT=production
LOG_LEVEL=info

# MongoDB
MONGODB_URI=mongodb://user:password@mongodb:27017/face-recognition?authSource=admin
MONGODB_REPLICA_SET=rs0

# Security
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=24h
COOKIE_SECRET=your_cookie_secret_here

# Services
FACE_RECOGNITION_SERVICE_URL=http://face-registration:8000
RAG_ENGINE_URL=http://rag-engine:8080

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# OpenAI (for RAG Engine)
OPENAI_API_KEY=your_openai_api_key_here
```

Modify these values according to your environment.

### Frontend Environment

Create a `.env` file in the `apps/frontend` directory:

```
VITE_API_URL=https://api.yourdomain.com/api
VITE_WEBSOCKET_URL=wss://api.yourdomain.com/ws
VITE_ENVIRONMENT=production
```

## Docker Deployment

### Using Docker Compose

1. Build the Docker images:

```bash
docker-compose build
```

2. Start the services:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Using Docker Swarm

1. Initialize a Docker Swarm:

```bash
docker swarm init
```

2. Deploy the stack:

```bash
docker stack deploy -c docker-compose.yml -c docker-compose.prod.yml face-recognition
```

3. Scale services as needed:

```bash
docker service scale face-recognition_backend=3
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.22+)
- kubectl configured to access your cluster
- Helm 3+

### Deployment Steps

1. Add Helm repository and update:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

2. Deploy MongoDB:

```bash
helm install mongodb bitnami/mongodb \
  --set auth.rootPassword=secretpassword \
  --set replicaSet.enabled=true \
  --set persistence.size=10Gi
```

3. Apply Kubernetes manifests:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/deployments.yaml
kubectl apply -f k8s/ingress.yaml
```

4. Verify deployment:

```bash
kubectl get pods -n face-recognition
```

## Cloud Provider Deployments

### AWS Deployment

#### Using Amazon ECS

1. Create an ECR repository for each service
2. Push Docker images to ECR
3. Create ECS task definitions and services
4. Set up Application Load Balancer
5. Configure Auto Scaling
6. Set up CloudWatch for monitoring

#### Using Amazon EKS

1. Create an EKS cluster
2. Configure kubectl for EKS
3. Deploy using Kubernetes manifests as described above
4. Set up AWS ALB Ingress Controller

### Azure Deployment

#### Using Azure Container Instances

1. Create a resource group
2. Create Azure Container Registry
3. Push Docker images to ACR
4. Deploy containers using Azure Container Instances
5. Set up Azure Application Gateway

#### Using Azure Kubernetes Service (AKS)

1. Create an AKS cluster
2. Configure kubectl for AKS
3. Deploy using Kubernetes manifests as described above
4. Set up Azure Application Gateway Ingress Controller

### Google Cloud Deployment

#### Using Google Kubernetes Engine (GKE)

1. Create a GKE cluster
2. Configure kubectl for GKE
3. Deploy using Kubernetes manifests as described above
4. Set up Google Cloud Load Balancer

## Scaling Considerations

### Horizontal Scaling

- **Frontend**: Can be scaled horizontally behind a load balancer
- **Backend**: Stateless, can be scaled horizontally
- **Face Recognition Service**: CPU/GPU intensive, scale based on recognition load
- **RAG Engine**: Memory intensive, scale based on query volume
- **MongoDB**: Configure with proper replication and sharding

### Vertical Scaling

- **Face Recognition Service**: Benefits from more CPU cores and GPU acceleration
- **RAG Engine**: Benefits from more RAM (at least 8GB per instance)
- **MongoDB**: Benefits from faster storage (SSD) and more RAM

## SSL/TLS Configuration

### Using Nginx as a Reverse Proxy

1. Install Nginx:

```bash
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx
```

2. Configure Nginx reverse proxy:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    add_header Strict-Transport-Security "max-age=63072000" always;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Generate SSL certificates using Let's Encrypt:

```bash
certbot --nginx -d api.yourdomain.com
```

## Monitoring Setup

### Prometheus and Grafana

1. Deploy Prometheus and Grafana:

```bash
helm install prometheus prometheus-community/prometheus
helm install grafana grafana/grafana
```

2. Import dashboards for:
   - Node.js metrics
   - MongoDB metrics
   - Docker/Kubernetes metrics
   - Custom application metrics

### Logging with ELK Stack

1. Deploy Elasticsearch, Logstash, and Kibana
2. Configure applications to send logs to Logstash
3. Set up Filebeat for log shipping
4. Create Kibana dashboards for log visualization

## Backup and Recovery

### MongoDB Backup

1. Schedule regular backups:

```bash
mongodump --uri="mongodb://user:password@mongodb:27017/face-recognition?authSource=admin" --out=/backup/$(date +%Y-%m-%d)
```

2. Configure automated backup rotation:

```bash
find /backup -type d -name "20*" -mtime +7 -exec rm -rf {} \;
```

### Application Data Backup

1. Set up regular backups for face encoding data:

```bash
rsync -av /path/to/face-data /backup/face-data/$(date +%Y-%m-%d)
```

### Disaster Recovery Plan

1. Document failover procedures
2. Test recovery regularly
3. Maintain offsite backups
4. Document recovery time objectives (RTO) and recovery point objectives (RPO)

## CI/CD Pipeline

### GitLab CI/CD Example

Create a `.gitlab-ci.yml` file:

```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""

test:
  stage: test
  image: node:18
  script:
    - cd apps/frontend
    - npm install
    - npm run test
    - cd ../backend
    - npm install
    - npm run test

build:
  stage: build
  image: docker:20.10
  services:
    - docker:20.10-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker-compose build
    - docker-compose push
  only:
    - main
    - release/*

deploy:production:
  stage: deploy
  image: kroniak/ssh-client
  script:
    - mkdir -p ~/.ssh
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' > ~/.ssh/id_rsa
    - chmod 600 ~/.ssh/id_rsa
    - ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST "cd /app && git pull && docker-compose pull && docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
  environment:
    name: production
  only:
    - main
```

### GitHub Actions Example

Create a `.github/workflows/deploy.yml` file:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Run tests
        run: |
          cd apps/frontend
          npm install
          npm run test
          cd ../backend
          npm install
          npm run test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Login to DockerHub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Build and push Docker images
        run: |
          docker-compose build
          docker-compose push

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app
            git pull
            docker-compose pull
            docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Maintenance and Updates

### Updating Services

1. Pull the latest code:
```bash
git pull origin main
```

2. Build and update containers:
```bash
docker-compose build
docker-compose up -d
```

### Database Maintenance

1. Schedule regular maintenance windows
2. Run database compaction and optimization:
```bash
mongosh --eval "db.runCommand({compact: 'users'})"
```

3. Monitor database size and performance:
```bash
mongosh --eval "db.stats()"
```

### System Health Checks

Implement HTTP health check endpoints:

- Backend API: `/api/health`
- Face Recognition Service: `/health`
- RAG Engine: `/health`
