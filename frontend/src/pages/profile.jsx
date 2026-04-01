import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { clearAuthSession, getAuthUser, setAuthSession } from '../auth'

function Profile() {
	const navigate = useNavigate()
	const user = getAuthUser()

	const [isEditing, setIsEditing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [profileData, setProfileData] = useState({
		first_name: '',
		last_name: '',
		email: '',
	})
	const [formData, setFormData] = useState({
		first_name: '',
		last_name: '',
		email: '',
	})
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const response = await api.get('/api/me')
				setProfileData(response.data)
				setFormData(response.data)
				setLoading(false)
			} catch (err) {
				setError(err.response?.data?.message || 'Failed to load profile.')
				setLoading(false)
			}
		}

		fetchProfile()
	}, [])

	const handleChange = (event) => {
		const { name, value } = event.target
		setFormData((prev) => ({ ...prev, [name]: value }))
	}

	const handleEdit = () => {
		setIsEditing(true)
		setFormData(profileData)
		setError('')
		setMessage('')
	}

	const handleCancel = () => {
		setIsEditing(false)
		setFormData(profileData)
		setError('')
		setMessage('')
	}

	const handleSubmit = async (event) => {
		event.preventDefault()
		setError('')
		setMessage('')
		setIsSubmitting(true)

		try {
			const response = await api.put('/api/me', {
				first_name: formData.first_name,
				last_name: formData.last_name,
				email: formData.email,
			})
			setProfileData(response.data.admin)
			setFormData(response.data.admin)
			setIsEditing(false)
			setMessage(response.data.message || 'Profile updated successfully.')
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to update profile.')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleDeleteAccount = async () => {
		setIsSubmitting(true)

		try {
			await api.delete('/api/me')
			clearAuthSession()
			navigate('/')
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to delete account.')
			setShowDeleteConfirm(false)
			setIsSubmitting(false)
		}
	}

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-background px-4">
				<p className="text-sm text-slate-600">Loading profile...</p>
			</main>
		)
	}

	return (
		<main className="min-h-screen bg-background px-4 py-8">
			<section className="mx-auto w-full max-w-2xl">
				<div className="mb-6 flex items-center justify-between">
					<h1 className="text-3xl font-bold">Profile</h1>
					<button
						type="button"
						onClick={() => navigate('/dashboard')}
						className="text-sm text-slate-600 hover:text-slate-900"
					>
						← Back
					</button>
				</div>

				{error ? <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
				{message ? (
					<p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>
				) : null}

				<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
					{!isEditing ? (
						<div className="space-y-6">
							<div>
								<p className="text-sm font-medium text-slate-600">First Name</p>
								<p className="mt-1 text-lg font-semibold">{profileData.first_name}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-slate-600">Last Name</p>
								<p className="mt-1 text-lg font-semibold">{profileData.last_name}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-slate-600">Email</p>
								<p className="mt-1 text-lg font-semibold">{profileData.email}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-slate-600">Username</p>
								<p className="mt-1 text-lg font-semibold">{user?.username}</p>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row">
								<button
									type="button"
									onClick={handleEdit}
									className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
								>
									Edit Profile
								</button>
								<button
									type="button"
									onClick={() => setShowDeleteConfirm(true)}
									className="rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
								>
									Delete Account
								</button>
							</div>
						</div>
					) : (
						<form className="space-y-4" onSubmit={handleSubmit}>
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
									className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
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
									className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
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
									className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
								/>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row">
								<button
									type="submit"
									disabled={isSubmitting}
									className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:brightness-110"
								>
									{isSubmitting ? 'Saving...' : 'Save Changes'}
								</button>
								<button
									type="button"
									onClick={handleCancel}
									disabled={isSubmitting}
									className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60 hover:bg-slate-50"
								>
									Cancel
								</button>
							</div>
						</form>
					)}
				</div>

				{showDeleteConfirm ? (
					<div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4">
						<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:max-w-md">
							<h2 className="text-xl font-bold">Delete Account</h2>
							<p className="mt-2 text-sm text-slate-600">
								Are you sure you want to delete your account? This action cannot be undone.
							</p>
							<div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
								<button
									type="button"
									onClick={handleDeleteAccount}
									disabled={isSubmitting}
									className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-red-600"
								>
									{isSubmitting ? 'Deleting...' : 'Delete'}
								</button>
								<button
									type="button"
									onClick={() => setShowDeleteConfirm(false)}
									disabled={isSubmitting}
									className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60 hover:bg-slate-50"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				) : null}
			</section>
		</main>
	)
}

export default Profile
