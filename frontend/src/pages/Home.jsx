import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { clearAuthSession, getAuthUser } from '../auth'
import '../index.css'
import Dashbord from './Dashbord.jsx'
import AddMember from './AddMember.jsx'
import Profile from './profile.jsx'
import Setting from './Setting.jsx'

function Home() {
	const navigate = useNavigate()
	const user = getAuthUser()
	const location = useLocation()

	const handleLogout = () => {
		clearAuthSession()
		navigate('/')
	}

	return (
		<main className="min-h-screen bg-background text-text">
			<nav className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-6">
				<div className="flex items-center gap-3">
					<img src="/logoo.png" alt="Logo" className="h-10 w-10 rounded-full object-cover" />
					<div>
						<p className="text-2xl font-bold text-primary"><span className="text-secondary">Attendance </span>Portal</p>
						
					</div>
				</div>

				<div className="flex items-center gap-3">
					<p className="rounded-full bg-background px-3 py-1 text-sm font-semibold text-text-muted">
						{user?.username || 'User'}
					</p>
					<button
						type="button"
						onClick={handleLogout}
						className="rounded-lg bg-accent2 px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
					>
						Log Out
					</button>
				</div>
			</nav>
			<div className="flex">
				<aside className="h-screen w-64 bg-surface border-r border-border flex flex-col">
					 {/* 🔷 Menu */}
					<nav className="flex-1 px-4 py-6 space-y-2">

						<button className={`sidebar-item ${location.pathname === '/home/dashboard' ? 'active' : ''}`} onClick={() => navigate('/home/dashboard')}>
							{/* Dashboard Icon */}
							<svg xmlns="http://www.w3.org/2000/svg" className="sidebar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
									d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
							</svg>
							Dashboard
						</button>

						<button className={`sidebar-item ${location.pathname === '/home/add-members' ? 'active' : ''}`} onClick={() => navigate('/home/add-members')}>
							{/* Add Members Icon */}
							<svg xmlns="http://www.w3.org/2000/svg" className="sidebar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
									d="M18 9v6m3-3h-6M5 20h14M12 4a4 4 0 110 8 4 4 0 010-8z" />
							</svg>
						 Members
						</button>

						<button className={`sidebar-item ${location.pathname === '/home/profile' ? 'active' : ''}`} onClick={() => navigate('/home/profile')}>
							{/* Profile Icon */}
							<svg xmlns="http://www.w3.org/2000/svg" className="sidebar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
									d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
							</svg>
							Profile
						</button>

						<button className={`sidebar-item ${location.pathname === '/home/settings' ? 'active' : ''}`} onClick={() => navigate('/home/settings')}>
							{/* Settings Icon */}
							<svg xmlns="http://www.w3.org/2000/svg" className="sidebar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
									d="M10.325 4.317a1.724 1.724 0 013.35 0l.17.94a1.724 1.724 0 001.292 1.292l.94.17a1.724 1.724 0 010 3.35l-.94.17a1.724 1.724 0 00-1.292 1.292l-.17.94a1.724 1.724 0 01-3.35 0l-.17-.94a1.724 1.724 0 00-1.292-1.292l-.94-.17a1.724 1.724 0 010-3.35l.94-.17a1.724 1.724 0 001.292-1.292l.17-.94z" />
							</svg>
							Settings
						</button>

					</nav>

				</aside>

				<section className="min-h-[calc(100vh-65px)] w-full p-6 sm:p-8 ">
					<Routes>
						<Route path="/" element={<Dashbord />} />
						<Route path="/add-members" element={<AddMember/>} />
						<Route path="/profile" element={<Profile/>} />
						<Route path="/settings" element={<Setting/>} />
						<Route path="*" element={<Navigate to="/" />} />
					</Routes>
				</section>
			</div>
		</main>
	)
}

export default Home
