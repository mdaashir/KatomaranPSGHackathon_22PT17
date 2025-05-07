import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import FaceRegistrationForm from './components/FaceRegistrationForm';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
	return (
		<div className='app-container'>
			<header className='app-header'>
				<h1>Face Recognition Platform</h1>
			</header>

			<main className='app-content'>
				<ErrorBoundary>
					<FaceRegistrationForm />
				</ErrorBoundary>
			</main>

			<ToastContainer
				position='top-right'
				autoClose={5000}
				hideProgressBar={false}
				newestOnTop
				closeOnClick
				rtl={false}
				pauseOnFocusLoss
				draggable
				pauseOnHover
			/>
		</div>
	);
}

export default App;
