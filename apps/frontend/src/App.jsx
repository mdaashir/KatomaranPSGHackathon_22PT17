import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import Navigation from './components/Navigation';
import FaceRegistrationForm from './components/FaceRegistrationForm';
import FaceRecognitionLive from './components/FaceRecognitionLive';
import Admin from './pages/Admin';
import ChatBot from './pages/ChatBot';
import ErrorBoundary from './components/ErrorBoundary';
import { useApp } from './context/AppContext';

function App() {
	const { theme, wsStatus } = useApp();

	// Animation variants for page transitions
	const pageVariants = {
		initial: {
			opacity: 0,
			x: '-5vw',
		},
		in: {
			opacity: 1,
			x: 0,
		},
		out: {
			opacity: 0,
			x: '5vw',
		},
	};

	const pageTransition = {
		type: 'tween',
		ease: 'anticipate',
		duration: 0.3,
	};

	return (
		<div className={`app-container ${theme}`}>
			<Navigation wsStatus={wsStatus} />

			<main className='app-content'>
				<ErrorBoundary>
					<AnimatePresence mode='wait'>
						<Routes>
							<Route path='/' element={<Navigate to='/register' replace />} />
							<Route
								path='/register'
								element={
									<motion.div
										key='register'
										initial='initial'
										animate='in'
										exit='out'
										variants={pageVariants}
										transition={pageTransition}>
										<FaceRegistrationForm />
									</motion.div>
								}
							/>
							<Route
								path='/recognize'
								element={
									<motion.div
										key='recognize'
										initial='initial'
										animate='in'
										exit='out'
										variants={pageVariants}
										transition={pageTransition}>
										<FaceRecognitionLive />
									</motion.div>
								}
							/>
							<Route
								path='/admin'
								element={
									<motion.div
										key='admin'
										initial='initial'
										animate='in'
										exit='out'
										variants={pageVariants}
										transition={pageTransition}>
										<Admin />
									</motion.div>
								}
							/>
							<Route
								path='/chatbot'
								element={
									<motion.div
										key='chatbot'
										initial='initial'
										animate='in'
										exit='out'
										variants={pageVariants}
										transition={pageTransition}>
										<ChatBot />
									</motion.div>
								}
							/>
							<Route path='*' element={<Navigate to='/register' replace />} />
						</Routes>
					</AnimatePresence>
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
				theme={theme}
			/>
		</div>
	);
}

export default App;
