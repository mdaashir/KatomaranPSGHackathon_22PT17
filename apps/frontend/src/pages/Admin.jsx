import FaceList from '../components/FaceList';
import { ToastContainer } from 'react-toastify';

const Admin = () => {
	return (
		<div className='admin-container'>
			<header className='admin-header'>
				<h1>Face Recognition Admin</h1>
			</header>

			<main className='admin-content'>
				<FaceList />
			</main>

			<ToastContainer
				position='top-right'
				autoClose={3000}
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
};

export default Admin;
