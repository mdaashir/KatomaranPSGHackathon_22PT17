import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import '../styles/FaceList.css';

const FaceList = () => {
	// State
	const [faces, setFaces] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [faceToDelete, setFaceToDelete] = useState(null);

	// Fetch face data from the API
	const fetchFaces = useCallback(async () => {
		try {
			setLoading(true);
			const response = await axios.get('http://localhost:8000/faces');
			setFaces(response.data.faces);
			setError(null);
		} catch (err) {
			console.error('Error fetching faces:', err);
			setError('Failed to load faces. Please try again later.');
			toast.error('Failed to load face data');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchFaces();
	}, [fetchFaces]);

	// Handle face deletion
	const handleDeleteFace = async (name) => {
		try {
			const response = await axios.delete(
				`http://localhost:8000/faces/${encodeURIComponent(name)}`
			);

			if (response.data.deleted) {
				// Update the local state to remove the deleted face
				setFaces(faces.filter((face) => face !== name));
				toast.success(`Deleted ${name}`);
			}
		} catch (err) {
			console.error(`Error deleting face ${name}:`, err);
			toast.error(`Failed to delete ${name}`);
		} finally {
			// Clear the confirmation dialog
			setShowConfirmation(false);
			setFaceToDelete(null);
		}
	};

	// Filter faces based on search query
	const filteredFaces = faces.filter((face) =>
		face.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Prompt for confirmation before deleting
	const promptDelete = (name) => {
		setFaceToDelete(name);
		setShowConfirmation(true);
	};

	// Render confirmation modal
	const renderConfirmationModal = () => {
		if (!showConfirmation) return null;

		return (
			<div className='confirmation-modal'>
				<div className='confirmation-content'>
					<h3>Confirm Deletion</h3>
					<p>
						Are you sure you want to delete <strong>{faceToDelete}</strong>?
					</p>
					<p>This action cannot be undone.</p>
					<div className='confirmation-actions'>
						<button
							className='btn-cancel'
							onClick={() => setShowConfirmation(false)}>
							Cancel
						</button>
						<button
							className='btn-delete'
							onClick={() => handleDeleteFace(faceToDelete)}>
							Delete
						</button>
					</div>
				</div>
			</div>
		);
	};

	if (loading) {
		return <div className='face-list-loading'>Loading faces...</div>;
	}

	if (error) {
		return <div className='face-list-error'>{error}</div>;
	}

	return (
		<div className='face-list-container'>
			<div className='face-list-header'>
				<h2>Stored Faces</h2>
				<div className='face-count'>Total: {faces.length}</div>
			</div>

			<div className='search-bar'>
				<input
					type='text'
					placeholder='Search by name...'
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</div>

			{filteredFaces.length === 0 ? (
				<p className='no-faces'>
					{faces.length === 0
						? 'No faces stored in the database.'
						: 'No faces match your search.'}
				</p>
			) : (
				<ul className='face-list'>
					{filteredFaces.map((face) => (
						<li className='face-item' key={face}>
							<span className='face-name'>{face}</span>
							<button
								className='delete-button'
								onClick={() => promptDelete(face)}>
								Delete
							</button>
						</li>
					))}
				</ul>
			)}

			{renderConfirmationModal()}
		</div>
	);
};

export default FaceList;
