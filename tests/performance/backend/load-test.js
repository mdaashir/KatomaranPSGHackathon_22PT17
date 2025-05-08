import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metric for tracking errors
const errorRate = new Rate('errors');

// Load test configuration for normal usage patterns
export const options = {
	stages: [
		{ duration: '1m', target: 50 }, // Ramp up to 50 users over 1 minute
		{ duration: '3m', target: 50 }, // Stay at 50 users for 3 minutes
		{ duration: '1m', target: 100 }, // Ramp up to 100 users over 1 minute
		{ duration: '3m', target: 100 }, // Stay at 100 users for 3 minutes
		{ duration: '1m', target: 0 }, // Ramp down to 0 users
	],
	thresholds: {
		http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
		errors: ['rate<0.1'], // Error rate should be less than 10%
	},
};

// Main function executed for each virtual user
export default function () {
	// 1. Test the health endpoint
	const healthRes = http.get('http://localhost:3001/health');
	check(healthRes, {
		'health check status is 200': (r) => r.status === 200,
		'health check has correct data': (r) => r.json('status') === 'ok',
	}) || errorRate.add(1);

	sleep(1);

	// 2. Test the push notification endpoint with random test data
	const pushRes = http.post(
		'http://localhost:3001/api/push',
		JSON.stringify({
			userId: `user-${Math.floor(Math.random() * 1000)}`,
			message: 'Test notification message',
			timestamp: new Date().toISOString(),
		}),
		{
			headers: {
				'Content-Type': 'application/json',
			},
		}
	);

	check(pushRes, {
		'push notification status is 200': (r) => r.status === 200,
	}) || errorRate.add(1);

	sleep(1);

	// 3. Test registration endpoint with random user data
	const registerRes = http.post(
		'http://localhost:3001/api/register',
		JSON.stringify({
			userId: `load-test-user-${Math.floor(Math.random() * 10000)}`,
			name: 'Load Test User',
			email: `loadtest${Math.floor(Math.random() * 10000)}@example.com`,
		}),
		{
			headers: {
				'Content-Type': 'application/json',
			},
		}
	);

	check(registerRes, {
		'register status is 200 or 201': (r) =>
			r.status === 200 || r.status === 201,
	}) || errorRate.add(1);

	// Wait between iterations
	sleep(Math.random() * 3 + 1);
}
