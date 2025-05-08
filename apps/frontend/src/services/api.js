import axios from 'axios';

// Create axios instance with default config
const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
	headers: {
		'Content-Type': 'application/json',
	},
	timeout: 10000, // 10 seconds
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
	(config) => {
		const token = localStorage.getItem('auth_token');
		if (token) {
			config.headers['Authorization'] = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		// Handle global error responses (e.g., 401, 403, 500)
		if (error.response && error.response.status === 401) {
			// Unauthorized - redirect to login or clear token
			localStorage.removeItem('auth_token');
			// Could dispatch an action for logging out the user
		}

		return Promise.reject(error);
	}
);

// Face registration API endpoints
export const faceApi = {
	/**
	 * Register a new face with name
	 * @param {Object} data - Registration data
	 * @param {string} data.name - User's name
	 * @param {string} data.faceImage - Base64 encoded face image
	 * @returns {Promise} - API response
	 */
	register: (data) => {
		return apiClient.post('/register', data);
	},

	/**
	 * Recognize a face from image
	 * @param {Object} data - Recognition data
	 * @param {string} data.faceImage - Base64 encoded face image
	 * @returns {Promise} - API response with recognition results
	 */
	recognize: (data) => {
		return apiClient.post('/recognize', data);
	},
};

export default apiClient;
