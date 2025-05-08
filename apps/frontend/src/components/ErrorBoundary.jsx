import { Component } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			errorCount: 0,
			lastErrorTime: null,
		};
	}

	static getDerivedStateFromError(error) {
		// Update state so the next render will show the fallback UI
		return { hasError: true, error };
	}

	componentDidCatch(error, errorInfo) {
		// Log the error to console
		console.error('ErrorBoundary caught an error', error, errorInfo);

		// Update state with error details and increment error counter
		this.setState((prevState) => ({
			errorInfo,
			errorCount: prevState.errorCount + 1,
			lastErrorTime: new Date().toISOString(),
		}));

		// Show error toast notification
		toast.error('An error occurred in the application');

		// Report error to monitoring service if available
		this.reportError(error, errorInfo);
	}

	reportError(error, errorInfo) {
		// In production, send error to monitoring service
		if (process.env.NODE_ENV === 'production') {
			// This would typically be a call to an error monitoring service like Sentry
			// Example: Sentry.captureException(error, { extra: errorInfo });

			// Fallback to console when no service is configured
			console.group('Error Report');
			console.error('Error:', error);
			console.error('Component Stack:', errorInfo?.componentStack);
			console.error('Timestamp:', new Date().toISOString());
			console.error('Error Count:', this.state.errorCount + 1);
			console.groupEnd();

			// You can also send errors to your backend API
			try {
				fetch(
					`${
						import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
					}/error-report`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							message: error.message,
							stack: error.stack,
							componentStack: errorInfo?.componentStack,
							timestamp: new Date().toISOString(),
							userAgent: navigator.userAgent,
							url: window.location.href,
						}),
					}
				).catch((e) => console.error('Failed to send error report:', e));
			} catch (reportError) {
				console.error('Error reporting failed:', reportError);
			}
		}
	}

	handleRetry = () => {
		// Reset the error state to allow the component to try rendering again
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});

		// Notify user
		toast.info('Retrying component render');
	};

	handleReload = () => {
		// Hard reload the page
		window.location.reload();
	};

	render() {
		if (this.state.hasError) {
			// Check if we should render fallback UI or custom fallback from props
			if (this.props.fallback) {
				return this.props.fallback({
					error: this.state.error,
					errorInfo: this.state.errorInfo,
					onRetry: this.handleRetry,
					onReload: this.handleReload,
				});
			}

			// Default fallback UI
			return (
				<div className='error-boundary'>
					<div className='error-content'>
						<h2>Something went wrong</h2>
						<p>
							We're sorry, but an error occurred while displaying this content.
						</p>

						<div className='error-actions'>
							<button
								onClick={this.handleRetry}
								className='error-retry-button primary'>
								Try Again
							</button>
							<button
								onClick={this.handleReload}
								className='error-reload-button secondary'>
								Reload Page
							</button>
						</div>

						{/* Show error details in development or if showDetails prop is true */}
						{(process.env.NODE_ENV !== 'production' ||
							this.props.showDetails) && (
							<details className='error-details'>
								<summary>Technical Details</summary>
								<p className='error-message'>
									{this.state.error && this.state.error.toString()}
								</p>
								<div className='stack-trace'>
									<h4>Component Stack:</h4>
									<pre>
										{this.state.errorInfo &&
											this.state.errorInfo.componentStack}
									</pre>
								</div>
							</details>
						)}
					</div>
				</div>
			);
		}

		// When there's no error, render children normally
		return this.props.children;
	}
}

ErrorBoundary.propTypes = {
	children: PropTypes.node.isRequired,
	fallback: PropTypes.func,
	showDetails: PropTypes.bool,
};

ErrorBoundary.defaultProps = {
	fallback: null,
	showDetails: false,
};

export default ErrorBoundary;
