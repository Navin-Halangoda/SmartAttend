import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/me');
      setUser(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPassword({
      ...password,
      [e.target.name]: e.target.value
    });
    setError('');
    setMessage('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!password.currentPassword || !password.newPassword || !password.confirmPassword) {
      setError('All password fields are required.');
      return;
    }

    setIsUpdating(true);
    setError('');
    setMessage('');

    try {
      const response = await api.put('/api/update-password', {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
        confirmPassword: password.confirmPassword
      });
      setMessage(response.data?.message || 'Password updated successfully.');
      setPassword({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-muted">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-2">
      {/* Profile Information Card */}
      <div className="theme-card p-6">
        <div className="border-b border-border pb-4">
          <h2 className="text-2xl font-bold">Profile Information</h2>
        </div>

        {user ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-text-muted">First Name</label>
              <p className="mt-1 text-base text-text">{user.first_name || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-text-muted">Last Name</label>
              <p className="mt-1 text-base text-text">{user.last_name || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-text-muted">Email</label>
              <p className="mt-1 text-base text-text">{user.email || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-text-muted">Username</label>
              <p className="mt-1 text-base text-text">{user.username || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-text-muted">Account Status</label>
              <p className="mt-1 text-base text-text">
                {user.is_active === 1 || user.is_active === '1' ? (
                  <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                    Active
                  </span>
                ) : (
                  <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
                    Pending Verification
                  </span>
                )}
              </p>
            </div>

            {user.created_at && (
              <div>
                <label className="text-sm font-medium text-text-muted">Member Since</label>
                <p className="mt-1 text-sm text-text">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-6 text-text-muted">No profile data available.</p>
        )}
      </div>

      {/* Change Password Card */}
      <div className="theme-card p-6">
        <div className="border-b border-border pb-4">
          <h2 className="text-2xl font-bold">Change Password</h2>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit}>
          {message && (
            <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label className="text-sm font-medium text-text-muted">Current Password</label>
            <input
              type="password"
              name="currentPassword"
              value={password.currentPassword}
              onChange={handlePasswordChange}
              className="theme-input mt-1"
              placeholder="Enter current password"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-muted">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={password.newPassword}
              onChange={handlePasswordChange}
              className="theme-input mt-1"
              placeholder="Enter new password (minimum 8 characters)"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-muted">Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={password.confirmPassword}
              onChange={handlePasswordChange}
              className="theme-input mt-1"
              placeholder="Confirm new password"
              required
            />
          </div>

          <button
            type="submit"
            className="theme-btn-primary w-full py-3"
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
