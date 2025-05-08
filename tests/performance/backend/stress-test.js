import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for tracking errors and response times
const errorRate = new Rate('errors');
const faceRecognitionTrend = new Trend('face_recognition_time');
const websocketConnectTime = new Trend('websocket_connect_time');

// Stress test configuration - push the system to its limits
export const options = {
	stages: [
		{ duration: '2m', target: 100 }, // Ramp up to 100 users over 2 minutes
		{ duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
		{ duration: '2m', target: 200 }, // Ramp up to 200 users over 2 minutes
		{ duration: '5m', target: 200 }, // Stay at 200 users for 5 minutes
		{ duration: '2m', target: 300 }, // Ramp up to 300 users over 2 minutes
		{ duration: '5m', target: 300 }, // Stay at 300 users for 5 minutes
		{ duration: '2m', target: 0 }, // Ramp down to 0 users
	],
	thresholds: {
		http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1s
		errors: ['rate<0.2'], // Error rate should be less than 20%
		face_recognition_time: ['p(95)<1500'], // 95% of face recognition requests should be below 1.5s
		websocket_connect_time: ['p(95)<300'], // 95% of websocket connections should be below 300ms
	},
};

// Helper function to generate a random test image payload
// In a real test, you would use actual test images
function getRandomImagePayload() {
	return JSON.stringify({
		image: 'base64EncodedImage', // Placeholder
	});
}

// Main function executed for each virtual user
export default function () {
	// 1. Test the health endpoint
	const healthRes = http.get('http://localhost:3001/health');
	check(healthRes, {
		'health check successful': (r) => r.status === 200,
	}) || errorRate.add(1);

	// Small pause between requests
	sleep(Math.random());

	// 2. Test face recognition API under load
	const startTime = new Date();
	const payload = getRandomImagePayload();
	const params = {
		headers: {
			'Content-Type': 'application/json',
		},
	};

	const recognizeRes = http.post(
		'http://localhost:3001/api/recognize',
		payload,
		params
	);
	const recognitionTime = new Date() - startTime;
	faceRecognitionTrend.add(recognitionTime);

	check(recognizeRes, {
		'recognize API successful': (r) => r.status === 200,
	}) || errorRate.add(1);

	sleep(Math.random());

	// 3. Test registration endpoint
	const regPayload = JSON.stringify({
		userId: `stress-test-user-${Math.floor(Math.random() * 100000)}`,
		name: 'Stress Test User',
		image: 'base64EncodedImage', // Placeholder
	});

	const registerRes = http.post(
		'http://localhost:3001/api/register',
		regPayload,
		params
	);
	check(registerRes, {
		'registration API successful': (r) => r.status === 200 || r.status === 201,
	}) || errorRate.add(1);

	sleep(Math.random());

	// 4. Test WebSocket connection performance
	const wsStartTime = new Date();
	const wsHealthRes = http.get('http://localhost:3001/health/websocket');
	const wsConnectTime = new Date() - wsStartTime;
	websocketConnectTime.add(wsConnectTime);

	check(wsHealthRes, {
		'websocket health check successful': (r) => r.status === 200,
	}) || errorRate.add(1);

	// Variable sleep time to simulate real-world usage patterns
	sleep(Math.random() * 2);
}
