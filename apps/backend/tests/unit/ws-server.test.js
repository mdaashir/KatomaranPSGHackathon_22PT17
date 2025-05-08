const WebSocket = require('ws');
const http = require('http');
const createWSServer = require('../../ws/server');

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
	appLogger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
	},
}));

describe('WebSocket Server', () => {
	let server;
	let wsServer;
	let wsUrl;
	let client;

	beforeEach((done) => {
		// Create HTTP server
		server = http.createServer();

		// Create WebSocket server
		wsServer = createWSServer(server);

		// Start server listening on random port
		server.listen(0, 'localhost', () => {
			const { port } = server.address();
			wsUrl = `ws://localhost:${port}/ws`;
			done();
		});
	});

	afterEach((done) => {
		// Close client if open
		if (client) {
			if (client.readyState === WebSocket.OPEN) {
				client.close();
			}
			client = null;
		}

		// Close server if running
		if (server.listening) {
			server.close(done);
		} else {
			done();
		}
	});

	test('should establish a connection', (done) => {
		// Create WebSocket client
		client = new WebSocket(wsUrl);

		// Define event handlers
		client.on('open', () => {
			expect(client.readyState).toBe(WebSocket.OPEN);
			done();
		});

		client.on('error', (err) => {
			done.fail(`WebSocket error: ${err.message}`);
		});
	});

	test('should send welcome message on connection', (done) => {
		// Create WebSocket client
		client = new WebSocket(wsUrl);

		// Listen for messages
		client.on('message', (data) => {
			const message = JSON.parse(data);

			// Verify structure of welcome message
			expect(message).toHaveProperty('type', 'connection');
			expect(message).toHaveProperty(
				'message',
				expect.stringContaining('Connected')
			);
			expect(message).toHaveProperty('clientId');
			expect(message).toHaveProperty('timestamp');

			done();
		});
	});

	test('should respond to ping messages with pong', (done) => {
		// Create WebSocket client
		client = new WebSocket(wsUrl);

		client.on('open', () => {
			// Send ping message
			client.send(JSON.stringify({ type: 'ping' }));
		});

		// Listen for messages
		client.on('message', (data) => {
			const message = JSON.parse(data);

			// Skip welcome message
			if (message.type === 'connection') {
				return;
			}

			// Verify pong response
			if (message.type === 'pong') {
				expect(message).toHaveProperty('timestamp');
				done();
				return;
			}

			// Fail if we get an unexpected message type
			done.fail(`Unexpected message type: ${message.type}`);
		});
	});

	test('should track client connections', (done) => {
		// Create WebSocket client
		client = new WebSocket(wsUrl);

		client.on('open', () => {
			// Check that connection is tracked
			expect(wsServer.getClientCount()).toBe(1);

			// Create another client
			const client2 = new WebSocket(wsUrl);

			client2.on('open', () => {
				// Check that both connections are tracked
				expect(wsServer.getClientCount()).toBe(2);

				// Close second client
				client2.close();

				// Wait briefly for close to propagate
				setTimeout(() => {
					// Check that count decreases
					expect(wsServer.getClientCount()).toBe(1);
					done();
				}, 100);
			});
		});
	});

	test('should broadcast message to all clients', (done) => {
		const messageCount = {
			client1: 0,
			client2: 0,
		};

		// Create first client
		client = new WebSocket(wsUrl);

		client.on('open', () => {
			// Create second client
			const client2 = new WebSocket(wsUrl);

			client2.on('open', () => {
				// Both clients connected, send a broadcast
				wsServer.broadcast({
					event: 'test-broadcast',
					data: 'test-data',
				});
			});

			// Message handler for first client
			client.on('message', (data) => {
				const message = JSON.parse(data);

				if (message.type === 'connection') return; // Skip welcome message

				if (message.event === 'test-broadcast') {
					messageCount.client1++;
					expect(message.data).toBe('test-data');
					checkDone();
				}
			});

			// Message handler for second client
			client2.on('message', (data) => {
				const message = JSON.parse(data);

				if (message.type === 'connection') return; // Skip welcome message

				if (message.event === 'test-broadcast') {
					messageCount.client2++;
					expect(message.data).toBe('test-data');
					checkDone();
				}
			});

			// Check if both clients have received the broadcast
			function checkDone() {
				if (messageCount.client1 === 1 && messageCount.client2 === 1) {
					client2.close();
					done();
				}
			}
		});
	});

	test('should provide client statistics', (done) => {
		// Create WebSocket client
		client = new WebSocket(wsUrl);

		client.on('open', () => {
			const stats = wsServer.getClientStats();

			expect(stats).toHaveProperty('total', 1);
			expect(stats).toHaveProperty('byUserAgent');
			expect(stats).toHaveProperty('byIP');
			expect(stats).toHaveProperty('connectionAges');
			expect(stats.connectionAges.length).toBe(1);

			done();
		});
	});
});
