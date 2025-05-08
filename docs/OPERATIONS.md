# Operations Guide

This document outlines the operational procedures, monitoring, and maintenance tasks for the Face Recognition Platform.

## Table of Contents

- [Monitoring and Observability](#monitoring-and-observability)
- [Logging Strategy](#logging-strategy)
- [Performance Monitoring](#performance-monitoring)
- [Alerting](#alerting)
- [Backup and Recovery](#backup-and-recovery)
- [Scaling Procedures](#scaling-procedures)
- [Maintenance Procedures](#maintenance-procedures)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Disaster Recovery](#disaster-recovery)
- [On-Call Procedures](#on-call-procedures)

## Monitoring and Observability

### Monitoring Stack

The platform uses the following monitoring stack:

1. **Prometheus**: Metrics collection and storage
2. **Grafana**: Visualization and dashboarding
3. **Loki**: Log aggregation
4. **Jaeger**: Distributed tracing
5. **AlertManager**: Alert management and routing

### Infrastructure Monitoring

Set up monitoring for:

1. **Host Metrics**:

   - CPU, memory, disk, and network usage
   - Load average
   - Disk I/O
   - Uptime

2. **Container Metrics**:

   - Container CPU and memory usage
   - Container restarts
   - Container health checks

3. **Kubernetes Metrics** (if applicable):
   - Pod health
   - Deployment status
   - Node health
   - Control plane health

### Key Dashboards

1. **System Overview Dashboard**:

   - Overall system health
   - Service status
   - Error rates
   - Response times

2. **Service-Specific Dashboards**:
   - Frontend metrics
   - Backend API metrics
   - Face Recognition service metrics
   - RAG Engine metrics
   - Database metrics

### Setting Up Monitoring

#### 1. Prometheus and Grafana Setup

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.44.0
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    ports:
      - '9090:9090'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:10.1.0
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - '3000:3000'
    restart: unless-stopped
    depends_on:
      - prometheus
      - loki

  loki:
    image: grafana/loki:2.9.0
    volumes:
      - ./monitoring/loki-config.yaml:/etc/loki/local-config.yaml
      - loki_data:/loki
    ports:
      - '3100:3100'
    restart: unless-stopped
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - ./monitoring/promtail-config.yaml:/etc/promtail/config.yml
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped
    depends_on:
      - loki

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
```

#### 2. Sample Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'rules/*.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'backend'
    metrics_path: /metrics
    static_configs:
      - targets: ['backend:3001']

  - job_name: 'face-recognition-service'
    metrics_path: /metrics
    static_configs:
      - targets: ['face-registration:8000']

  - job_name: 'rag-engine'
    metrics_path: /metrics
    static_configs:
      - targets: ['rag-engine:8080']

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

## Logging Strategy

### Structured Logging

All services in the platform use structured JSON logging with the following fields:

1. **Common Fields**:

   - `timestamp`: ISO 8601 format
   - `level`: Log level (debug, info, warn, error)
   - `service`: Service name
   - `message`: Log message
   - `traceId`: Distributed tracing ID

2. **Context-Specific Fields**:
   - `userId`: User identity (when available)
   - `requestId`: Unique request identifier
   - `path`: API path (for API logs)
   - `method`: HTTP method (for API logs)
   - `statusCode`: HTTP status code (for API responses)
   - `duration`: Request duration in ms

### Logging Implementation

#### Node.js Backend Logging

```javascript
// apps/backend/utils/logger.js
const winston = require('winston');
const { format } = winston;

const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	format: format.combine(
		format.timestamp(),
		format.errors({ stack: true }),
		format.json()
	),
	defaultMeta: { service: 'backend' },
	transports: [
		new winston.transports.Console(),
		new winston.transports.File({
			filename: process.env.LOG_FILE || 'logs/backend.log',
			maxsize: 10485760, // 10MB
			maxFiles: 10,
		}),
	],
});

// HTTP request logger middleware
const requestLogger = (req, res, next) => {
	const startTime = Date.now();

	// Once the request is processed
	res.on('finish', () => {
		const duration = Date.now() - startTime;

		logger.info('HTTP Request', {
			requestId: req.id,
			method: req.method,
			path: req.path,
			statusCode: res.statusCode,
			duration,
			userAgent: req.get('user-agent'),
			ip: req.ip,
		});
	});

	next();
};

module.exports = { logger, requestLogger };
```

#### Python Service Logging

```python
# services/face-recognition/utils/logger.py
import logging
import json
import sys
import os
from datetime import datetime
import uuid
from pythonjsonlogger import jsonlogger

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        log_record['timestamp'] = datetime.utcnow().isoformat()
        log_record['level'] = record.levelname
        log_record['service'] = 'face-recognition'
        if not log_record.get('request_id'):
            log_record['request_id'] = str(uuid.uuid4())

# Configure logger
def setup_logger():
    logger = logging.getLogger()
    handler = logging.StreamHandler(sys.stdout)

    formatter = CustomJsonFormatter('%(timestamp)s %(level)s %(service)s %(name)s %(message)s')
    handler.setFormatter(formatter)

    # Add file handler if LOG_FILE is specified
    log_file = os.environ.get('LOG_FILE')
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    logger.addHandler(handler)
    logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))

    return logger

logger = setup_logger()
```

### Log Collection and Analysis

1. **Centralized Log Aggregation**:

   - All logs are forwarded to Loki
   - Structured logs enable efficient querying

2. **Log Retention Policy**:

   - Production logs: 90 days
   - Security logs: 1 year
   - Debug logs: 14 days

3. **Log Rotation**:
   - Logs rotated daily
   - Compressed after rotation
   - Old logs archived to cold storage

## Performance Monitoring

### Key Performance Indicators (KPIs)

1. **API Performance**:

   - Request latency (p50, p95, p99)
   - Request throughput
   - Error rate

2. **Face Recognition Performance**:

   - Recognition latency
   - Recognition accuracy
   - Face encoding time

3. **RAG Engine Performance**:

   - Query latency
   - Index search time
   - Response quality metrics

4. **System Performance**:
   - Service uptime
   - Resource utilization
   - Response time under load

### Performance Dashboards

Create Grafana dashboards to visualize:

1. **Real-time Performance**:

   - Current metrics
   - Short-term trends (1h, 6h, 24h)

2. **Historical Performance**:

   - Long-term trends (7d, 30d, 90d)
   - Performance regressions

3. **User Experience Metrics**:
   - Frontend load time
   - Time to interactive
   - WebSocket latency

## Alerting

### Alert Configuration

Configure alerts for:

1. **Infrastructure Alerts**:

   - High CPU/memory usage (>80% for 5min)
   - Disk space running low (<10% free)
   - Service unreachable
   - Abnormal service restarts

2. **Application Alerts**:

   - High error rate (>1% of requests)
   - High latency (p95 >500ms for 5min)
   - Failed health checks
   - Authentication failures

3. **Security Alerts**:
   - Multiple failed login attempts
   - Unusual access patterns
   - API rate limit exceeded
   - Unauthorized access attempts

### Alert Channels

Configure alerts to be sent via:

1. **Email**: For non-urgent issues
2. **SMS**: For urgent issues
3. **PagerDuty/OpsGenie**: For critical issues
4. **Slack**: For team notifications

### Sample Alert Configuration

```yaml
# monitoring/rules/alerts.yml
groups:
  - name: service_alerts
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate for {{ $labels.service }}'
          description: 'Error rate is {{ $value | humanizePercentage }} for the last 5 minutes'

      - alert: SlowResponses
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Slow responses from {{ $labels.service }}'
          description: '95th percentile of request duration is {{ $value | humanizeDuration }} for the last 5 minutes'

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Service {{ $labels.job }} is down'
          description: '{{ $labels.job }} has been down for more than 1 minute'
```

## Backup and Recovery

### Database Backup Strategy

1. **Regular Backups**:

   - Full daily backups
   - Incremental hourly backups
   - Transaction log backups every 15 minutes

2. **Backup Verification**:

   - Weekly restore tests
   - Integrity verification
   - Simulated recovery exercises

3. **Backup Storage**:
   - Primary backup: Local storage
   - Secondary backup: Cloud storage (AWS S3/Azure Blob/GCP Storage)
   - Cold storage: Monthly archives retained for 1 year

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

# Configuration
BACKUP_DIR="/backups"
MONGODB_URI="mongodb://user:password@mongodb:27017/face-recognition"
DATE=$(date +"%Y-%m-%d_%H-%M")

# Create backup directory
mkdir -p ${BACKUP_DIR}/${DATE}

# MongoDB backup
echo "Starting MongoDB backup..."
mongodump --uri="${MONGODB_URI}" --out="${BACKUP_DIR}/${DATE}/mongodb"

# Face data backup
echo "Starting Face data backup..."
cp -r /data/face-encodings ${BACKUP_DIR}/${DATE}/face-encodings

# Compress backup
echo "Compressing backup..."
tar -czf ${BACKUP_DIR}/${DATE}.tar.gz -C ${BACKUP_DIR} ${DATE}

# Upload to cloud storage (example with AWS S3)
echo "Uploading to cloud storage..."
aws s3 cp ${BACKUP_DIR}/${DATE}.tar.gz s3://face-recognition-backups/${DATE}.tar.gz

# Cleanup
echo "Cleaning up local files..."
rm -rf ${BACKUP_DIR}/${DATE}

# Delete backups older than 14 days
find ${BACKUP_DIR} -name "*.tar.gz" -type f -mtime +14 -delete

echo "Backup completed"
```

### Recovery Procedures

1. **Database Recovery**:

```bash
# Restore MongoDB database
mongorestore --uri="mongodb://user:password@mongodb:27017" --drop ${BACKUP_DIR}/${DATE}/mongodb
```

2. **Face Data Recovery**:

```bash
# Restore face encodings
cp -r ${BACKUP_DIR}/${DATE}/face-encodings /data/face-encodings
```

3. **Full System Recovery**:

```bash
# Stop all services
docker-compose down

# Restore database and data
mongorestore --uri="mongodb://user:password@mongodb:27017" --drop ${BACKUP_DIR}/${DATE}/mongodb
cp -r ${BACKUP_DIR}/${DATE}/face-encodings /data/face-encodings

# Restart all services
docker-compose up -d
```

## Scaling Procedures

### Horizontal Scaling

1. **Frontend Scaling**:

   - Deploy additional instances
   - Update load balancer configuration

2. **Backend Scaling**:

   - Add API servers
   - Ensure stateless design
   - Update service discovery

3. **Face Recognition Service Scaling**:

   - Add worker nodes
   - Implement task queue for distributed processing
   - Consider GPU scaling for recognition workloads

4. **Database Scaling**:
   - Set up MongoDB replica sets
   - Consider sharding for large datasets
   - Implement read replicas for read-heavy workloads

### Scaling Config Example

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  face-recognition:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G

  rag-engine:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 2G

  frontend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.25'
          memory: 256M
```

### Auto-Scaling Rules

For Kubernetes deployments, configure Horizontal Pod Autoscalers (HPAs):

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Maintenance Procedures

### Scheduled Maintenance

1. **Weekly Maintenance**:

   - Security patches
   - Log rotation
   - Monitoring checks
   - Performance review

2. **Monthly Maintenance**:
   - Full system updates
   - Database optimization
   - Backup verification
   - Capacity planning

### Service Updates

1. **Rolling Updates**:
   - Update services one at a time
   - Health check between updates
   - Automatic rollback on failure

```bash
# Example rolling update in Docker Swarm
docker service update --image username/backend:new-version --update-parallelism 1 --update-delay 30s backend
```

2. **Blue-Green Deployment**:
   - Deploy new version alongside existing version
   - Test new version
   - Switch traffic when validated
   - Keep old version for quick rollback

### Database Maintenance

1. **Index Optimization**:

```javascript
// MongoDB index optimization
db.runCommand({ compact: 'users' });
db.users.reIndex();
```

2. **Database Cleanup**:

```javascript
// Remove old logs
db.logs.deleteMany({
	timestamp: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
});
```

## Troubleshooting Guide

### Common Issues and Resolutions

1. **Service Connectivity Issues**:

   - Check network connectivity
   - Verify DNS resolution
   - Check firewall rules
   - Validate service health

2. **Face Recognition Failures**:

   - Check camera feed quality
   - Verify face encoding data
   - Check lighting conditions
   - Validate model loading

3. **High API Latency**:

   - Check database performance
   - Monitor resource utilization
   - Check for blocked queries
   - Validate connection pooling

4. **WebSocket Disconnects**:
   - Check network stability
   - Verify proxy configuration
   - Check idle timeout settings
   - Monitor connection count

### Troubleshooting Commands

1. **Check Service Health**:

```bash
# Docker health check
docker ps --format "{{.Names}}: {{.Status}}"

# Kubernetes health check
kubectl get pods -o wide
```

2. **Check Logs**:

```bash
# Docker logs
docker logs -f --tail 100 container_name

# Kubernetes logs
kubectl logs -f pod_name
```

3. **Check Network Connectivity**:

```bash
# Test network connectivity
curl -v http://service:port/health

# Check DNS resolution
nslookup service
```

## Disaster Recovery

### Recovery Time Objectives (RTO)

- Critical services: < 1 hour
- Non-critical services: < 4 hours
- Full system: < 8 hours

### Recovery Point Objectives (RPO)

- Database: < 15 minutes
- Face encodings: < 1 hour
- Configuration: < 24 hours

### Disaster Recovery Plan

1. **Failover Procedure**:

   - Activate backup infrastructure
   - Restore from latest backup
   - Validate system integrity
   - Route traffic to backup

2. **Service Restoration Priority**:

   1. Core services (database, authentication)
   2. Face recognition service
   3. RAG engine
   4. Frontend application

3. **Communication Plan**:
   - Internal notification
   - Status updates
   - User communication
   - Post-incident report

## On-Call Procedures

### On-Call Rotation

- Primary on-call: Direct response
- Secondary on-call: Escalation support
- Management on-call: Critical issues

### Incident Severity Levels

1. **Severity 1 (Critical)**:

   - System-wide outage
   - Data loss or corruption
   - Security breach
   - Response time: Immediate (< 15 minutes)

2. **Severity 2 (Major)**:

   - Partial system outage
   - Significant performance degradation
   - Critical functionality affected
   - Response time: < 30 minutes

3. **Severity 3 (Minor)**:

   - Non-critical functionality affected
   - Isolated issues
   - Workaround available
   - Response time: < 2 hours

4. **Severity 4 (Low)**:
   - Minor bugs or issues
   - Cosmetic problems
   - Limited impact
   - Response time: Next business day

### Escalation Procedure

1. **First Level**: On-call engineer
2. **Second Level**: Engineering team lead
3. **Third Level**: CTO/VP Engineering
4. **Fourth Level**: CEO/Executive team
