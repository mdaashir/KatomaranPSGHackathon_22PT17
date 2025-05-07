import { useState, useEffect, useRef } from 'react';
import '../styles/ChatBox.css';

const ChatBox = () => {
	// States
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef(null);
	const eventSourceRef = useRef(null);

	// Scroll to bottom when messages change
	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	// Clean up event source on unmount
	useEffect(() => {
		return () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
			}
		};
	}, []);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!input.trim()) return;

		const userMessage = input.trim();
		setInput('');

		// Add user message to chat
		setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

		// Add empty assistant message that will be filled as the stream arrives
		setMessages((prev) => [
			...prev,
			{ role: 'assistant', content: '', pending: true },
		]);

		setIsLoading(true);

		try {
			// Close existing connection if any
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
			}

			// Create new EventSource connection
			eventSourceRef.current = new EventSource(
				`http://localhost:8001/chat?query=${encodeURIComponent(userMessage)}`
			);

			// Define what happens when we receive data
			eventSourceRef.current.onmessage = (event) => {
				const data = JSON.parse(event.data);

				// Update the last message (assistant's message)
				setMessages((prevMessages) => {
					const newMessages = [...prevMessages];
					const lastMessageIndex = newMessages.length - 1;

					if (
						lastMessageIndex >= 0 &&
						newMessages[lastMessageIndex].role === 'assistant'
					) {
						newMessages[lastMessageIndex] = {
							...newMessages[lastMessageIndex],
							content:
								(newMessages[lastMessageIndex].content || '') +
								(data.content || ''),
							pending: false,
						};
					}

					return newMessages;
				});
			};

			// Handle errors
			eventSourceRef.current.onerror = (error) => {
				console.error('EventSource error:', error);
				eventSourceRef.current.close();
				setIsLoading(false);

				// Update the last message to show the error
				setMessages((prevMessages) => {
					const newMessages = [...prevMessages];
					const lastMessageIndex = newMessages.length - 1;

					if (
						lastMessageIndex >= 0 &&
						newMessages[lastMessageIndex].role === 'assistant' &&
						newMessages[lastMessageIndex].pending
					) {
						newMessages[lastMessageIndex] = {
							...newMessages[lastMessageIndex],
							content: 'Sorry, there was an error processing your request.',
							pending: false,
							error: true,
						};
					}

					return newMessages;
				});
			};

			// When the stream is done
			eventSourceRef.current.addEventListener('end', () => {
				eventSourceRef.current.close();
				setIsLoading(false);
			});
		} catch (error) {
			console.error('Error sending message:', error);
			setIsLoading(false);

			// Update last message on error
			setMessages((prevMessages) => {
				const newMessages = [...prevMessages];
				const lastIndex = newMessages.length - 1;

				if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
					newMessages[lastIndex] = {
						...newMessages[lastIndex],
						content: 'Sorry, there was an error processing your request.',
						pending: false,
						error: true,
					};
				}

				return newMessages;
			});
		}
	};

	return (
		<div className='chat-container'>
			<div className='chat-header'>
				<h2>AI Assistant</h2>
				<p>Ask me anything about the event!</p>
			</div>

			<div className='chat-messages'>
				{messages.length === 0 ? (
					<div className='empty-chat'>
						<p>No messages yet. Start a conversation!</p>
					</div>
				) : (
					messages.map((message, index) => (
						<div
							key={index}
							className={`message ${
								message.role === 'user' ? 'user-message' : 'assistant-message'
							} ${message.pending ? 'pending' : ''}`}>
							<div className='message-content'>
								{message.content || (message.pending ? 'Thinking...' : '')}
								{message.pending && (
									<span className='typing-indicator'>
										<span className='dot'></span>
										<span className='dot'></span>
										<span className='dot'></span>
									</span>
								)}
							</div>
						</div>
					))
				)}
				<div ref={messagesEndRef} />
			</div>

			<form className='chat-input-form' onSubmit={handleSubmit}>
				<input
					type='text'
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder='Type your message...'
					disabled={isLoading}
				/>
				<button type='submit' disabled={isLoading || !input.trim()}>
					{isLoading ? 'Sending...' : 'Send'}
				</button>
			</form>
		</div>
	);
};

export default ChatBox;
