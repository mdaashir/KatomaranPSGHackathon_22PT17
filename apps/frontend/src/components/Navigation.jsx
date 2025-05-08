import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../styles/Navigation.css';
import { useApp } from '../context/AppContext';

const Navigation = () => {
	const { theme, toggleTheme, wsStatus } = useApp();
	const [isOpen, setIsOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	// Handle scrolling effect for navigation bar
	useEffect(() => {
		const handleScroll = () => {
			setScrolled(window.scrollY > 10);
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const toggleMenu = () => {
		setIsOpen(!isOpen);
	};

	// Connection status indicator style
	const getStatusColor = () => {
		switch (wsStatus) {
			case 'connected':
				return 'bg-green-500';
			case 'disconnected':
				return 'bg-red-500';
			case 'error':
				return 'bg-yellow-500';
			default:
				return 'bg-gray-500';
		}
	};

	const navLinks = [
		{ path: '/register', label: 'Register' },
		{ path: '/recognize', label: 'Recognize' },
		{ path: '/admin', label: 'Admin' },
		{ path: '/chatbot', label: 'AI Assistant' },
	];

	return (
		<nav className={`navigation ${scrolled ? 'scrolled' : ''} ${theme}`}>
			<div className='nav-container'>
				<div className='logo-section'>
					<NavLink to='/' className='logo'>
						<span className='logo-text'>Katomaran</span>
						<span className='logo-badge'>Face Recognition</span>
					</NavLink>

					{/* Connection status indicator */}
					<div className='connection-status'>
						<span className={`status-dot ${getStatusColor()}`}></span>
						<span className='status-text'>{wsStatus}</span>
					</div>
				</div>

				{/* Desktop navigation */}
				<div className='desktop-nav'>
					<ul className='nav-links'>
						{navLinks.map((link) => (
							<li key={link.path}>
								<NavLink
									to={link.path}
									className={({ isActive }) =>
										isActive ? 'nav-link active' : 'nav-link'
									}>
									{link.label}
								</NavLink>
							</li>
						))}
					</ul>

					<button
						onClick={toggleTheme}
						className='theme-toggle'
						aria-label='Toggle theme'>
						{theme === 'light' ? '🌙' : '☀️'}
					</button>
				</div>

				{/* Mobile menu button */}
				<button
					className='mobile-menu-button'
					onClick={toggleMenu}
					aria-label='Toggle menu'>
					<div className={`hamburger ${isOpen ? 'open' : ''}`}>
						<span></span>
						<span></span>
						<span></span>
					</div>
				</button>
			</div>

			{/* Mobile navigation */}
			{isOpen && (
				<motion.div
					className='mobile-nav'
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -20 }}
					transition={{ duration: 0.2 }}>
					<ul className='mobile-nav-links'>
						{navLinks.map((link) => (
							<li key={link.path}>
								<NavLink
									to={link.path}
									className={({ isActive }) =>
										isActive ? 'mobile-nav-link active' : 'mobile-nav-link'
									}
									onClick={() => setIsOpen(false)}>
									{link.label}
								</NavLink>
							</li>
						))}

						<li className='mobile-theme-toggle'>
							<button onClick={toggleTheme} className='theme-toggle-mobile'>
								{theme === 'light'
									? 'Switch to Dark Mode'
									: 'Switch to Light Mode'}
							</button>
						</li>
					</ul>
				</motion.div>
			)}
		</nav>
	);
};

export default Navigation;
