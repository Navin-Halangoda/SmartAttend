import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { clearAuthSession, getAuthUser } from '../auth'
import Users from './users'
import Profile from './profile'
import RegisterAdmin from './register_admin'

function Dashboard() {
	const navigate = useNavigate()
	const user = getAuthUser()
	const [profileData, setProfileData] = useState(null)
	const [userCount, setUserCount] = useState(0)
	const [loading, setLoading] = useState(true)
	const [activeView, setActiveView] = useState('dashboard')

	useEffect(() => {
		const fetchData = async () => {
			try {
				const profileRes = await api.get('/api/me')
				setProfileData(profileRes.data)

				const usersRes = await api.get('/api/admins')
				setUserCount(usersRes.data.length || 0)
			} catch (err) {
				console.error('Failed to fetch dashboard data:', err)
			} finally {
				setLoading(false)
			}
		}

		fetchData()
	}, [])

	const handleLogout = () => {
		clearAuthSession()
		navigate('/')
	}

	return (
		<main className="min-h-screen bg-background text-text">
			<nav className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
				<div className="flex items-center gap-3">
					<img src="/logoo.png" alt="Logo" className="h-10 w-10 rounded-full object-cover" />
					<div>
						<p className="text-2xl font-bold text-primary"><span className='text-secondary'>
Attendance </span>Portal</p>
						
					</div>
				</div>

				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => setActiveView('profile')}
						className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-300"
						title="Profile"
					>
						{(user?.username || 'U').charAt(0).toUpperCase()}
					</button>
					<button
						type="button"
						onClick={handleLogout}
						className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600"
					>
						Log Out
					</button>
				</div>
			</nav>

			<section className="grid min-h-[calc(100vh-65px)] grid-cols-1 md:grid-cols-[260px_1fr]">
				<aside className="border-r border-slate-200 bg-white p-4">
					<p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Menu</p>
					<div className="space-y-3">
						<button
							type="button"
							onClick={() => setActiveView('dashboard')}
							className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
								activeView === 'dashboard'
									? 'bg-primary text-white shadow-lg'
									: 'border border-slate-200 text-slate-700 hover:bg-slate-50'
							}`}
						>
							Dashboard
						</button>
						<button
							type="button"
							onClick={() => setActiveView('users')}
							className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
								activeView === 'users'
									? 'bg-primary text-white shadow-lg'
									: 'border border-slate-200 text-slate-700 hover:bg-slate-50'
							}`}
						>
							Admins Mangage
						</button>
						<button
							type="button"
							onClick={() => setActiveView('register')}
							className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
								activeView === 'register'
									? 'bg-primary text-white shadow-lg'
									: 'border border-slate-200 text-slate-700 hover:bg-slate-50'
							}`}
						>
							Add Admin
						</button>
						<button
							type="button"
							onClick={() => setActiveView('profile')}
							className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
								activeView === 'profile'
									? 'bg-primary text-white shadow-lg'
									: 'border border-slate-200 text-slate-700 hover:bg-slate-50'
							}`}
						>
							My Profile
						</button>
					</div>
				</aside>

				<div className="space-y-6 overflow-y-auto p-6 sm:p-8">
					{activeView === 'dashboard' && (
						<>
							<header>
								<h1 className="text-3xl font-bold">Dashboard</h1>
								<p className="mt-2 text-sm text-slate-600">Welcome, {user?.username || 'Admin'}.</p>
							</header>

							{!loading && (
								<div className="grid gap-6 md:grid-cols-2">
									{/* Profile Card */}
									<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
										<h2 className="text-lg font-bold">Your Profile</h2>
										<div className="mt-4 space-y-3">
											<div>
												<p className="text-xs font-semibold uppercase text-slate-500">First Name</p>
												<p className="mt-1 text-base font-semibold">{profileData?.first_name}</p>
											</div>
											<div>
												<p className="text-xs font-semibold uppercase text-slate-500">Last Name</p>
												<p className="mt-1 text-base font-semibold">{profileData?.last_name}</p>
											</div>
											<div>
												<p className="text-xs font-semibold uppercase text-slate-500">Email</p>
												<p className="mt-1 text-base font-semibold text-slate-700">{profileData?.email}</p>
											</div>
											<div>
												<p className="text-xs font-semibold uppercase text-slate-500">Username</p>
												<p className="mt-1 text-base font-semibold">{profileData?.username}</p>
											</div>
											<button
												type="button"
												onClick={() => setActiveView('profile')}
												className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
											>
												Edit Profile
											</button>
										</div>
									</div>

									{/* Stats Card */}
									<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
										<h2 className="text-lg font-bold">System Stats</h2>
										<div className="mt-4 space-y-4">
											<div className="rounded-xl bg-slate-50 p-4">
												<p className="text-xs font-semibold uppercase text-slate-500">Total Admins</p>
												<p className="mt-2 text-3xl font-bold text-primary">{userCount}</p>
											</div>
											<button
												type="button"
												onClick={() => setActiveView('users')}
												className="block w-full rounded-xl bg-secondary px-4 py-2 text-center text-sm font-semibold text-white hover:brightness-110"
											>
												View All Users
											</button>
											<button
												type="button"
												onClick={() => setActiveView('register')}
												className="block w-full rounded-xl border border-primary px-4 py-2 text-center text-sm font-semibold text-primary hover:bg-slate-50"
											>
												Add New Admin
											</button>
										</div>
									</div>
								</div>
							)}

							{loading && (
								<div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
									<p className="text-sm text-slate-600">Loading dashboard data...</p>
								</div>
							)}
						</>
					)}

					{activeView === 'users' && <Users />}
					{activeView === 'profile' && <Profile />}
					{activeView === 'register' && <RegisterAdmin />}
				</div>
			</section>
		</main>
	)
}

export default Dashboard
