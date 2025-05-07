# Face Recognition Platform - Frontend

This is the frontend application for the Face Recognition Platform, built using React, Vite, and modern web technologies.

## Features

- **Face Registration**: Capture faces using webcam and register them with user names
- **Real-time Feedback**: User-friendly notifications and status updates
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Comprehensive error handling with ErrorBoundary
- **API Integration**: Clean service-based architecture for API communication

## Tech Stack

- **React**: UI library
- **Vite**: Build tool
- **react-webcam**: For webcam integration
- **axios**: API client for HTTP requests
- **react-toastify**: Toast notifications

## Project Structure

```
src/
├── assets/           # Static assets (images, fonts, etc.)
├── components/       # React components
│   ├── ErrorBoundary.jsx  # Error handling component
│   └── FaceRegistrationForm.jsx  # Webcam-based registration form
├── services/         # API and service integrations
│   └── api.js        # API client for backend communication
├── styles/           # Component-specific styles
│   └── FaceRegistrationForm.css
├── App.css           # Application styles
├── App.jsx           # Main application component
├── index.css         # Global styles
└── main.jsx          # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 14+ and npm

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev
```

### Building for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## API Integration

The application is designed to work with the backend API running at `http://localhost:3001/api`.
The API base URL can be configured via the `VITE_API_URL` environment variable.

## Accessibility

The application is built with accessibility in mind:

- Proper form labeling
- Keyboard navigation support
- Screen reader considerations
- ARIA attributes where needed

## Future Enhancements

- Face recognition testing UI
- User management dashboard
- Admin controls
- Dark mode support
- Multi-language support
