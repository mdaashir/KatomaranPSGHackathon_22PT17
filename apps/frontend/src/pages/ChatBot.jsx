import React from 'react';
import ChatBox from '../components/ChatBox';
import { ToastContainer } from 'react-toastify';

const ChatBot = () => {
	return (
		<div className='chatbot-page'>
			<header className='chatbot-header'>
				<h1>Katomaran AI Assistant</h1>
				<p>Get instant answers to your hackathon questions</p>
			</header>

			<main className='chatbot-content'>
				<ChatBox />
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

export default ChatBot;
