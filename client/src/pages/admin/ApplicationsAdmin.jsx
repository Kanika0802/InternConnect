import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);
export default function ApplicationsAdmin() {
  const [apps, setApps]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [filter, setFilter] = useState('');
  const [opportunityFilter, setOpportunityFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [oppsList, setOppsList] = useState([]);
  const [bulkForm, setBulkForm] = useState({ opportunityId: '', isFinalSelection: false, round: '', file: null });
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const LIMIT = 25;

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/applications', { params: { page, limit: LIMIT, status: filter || undefined, opportunityId: opportunityFilter || undefined } });
      setApps(res.data.applications);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  };

  const fetchOpps = async () => {
    try {
      const res = await api.get('/opportunities', { params: { limit: 100 } });
      setOppsList(res.data.opportunities);
    } catch {}
  };

  useEffect(() => { fetch(); fetchOpps(); }, [page, filter, opportunityFilter]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/applications/${id}/status`, { status });
      toast.success(`Status updated to ${status}.`);
      fetch();
    } catch { toast.error('Failed to update status.'); }
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    if (!bulkForm.file || !bulkForm.opportunityId) return toast.error('Please select opportunity and file.');
    setBulkUploading(true);
    const fd = new FormData();
    fd.append('opportunityId', bulkForm.opportunityId);
    fd.append('file', bulkForm.file);

    try {
      const res = await api.post('/applications/bulk-update-results', fd);
      setBulkResult(res.data);
      fetch();
      bulkForm.file = null;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error occurred.');
    }
    setBulkUploading(false);
  };

  const statusColors = {
    applied:'bg-blue-100 text-blue-700', shortlisted:'bg-green-100 text-green-700',
    rejected:'bg-red-100 text-red-700', selected:'bg-purple-100 text-purple-700', withdrawn:'bg-gray-100 text-gray-600'
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total applications</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => { setBulkModal(true); setBulkResult(null); }} className="btn-primary">
            Bulk Update Results
          </button>
          
          <select className="input text-sm w-44" value={opportunityFilter} onChange={e => { setOpportunityFilter(e.target.value); setPage(1); }}>
            <option value="">All Companies</option>
            {oppsList.map(o => (
              <option key={o._id} value={o._id}>{o.companyName} ({o.role})</option>
            ))}
          </select>

          <select className="input text-sm w-44" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {['applied','shortlisted','rejected','selected','withdrawn'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Student', 'Company / Role', 'CGPA', 'Applied On', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><div className="inline-block w-6 h-6 border-3 border-primary-600 border-t-transparent rounded-full animate-spin"/></td></tr>
              ) : apps.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-gray-400">No applications found.</td></tr>
              ) : apps.map(a => (
                <tr key={a._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.student?.name}</div>
                    <div className="text-xs text-gray-400">{a.student?.studentId} · {a.student?.department}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{a.opportunity?.companyName}</div>
                    <div className="text-xs text-gray-500">{a.opportunity?.role}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{a.cgpaAtApplication ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColors[a.status]}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {a.status !== 'shortlisted' && (
                        <button onClick={() => updateStatus(a._id, 'shortlisted')} className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 hover:shadow-sm transition-all border border-emerald-200">
                          Shortlist
                        </button>
                      )}
                      {a.status !== 'selected' && (
                        <button onClick={() => updateStatus(a._id, 'selected')} className="px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 hover:shadow-sm transition-all border border-purple-200">
                          Select
                        </button>
                      )}
                      {a.status !== 'rejected' && (
                        <button onClick={() => updateStatus(a._id, 'rejected')} className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 rounded-md hover:bg-rose-100 hover:shadow-sm transition-all border border-rose-200">
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Prev</button>
              <button disabled={page===pages} onClick={() => setPage(p=>p+1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {bulkModal && (
        <Modal title="Bulk Update Selection Results" onClose={() => setBulkModal(false)}>
          {bulkResult ? (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl shadow-sm">
                <h4 className="font-bold text-emerald-800 text-lg">Results Uploaded Successfully</h4>
                <div className="mt-3 space-y-1">
                  <div className="text-sm font-medium text-emerald-800 flex justify-between bg-white/50 p-2 rounded-lg">
                    <span>Total Applications Processed:</span>
                    <span className="font-bold">{bulkResult.summary.total}</span>
                  </div>
                  <div className="text-sm font-medium text-emerald-800 flex justify-between bg-white/50 p-2 rounded-lg">
                    <span>Selected:</span>
                    <span className="font-bold text-emerald-600">{bulkResult.summary.selected}</span>
                  </div>
                  <div className="text-sm font-medium text-emerald-800 flex justify-between bg-white/50 p-2 rounded-lg">
                    <span>Rejected:</span>
                    <span className="font-bold text-rose-600">{bulkResult.summary.rejected}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={() => setBulkModal(false)} className="btn-secondary">Close</button>
              </div>
            </div>
          ) : (
            <form onSubmit={submitBulk} className="space-y-4">
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-4 shadow-sm">
                 <p className="text-sm font-bold text-indigo-900 mb-2">How this override works:</p>
                 <ul className="text-sm text-indigo-800 list-disc pl-5 mt-1 space-y-1.5 marker:text-indigo-400">
                   <li>Upload a CSV containing the Student IDs of the <span className="font-bold underline">Selected</span> students.</li>
                   <li>Any student present in the CSV will be automatically marked as <span className="font-bold text-emerald-600">Selected</span>.</li>
                   <li>All OTHER students who applied to this company will be automatically marked as <span className="font-bold text-rose-600">Rejected</span>.</li>
                   <li>This performs a <span className="font-bold">Complete Override</span> of previous application statuses for this company.</li>
                 </ul>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Opportunity *</label>
                <select required className="input text-base" value={bulkForm.opportunityId} onChange={e => setBulkForm({...bulkForm, opportunityId: e.target.value})}>
                  <option value="">-- Choose Opportunity --</option>
                  {oppsList.map(o => <option key={o._id} value={o._id}>{o.companyName} - {o.role}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 mt-4">Upload Selected Students CSV *</label>
                <input required type="file" accept=".csv" className="input text-sm p-2 cursor-pointer bg-slate-50" onChange={e => setBulkForm({...bulkForm, file: e.target.files[0]})} />
                <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  The CSV only requires a column named "Student ID".
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setBulkModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={bulkUploading} className="btn-primary">{bulkUploading ? 'Uploading...' : 'Upload Results'}</button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
