require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { appLogger } = require('./utils/logger');
const { metricsMiddleware, metricsEndpoint } = require('./utils/metrics');
const registerRoutes = require('./routes/register');
const healthRoutes = require('./routes/health');
const { router: pushRouter, setWSServer } = require('./routes/push');
const createWSServer = require('./ws/server');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Metrics middleware - should be early to capture all requests
app.use(metricsMiddleware);

// Set security headers
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", 'data:', 'blob:'],
				connectSrc: ["'self'", 'wss:', 'ws:'],
			},
		},
	})
);

// Configure CORS with more options
app.use(
	cors({
		origin: process.env.ALLOWED_ORIGINS
			? process.env.ALLOWED_ORIGINS.split(',')
			: ['http://localhost:3000', 'http://localhost:5173'],
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
		maxAge: 86400, // Cache preflight request for 24 hours
	})
);

// Request body parsing
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging with Morgan
const logsDir = path.join(__dirname, '..', '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
	fs.mkdirSync(logsDir, { recursive: true });
}

const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), {
	flags: 'a',
});

// Use combined format for file logs, dev format for console
app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan('dev'));

// Metrics endpoint for Prometheus
app.get('/metrics', metricsEndpoint);

// Health check routes - simple legacy route and detailed health check
app.get('/health', (req, res) => {
	res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/health', healthRoutes);

// API routes
app.use('/api', registerRoutes);
app.use('/api', pushRouter);

// 404 handler
app.use((req, res, next) => {
	res.status(404).json({
		success: false,
		message: 'Resource not found',
		path: req.originalUrl,
	});
});

// Error handling middleware
app.use((err, req, res, next) => {
	appLogger.error(`Unhandled error: ${err.message}`, {
		error: err.stack,
		path: req.originalUrl,
		method: req.method,
		ip: req.ip,
	});
	res.status(500).json({
		success: false,
		message: 'An unexpected error occurred',
		error: process.env.NODE_ENV === 'development' ? err.message : undefined,
		requestId: req.id || undefined,
	});
});

// Initialize WebSocket server
const wsServer = createWSServer(server);
// Store websocket server in global for health checks
global.wsServer = wsServer;

// Connect WebSocket server to push route
setWSServer(wsServer);

// Start the server
server.listen(PORT, () => {
	appLogger.info(`Server running on port ${PORT}`);
	appLogger.info(`WebSocket server available at ws://localhost:${PORT}/ws`);
	appLogger.info(`Health check available at http://localhost:${PORT}/health`);
	appLogger.info(
		`Metrics endpoint available at http://localhost:${PORT}/metrics`
	);
});

// Handle graceful shutdown
const gracefulShutdown = () => {
	appLogger.info('Shutting down gracefully...');

	// Set a timeout for forceful exit
	const forceExit = setTimeout(() => {
		appLogger.error('Forced shutdown after timeout');
		process.exit(1);
	}, 30000);

	// Close server
	server.close(() => {
		appLogger.info('HTTP server closed');

		// Any other cleanup tasks
		appLogger.info('Cleanup complete, exiting process');
		clearTimeout(forceExit);
		process.exit(0);
	});
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
	appLogger.error('Uncaught Exception:', error);
	// It's usually best to exit on uncaught exceptions
	gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
	appLogger.error('Unhandled Promise Rejection:', reason);
	// Log but don't exit for unhandled rejections
});

module.exports = server;
