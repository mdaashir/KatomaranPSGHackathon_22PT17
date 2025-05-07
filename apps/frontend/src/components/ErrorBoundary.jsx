import { Component } from 'react';

class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null, errorInfo: null };
	}

	static getDerivedStateFromError(error) {
		// Update state so the next render will show the fallback UI
		return { hasError: true, error };
	}

	componentDidCatch(error, errorInfo) {
		// You can log the error to an error reporting service
		console.error('ErrorBoundary caught an error', error, errorInfo);
		this.setState({ errorInfo });
	}

	render() {
		if (this.state.hasError) {
			// You can render any custom fallback UI
			return (
				<div className='error-boundary'>
					<h2>Something went wrong.</h2>
					<details>
						<summary>Error Details</summary>
						<p>{this.state.error && this.state.error.toString()}</p>
						<p>Component Stack Error Details:</p>
						<pre>
							{this.state.errorInfo && this.state.errorInfo.componentStack}
						</pre>
					</details>
					<button
						onClick={() => window.location.reload()}
						className='error-retry-button'>
						Reload Page
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
