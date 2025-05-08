import { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../styles/FaceRecognitionLive.css';

const FaceRecognitionLive = () => {
	// State management
	const [isRecognizing, setIsRecognizing] = useState(false);
	const [wsConnected, setWsConnected] = useState(false);
	const [lastMatch, setLastMatch] = useState(null);
	const [isMatchHighlighted, setIsMatchHighlighted] = useState(false);
	const [reconnectAttempts, setReconnectAttempts] = useState(0);

	// Refs
	const webcamRef = useRef(null);
	const wsRef = useRef(null);
	const recognitionIntervalRef = useRef(null);
	const heartbeatIntervalRef = useRef(null);

	// Webcam configuration
	const videoConstraints = {
		width: 480,
		height: 480,
		facingMode: 'user',
	};

	// Maximum WebSocket reconnection attempts
	const MAX_RECONNECT_ATTEMPTS = 5;
	// WebSocket reconnection delay with exponential backoff
	const getReconnectDelay = (attempt) => Math.min(1000 * 2 ** attempt, 30000);

	// Initialize WebSocket connection
	useEffect(() => {
		connectWebSocket();

		// Cleanup on unmount
		return () => {
			cleanupConnections();
		};
	}, []);

	// Cleanup function for all active connections and intervals
	const cleanupConnections = () => {
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}

		if (recognitionIntervalRef.current) {
			clearInterval(recognitionIntervalRef.current);
			recognitionIntervalRef.current = null;
		}

		if (heartbeatIntervalRef.current) {
			clearInterval(heartbeatIntervalRef.current);
			heartbeatIntervalRef.current = null;
		}
	};

	// Function to establish WebSocket connection with reconnection logic
	const connectWebSocket = () => {
		// Cleanup any existing connection first
		if (wsRef.current) {
			wsRef.current.close();
		}

		const wsUrl =
			import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001/ws';
		const ws = new WebSocket(wsUrl);
		wsRef.current = ws;

		ws.onopen = () => {
			setWsConnected(true);
			setReconnectAttempts(0);
			toast.info('WebSocket connected');

			// Setup heartbeat to keep connection alive
			heartbeatIntervalRef.current = setInterval(() => {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify({ type: 'ping' }));
				}
			}, 30000); // Send ping every 30 seconds
		};

		ws.onclose = (event) => {
			setWsConnected(false);

			// Clear heartbeat interval
			if (heartbeatIntervalRef.current) {
				clearInterval(heartbeatIntervalRef.current);
			}

			// Don't try to reconnect if the closure was clean and intentional
			const isIntentionalClosure = event.code === 1000 || event.code === 1001;
			if (!isIntentionalClosure && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
				const attempt = reconnectAttempts + 1;
				const delay = getReconnectDelay(attempt);

				toast.warn(
					`WebSocket disconnected. Reconnecting in ${delay / 1000} seconds...`
				);
				setReconnectAttempts(attempt);

				setTimeout(() => {
					if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
						connectWebSocket();
					}
				}, delay);
			} else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
				toast.error(
					'Failed to reconnect WebSocket after multiple attempts. Please refresh the page.'
				);
			}
		};

		ws.onerror = (error) => {
			console.error('WebSocket error:', error);
			toast.error('WebSocket connection error');
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				console.log('WebSocket message received:', data);

				// Handle heartbeat response
				if (data.type === 'pong') {
					console.debug('Heartbeat acknowledged');
					return;
				}

				if (data.event === 'match') {
					handleMatch(data);
				}
			} catch (error) {
				console.error('Error parsing WebSocket message:', error);
			}
		};
	};

	// Handle match event from WebSocket
	const handleMatch = (matchData) => {
		setLastMatch(matchData);
		setIsMatchHighlighted(true);

		// Show toast notification
		toast.success(`Recognized: ${matchData.name}`);

		// Remove highlight after 3 seconds
		setTimeout(() => {
			setIsMatchHighlighted(false);
		}, 3000);
	};

	// Capture frame and send to recognition API with retry logic
	const captureAndRecognize = useCallback(async () => {
		if (!webcamRef.current || !isRecognizing) return;

		try {
			const imageSrc = webcamRef.current.getScreenshot();
			if (!imageSrc) return;

			// Extract base64 data
			const base64Data = imageSrc.split(',')[1];

			// Enhanced error handling and retry logic
			const recognizeWithRetry = async (retries = 2) => {
				try {
					// Add cache-busting query parameter
					const timestamp = new Date().getTime();
					await axios.post(
						`${
							import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
						}/recognize?t=${timestamp}`,
						{
							faceImage: base64Data,
						},
						{
							timeout: 5000, // 5 second timeout
							headers: {
								'Content-Type': 'application/json',
							},
						}
					);
				} catch (error) {
					if (
						retries > 0 &&
						(error.code === 'ECONNABORTED' || error.response?.status >= 500)
					) {
						// Retry on timeout or server errors
						console.warn(
							`Recognition request failed, retrying... (${retries} attempts left)`
						);
						await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
						return recognizeWithRetry(retries - 1);
					}

					// Don't show errors for 404 (no match found)
					if (error.response?.status === 404) {
						// No match found, this is normal
						return;
					}

					// Handle other errors
					console.error('Recognition error:', error);
					toast.error(
						`Recognition error: ${
							error.response?.data?.message ||
							'Network error or server unavailable'
						}`
					);
				}
			};

			await recognizeWithRetry();
		} catch (error) {
			console.error('Error capturing image:', error);
			toast.error('Failed to capture image from webcam');
		}
	}, [isRecognizing]);

	// Toggle recognition state with debounce protection
	const toggleRecognition = useCallback(() => {
		if (isRecognizing) {
			// Stop recognition
			if (recognitionIntervalRef.current) {
				clearInterval(recognitionIntervalRef.current);
				recognitionIntervalRef.current = null;
			}
			setIsRecognizing(false);
			toast.info('Recognition stopped');
		} else {
			// Start recognition with camera check
			if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
				navigator.mediaDevices
					.getUserMedia({ video: true })
					.then(() => {
						setIsRecognizing(true);
						toast.info('Recognition started');

						// Capture and recognize every 2.5 seconds
						recognitionIntervalRef.current = setInterval(() => {
							captureAndRecognize();
						}, 2500);
					})
					.catch((err) => {
						console.error('Camera access error:', err);
						toast.error('Could not access camera. Please check permissions.');
					});
			} else {
				toast.error('Your browser does not support camera access');
			}
		}
	}, [isRecognizing, captureAndRecognize]);

	return (
		<div className='face-recognition-container'>
			<h2 className='recognition-title'>Real-time Face Recognition</h2>

			<div className='connection-status'>
				<span
					className={`status-indicator ${
						wsConnected ? 'connected' : 'disconnected'
					}`}></span>
				<span className='status-text'>
					{wsConnected ? 'Connected to server' : 'Disconnected'}
				</span>
			</div>

			<div
				className={`webcam-container ${
					isMatchHighlighted ? 'match-highlighted' : ''
				}`}>
				<Webcam
					audio={false}
					ref={webcamRef}
					screenshotFormat='image/jpeg'
					videoConstraints={videoConstraints}
					className='webcam'
				/>
			</div>

			<button
				className={`recognition-toggle-btn ${isRecognizing ? 'active' : ''}`}
				onClick={toggleRecognition}
				disabled={!wsConnected}>
				{isRecognizing ? 'Stop Recognition' : 'Start Recognition'}
			</button>

			{lastMatch && (
				<div className='last-match-info'>
					<h3>Last Match</h3>
					<p className='match-name'>{lastMatch.name}</p>
					<p className='match-time'>
						{new Date(lastMatch.timestamp).toLocaleTimeString()}
					</p>
				</div>
			)}
		</div>
	);
};

export default FaceRecognitionLive;
