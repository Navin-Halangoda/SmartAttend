import { useState } from 'react'
import api from '../api'

function RegisterAdmin() {
	const [formData, setFormData] = useState({
		first_name: '',
		last_name: '',
		email: '',
	})
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleChange = (event) => {
		const { name, value } = event.target
		setFormData((prev) => ({ ...prev, [name]: value }))
	}

	const handleSubmit = async (event) => {
		event.preventDefault()
		setMessage('')
		setError('')
		setIsSubmitting(true)

		try {
			const response = await api.post('/api/register_admin', formData)
			setMessage(response.data.message || 'Admin registered and setup email sent.')
			setFormData({ first_name: '', last_name: '', email: '' })
		} catch (err) {
			setError(err.response?.data?.message || 'Server error. Please try again.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="min-h-screen bg-[var(--color-background)] px-4 py-10 text-[var(--color-text)]">
			<section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
				<h1 className="text-2xl font-bold">Register Admin</h1>
				<p className="mt-2 text-sm text-slate-500">
					Enter first name, last name and email. A setup link with token will be sent to the email.
				</p>

				{error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
				{message ? (
					<p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
				) : null}

				<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
					<div>
						<label htmlFor="first_name" className="text-sm font-medium text-slate-700">
							First Name
						</label>
						<input
							id="first_name"
							name="first_name"
							type="text"
							value={formData.first_name}
							onChange={handleChange}
							required
							className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20"
						/>
					</div>

					<div>
						<label htmlFor="last_name" className="text-sm font-medium text-slate-700">
							Last Name
						</label>
						<input
							id="last_name"
							name="last_name"
							type="text"
							value={formData.last_name}
							onChange={handleChange}
							required
							className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20"
						/>
					</div>

					<div>
						<label htmlFor="email" className="text-sm font-medium text-slate-700">
							Email
						</label>
						<input
							id="email"
							name="email"
							type="email"
							value={formData.email}
							onChange={handleChange}
							required
							className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[var(--color-secondary)] focus:ring-2 focus:ring-[var(--color-secondary)]/20"
						/>
					</div>

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-primary)]/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSubmitting ? 'Registering...' : 'Register Admin'}
					</button>
				</form>
			</section>
		</main>
	)
}

export default RegisterAdmin
