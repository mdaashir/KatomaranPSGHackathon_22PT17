import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	useRef,
} from 'react';
import { toast } from 'react-toastify';

// Create the context
const AppContext = createContext();

// Custom hook for using the context
export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
	// Global state
	const [theme, setTheme] = useState('light'); // light or dark theme
	const [wsStatus, setWsStatus] = useState('disconnected'); // WebSocket connection status
	const [wsInstance, setWsInstance] = useState(null); // WebSocket instance
	const [isLoading, setIsLoading] = useState(false); // Global loading state
	const [authToken, setAuthToken] = useState(
		localStorage.getItem('authToken') || ''
	);

	// WebSocket connection reference values
	const wsRef = useRef(null);
	const reconnectAttemptsRef = useRef(0);
	const maxReconnectAttempts = 10; // Maximum number of reconnection attempts
	const heartbeatIntervalRef = useRef(null);
	const lastPongRef = useRef(Date.now());
	const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

	// Function to send ping to keep the connection alive
	const sendPing = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			try {
				wsRef.current.send(JSON.stringify({ type: 'ping' }));

				// Check if we've received a pong recently
				const now = Date.now();
				if (now - lastPongRef.current > 30000) {
					// 30 seconds timeout
					console.warn('No pong received recently, connection may be stale');
					toast.warning(
						'Connection appears to be stale, attempting to reconnect...'
					);

					// Close and reconnect
					wsRef.current.close();
				}
			} catch (error) {
				console.error('Error sending ping:', error);
			}
		}
	}, []);

	// Calculate exponential backoff for reconnection attempts
	const getReconnectDelay = useCallback(() => {
		const baseDelay = 1000; // Start with 1 second
		const maxDelay = 30000; // Cap at 30 seconds
		const attempt = reconnectAttemptsRef.current;

		// Exponential backoff with jitter
		const exponentialDelay = Math.min(
			maxDelay,
			baseDelay * Math.pow(2, attempt)
		);

		// Add random jitter (±20%)
		const jitter = exponentialDelay * 0.2 * (Math.random() * 2 - 1);

		return Math.floor(exponentialDelay + jitter);
	}, []);

	// Connect to WebSocket
	const connectWebSocket = useCallback(() => {
		// Clean up any existing connection
		if (wsRef.current) {
			wsRef.current.close();
		}

		try {
			const wsUrl = `${wsBaseUrl}/ws`;
			console.log(`Connecting to WebSocket: ${wsUrl}`);
			setWsStatus('connecting');

			const socket = new WebSocket(wsUrl);
			wsRef.current = socket;

			socket.onopen = () => {
				console.log('WebSocket connected');
				setWsStatus('connected');
				setWsInstance(socket);
				reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection

				// Notify user only if this was a reconnection
				if (reconnectAttemptsRef.current > 0) {
					toast.success('Connection re-established');
				}

				// Set up heartbeat
				if (heartbeatIntervalRef.current) {
					clearInterval(heartbeatIntervalRef.current);
				}
				heartbeatIntervalRef.current = setInterval(sendPing, 15000); // Send ping every 15 seconds
			};

			socket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					// Handle different message types
					switch (data.type) {
						case 'pong':
							// Update last pong timestamp
							lastPongRef.current = Date.now();
							break;
						case 'connection':
							// Connection established message
							console.log('Connection confirmed:', data);
							break;
						case 'error':
							// Server reported an error
							console.error('Server error:', data);
							toast.error(`Server error: ${data.message || 'Unknown error'}`);
							break;
						default:
							// Handle other message types as needed
							console.log('WebSocket message received:', data);
					}
				} catch (error) {
					console.error('Error parsing WebSocket message:', error);
				}
			};

			socket.onclose = (event) => {
				// Connection closed
				console.log(
					`WebSocket disconnected, code: ${event.code}, reason: ${event.reason}`
				);
				setWsStatus('disconnected');
				setWsInstance(null);

				// Clear heartbeat interval
				if (heartbeatIntervalRef.current) {
					clearInterval(heartbeatIntervalRef.current);
					heartbeatIntervalRef.current = null;
				}

				// Attempt to reconnect with exponential backoff if not closed cleanly
				if (reconnectAttemptsRef.current < maxReconnectAttempts) {
					reconnectAttemptsRef.current += 1;
					const delay = getReconnectDelay();

					console.log(
						`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms`
					);

					// Only show toast for longer delays to avoid spamming
					if (delay > 5000) {
						toast.info(
							`Connection lost. Reconnecting in ${Math.round(
								delay / 1000
							)} seconds...`
						);
					}

					setTimeout(() => {
						if (wsStatus !== 'connected') {
							connectWebSocket();
						}
					}, delay);
				} else {
					console.error('Maximum reconnection attempts reached');
					setWsStatus('failed');
					toast.error(
						'Failed to establish a stable connection. Please refresh the page or try again later.'
					);
				}
			};

			socket.onerror = (error) => {
				console.error('WebSocket error:', error);
				setWsStatus('error');

				// We don't need to do anything here as the onclose handler will be called after an error
				// and will handle the reconnection logic
			};

			return socket;
		} catch (error) {
			console.error('Error connecting to WebSocket:', error);
			setWsStatus('error');
			return null;
		}
	}, [getReconnectDelay, sendPing, wsBaseUrl, wsStatus]);

	// Connect to WebSocket when the app loads
	useEffect(() => {
		const socket = connectWebSocket();

		// Clean up WebSocket connection when component unmounts
		return () => {
			if (socket) {
				socket.close();
			}

			if (heartbeatIntervalRef.current) {
				clearInterval(heartbeatIntervalRef.current);
			}
		};
	}, [connectWebSocket]);

	// Function to manually reconnect
	const reconnectWebSocket = useCallback(() => {
		// Reset reconnect attempts to ensure we can try the full sequence again
		reconnectAttemptsRef.current = 0;
		connectWebSocket();
	}, [connectWebSocket]);

	// Save auth token to localStorage when it changes
	useEffect(() => {
		if (authToken) {
			localStorage.setItem('authToken', authToken);
		} else {
			localStorage.removeItem('authToken');
		}
	}, [authToken]);

	// Toggle theme between light and dark
	const toggleTheme = () => {
		setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
	};

	// Set up dark mode class on document
	useEffect(() => {
		if (theme === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, [theme]);

	// Public context value
	const contextValue = {
		theme,
		toggleTheme,
		wsStatus,
		wsInstance,
		reconnectWebSocket,
		isLoading,
		setIsLoading,
		authToken,
		setAuthToken,
	};

	return (
		<AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
	);
};
