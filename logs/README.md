# Logs

Structured JSON logs for the Face Recognition Platform.

## Log Types

- Face Registration Events
- Face Recognition Events
- System Events
- Error Logs
- Performance Metrics

## Schema

All logs follow a standardized JSON schema with common fields:

- `timestamp`: ISO 8601 timestamp
- `level`: Log level (info, warn, error)
- `service`: Source service name
- `eventType`: Type of event being logged
- `data`: Event-specific data
- `metadata`: Additional contextual information

## Storage

In production, logs should be forwarded to a centralized logging system for:

- Aggregation
- Searching
- Alerting
- Analytics

## Development

During development, logs are stored locally in this directory.

**Note:** This directory is git-ignored except for this README file and any sample log schemas.
