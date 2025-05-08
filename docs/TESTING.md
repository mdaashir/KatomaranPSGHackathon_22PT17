# Testing Guide

This document provides comprehensive testing procedures and guidelines for the Face Recognition Platform.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Test Environments](#test-environments)
- [Frontend Testing](#frontend-testing)
- [Backend Testing](#backend-testing)
- [Face Recognition Service Testing](#face-recognition-service-testing)
- [RAG Engine Testing](#rag-engine-testing)
- [Integration Testing](#integration-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [Accessibility Testing](#accessibility-testing)
- [Test Automation](#test-automation)
- [Continuous Integration](#continuous-integration)
- [Test Reporting](#test-reporting)

## Testing Strategy

Our testing strategy follows a pyramid approach:

1. **Unit Tests**: Testing individual components in isolation
2. **Integration Tests**: Testing interaction between components
3. **End-to-End Tests**: Testing complete user flows
4. **Performance Tests**: Evaluating system performance under load
5. **Security Tests**: Identifying security vulnerabilities
6. **Accessibility Tests**: Ensuring accessibility standards compliance

## Test Environments

### Local Development Environment

- For developers to run tests during development
- Uses in-memory MongoDB and mocked external services

### Testing Environment

- Isolated environment for automated test runs
- Mirrors production configuration with test databases
- Separate instances for each service

### Staging Environment

- Production-like environment for final testing
- Uses production configurations with staging data
- Used for performance and integration testing

### Production Environment

- Live system monitoring and testing
- Canary deployments for safe releases

## Frontend Testing

### Unit Testing with React Testing Library and Jest

Run the frontend unit tests with:

```bash
cd apps/frontend
npm test
```

#### Component Testing Example

```jsx
// Example test for FaceRegistrationForm.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import FaceRegistrationForm from '../components/FaceRegistrationForm';

describe('FaceRegistrationForm', () => {
	test('renders the form correctly', () => {
		render(<FaceRegistrationForm />);
		expect(screen.getByText('Face Registration')).toBeInTheDocument();
		expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /Capture Photo/ })
		).toBeInTheDocument();
	});

	test('validates input fields', () => {
		render(<FaceRegistrationForm />);
		const registerButton = screen.getByRole('button', { name: /Register/ });
		expect(registerButton).toBeDisabled();

		// Enter name but no photo
		fireEvent.change(screen.getByLabelText(/Full Name/), {
			target: { value: 'John Doe' },
		});
		expect(registerButton).toBeDisabled();
	});
});
```

### End-to-End Testing with Cypress

Setup Cypress tests:

```bash
cd apps/frontend
npm install --save-dev cypress
```

Create a `cypress.config.js` file:

```javascript
export default {
	e2e: {
		baseUrl: 'http://localhost:5173',
		supportFile: false,
	},
};
```

Example E2E test:

```javascript
// cypress/e2e/face-registration.cy.js
describe('Face Registration Flow', () => {
	beforeEach(() => {
		cy.intercept('POST', '/api/register', { statusCode: 201 }).as(
			'registerUser'
		);
		cy.visit('/register');
	});

	it('completes registration process', () => {
		// Mock webcam by overriding getUserMedia
		cy.window().then((win) => {
			cy.stub(win.navigator.mediaDevices, 'getUserMedia').resolves({
				getTracks: () => [
					{
						stop: () => {},
					},
				],
			});
		});

		// Fill the form
		cy.get('#name').type('John Doe');
		cy.get('.capture-button').click();

		// Mock captured image
		cy.get('.register-button').click();
		cy.wait('@registerUser');

		// Check success message
		cy.contains('Registration successful');
	});
});
```

Run E2E tests with:

```bash
npx cypress run
```

## Backend Testing

### Unit Testing with Jest

Run backend tests:

```bash
cd apps/backend
npm test
```

#### Example API Route Test

```javascript
// routes/register.test.js
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
	mongoServer = await MongoMemoryServer.create();
	const mongoUri = mongoServer.getUri();
	await mongoose.connect(mongoUri);
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
});

describe('POST /api/register', () => {
	it('should register a new user with face image', async () => {
		const response = await request(app).post('/api/register').send({
			name: 'Test User',
			faceImage: 'base64EncodedImageData',
		});

		expect(response.status).toBe(201);
		expect(response.body).toHaveProperty('id');
		expect(response.body).toHaveProperty('name', 'Test User');
	});

	it('should return 400 if name is missing', async () => {
		const response = await request(app).post('/api/register').send({
			faceImage: 'base64EncodedImageData',
		});

		expect(response.status).toBe(400);
		expect(response.body).toHaveProperty('message');
	});
});
```

### WebSocket Testing

```javascript
// ws/server.test.js
const WebSocket = require('ws');
const http = require('http');
const { setupWebSocketServer } = require('./server');

describe('WebSocket Server', () => {
	let server;
	let wss;
	let ws;

	beforeEach((done) => {
		server = http.createServer();
		wss = setupWebSocketServer(server);
		server.listen(0, 'localhost', () => {
			const { port } = server.address();
			ws = new WebSocket(`ws://localhost:${port}`);
			ws.on('open', () => done());
		});
	});

	afterEach((done) => {
		ws.close();
		server.close(() => done());
	});

	it('sends recognition event when match is found', (done) => {
		ws.on('message', (data) => {
			const message = JSON.parse(data);
			expect(message).toHaveProperty('event', 'match');
			expect(message).toHaveProperty('name');
			done();
		});

		// Simulate a match event by directly emitting it
		wss.clients.forEach((client) => {
			client.send(
				JSON.stringify({
					event: 'match',
					name: 'John Doe',
					timestamp: new Date().toISOString(),
				})
			);
		});
	});
});
```

## Face Recognition Service Testing

### Unit Testing with pytest

Run tests:

```bash
cd services/face-recognition
python -m pytest
```

#### Example Face Recognition Test

```python
# test_encoding.py
import pytest
import numpy as np
from utils.encoding import encode_face, compare_faces

@pytest.fixture
def sample_image():
    # Create a dummy image for testing
    return np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8)

def test_encode_face(sample_image):
    encoding = encode_face(sample_image)
    assert encoding is not None
    assert len(encoding) == 128  # dlib creates 128-dimensional face encodings

def test_compare_faces():
    # Create two similar face encodings
    encoding1 = np.random.rand(128)
    encoding2 = encoding1 + np.random.normal(0, 0.1, 128)

    # Create a completely different encoding
    encoding3 = np.random.rand(128)

    # Test comparison
    similarity12 = compare_faces(encoding1, encoding2)
    similarity13 = compare_faces(encoding1, encoding3)

    # Similar encodings should have higher similarity
    assert similarity12 > similarity13
```

## RAG Engine Testing

### Testing the RAG Engine

```python
# test_rag.py
import pytest
from rag.index import create_index, query_index
from rag.chat import generate_response

@pytest.fixture
def sample_data():
    return [
        {"text": "John Doe is a software engineer.", "metadata": {"id": "1"}},
        {"text": "Jane Smith is a data scientist.", "metadata": {"id": "2"}},
    ]

def test_index_creation(sample_data):
    index = create_index(sample_data)
    assert index is not None

def test_query_index(sample_data):
    index = create_index(sample_data)
    results = query_index(index, "Who is John Doe?")
    assert len(results) > 0
    assert "John" in results[0].page_content

@pytest.mark.asyncio
async def test_generate_response(mocker):
    # Mock the OpenAI API call
    mock_completion = mocker.patch("openai.ChatCompletion.create")
    mock_completion.return_value = {
        "choices": [{"message": {"content": "John Doe is a software engineer."}}]
    }

    response = await generate_response("Who is John Doe?", ["John Doe is a software engineer."])
    assert "software engineer" in response
```

## Integration Testing

### API and WebSocket Integration

```javascript
// integration/api-websocket.test.js
const request = require('supertest');
const WebSocket = require('ws');
const app = require('../apps/backend/app');
const http = require('http');

describe('API and WebSocket Integration', () => {
	let server;
	let ws;

	beforeEach((done) => {
		server = http.createServer(app);
		server.listen(0, 'localhost', () => {
			const { port } = server.address();
			ws = new WebSocket(`ws://localhost:${port}/ws`);
			ws.on('open', () => done());
		});
	});

	afterEach((done) => {
		ws.close();
		server.close(() => done());
	});

	it('sends WebSocket notification when face is recognized via API', (done) => {
		ws.on('message', (data) => {
			const message = JSON.parse(data);
			expect(message).toHaveProperty('event', 'match');
			expect(message).toHaveProperty('name', 'Test User');
			done();
		});

		// Make API call to recognize face
		request(server)
			.post('/api/recognize')
			.send({ image: 'base64EncodedImageData' });
	});
});
```

## Performance Testing

### Load Testing with k6

Create a k6 test file:

```javascript
// performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
	stages: [
		{ duration: '30s', target: 20 }, // Ramp up to 20 users over 30 seconds
		{ duration: '1m', target: 20 }, // Stay at 20 users for 1 minute
		{ duration: '30s', target: 0 }, // Ramp down to 0 users
	],
	thresholds: {
		http_req_duration: ['p(95)<500'], // 95% of requests should complete within 500ms
	},
};

export default function () {
	// Test face recognition endpoint
	const payload = JSON.stringify({
		image: 'base64EncodedImageData', // Use a small sample image
	});

	const params = {
		headers: { 'Content-Type': 'application/json' },
	};

	const res = http.post('http://localhost:3001/api/recognize', payload, params);

	check(res, {
		'status is 200': (r) => r.status === 200,
		'response time < 500ms': (r) => r.timings.duration < 500,
	});

	sleep(1);
}
```

Run the load test:

```bash
k6 run performance/load-test.js
```

### Stress Testing

```javascript
// performance/stress-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
	stages: [
		{ duration: '2m', target: 100 }, // Ramp up to 100 users over 2 minutes
		{ duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
		{ duration: '2m', target: 0 }, // Ramp down to 0 users
	],
};

export default function () {
	// Similar to load test but with higher concurrency
	// ...
}
```

## Security Testing

### Dependency Scanning

```bash
# For Node.js projects
cd apps/frontend
npm audit

cd ../backend
npm audit

# For Python projects
cd services/face-recognition
safety check -r requirements.txt

cd ../rag-engine
safety check -r requirements.txt
```

### OWASP ZAP Scanning

```bash
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://your-application-url
```

### API Security Testing

Use a tool like Dredd to validate API specifications:

```bash
dredd api-spec.yml http://localhost:3001
```

## Accessibility Testing

### Automated Accessibility Testing

Add axe-core to the project:

```bash
cd apps/frontend
npm install --save-dev @axe-core/react
```

Create accessibility tests:

```jsx
// a11y/accessibility.test.jsx
import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import FaceRegistrationForm from '../components/FaceRegistrationForm';

expect.extend(toHaveNoViolations);

describe('Accessibility tests', () => {
	it('should not have accessibility violations', async () => {
		const { container } = render(<FaceRegistrationForm />);
		const results = await axe(container);
		expect(results).toHaveNoViolations();
	});
});
```

## Test Automation

### Setting Up GitHub Actions for Test Automation

Create a workflow file:

```yaml
# .github/workflows/test.yml
name: Run Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Frontend Tests
        run: |
          cd apps/frontend
          npm install
          npm test

      - name: Backend Tests
        run: |
          cd apps/backend
          npm install
          npm test

  python-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          cd services/face-recognition
          pip install -e .
          pip install pytest pytest-cov

      - name: Run tests
        run: |
          cd services/face-recognition
          python -m pytest --cov=./ --cov-report=xml

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./services/face-recognition/coverage.xml
```

## Test Reporting

### Jest Test Report

Configure Jest to generate test reports:

```json
{
	"jest": {
		"reporters": [
			"default",
			[
				"jest-junit",
				{
					"outputDirectory": "test-results",
					"outputName": "jest-junit.xml"
				}
			]
		]
	}
}
```

### Python Test Report

```bash
python -m pytest --junitxml=test-results/pytest-report.xml
```

### Test Coverage Thresholds

Frontend:

```json
{
	"jest": {
		"coverageThreshold": {
			"global": {
				"branches": 80,
				"functions": 80,
				"lines": 80,
				"statements": 80
			}
		}
	}
}
```

Python:

```ini
# pytest.ini
[pytest]
minversion = 6.0
testpaths = tests
python_classes = Test
python_files = test_*.py
python_functions = test_*
addopts = --cov=. --cov-report=term --cov-report=xml --cov-fail-under=80
```

## Testing Best Practices

1. **Write tests first**: Follow Test-Driven Development (TDD) principles
2. **Keep tests fast**: Unit tests should run in milliseconds
3. **Independent tests**: No interdependencies between test cases
4. **One assertion per test**: Each test should verify one specific behavior
5. **Clean test data**: Reset test data between test runs
6. **Mock external services**: Use mocks for APIs, databases, and other external dependencies
7. **Test edge cases**: Test boundary conditions and error paths
8. **Continuous testing**: Run tests automatically on code changes
9. **Test coverage**: Aim for 80%+ code coverage, but focus on critical paths
10. **Security testing**: Include security tests in the CI pipeline

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Documentation](https://docs.cypress.io/)
- [pytest Documentation](https://docs.pytest.org/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [k6 Documentation](https://k6.io/docs/)
- [axe-core Accessibility Testing](https://github.com/dequelabs/axe-core)
