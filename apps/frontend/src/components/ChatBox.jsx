import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import '../styles/ChatBox.css';

const ChatBox = () => {
	// State for messages, input value, and loading state
	const [messages, setMessages] = useState([
		{
			role: 'assistant',
			content:
				"Hello! I'm your AI assistant. How can I help you with information about the Katomaran Hackathon?",
		},
	]);
	const [inputValue, setInputValue] = useState('');
	const [isTyping, setIsTyping] = useState(false);

	// Ref for chat history div to scroll to bottom
	const chatHistoryRef = useRef(null);
	// Ref for EventSource to close it when component unmounts
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

	// Scroll to bottom of chat
	const scrollToBottom = () => {
		if (chatHistoryRef.current) {
			chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
		}
	};

	// Handle form submission
	const handleSubmit = async (e) => {
		e.preventDefault();

		// Don't send empty messages
		if (!inputValue.trim()) return;

		// Add user message to chat
		const userMessage = { role: 'user', content: inputValue };
		setMessages((prev) => [...prev, userMessage]);

		// Clear input and show typing indicator
		setInputValue('');
		setIsTyping(true);

		try {
			// Close any existing connection
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
			}

			// Create a new EventSource connection for server-sent events
			const encodedQuery = encodeURIComponent(userMessage.content);
			const eventSource = new EventSource(
				`http://localhost:5002/chat?query=${encodedQuery}`
			);
			eventSourceRef.current = eventSource;

			// Create a temporary message for streaming content
			const tempMessage = { role: 'assistant', content: '' };
			setMessages((prev) => [...prev, tempMessage]);

			// Handle incoming message chunks
			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					// Check if it's the end of the stream
					if (data.end) {
						eventSource.close();
						setIsTyping(false);
						return;
					}

					// Handle error message
					if (data.error) {
						toast.error(`Error: ${data.error}`);
						eventSource.close();
						setIsTyping(false);
						return;
					}

					// Update the assistant's message as chunks arrive
					if (data.content) {
						setMessages((prev) => {
							const newMessages = [...prev];
							// Find the last assistant message and append to it
							for (let i = newMessages.length - 1; i >= 0; i--) {
								if (newMessages[i].role === 'assistant') {
									newMessages[i].content += data.content;
									break;
								}
							}
							return newMessages;
						});
					}
				} catch (error) {
					console.error('Error parsing SSE message:', error);
				}
			};

			// Handle connection errors
			eventSource.onerror = () => {
				toast.error('Connection to AI assistant lost. Please try again.');
				eventSource.close();
				setIsTyping(false);
			};
		} catch (error) {
			console.error('Error sending message:', error);
			toast.error('Failed to send message. Please try again.');
			setIsTyping(false);
		}
	};

	return (
		<div className='chat-container'>
			<div className='chat-header'>
				<h2>AI Assistant</h2>
				<p>Ask me anything about the Hackathon!</p>
			</div>

			<div className='chat-history' ref={chatHistoryRef}>
				{messages.map((message, index) => (
					<div key={index} className={`chat-message ${message.role}`}>
						<div className='avatar'>
							{message.role === 'assistant' ? '🤖' : '👤'}
						</div>
						<div className='message-content'>{message.content}</div>
					</div>
				))}

				{isTyping && (
					<div className='chat-message assistant'>
						<div className='avatar'>🤖</div>
						<div className='message-content'>
							<div className='typing-indicator'>
								<span></span>
								<span></span>
								<span></span>
							</div>
						</div>
					</div>
				)}
			</div>

			<form className='chat-input-form' onSubmit={handleSubmit}>
				<input
					type='text'
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					placeholder='Type your question here...'
					disabled={isTyping}
					className='chat-input'
				/>
				<button
					type='submit'
					disabled={isTyping || !inputValue.trim()}
					className='chat-submit-button'>
					Send
				</button>
			</form>
		</div>
	);
};

export default ChatBox;
