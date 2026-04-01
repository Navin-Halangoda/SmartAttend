export const getAuthToken = () => localStorage.getItem('auth_token')

export const setAuthSession = (token, user) => {
	localStorage.setItem('auth_token', token)
	localStorage.setItem('auth_user', JSON.stringify(user))
}

export const clearAuthSession = () => {
	localStorage.removeItem('auth_token')
	localStorage.removeItem('auth_user')
}

export const getAuthUser = () => {
	const rawUser = localStorage.getItem('auth_user')
	if (!rawUser) {
		return null
	}

	try {
		return JSON.parse(rawUser)
	} catch {
		return null
	}
}
