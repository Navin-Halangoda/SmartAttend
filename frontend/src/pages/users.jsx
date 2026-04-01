import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function Users() {
	const navigate = useNavigate()
	const [users, setUsers] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')
	const [deleteConfirm, setDeleteConfirm] = useState(null)
	const [isDeleting, setIsDeleting] = useState(false)

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const response = await api.get('/api/admins')
				setUsers(response.data)
				setLoading(false)
			} catch (err) {
				setError(err.response?.data?.message || 'Failed to load users.')
				setLoading(false)
			}
		}

		fetchUsers()
	}, [])

	const handleDeleteUser = async (userId, userName) => {
		setIsDeleting(true)
		try {
			await api.delete(`/api/admins/${userId}`)
			setUsers(users.filter((u) => u.id !== userId))
			setMessage(`User "${userName}" deleted successfully.`)
			setDeleteConfirm(null)
		} catch (err) {
			setError(err.response?.data?.message || 'Failed to delete user.')
		} finally {
			setIsDeleting(false)
		}
	}

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-background px-4">
				<p className="text-sm text-slate-600">Loading users...</p>
			</main>
		)
	}

	return (
		<main className="min-h-screen bg-background px-4 py-8">
			<section className="mx-auto w-full max-w-4xl">
				<div className="mb-6 flex items-center justify-between">
					<h1 className="text-3xl font-bold">All Users</h1>
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

				{users.length === 0 ? (
					<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
						<p className="text-slate-600">No users found.</p>
					</div>
				) : (
					<div className="rounded-2xl border border-slate-200 bg-white shadow-lg">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="border-b border-slate-200 bg-slate-50">
									<tr>
										<th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
										<th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
										<th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Username</th>
										<th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Action</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200">
									{users.map((user) => (
										<tr key={user.id} className="hover:bg-slate-50">
											<td className="px-6 py-4 text-sm">
												<span className="font-medium">{user.first_name} {user.last_name}</span>
											</td>
											<td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
											<td className="px-6 py-4 text-sm text-slate-600">{user.username}</td>
											<td className="px-6 py-4 text-sm">
												<button
													type="button"
													onClick={() => setDeleteConfirm(user)}
													className="rounded-lg border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
												>
													Delete
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</section>

			{deleteConfirm ? (
				<div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4">
					<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:max-w-md">
						<h2 className="text-xl font-bold">Delete User</h2>
						<p className="mt-2 text-sm text-slate-600">
							Are you sure you want to delete <strong>{deleteConfirm.first_name} {deleteConfirm.last_name}</strong>?
							This action cannot be undone.
						</p>
						<div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
							<button
								type="button"
								onClick={() =>
									handleDeleteUser(deleteConfirm.id, `${deleteConfirm.first_name} ${deleteConfirm.last_name}`)
								}
								disabled={isDeleting}
								className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-red-600"
							>
								{isDeleting ? 'Deleting...' : 'Delete'}
							</button>
							<button
								type="button"
								onClick={() => setDeleteConfirm(null)}
								disabled={isDeleting}
								className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60 hover:bg-slate-50"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			) : null}
		</main>
	)
}

export default Users
