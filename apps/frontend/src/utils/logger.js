// @ts-check
/// <reference types="vite/client" />

/** @typedef {Record<string, any>} LogData */
/** @typedef {'error' | 'warn' | 'info' | 'debug'} LogLevel */

/** @type {Record<string, LogLevel>} */
const LogLevel = {
	ERROR: 'error',
	WARN: 'warn',
	INFO: 'info',
	DEBUG: 'debug',
};

class FrontendLogger {
	constructor() {
		/** @type {any[]} */
		this.buffer = [];
		this.bufferSize = 50;
		this.flushInterval = 5000; // 5 seconds
		this.apiEndpoint =
			`${import.meta.env.VITE_API_URL}/logs` || 'http://localhost:3001/logs';

		// Start periodic flush
		setInterval(() => this.flush(), this.flushInterval);

		// Flush on page unload
		window.addEventListener('beforeunload', () => this.flush());
	}

	/**
	 * @param {LogLevel} level
	 * @param {string} message
	 * @param {LogData} [data]
	 */
	log(level, message, data = {}) {
		const logEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			...data,
			userAgent: navigator.userAgent,
			url: window.location.href,
		};

		// Always log to console in development
		if (import.meta.env.DEV) {
			console[level]('[Frontend]', message, data);
		}

		this.buffer.push(logEntry);

		// Flush if buffer is full
		if (this.buffer.length >= this.bufferSize) {
			this.flush();
		}
	}

	async flush() {
		if (this.buffer.length === 0) return;

		const currentLogs = [...this.buffer];
		this.buffer = [];

		try {
			await fetch(this.apiEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ logs: currentLogs }),
			});
		} catch (error) {
			console.error('Failed to send logs:', error);
			// Retry failed logs
			this.buffer = [...this.buffer, ...currentLogs];
		}
	}

	/**
	 * @param {string} message
	 * @param {LogData} [data]
	 */
	error(message, data = {}) {
		this.log(LogLevel.ERROR, message, data);
	}

	/**
	 * @param {string} message
	 * @param {LogData} [data]
	 */
	warn(message, data = {}) {
		this.log(LogLevel.WARN, message, data);
	}

	/**
	 * @param {string} message
	 * @param {LogData} [data]
	 */
	info(message, data = {}) {
		this.log(LogLevel.INFO, message, data);
	}

	/**
	 * @param {string} message
	 * @param {LogData} [data]
	 */
	debug(message, data = {}) {
		this.log(LogLevel.DEBUG, message, data);
	}

	/**
	 * @param {string} from
	 * @param {string} to
	 */
	logNavigation(from, to) {
		this.info('Navigation', { from, to, type: 'navigation' });
	}

	/**
	 * @param {boolean} success
	 * @param {Error | null} [error]
	 */
	logFaceCapture(success, error = null) {
		this.info('Face Capture', {
			type: 'face_capture',
			success,
			error: error?.message,
		});
	}

	/**
	 * @param {boolean} success
	 * @param {Error | null} [error]
	 * @param {number | null} [duration]
	 */
	logRecognitionAttempt(success, error = null, duration = null) {
		this.info('Face Recognition', {
			type: 'recognition',
			success,
			duration,
			error: error?.message,
		});
	}

	/**
	 * @param {string} message
	 * @param {string | null} [response]
	 * @param {Error | null} [error]
	 */
	logChatInteraction(message, response = null, error = null) {
		this.info('Chat Interaction', {
			type: 'chat',
			message,
			success: !error,
			error: error?.message,
			hasResponse: !!response,
		});
	}

	/**
	 * @param {Error} error
	 * @param {LogData} [context]
	 */
	logError(error, context = {}) {
		this.error(error.message, {
			...context,
			stack: error.stack,
			type: 'error',
		});
	}
}

export const logger = new FrontendLogger();
