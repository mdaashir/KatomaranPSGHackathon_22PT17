import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { toast } from 'react-toastify';
import { faceApi } from '../services/api';
import '../styles/FaceRegistrationForm.css';

const FaceRegistrationForm = () => {
	const [name, setName] = useState('');
	const [capturedImage, setCapturedImage] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const webcamRef = useRef(null);

	// Webcam configuration
	const videoConstraints = {
		width: 480,
		height: 480,
		facingMode: 'user',
	};

	// Function to capture photo from webcam
	const capturePhoto = useCallback(() => {
		const imageSrc = webcamRef.current.getScreenshot();
		if (imageSrc) {
			setCapturedImage(imageSrc);
			setError('');
			toast.info('Photo captured successfully!');
		} else {
			setError(
				'Could not capture photo. Please make sure your webcam is working.'
			);
			toast.error('Could not capture photo. Please check your webcam.');
		}
	}, [webcamRef]);

	// Function to reset the captured photo
	const resetPhoto = () => {
		setCapturedImage(null);
	};

	// Function to handle registration form submission
	const handleRegister = async (e) => {
		e.preventDefault();

		if (!name.trim()) {
			setError('Name is required');
			toast.error('Please enter your name');
			return;
		}

		if (!capturedImage) {
			setError('Please capture your face before registering');
			toast.error('Please capture your face before registering');
			return;
		}

		try {
			setIsLoading(true);
			setError('');

			// Convert base64 to blob for API upload
			const base64Data = capturedImage.split(',')[1];

			// Data to be sent to the API
			const formData = {
				name: name,
				faceImage: base64Data,
			};

			// API call to register the face using our service
			const response = await faceApi.register(formData);

			if (response.status === 200 || response.status === 201) {
				toast.success('Registration successful!');
				setSuccessMessage('Face registration completed successfully!');
				// Reset form after successful registration
				setName('');
				setCapturedImage(null);
			}
		} catch (err) {
			const errorMessage =
				err.response?.data?.message || 'An error occurred during registration';
			setError(errorMessage);
			toast.error(errorMessage);
			console.error('Registration error:', err);
		} finally {
			setIsLoading(false);
		}
	};

	// Check if form is valid for submission
	const isFormValid = name.trim() && capturedImage && !isLoading;

	return (
		<div className='face-registration-container'>
			<h2 className='form-title'>Face Registration</h2>

			{error && <div className='error-message'>{error}</div>}
			{successMessage && (
				<div className='success-message'>{successMessage}</div>
			)}

			<div className='webcam-section'>
				{!capturedImage ? (
					<>
						<Webcam
							audio={false}
							ref={webcamRef}
							screenshotFormat='image/jpeg'
							videoConstraints={videoConstraints}
							className='webcam'
						/>
						<button
							type='button'
							onClick={capturePhoto}
							className='capture-button'>
							Capture Photo
						</button>
					</>
				) : (
					<>
						<div className='captured-image-container'>
							<img
								src={capturedImage}
								alt='Captured'
								className='captured-image'
							/>
						</div>
						<button type='button' onClick={resetPhoto} className='reset-button'>
							Retake Photo
						</button>
					</>
				)}
			</div>

			<form onSubmit={handleRegister} className='registration-form'>
				<div className='form-group'>
					<label htmlFor='name' className='form-label'>
						Full Name <span className='required'>*</span>
					</label>
					<input
						type='text'
						id='name'
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder='Enter your full name'
						className='form-input'
						required
					/>
				</div>

				<button
					type='submit'
					disabled={!isFormValid}
					className={`register-button ${!isFormValid ? 'disabled' : ''}`}>
					{isLoading ? 'Registering...' : 'Register'}
				</button>
			</form>
		</div>
	);
};

export default FaceRegistrationForm;
