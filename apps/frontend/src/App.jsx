import { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import FaceRegistrationForm from './components/FaceRegistrationForm';
import FaceRecognitionLive from './components/FaceRecognitionLive';
import Admin from './pages/Admin';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
	const [activeTab, setActiveTab] = useState('register'); // 'register', 'recognize', or 'admin'

	return (
		<div className='app-container'>
			<header className='app-header'>
				<h1>Face Recognition Platform</h1>

				<div className='tab-navigation'>
					<button
						className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
						onClick={() => setActiveTab('register')}>
						Face Registration
					</button>
					<button
						className={`tab-button ${
							activeTab === 'recognize' ? 'active' : ''
						}`}
						onClick={() => setActiveTab('recognize')}>
						Live Recognition
					</button>
					<button
						className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
						onClick={() => setActiveTab('admin')}>
						Admin
					</button>
				</div>
			</header>

			<main className='app-content'>
				<ErrorBoundary>
					{activeTab === 'register' && <FaceRegistrationForm />}
					{activeTab === 'recognize' && <FaceRecognitionLive />}
					{activeTab === 'admin' && <Admin />}
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
