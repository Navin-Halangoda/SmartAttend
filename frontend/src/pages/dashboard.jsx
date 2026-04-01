import { Link, useNavigate } from 'react-router-dom'
import { clearAuthSession, getAuthUser } from '../auth'

function Dashboard() {
	const navigate = useNavigate()
	const user = getAuthUser()

	const handleLogout = () => {
		clearAuthSession()
		navigate('/')
	}

	return (
		<main className="min-h-screen bg-background text-text">
			<nav className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-white">
						D
					</div>
					<div>
						<p className="text-sm font-semibold">Demo Logo</p>
						<p className="text-xs text-slate-500">Attendance Dashboard</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
						{(user?.username || 'U').charAt(0).toUpperCase()}
					</div>
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
							className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
						>
							Demo Button
						</button>
						<Link
							to="/register-admin"
							className="block w-full rounded-xl bg-primary px-4 py-3 text-left text-sm font-semibold text-white shadow-lg shadow-black/20"
						>
							Add Admin
						</Link>
					</div>
				</aside>

				<div className="p-6 sm:p-8">
					<h1 className="text-2xl font-bold">Dashboard</h1>
					<p className="mt-2 text-sm text-slate-600">Welcome, {user?.username || 'Admin'}.</p>
				</div>
			</section>
		</main>
	)
}

export default Dashboard
