import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { useNavigate } from "react-router-dom";

function SetupAccount() {
	const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', [])

	const [loading, setLoading] = useState(true)
	const [adminInfo, setAdminInfo] = useState({ first_name: '', last_name: '', email: '' })
	const [formData, setFormData] = useState({ username: '', password: '', confirm_password: '' })
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const navigate = useNavigate()

	useEffect(() => {
		const fetchAdmin = async () => {
			if (!token) {
				setError('Token is missing from the URL.')
				setLoading(false)
				return
			}

			try {
				const response = await api.get('/api/admin/setup-account', {
					params: { token },
				})
				setAdminInfo(response.data)
				
			} catch (err) {
				setError(err.response?.data?.message || 'Could not verify setup link. Please try again.')
			} finally {
				setLoading(false)
			}
		}

		fetchAdmin()
	}, [token])

	const handleChange = (event) => {
		const { name, value } = event.target
		setFormData((prev) => ({ ...prev, [name]: value }))
	}

	const handleSubmit = async (event) => {
		event.preventDefault()
		setError('')
		setMessage('')
		setIsSubmitting(true)

		try {
			const response = await api.post('/api/admin/setup-account', {
					token,
					username: formData.username,
					password: formData.password,
					confirm_password: formData.confirm_password,
			})

			setMessage(response.data.message || 'Account created successfully.')
			setFormData({ username: '', password: '', confirm_password: '' })
			navigate('/')
		} catch (err) {
			setError(err.response?.data?.message || 'Server error. Please try again later.')
		} finally {
			setIsSubmitting(false)
		}
	}

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-background px-4">
				<p className="text-sm text-slate-600">Validating setup link...</p>
			</main>
		)
	}

	return (
		<main className="min-h-screen bg-background px-4 py-10 text-text">
			<section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
				<h1 className="text-2xl font-bold">Set Up Admin Account</h1>
				<p className="mt-2 text-sm text-slate-500">
					Create your username and password to complete admin account setup.
				</p>

				{error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
				{message ? (
					<p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
				) : null}

				<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<label htmlFor="first_name" className="text-sm font-medium text-slate-700">
								First Name
							</label>
							<input
								id="first_name"
								type="text"
								value={adminInfo.first_name}
								disabled
								className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm"
							/>
						</div>
						<div>
							<label htmlFor="last_name" className="text-sm font-medium text-slate-700">
								Last Name
							</label>
							<input
								id="last_name"
								type="text"
								value={adminInfo.last_name}
								disabled
								className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm"
							/>
						</div>
					</div>

					<div>
						<label htmlFor="email" className="text-sm font-medium text-slate-700">
							Email
						</label>
						<input
							id="email"
							type="email"
							value={adminInfo.email}
							disabled
							className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm"
						/>
					</div>

					<div>
						<label htmlFor="username" className="text-sm font-medium text-slate-700">
							Username
						</label>
						<input
							id="username"
							name="username"
							type="text"
							value={formData.username}
							onChange={handleChange}
							required
							className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
						/>
					</div>

					<div>
						<label htmlFor="password" className="text-sm font-medium text-slate-700">
							Password
						</label>
						<input
							id="password"
							name="password"
							type="password"
							value={formData.password}
							onChange={handleChange}
							required
							className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
						/>
					</div>

					<div>
						<label htmlFor="confirm_password" className="text-sm font-medium text-slate-700">
							Confirm Password
						</label>
						<input
							id="confirm_password"
							name="confirm_password"
							type="password"
							value={formData.confirm_password}
							onChange={handleChange}
							required
							className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting || !!error}
						className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSubmitting ? 'Creating account...' : 'Create Account'}
					</button>
				</form>
			</section>
		</main>
	)
}

export default SetupAccount
