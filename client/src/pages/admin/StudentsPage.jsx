import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const FIELDS = [
  { key: 'name', label: 'Name' }, { key: 'studentId', label: 'Student ID' },
  { key: 'email', label: 'Email' }, { key: 'department', label: 'Department' },
  { key: 'cgpa', label: 'CGPA', type: 'number' }, { key: 'amcatScore', label: 'AMCAT', type: 'number' },
  { key: 'batch', label: 'Batch' }, { key: 'phone', label: 'Phone' },
  { key: 'dob', label: 'DOB (DDMMYYYY)' }
];

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

export default function StudentsPage() {
  const [students, setStudents]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null);  // 'create' | 'edit' | 'bulk-create' | 'bulk-update'
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState({});
  const [bulkResult, setBulkResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const LIMIT = 20;

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students', { params: { page, limit: LIMIT, search } });
      setStudents(res.data.students);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load students.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStudents(); }, [page, search]);

  const openCreate = () => { setForm({}); setModal('create'); };
  const openEdit = (s) => { setSelected(s); setForm({ ...s }); setModal('edit'); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (modal === 'create') {
        const res = await api.post('/students', form);
        toast.success(`Student created. Temp password: ${res.data.temporaryPassword}`);
      } else {
        await api.put(`/students/${selected._id}`, form);
        toast.success('Student updated.');
      }
      setModal(null);
      fetchStudents();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving student.'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success('Student deleted.');
      fetchStudents();
    } catch { toast.error('Failed to delete.'); }
  };

  const handleResetPassword = async (id, name) => {
    if (!window.confirm(`Reset password for ${name}?`)) return;
    try {
      const res = await api.post(`/students/${id}/reset-password`);
      toast.success(`Password reset. New temp password: ${res.data.temporaryPassword}`);
    } catch { toast.error('Failed to reset password.'); }
  };

  const handleBulkUpload = async (mode) => {
    const file = fileRef.current.files[0];
    if (!file) return toast.error('Please select a file.');
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    setBulkResult(null);
    try {
      const res = await api.post(`/students/bulk/${mode}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBulkResult(res.data);
      toast.success(`Done! ${mode === 'create' ? res.data.summary.created : res.data.summary.updated} records processed.`);
      fetchStudents();
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed.'); }
    finally { setUploading(false); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{total} students registered</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setBulkResult(null); setModal('bulk-update'); }} className="btn-secondary text-sm">
            Bulk Update
          </button>
          <button onClick={() => { setBulkResult(null); setModal('bulk-create'); }} className="btn-secondary text-sm">
            Bulk Import
          </button>
          <button onClick={openCreate} className="btn-primary text-sm">+ Add Student</button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input className="input pl-9 text-sm" placeholder="Search by name, ID or email…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Student ID', 'Name', 'Dept', 'CGPA', 'AMCAT', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center"><div className="inline-block w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin"/></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-gray-400">No students found.</td></tr>
              ) : students.map(s => (
                <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.studentId}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.department || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${s.cgpa >= 8 ? 'text-green-600' : s.cgpa >= 6 ? 'text-amber-600' : 'text-red-500'}`}>
                      {s.cgpa ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.amcatScore ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleResetPassword(s._id, s.name)} className="p-1.5 hover:bg-amber-50 rounded text-amber-600" title="Reset password">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(s._id, s.name)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Prev</button>
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Add New Student' : 'Edit Student'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(f => (
                <div key={f.key} className={f.key === 'email' || f.key === 'name' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    className="input text-sm"
                    type={f.type || 'text'}
                    step={f.type === 'number' ? '0.01' : undefined}
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    disabled={modal === 'edit' && f.key === 'studentId'}
                    required={['studentId','name','email', 'dob'].includes(f.key)}
                  />
                </div>
              ))}
              {modal === 'edit' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Active</label>
                  <select className="input text-sm" value={form.isActive ? 'true' : 'false'}
                    onChange={e => setForm(p => ({ ...p, isActive: e.target.value === 'true' }))}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">{modal === 'create' ? 'Create Student' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk Create / Update Modal */}
      {(modal === 'bulk-create' || modal === 'bulk-update') && (
        <Modal title={modal === 'bulk-create' ? 'Bulk Import Students' : 'Bulk Update Students'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-800">Required CSV/Excel columns:</p>
              {modal === 'bulk-create'
                ? <p>Student ID, Name, Email, CGPA, AMCAT Score, Department, Batch, DOB</p>
                : <p>Student ID (required), CGPA, AMCAT Score, Department, Batch, Email (optional)</p>
              }
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Upload File (.csv, .xlsx, .xls)</label>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls"
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
            </div>

            {bulkResult && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-gray-900">{bulkResult.summary.total}</div>
                    <div className="text-xs text-gray-500">Total</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-green-700">{bulkResult.summary.created ?? bulkResult.summary.updated}</div>
                    <div className="text-xs text-green-600">{modal === 'bulk-create' ? 'Created' : 'Updated'}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-lg font-bold text-red-600">{bulkResult.summary.failed}</div>
                    <div className="text-xs text-red-500">Failed</div>
                  </div>
                </div>
                {bulkResult.errors.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {bulkResult.errors.map((e, i) => (
                      <div key={i} className="text-xs text-red-700">{e.studentId || `Row ${e.row}`}: {e.reason}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary">Close</button>
              <button onClick={() => handleBulkUpload(modal === 'bulk-create' ? 'create' : 'update')} disabled={uploading} className="btn-primary">
                {uploading ? 'Processing…' : modal === 'bulk-create' ? 'Import Students' : 'Update Students'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
