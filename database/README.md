# Database

MongoDB database schemas and migration scripts for the Face Recognition Platform (2025).

## Schema

The database includes schemas for:

- Users
- Face Encodings
- Recognition Events
- Q&A History
- System Configuration

## Usage

This directory contains:

- Schema definitions
- Migration scripts
- Seed data for development
- Connection utilities

## Swappable Design

The database layer is designed to be replaceable with minimal changes to other components:

- Abstract repository pattern
- Database-agnostic models
- Connection configuration isolated in environment variables

## Development

See [DEVELOPMENT.md](../docs/DEVELOPMENT.md) for setup instructions.
