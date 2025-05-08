import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';

const Navigation = () => {
	const { wsStatus, theme, toggleTheme } = useAppContext();

	return (
		<motion.nav
			className='navigation'
			initial={{ y: -50, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.3 }}>
			<div className='nav-container'>
				<div className='nav-logo'>
					<h1>Face Recognition Platform</h1>

					{/* WebSocket Status Indicator */}
					<div
						className={`ws-status ${wsStatus}`}
						title={`WebSocket: ${wsStatus}`}>
						<span className='status-dot'></span>
						<span className='status-text'>{wsStatus}</span>
					</div>
				</div>

				<ul className='nav-links'>
					<li>
						<NavLink
							to='/'
							end
							className={({ isActive }) => (isActive ? 'active' : '')}>
							Register
						</NavLink>
					</li>
					<li>
						<NavLink
							to='/recognition'
							className={({ isActive }) => (isActive ? 'active' : '')}>
							Live Recognition
						</NavLink>
					</li>
					<li>
						<NavLink
							to='/admin'
							className={({ isActive }) => (isActive ? 'active' : '')}>
							Admin
						</NavLink>
					</li>
					<li>
						<NavLink
							to='/ai-assistant'
							className={({ isActive }) => (isActive ? 'active' : '')}>
							AI Assistant
						</NavLink>
					</li>
					<li>
						<button
							onClick={toggleTheme}
							className='theme-toggle'
							aria-label='Toggle dark mode'>
							{theme === 'light' ? '🌙' : '☀️'}
						</button>
					</li>
				</ul>
			</div>
		</motion.nav>
	);
};

export default Navigation;
