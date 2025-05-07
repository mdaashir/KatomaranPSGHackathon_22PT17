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

	// Refs
	const webcamRef = useRef(null);
	const wsRef = useRef(null);
	const recognitionIntervalRef = useRef(null);

	// Webcam configuration
	const videoConstraints = {
		width: 480,
		height: 480,
		facingMode: 'user',
	};

	// Initialize WebSocket connection
	useEffect(() => {
		connectWebSocket();

		// Cleanup on unmount
		return () => {
			if (wsRef.current) {
				wsRef.current.close();
			}
			if (recognitionIntervalRef.current) {
				clearInterval(recognitionIntervalRef.current);
			}
		};
	}, []);

	// Function to establish WebSocket connection
	const connectWebSocket = () => {
		const ws = new WebSocket('ws://localhost:3001/ws');
		wsRef.current = ws;

		ws.onopen = () => {
			setWsConnected(true);
			toast.info('WebSocket connected');
		};

		ws.onclose = () => {
			setWsConnected(false);
			toast.warn('WebSocket disconnected');

			// Try to reconnect after a delay
			setTimeout(() => {
				if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
					connectWebSocket();
				}
			}, 3000);
		};

		ws.onerror = (error) => {
			console.error('WebSocket error:', error);
			toast.error('WebSocket connection error');
		};

		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				console.log('WebSocket message received:', data);

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

	// Capture frame and send to recognition API
	const captureAndRecognize = useCallback(async () => {
		if (!webcamRef.current || !isRecognizing) return;

		try {
			const imageSrc = webcamRef.current.getScreenshot();
			if (!imageSrc) return;

			// Send image to recognition API
			await axios.post('http://localhost:3001/api/recognize', {
				image: imageSrc,
			});
		} catch (error) {
			console.error('Recognition error:', error);
			if (error.response?.status === 404) {
				// No match found, this is normal
			} else {
				toast.error(
					`Recognition error: ${
						error.response?.data?.message || 'Unknown error'
					}`
				);
			}
		}
	}, [isRecognizing]);

	// Toggle recognition state
	const toggleRecognition = () => {
		if (isRecognizing) {
			// Stop recognition
			if (recognitionIntervalRef.current) {
				clearInterval(recognitionIntervalRef.current);
				recognitionIntervalRef.current = null;
			}
			setIsRecognizing(false);
			toast.info('Recognition stopped');
		} else {
			// Start recognition
			setIsRecognizing(true);
			toast.info('Recognition started');

			// Capture and recognize every 2.5 seconds
			recognitionIntervalRef.current = setInterval(() => {
				captureAndRecognize();
			}, 2500);
		}
	};

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
				onClick={toggleRecognition}>
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
