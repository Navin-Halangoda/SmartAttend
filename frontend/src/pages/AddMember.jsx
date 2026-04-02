import React, { useEffect, useState } from 'react';
import api from '../api';

const initialForm = {
  name: '',
  dateOfBirth: '',
  mobile: '',
  memberId: ''
};

export default function AddMember() {
  const [formData, setFormData] = useState(initialForm);
  const [members, setMembers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRowId, setEditingRowId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/members');
      setMembers(response.data?.members || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load members.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setMessage('');
  };

  const resetForm = () => {
    setFormData(initialForm);
    setEditingRowId(null);
  };

  const handleEdit = (member) => {
    setEditingRowId(member.id);
    setFormData({
      name: member.name || '',
      dateOfBirth: member.date_of_birth || '',
      mobile: member.contactNumber || '',
      memberId: member.member_id || ''
    });
    setError('');
    setMessage('');
  };

  const handleDelete = async (rowId) => {
    const isConfirmed = window.confirm('Delete this member?');
    if (!isConfirmed) {
      return;
    }

    try {
      await api.delete(`/api/members/${rowId}`);
      setMessage('Member deleted successfully.');
      if (editingRowId === rowId) {
        resetForm();
      }
      await fetchMembers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete member.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.memberId.trim()) {
      setError('Member ID is required.');
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        name: formData.name.trim(),
        dateOfBirth: formData.dateOfBirth.trim(),
        contactNumber: formData.mobile.trim(),
        member_id: formData.memberId.trim()
      };

      if (editingRowId) {
        const response = await api.put(`/api/members/${editingRowId}`, payload);
        setMessage(response.data?.message || 'Member updated successfully.');
      } else {
        const response = await api.post('/api/members', payload);
        setMessage(response.data?.message || 'Member saved successfully.');
      }

      resetForm();
      await fetchMembers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save member.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(360px,460px)_1fr]">
      <div className="theme-card p-6">
        <div>
          <h1 className="text-3xl font-bold">Add Member</h1>
          <p className="mt-2 text-sm text-text-muted">Fill the details to register a new member.</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
            <label className="text-sm font-medium text-text-muted">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="theme-input mt-1"
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-muted">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="theme-input mt-1"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-muted">Contact Number</label>
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              className="theme-input mt-1"
              placeholder="07XXXXXXXX"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-muted">Member ID</label>
            <input
              type="text"
              name="memberId"
              value={formData.memberId}
              onChange={handleChange}
              className="theme-input mt-1"
              placeholder="Enter member ID"
              required
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="theme-btn-primary w-full py-3" disabled={isSaving}>
              {isSaving ? 'Saving...' : editingRowId ? 'Update Member' : 'Add Member'}
            </button>
            {editingRowId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-border px-4 py-3 text-sm font-semibold text-text-muted hover:bg-background"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="theme-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-xl font-semibold">Members</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-background text-text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Date of Birth</th>
                <th className="px-4 py-3">Contact Number</th>
                <th className="px-4 py-3">Member ID</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-text-muted" colSpan={5}>Loading members...</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-text-muted" colSpan={5}>No members yet.</td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-t border-border">
                    <td className="px-4 py-3">{member.name}</td>
                    <td className="px-4 py-3">{member.date_of_birth}</td>
                    <td className="px-4 py-3">{member.contactNumber}</td>
                    <td className="px-4 py-3">{member.member_id}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(member)}
                          className="rounded-md bg-accent2 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(member.id)}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          Delete
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
  );
}
