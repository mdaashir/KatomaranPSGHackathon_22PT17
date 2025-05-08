const express = require('express');
const router = express.Router();
const { appLogger } = require('../utils/logger');
const os = require('os');
const mongoose = require('mongoose');

/**
 * Health check data for the API
 * @returns {Object} Health status information
 */
const getHealthData = async () => {
	const startTime = process.uptime();
	const uptime = process.uptime();

	// System information
	const systemInfo = {
		platform: process.platform,
		nodeVersion: process.version,
		memoryUsage: process.memoryUsage(),
		cpuUsage: process.cpuUsage(),
		totalMemory: os.totalmem(),
		freeMemory: os.freemem(),
		cpus: os.cpus().length,
		loadAverage: os.loadavg(),
	};

	// Database connectivity check
	let dbStatus = {
		connected: false,
		status: 'disconnected',
		error: null,
	};

	if (mongoose.connection) {
		try {
			dbStatus.status = mongoose.connection.readyState;
			dbStatus.connected = mongoose.connection.readyState === 1;
		} catch (error) {
			dbStatus.error = error.message;
		}
	}

	// Service dependencies check
	let serviceDependencies = {
		faceRecognition: {
			status: 'unknown',
			latencyMs: null,
			error: null,
		},
		ragEngine: {
			status: 'unknown',
			latencyMs: null,
			error: null,
		},
	};

	// Check face recognition service
	try {
		const faceRecognitionUrl =
			process.env.FACE_RECOGNITION_URL ||
			'http://face-registration:8000/health';
		const faceStartTime = Date.now();
		const faceResponse = await fetch(faceRecognitionUrl, {
			timeout: 5000,
		}).then((res) => {
			const latency = Date.now() - faceStartTime;
			return { status: res.status, latency };
		});

		serviceDependencies.faceRecognition.status =
			faceResponse.status === 200 ? 'healthy' : 'unhealthy';
		serviceDependencies.faceRecognition.latencyMs = faceResponse.latency;
	} catch (error) {
		serviceDependencies.faceRecognition.status = 'unreachable';
		serviceDependencies.faceRecognition.error = error.message;
	}

	// Check RAG engine service
	try {
		const ragEngineUrl =
			process.env.RAG_ENGINE_URL || 'http://rag-engine:8080/health';
		const ragStartTime = Date.now();
		const ragResponse = await fetch(ragEngineUrl, { timeout: 5000 }).then(
			(res) => {
				const latency = Date.now() - ragStartTime;
				return { status: res.status, latency };
			}
		);

		serviceDependencies.ragEngine.status =
			ragResponse.status === 200 ? 'healthy' : 'unhealthy';
		serviceDependencies.ragEngine.latencyMs = ragResponse.latency;
	} catch (error) {
		serviceDependencies.ragEngine.status = 'unreachable';
		serviceDependencies.ragEngine.error = error.message;
	}

	// Calculate overall health status
	const isHealthy =
		dbStatus.connected &&
		serviceDependencies.faceRecognition.status === 'healthy' &&
		serviceDependencies.ragEngine.status === 'healthy';

	// Get WebSocket connection count if available
	let wsConnections = 0;
	if (global.wsServer && typeof global.wsServer.getClientCount === 'function') {
		wsConnections = global.wsServer.getClientCount();
	}

	return {
		status: isHealthy ? 'healthy' : 'unhealthy',
		timestamp: new Date().toISOString(),
		version: process.env.npm_package_version || '1.0.0',
		uptime: uptime,
		environment: process.env.NODE_ENV || 'development',
		wsConnections,
		database: dbStatus,
		services: serviceDependencies,
		system: systemInfo,
		responseTime: process.uptime() - startTime,
	};
};

/**
 * @api {get} /health Healthcheck endpoint
 * @apiName GetHealth
 * @apiGroup System
 * @apiDescription Provides health status information about the API and its dependencies
 *
 * @apiSuccess {String} status Overall health status (healthy/unhealthy)
 * @apiSuccess {String} timestamp ISO timestamp of the health check
 * @apiSuccess {String} version API version
 * @apiSuccess {Number} uptime Server uptime in seconds
 * @apiSuccess {Object} database Database connection status
 * @apiSuccess {Object} services Service dependencies status
 */
router.get('/', async (req, res) => {
	try {
		const healthData = await getHealthData();

		// Log health check
		if (healthData.status === 'healthy') {
			appLogger.debug('Health check passed');
		} else {
			appLogger.warn('Health check failed', healthData);
		}

		res.status(healthData.status === 'healthy' ? 200 : 503).json(healthData);
	} catch (error) {
		appLogger.error(`Health check error: ${error.message}`);
		res.status(500).json({
			status: 'error',
			timestamp: new Date().toISOString(),
			error: error.message,
		});
	}
});

/**
 * @api {get} /health/liveness Simple liveness probe for container orchestration
 * @apiName GetLiveness
 * @apiGroup System
 * @apiDescription Simple liveness check to verify service is running
 */
router.get('/liveness', (req, res) => {
	res.status(200).json({
		status: 'alive',
		timestamp: new Date().toISOString(),
	});
});

/**
 * @api {get} /health/readiness Readiness probe for container orchestration
 * @apiName GetReadiness
 * @apiGroup System
 * @apiDescription Readiness check to verify service can process requests
 */
router.get('/readiness', async (req, res) => {
	try {
		// Just check database connectivity for readiness
		const dbConnected =
			mongoose.connection && mongoose.connection.readyState === 1;

		if (dbConnected) {
			res.status(200).json({
				status: 'ready',
				timestamp: new Date().toISOString(),
			});
		} else {
			res.status(503).json({
				status: 'not_ready',
				timestamp: new Date().toISOString(),
				reason: 'Database not connected',
			});
		}
	} catch (error) {
		appLogger.error(`Readiness check error: ${error.message}`);
		res.status(503).json({
			status: 'not_ready',
			timestamp: new Date().toISOString(),
			error: error.message,
		});
	}
});

module.exports = router;
