import { Navigate, Outlet } from 'react-router-dom'
import { getAuthToken } from '../auth'

function ProtectedRoute() {
	const token = getAuthToken()

	if (!token) {
		return <Navigate to="/" replace />
	}

	return <Outlet />
}

export default ProtectedRoute
