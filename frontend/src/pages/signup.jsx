import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

function Signup() {
	const navigate = useNavigate()
	const [formData, setFormData] = useState({
		first_name: '',
		last_name: '',
		email: '',
		username: '',
		password: '',
		confirm_password: '',
	})
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

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
			const response = await api.post('/api/signup', formData)
			setMessage(response.data?.message || 'Signup successful. OTP sent to your email.')
			navigate('/verify-otp', { state: { email: formData.email } })
		} catch (err) {
			setError(err.response?.data?.message || 'Signup failed. Please try again.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<main className="min-h-screen bg-background text-text">
			<section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid w-full overflow-hidden rounded-3xl border border-white/40 bg-white shadow-2xl md:grid-cols-2 ">
					<div className="relative hidden overflow-hidden bg-linear-to-br from-secondary via-secondary to-primary p-8 text-white md:block lg:p-12">
						<div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-white/10" />
						<div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-white/10" />
						<div className="relative z-10 space-y-5">
							<p className="inline-flex rounded-full border border-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
								Attendance Portal
							</p>
							<h1 className="text-3xl font-bold leading-tight lg:text-4xl">
								Welcome to the Attendance Portal
							</h1>
							<p className="max-w-sm text-sm text-white/85 lg:text-base">
								Sign up to manage attendance records quickly and securely.
							</p>
						</div>
					</div>
                    <div className="p-6 sm:p-8 lg:p-12">  
                        <div className='mx-auto w-full max-w-md space-y-6'>
                            <h1 className="text-3xl font-bold">Create Account</h1>
                            <p className="mt-2 text-sm text-text-muted">Register and verify your email with OTP.</p>

                            {error ? <p className="mt-4 rounded-lg bg-accent2-light/30 px-3 py-2 text-sm text-accent2">{error}</p> : null}
                            {message ? <p className="mt-4 rounded-lg bg-primary-light/30 px-3 py-2 text-sm text-primary-dark">{message}</p> : null}

                            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="first_name" className="text-sm font-medium text-text-muted">First Name</label>
                                        <input id="first_name" name="first_name" type="text" value={formData.first_name} onChange={handleChange} className="theme-input mt-1" required />
                                    </div>
                                    <div>
                                        <label htmlFor="last_name" className="text-sm font-medium text-text-muted">Last Name</label>
                                        <input id="last_name" name="last_name" type="text" value={formData.last_name} onChange={handleChange} className="theme-input mt-1" required />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="email" className="text-sm font-medium text-text-muted">Email</label>
                                    <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="theme-input mt-1" required />
                                </div>

                                <div>
                                    <label htmlFor="username" className="text-sm font-medium text-text-muted">Username</label>
                                    <input id="username" name="username" type="text" value={formData.username} onChange={handleChange} className="theme-input mt-1" required />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="password" className="text-sm font-medium text-text-muted">Password</label>
                                        <input id="password" name="password" type="password" value={formData.password} onChange={handleChange} className="theme-input mt-1" required />
                                    </div>
                                    <div>
                                        <label htmlFor="confirm_password" className="text-sm font-medium text-text-muted">Confirm Password</label>
                                        <input id="confirm_password" name="confirm_password" type="password" value={formData.confirm_password} onChange={handleChange} className="theme-input mt-1" required />
                                    </div>
                                </div>

                                <button type="submit" disabled={isSubmitting} className="theme-btn-primary w-full py-3">
                                    {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                                </button>
                            </form>

                            <p className="mt-4 text-sm text-text-muted">
                                Already have an account? <Link to="/" className="font-semibold text-secondary">Login</Link>
                            </p>
                        </div>
                    </div>
                </div>
			</section>
		</main>
	)
}

export default Signup