import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [editMode, setEditMode]   = useState(false);
  const [form, setForm]           = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passForm, setPassForm]   = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [saving, setSaving]       = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const fileRef = useRef();

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/students/me/profile', form);
      await refreshUser();
      toast.success('Profile updated.');
      setEditMode(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) return toast.error('Passwords do not match.');
    if (passForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters.');
    setChangingPass(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      toast.success('Password changed successfully!');
      setPassForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setChangingPass(false);
    }
  };

  const handleResumeUpload = async () => {
    const file = fileRef.current?.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') return toast.error('Only PDF files are accepted.');
    if (file.size > 5 * 1024 * 1024) return toast.error('File must be under 5MB.');
    const fd = new FormData();
    fd.append('resume', file);
    setUploadingResume(true);
    try {
      await api.post('/api/students/me/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      toast.success('Resume uploaded!');
    } catch {
      toast.error('Upload failed.');
    } finally {
      setUploadingResume(false);
    }
  };

  const InfoRow = ({ label, value, highlight }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${highlight || 'text-gray-900'}`}>{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your placement profile</p>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-primary-700">
            {user?.name?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <div className="text-sm text-gray-500">{user?.studentId} · {user?.email}</div>
            <div className="mt-1">
              <span className={`badge ${user?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {user?.isActive ? 'Active' : 'Inactive'}
              </span>
              {user?.placementStatus === 'placed' && (
                <span className="badge bg-violet-100 text-violet-700 ml-2">Placed ✓</span>
              )}
            </div>
          </div>
        </div>

        {/* Academic info */}
        <div className="bg-gray-50 rounded-xl px-4 mb-5">
          <div className="grid grid-cols-2">
            <div className="py-4 pr-4 border-r border-gray-200">
              <div className="text-xs text-gray-500 mb-0.5">CGPA</div>
              <div className={`text-2xl font-bold font-display ${user?.cgpa >= 8 ? 'text-green-600' : user?.cgpa >= 6 ? 'text-amber-600' : 'text-red-500'}`}>
                {user?.cgpa ?? 'N/A'}
              </div>
            </div>
            <div className="py-4 pl-4">
              <div className="text-xs text-gray-500 mb-0.5">AMCAT Score</div>
              <div className="text-2xl font-bold font-display text-gray-900">{user?.amcatScore || 'N/A'}</div>
            </div>
          </div>
        </div>

        <InfoRow label="Department" value={user?.department} />
        <InfoRow label="Batch" value={user?.batch} />
        <InfoRow label="Phone" value={user?.phone} />
        <InfoRow label="Email" value={user?.email} />

        {editMode ? (
          <form onSubmit={handleProfileSave} className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input className="input text-sm" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
              <input className="input text-sm" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" onClick={() => setEditMode(false)} className="btn-secondary text-sm">Cancel</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setEditMode(true)} className="btn-secondary text-sm mt-4 w-full">
            Edit Profile
          </button>
        )}
      </div>

      {/* Resume upload */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Resume</h3>
        <p className="text-sm text-gray-500 mb-4">Upload your latest resume (PDF, max 5MB)</p>
        {user?.resume && (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
            <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
            </svg>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">Resume uploaded</div>
              <div className="text-xs text-gray-400 truncate">{user.resume.split('/').pop()}</div>
            </div>
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
          </div>
        )}
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleResumeUpload}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer" />
          {uploadingResume && <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin flex-shrink-0"/>}
        </div>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Change Password</h3>
        <p className="text-sm text-gray-500 mb-4">Choose a strong password with at least 6 characters</p>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          {[
            { key: 'currentPassword', label: 'Current Password' },
            { key: 'newPassword', label: 'New Password' },
            { key: 'confirmPassword', label: 'Confirm New Password' }
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              <input className="input text-sm" type="password" value={passForm[f.key]}
                onChange={e => setPassForm(p => ({ ...p, [f.key]: e.target.value }))} required />
            </div>
          ))}
          <button type="submit" disabled={changingPass} className="btn-primary text-sm">
            {changingPass ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
