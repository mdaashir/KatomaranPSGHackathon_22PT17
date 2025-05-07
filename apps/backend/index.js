require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { appLogger } = require('./utils/logger');
const registerRoutes = require('./routes/register');
const createWSServer = require('./ws/server');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Set up middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'], // Frontend URLs
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with Morgan
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, '..', '..', 'logs', 'access.log'),
  { flags: 'a' }
);
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev'));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', registerRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  appLogger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize WebSocket server
const wsServer = createWSServer(server);

// Start the server
server.listen(PORT, () => {
  appLogger.info(`Server running on port ${PORT}`);
  appLogger.info(`WebSocket server available at ws://localhost:${PORT}/ws`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  appLogger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    appLogger.info('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  appLogger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    appLogger.info('HTTP server closed');
  });
});

module.exports = server;
