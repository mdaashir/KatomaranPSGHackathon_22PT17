import { createContext, useState, useContext, useEffect } from 'react';

// Create context
const AppContext = createContext();

export const AppProvider = ({ children }) => {
	// Global state
	const [theme, setTheme] = useState('light');
	const [wsStatus, setWsStatus] = useState('disconnected');
	const [isLoading, setIsLoading] = useState(false);
	const [user, setUser] = useState(null);

	// WebSocket connection
	useEffect(() => {
		// Initialize WebSocket connection
		const ws = new WebSocket('ws://localhost:3001');

		ws.onopen = () => {
			setWsStatus('connected');
			console.log('WebSocket Connected');
		};

		ws.onclose = () => {
			setWsStatus('disconnected');
			console.log('WebSocket Disconnected');

			// Try to reconnect after 2 seconds
			setTimeout(() => {
				setWsStatus('reconnecting');
			}, 2000);
		};

		ws.onerror = (error) => {
			console.error('WebSocket Error:', error);
			setWsStatus('error');
		};

		// Clean up
		return () => {
			ws.close();
		};
	}, []);

	// Toggle theme
	const toggleTheme = () => {
		const newTheme = theme === 'light' ? 'dark' : 'light';
		setTheme(newTheme);
		document.documentElement.setAttribute('data-theme', newTheme);
		localStorage.setItem('theme', newTheme);
	};

	// Initialize theme from localStorage
	useEffect(() => {
		const savedTheme = localStorage.getItem('theme') || 'light';
		setTheme(savedTheme);
		document.documentElement.setAttribute('data-theme', savedTheme);
	}, []);

	// Context value
	const value = {
		theme,
		toggleTheme,
		wsStatus,
		isLoading,
		setIsLoading,
		user,
		setUser,
	};

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom hook to use the context
export const useAppContext = () => {
	const context = useContext(AppContext);
	if (context === undefined) {
		throw new Error('useAppContext must be used within an AppProvider');
	}
	return context;
};
