const express = require('express');
const { appLogger, logMatch } = require('../utils/logger');

const router = express.Router();

// Store WebSocket server instance (will be set from main app)
let wsServer = null;

// Set WebSocket server reference
const setWSServer = (server) => {
	wsServer = server;
};

// Endpoint to receive match events from Python face recognition service
router.post('/push', (req, res) => {
	const { event, name, timestamp } = req.body;

	// Validate request body
	if (!event || !name) {
		const errorMessage = 'Event type and name are required';
		appLogger.error(errorMessage);
		return res.status(400).json({ success: false, message: errorMessage });
	}

	try {
		appLogger.info(`Received push event: ${event} for ${name}`);

		// Broadcast to all connected WebSocket clients
		if (wsServer && event === 'match') {
			const matchData = {
				event,
				name,
				timestamp: timestamp || new Date().toISOString(),
			};

			// Log the match event to the dedicated matches.log file
			logMatch(name, matchData.timestamp);

			// Broadcast to all connected clients
			wsServer.broadcast(matchData);

			appLogger.info(
				`Broadcast match event for ${name} to ${wsServer.getClientCount()} clients`
			);
		}

		return res.status(200).json({ success: true });
	} catch (error) {
		appLogger.error(`Error processing push event: ${error.message}`);
		return res
			.status(500)
			.json({ success: false, message: 'Error broadcasting event' });
	}
});

module.exports = {
	router,
	setWSServer,
};
