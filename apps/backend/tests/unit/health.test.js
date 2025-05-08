const request = require('supertest');
const express = require('express');
const healthRoutes = require('../../routes/health');

// Mock mongoose
jest.mock('mongoose', () => ({
	connection: {
		readyState: 1,
	},
}));

// Mock fetch for service dependency checks
global.fetch = jest.fn(() =>
	Promise.resolve({
		status: 200,
	})
);

// Mock logger
jest.mock('../../utils/logger', () => ({
	appLogger: {
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

// Mock global wsServer for WebSocket connection count
global.wsServer = {
	getClientCount: jest.fn().mockReturnValue(5),
};

// Updated for 2025: clarified test descriptions, improved mocks, and ensured Windows compatibility
describe('Health Check Routes', () => {
	let app;

	beforeEach(() => {
		app = express();
		app.use(express.json());
		app.use('/health', healthRoutes);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('GET /health should return 200 when all dependencies are healthy', async () => {
		const res = await request(app).get('/health');

		expect(res.statusCode).toBe(200);
		expect(res.body).toHaveProperty('status', 'healthy');
		expect(res.body).toHaveProperty('timestamp');
		expect(res.body).toHaveProperty('uptime');
		expect(res.body).toHaveProperty('database.connected', true);
		expect(res.body).toHaveProperty(
			'services.faceRecognition.status',
			'healthy'
		);
		expect(res.body).toHaveProperty('services.ragEngine.status', 'healthy');
		expect(res.body).toHaveProperty('wsConnections', 5);
	});

	test('GET /health should return 503 when database is not connected', async () => {
		// Mock mongoose to simulate disconnected database
		const originalConnection = mongoose.connection;
		jest.resetModules();
		jest.mock('mongoose', () => ({
			connection: {
				readyState: 0,
			},
		}));

		// Need to re-require the router after mocking
		const freshHealthRoutes = require('../../routes/health');
		const tempApp = express();
		tempApp.use(express.json());
		tempApp.use('/health', freshHealthRoutes);

		const res = await request(tempApp).get('/health');

		expect(res.statusCode).toBe(503);
		expect(res.body).toHaveProperty('status', 'unhealthy');
		expect(res.body).toHaveProperty('database.connected', false);

		// Restore mock
		jest.mock('mongoose', () => ({
			connection: originalConnection,
		}));
	});

	test('GET /health/liveness should always return 200', async () => {
		const res = await request(app).get('/health/liveness');

		expect(res.statusCode).toBe(200);
		expect(res.body).toHaveProperty('status', 'alive');
		expect(res.body).toHaveProperty('timestamp');
	});

	test('GET /health/readiness should return 200 when database is connected', async () => {
		const res = await request(app).get('/health/readiness');

		expect(res.statusCode).toBe(200);
		expect(res.body).toHaveProperty('status', 'ready');
		expect(res.body).toHaveProperty('timestamp');
	});

	test('GET /health/readiness should return 503 when database is not connected', async () => {
		// Mock mongoose to simulate disconnected database
		const originalConnection = mongoose.connection;
		jest.resetModules();
		jest.mock('mongoose', () => ({
			connection: {
				readyState: 0,
			},
		}));

		// Need to re-require the router after mocking
		const freshHealthRoutes = require('../../routes/health');
		const tempApp = express();
		tempApp.use(express.json());
		tempApp.use('/health', freshHealthRoutes);

		const res = await request(tempApp).get('/health/readiness');

		expect(res.statusCode).toBe(503);
		expect(res.body).toHaveProperty('status', 'not_ready');
		expect(res.body).toHaveProperty('reason', 'Database not connected');

		// Restore mock
		jest.mock('mongoose', () => ({
			connection: originalConnection,
		}));
	});

	test('should handle service dependency failures gracefully', async () => {
		// Mock fetch to simulate service dependency failure
		global.fetch.mockImplementationOnce(() =>
			Promise.reject(new Error('Connection refused'))
		);

		const res = await request(app).get('/health');

		expect(res.statusCode).toBe(503);
		expect(res.body).toHaveProperty(
			'services.faceRecognition.status',
			'unreachable'
		);
		expect(res.body).toHaveProperty(
			'services.faceRecognition.error',
			'Connection refused'
		);
	});
});

describe('Health Check API', () => {
	let app;

	beforeEach(() => {
		app = express();

		// Mock the WebSocket server for testing
		global.wsServer = {
			getClientCount: jest.fn().mockReturnValue(5),
			getClientStats: jest.fn().mockReturnValue({
				total: 5,
				byUserAgent: { Chrome: 3, Firefox: 2 },
				byIP: { '127.0.0.1': 5 },
				connectionAges: [10, 20, 30, 40, 50],
			}),
		};

		// Mock the necessary middleware
		app.use(express.json());
		app.use('/health', healthRoutes);
	});

	afterEach(() => {
		// Clean up global mock
		delete global.wsServer;
	});

	it('should return 200 OK for the detailed health check', async () => {
		const response = await request(app).get('/health/details');

		expect(response.status).toBe(200);
		expect(response.body).toHaveProperty('status', 'ok');
		expect(response.body).toHaveProperty('services');
		expect(response.body).toHaveProperty('timestamp');
		expect(response.body).toHaveProperty('version');
		expect(response.body).toHaveProperty('uptime');
		expect(response.body.services).toHaveProperty('websocket');
	});

	it('should include WebSocket statistics in health check', async () => {
		const response = await request(app).get('/health/details');

		expect(response.body.services.websocket).toHaveProperty('status', 'ok');
		expect(response.body.services.websocket).toHaveProperty('connections', 5);
		expect(response.body.services.websocket).toHaveProperty('stats');
	});

	it('should handle missing WebSocket server gracefully', async () => {
		// Remove the WebSocket server mock
		delete global.wsServer;

		const response = await request(app).get('/health/details');

		expect(response.status).toBe(200);
		expect(response.body.services.websocket).toHaveProperty(
			'status',
			'unavailable'
		);
	});

	it('should include system information in health check', async () => {
		const response = await request(app).get('/health/details');

		expect(response.body).toHaveProperty('system');
		expect(response.body.system).toHaveProperty('nodeVersion');
		expect(response.body.system).toHaveProperty('platform');
		expect(response.body.system).toHaveProperty('memoryUsage');
		expect(response.body.system).toHaveProperty('cpuUsage');
	});

	it('should handle errors gracefully', async () => {
		// Mock a WebSocket server that throws an error
		global.wsServer = {
			getClientCount: jest.fn().mockImplementation(() => {
				throw new Error('Test error');
			}),
		};

		const response = await request(app).get('/health/details');

		expect(response.status).toBe(200);
		expect(response.body.services.websocket).toHaveProperty('status', 'error');
		expect(response.body.services.websocket).toHaveProperty('error');
	});
});
