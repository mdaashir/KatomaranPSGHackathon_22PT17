const WebSocket = require('ws');
const { appLogger } = require('../utils/logger');
const { wsMetrics } = require('../utils/metrics');

// Create WebSocket server
const createWSServer = (server) => {
	const wss = new WebSocket.Server({ server, path: '/ws' });

	// Client connections store with additional metadata
	const clients = new Map();

	// WebSocket connection handler
	wss.on('connection', (ws, req) => {
		const clientId = generateClientId();
		const clientIp = req.socket.remoteAddress;
		const userAgent = req.headers['user-agent'] || 'Unknown';

		// Store client connection with enhanced metadata
		clients.set(clientId, {
			ws,
			ip: clientIp,
			userAgent,
			connectedAt: new Date().toISOString(),
			lastActivity: Date.now(),
			isAlive: true,
		});

		// Record metrics for new connection
		wsMetrics.recordConnection();

		appLogger.info(
			`WebSocket client connected: ID=${clientId}, IP=${clientIp}, UA=${userAgent}`
		);

		// Send initial welcome message
		ws.send(
			JSON.stringify({
				type: 'connection',
				message: 'Connected to Face Recognition WebSocket Server',
				clientId,
				timestamp: new Date().toISOString(),
			})
		);

		// Set up heartbeat
		ws.isAlive = true;
		ws.on('pong', () => {
			ws.isAlive = true;
			const client = clients.get(clientId);
			if (client) {
				client.isAlive = true;
				client.lastActivity = Date.now();
			}
		});

		// Handle incoming messages
		ws.on('message', (message) => {
			try {
				// Update client activity timestamp
				const client = clients.get(clientId);
				if (client) {
					client.lastActivity = Date.now();
				}

				// Parse the incoming message
				const data = JSON.parse(message);
				appLogger.debug(`Received message from client ${clientId}:`, data);

				// Record metrics for message
				wsMetrics.recordMessage(data.type || 'unknown');

				// Handle different message types
				switch (data.type) {
					case 'ping':
						// Respond to heartbeat ping from client
						ws.send(
							JSON.stringify({
								type: 'pong',
								timestamp: new Date().toISOString(),
							})
						);
						break;

					default:
						// Handle other message types or acknowledge receipt
						ws.send(
							JSON.stringify({
								type: 'acknowledge',
								message: 'Message received',
								timestamp: new Date().toISOString(),
							})
						);
				}
			} catch (e) {
				appLogger.error(
					`Error processing message from client ${clientId}: ${e.message}`
				);
				ws.send(
					JSON.stringify({
						type: 'error',
						message: 'Invalid message format',
						timestamp: new Date().toISOString(),
					})
				);
			}
		});

		// Handle disconnections
		ws.on('close', (code, reason) => {
			appLogger.info(
				`WebSocket client disconnected: ${clientId}, code: ${code}, reason: ${reason || 'No reason provided'}`
			);
			clients.delete(clientId);

			// Record metrics for disconnection
			wsMetrics.recordDisconnection();

			// Log updated client count
			appLogger.info(`Active WebSocket connections: ${wss.clients.size}`);
		});

		// Handle errors
		ws.on('error', (error) => {
			appLogger.error(`WebSocket client error (${clientId}): ${error.message}`);
			clients.delete(clientId);

			// Record metrics for disconnection
			wsMetrics.recordDisconnection();

			// Try graceful termination
			try {
				ws.terminate();
			} catch (err) {
				appLogger.error(
					`Error terminating WebSocket connection: ${err.message}`
				);
			}
		});

		// Log updated client count
		appLogger.info(`Active WebSocket connections: ${wss.clients.size}`);

		// Update metrics with current connection count
		wsMetrics.updateConnectionsGauge(wss.clients.size);
	});

	// Server-side heartbeat interval
	const interval = setInterval(() => {
		let terminatedCount = 0;
		wss.clients.forEach((ws) => {
			if (ws.isAlive === false) {
				terminatedCount++;
				wsMetrics.recordDisconnection();
				return ws.terminate();
			}

			ws.isAlive = false;
			ws.ping();
		});

		// Log terminations if any occurred
		if (terminatedCount > 0) {
			appLogger.warn(
				`Terminated ${terminatedCount} inactive WebSocket connections`
			);
			appLogger.info(
				`Active WebSocket connections after cleanup: ${wss.clients.size}`
			);

			// Update metrics with current connection count
			wsMetrics.updateConnectionsGauge(wss.clients.size);
		}
	}, 30000); // Check every 30 seconds

	// Additional client activity check interval (detects stale connections)
	const staleCheckInterval = setInterval(() => {
		const now = Date.now();
		const staleTimeout = 120000; // 2 minutes
		let staleCount = 0;

		for (const [clientId, client] of clients.entries()) {
			if (now - client.lastActivity > staleTimeout) {
				staleCount++;
				appLogger.warn(
					`Stale client detected: ${clientId}, last active ${(now - client.lastActivity) / 1000}s ago`
				);

				try {
					client.ws.terminate();
					clients.delete(clientId);

					// Record metrics for disconnection
					wsMetrics.recordDisconnection();
				} catch (err) {
					appLogger.error(`Error terminating stale connection: ${err.message}`);
					clients.delete(clientId);

					// Record metrics for disconnection
					wsMetrics.recordDisconnection();
				}
			}
		}

		if (staleCount > 0) {
			appLogger.info(`Removed ${staleCount} stale connections`);
			appLogger.info(
				`Active WebSocket connections after stale cleanup: ${wss.clients.size}`
			);

			// Update metrics with current connection count
			wsMetrics.updateConnectionsGauge(wss.clients.size);
		}
	}, 60000); // Check every minute

	// Clean up on server close
	wss.on('close', () => {
		clearInterval(interval);
		clearInterval(staleCheckInterval);
		appLogger.info('WebSocket server closed');
	});

	// Broadcast to all connected clients with optional filtering
	const broadcast = (message, filter = null) => {
		let sentCount = 0;

		wss.clients.forEach((client) => {
			// Apply filter if provided
			if (filter && !filter(client)) {
				return;
			}

			if (client.readyState === WebSocket.OPEN) {
				client.send(
					JSON.stringify({
						...message,
						timestamp: new Date().toISOString(),
					})
				);
				sentCount++;
			}
		});

		// Record metrics for broadcast messages
		if (sentCount > 0) {
			wsMetrics.recordMessage('broadcast');
		}

		appLogger.debug(
			`Broadcast message sent to ${sentCount} clients: ${JSON.stringify(message)}`
		);
		return sentCount;
	};

	// Get client count with optional filter
	const getClientCount = (filter = null) => {
		if (!filter) {
			return wss.clients.size;
		}

		let count = 0;
		wss.clients.forEach((client) => {
			if (filter(client)) {
				count++;
			}
		});

		return count;
	};

	// Get detailed client statistics
	const getClientStats = () => {
		const stats = {
			total: wss.clients.size,
			byUserAgent: {},
			byIP: {},
			connectionAges: [],
		};

		const now = Date.now();

		for (const [, client] of clients.entries()) {
			// Count by user agent
			const ua = client.userAgent || 'Unknown';
			stats.byUserAgent[ua] = (stats.byUserAgent[ua] || 0) + 1;

			// Count by IP
			const ip = client.ip || 'Unknown';
			stats.byIP[ip] = (stats.byIP[ip] || 0) + 1;

			// Track connection ages
			const connectedAt = new Date(client.connectedAt).getTime();
			const ageInSeconds = Math.floor((now - connectedAt) / 1000);
			stats.connectionAges.push(ageInSeconds);
		}

		return stats;
	};

	// Utility function to generate a client ID
	function generateClientId() {
		return `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
	}

	appLogger.info('WebSocket server initialized');

	return {
		wss,
		clients,
		broadcast,
		getClientCount,
		getClientStats,
	};
};

module.exports = createWSServer;
