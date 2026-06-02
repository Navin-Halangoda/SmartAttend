import React, { useEffect, useState } from 'react'
import api from '../api'

export default function Dashbord() {
  const [isCapture, setIscapture] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchAttendance = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/attendance');
      setAttendance(response.data?.attendance || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load attendance records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const take_attendence = async () => {
    setMessage('');
    setError('');
    setIscapture(true);
    try {
      const response = await api.patch('/api/members/attendance');
      setMessage(response.data?.message || 'Attendence taken successfully.');
      await fetchAttendance();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to take attendence.');
    } finally {
      setIscapture(false);
    }
  };

  const handleDelete = async (rowId) => {
    const isConfirmed = window.confirm('Delete this attendance record?');
    if (!isConfirmed) {
      return;
    }

    setMessage('');
    setError('');
    setIsDeletingId(rowId);
    try {
      const response = await api.delete(`/api/attendance/${rowId}`);
      setMessage(response.data?.message || 'Attendance deleted successfully.');
      setAttendance((prev) => prev.filter((item) => item.id !== rowId));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete attendance record.');
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div>
      <div className="theme-card overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex">
          <h2 className="text-xl font-semibold">Attendence</h2>
          <button className="theme-btn-primary ml-auto py-2 px-4" onClick={take_attendence} disabled={isCapture}>
            {isCapture ? 'Capturing...' : 'Take Attendence'}
          </button>
        </div>

        {message && <p className="mx-6 mt-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
        {error && <p className="mx-6 mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-background text-text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Member ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-text-muted" colSpan={5}>Loading attendance...</td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-muted" colSpan={5}>No attendance records yet.</td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={record.id} className="border-t border-border">
                    <td className="px-4 py-3">{record.name}</td>
                    <td className="px-4 py-3">{record.member_id}</td>
                    <td className="px-4 py-3">{record.date}</td>
                    <td className="px-4 py-3">{record.time}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          disabled={isDeletingId === record.id}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          {isDeletingId === record.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
