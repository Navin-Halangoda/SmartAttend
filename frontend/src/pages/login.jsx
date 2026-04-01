import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { getAuthToken, setAuthSession } from '../auth'

function Login() {
	const navigate = useNavigate()
	const [formData, setFormData] = useState({
		username: '',
		password: '',
	})
	const [error, setError] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		if (getAuthToken()) {
			navigate('/dashboard')
		}
	}, [navigate])

	const handleChange = (event) => {
		const { name, value } = event.target
		setFormData((prev) => ({ ...prev, [name]: value }))
	}

	const handleSubmit = async (event) => {
		event.preventDefault()
		setError('')
		setIsSubmitting(true)

		try {
			const response = await api.post('/api/login', formData)
			setAuthSession(response.data.token, response.data.user)
			navigate('/dashboard')
		} catch (err) {
			setError(err.response?.data?.message || 'Login failed. Please check your username and password.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
			<section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
				<div className="grid w-full overflow-hidden rounded-3xl border border-white/40 bg-white shadow-2xl md:grid-cols-2">
					<div className="relative hidden overflow-hidden bg-gradient-to-br from-[var(--color-secondary)] via-[var(--color-secondary)] to-[var(--color-primary)] p-8 text-white md:block lg:p-12">
						<div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-white/10" />
						<div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-white/10" />
						<div className="relative z-10 space-y-5">
							<p className="inline-flex rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
								Attendance Portal
							</p>
							<h1 className="text-3xl font-bold leading-tight lg:text-4xl">
								Welcome Back
							</h1>
							<p className="max-w-sm text-sm text-white/85 lg:text-base">
								Sign in to manage attendance records quickly and securely.
							</p>
						</div>
					</div>

					<div className="p-6 sm:p-8 lg:p-12">
						<div className="mx-auto w-full max-w-md space-y-6">
							<header className="space-y-2 md:hidden">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-secondary)]">
									Attendance Portal
								</p>
								<h1 className="text-2xl font-bold">Welcome Back</h1>
							</header>

							<header className="hidden space-y-2 md:block">
								<h2 className="text-3xl font-bold">Login</h2>
								<p className="text-sm text-slate-500">Use your username and password.</p>
							</header>

							<form className="space-y-5" onSubmit={handleSubmit}>
								{error ? (
									<p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
								) : null}

								<div className="space-y-2">
									<label htmlFor="username" className="text-sm font-medium text-slate-700">
										User Name
									</label>
									<input
										id="username"
										name="username"
										type="text"
										autoComplete="username"
										value={formData.username}
										onChange={handleChange}
										placeholder="Enter your username"
										className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20"
										required
									/>
								</div>

								<div className="space-y-2">
									<label htmlFor="password" className="text-sm font-medium text-slate-700">
										Password
									</label>
									<input
										id="password"
										name="password"
										type="password"
										autoComplete="current-password"
										value={formData.password}
										onChange={handleChange}
										placeholder="Enter your password"
										className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20"
										required
									/>
								</div>

								<button
									type="submit"
									disabled={isSubmitting}
									className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-primary)]/30 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
								>
									{isSubmitting ? 'Signing In...' : 'Sign In'}
								</button>
							</form>
						</div>
					</div>
				</div>
			</section>
		</main>
	)
}

export default Login
