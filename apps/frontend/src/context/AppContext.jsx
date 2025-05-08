import { createContext, useContext, useState, useEffect } from 'react';

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

	// Connect to WebSocket when the app loads
	useEffect(() => {
		const connectWebSocket = () => {
			try {
				const socket = new WebSocket('ws://localhost:8080');

				socket.onopen = () => {
					console.log('WebSocket connected');
					setWsStatus('connected');
					setWsInstance(socket);
				};

				socket.onclose = () => {
					console.log('WebSocket disconnected');
					setWsStatus('disconnected');
					setWsInstance(null);

					// Try to reconnect after 5 seconds
					setTimeout(() => {
						if (wsStatus !== 'connected') {
							connectWebSocket();
						}
					}, 5000);
				};

				socket.onerror = (error) => {
					console.error('WebSocket error:', error);
					setWsStatus('error');
				};

				return socket;
			} catch (error) {
				console.error('Error connecting to WebSocket:', error);
				setWsStatus('error');
				return null;
			}
		};

		const socket = connectWebSocket();

		// Clean up WebSocket connection when component unmounts
		return () => {
			if (socket) {
				socket.close();
			}
		};
	}, []);

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
		isLoading,
		setIsLoading,
		authToken,
		setAuthToken,
	};

	return (
		<AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
	);
};
