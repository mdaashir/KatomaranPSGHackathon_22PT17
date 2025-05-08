// @ts-check
const express = require('express');
/** @type {import('express').Router} */
const router = express.Router();
const { appLogger } = require('../utils/logger');

/** @type {import('express').RequestHandler} */
const handleLogs = (req, res) => {
	try {
		const { logs } = req.body;

		if (!Array.isArray(logs)) {
			res.status(400).json({ error: 'Logs must be an array' });
			return;
		}

		// Process each log entry
		logs.forEach((log) => {
			const { level = 'info', message, ...data } = log;

			// Add client IP and timestamp if not present
			const enrichedData = {
				...data,
				clientIp: req.ip,
				timestamp: data.timestamp || new Date().toISOString(),
			};

			// Use the appropriate log level
			if (level in appLogger && typeof appLogger[level] === 'function') {
				appLogger[level](message, enrichedData);
			} else {
				appLogger.info(message, enrichedData);
			}
		});

		res.status(200).json({ success: true });
	} catch (error) {
		appLogger.error('Error processing frontend logs', {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		res.status(500).json({ error: 'Failed to process logs' });
	}
};

router.post('/', handleLogs);

module.exports = router;
