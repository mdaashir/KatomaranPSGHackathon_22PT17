const client = require('prom-client');
const { appLogger } = require('./logger');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label for all metrics
register.setDefaultLabels({
	app: 'face-recognition-backend',
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
	name: 'http_request_duration_seconds',
	help: 'Duration of HTTP requests in seconds',
	labelNames: ['method', 'route', 'status_code'],
	buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const httpRequestsTotal = new client.Counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'route', 'status_code'],
});

const wsConnectionsGauge = new client.Gauge({
	name: 'ws_connections_current',
	help: 'Current number of WebSocket connections',
});

const wsConnectionsTotal = new client.Counter({
	name: 'ws_connections_total',
	help: 'Total number of WebSocket connections established',
});

const wsMessagesTotal = new client.Counter({
	name: 'ws_messages_total',
	help: 'Total number of WebSocket messages',
	labelNames: ['type'],
});

const faceRecognitionLatency = new client.Histogram({
	name: 'face_recognition_latency_seconds',
	help: 'Face recognition service response time in seconds',
	buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const faceRecognitionTotal = new client.Counter({
	name: 'face_recognition_requests_total',
	help: 'Total number of face recognition requests',
	labelNames: ['status'],
});

// Register the custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(wsConnectionsGauge);
register.registerMetric(wsConnectionsTotal);
register.registerMetric(wsMessagesTotal);
register.registerMetric(faceRecognitionLatency);
register.registerMetric(faceRecognitionTotal);

/**
 * Middleware to collect HTTP metrics
 */
const metricsMiddleware = (req, res, next) => {
	const start = process.hrtime();

	// Add a unique identifier to the request
	req.id =
		req.id ||
		`req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

	// Record when the request ends
	res.on('finish', () => {
		const responseTimeInSec = getDurationInSeconds(start);

		// Extract route pattern if it exists
		const route = req.route ? req.route.path : req.path;

		// Increment the requests counter
		httpRequestsTotal.inc({
			method: req.method,
			route: route,
			status_code: res.statusCode,
		});

		// Record the response time
		httpRequestDurationMicroseconds.observe(
			{
				method: req.method,
				route: route,
				status_code: res.statusCode,
			},
			responseTimeInSec
		);

		// Detailed logging only for slow requests or errors
		if (responseTimeInSec > 1.0 || res.statusCode >= 400) {
			appLogger.debug('HTTP request metrics', {
				method: req.method,
				url: req.originalUrl,
				statusCode: res.statusCode,
				responseTime: responseTimeInSec,
				requestId: req.id,
			});
		}
	});

	next();
};

/**
 * WebSocket metrics recorder functions
 */
const wsMetrics = {
	/**
	 * Record a new WebSocket connection
	 */
	recordConnection: () => {
		wsConnectionsGauge.inc();
		wsConnectionsTotal.inc();
	},

	/**
	 * Record a closed WebSocket connection
	 */
	recordDisconnection: () => {
		wsConnectionsGauge.dec();
	},

	/**
	 * Record a WebSocket message
	 * @param {string} type - Message type
	 */
	recordMessage: (type) => {
		wsMessagesTotal.inc({ type });
	},

	/**
	 * Update the WebSocket connections gauge with the current count
	 * @param {number} count - Current number of connections
	 */
	updateConnectionsGauge: (count) => {
		wsConnectionsGauge.set(count);
	},
};

/**
 * Face recognition metrics recorder functions
 */
const faceRecognitionMetrics = {
	/**
	 * Record a face recognition request
	 * @param {number} latency - Request latency in seconds
	 * @param {string} status - Request status (success, not_found, error)
	 */
	recordRecognitionRequest: (latency, status) => {
		faceRecognitionLatency.observe(latency);
		faceRecognitionTotal.inc({ status });
	},
};

/**
 * Convert hrtime to seconds
 */
const getDurationInSeconds = (start) => {
	const NS_PER_SEC = 1e9;
	const diff = process.hrtime(start);
	return (diff[0] * NS_PER_SEC + diff[1]) / NS_PER_SEC;
};

/**
 * Metrics endpoint for Prometheus scraping
 */
const metricsEndpoint = async (req, res) => {
	try {
		// Update WebSocket connections gauge if wsServer is available
		if (
			global.wsServer &&
			typeof global.wsServer.getClientCount === 'function'
		) {
			wsMetrics.updateConnectionsGauge(global.wsServer.getClientCount());
		}

		// Return all metrics in Prometheus format
		res.set('Content-Type', register.contentType);
		res.end(await register.metrics());
	} catch (error) {
		appLogger.error(`Error generating metrics: ${error.message}`);
		res.status(500).end();
	}
};

module.exports = {
	metricsMiddleware,
	metricsEndpoint,
	wsMetrics,
	faceRecognitionMetrics,
};
