import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api'

function VerifyOtp() {
	const navigate = useNavigate()
	const location = useLocation()
	const [email, setEmail] = useState(location.state?.email || '')
	const [otp, setOtp] = useState('')
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = async (event) => {
		event.preventDefault()
		setError('')
		setMessage('')
		setIsSubmitting(true)

		try {
			const response = await api.post('/api/verify-otp', { email, otp })
			setMessage(response.data?.message || 'Email verified successfully. Redirecting to login...')
			setTimeout(() => navigate('/'), 1200)
		} catch (err) {
			setError(err.response?.data?.message || 'OTP verification failed.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="min-h-screen bg-background px-4 py-10 text-text">
			<section className="theme-card mx-auto w-full max-w-lg p-6 sm:p-8">
				<h1 className="text-3xl font-bold">Verify Email OTP</h1>
				<p className="mt-2 text-sm text-text-muted">Enter your email and the 6-digit OTP sent to your inbox.</p>

				{error ? <p className="mt-4 rounded-lg bg-accent2-light/30 px-3 py-2 text-sm text-accent2">{error}</p> : null}
				{message ? <p className="mt-4 rounded-lg bg-primary-light/30 px-3 py-2 text-sm text-primary-dark">{message}</p> : null}

				<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
					<div>
						<label htmlFor="email" className="text-sm font-medium text-text-muted">Email</label>
						<input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="theme-input mt-1" required />
					</div>

					<div>
						<label htmlFor="otp" className="text-sm font-medium text-text-muted">OTP Code</label>
						<input
							id="otp"
							name="otp"
							type="text"
							value={otp}
							onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
							className="theme-input mt-1"
							placeholder="6-digit OTP"
							required
						/>
					</div>

					<button type="submit" disabled={isSubmitting} className="theme-btn-primary w-full py-3">
						{isSubmitting ? 'Verifying...' : 'Verify OTP'}
					</button>
				</form>

				<p className="mt-4 text-sm text-text-muted">
					Back to <Link to="/" className="font-semibold text-secondary">Login</Link>
				</p>
			</section>
		</main>
	)
}

export default VerifyOtp