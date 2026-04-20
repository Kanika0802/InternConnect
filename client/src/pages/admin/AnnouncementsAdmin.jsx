import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export function AnnouncementsAdmin() {
  const [anns, setAnns] = useState([]);
  const [form, setForm] = useState({ title:'', content:'', type:'general', expiresAt:'' });
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    const res = await api.get('/announcements');
    setAnns(res.data.announcements);
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/announcements', form);
      toast.success('Announcement posted.');
      setForm({ title:'', content:'', type:'general', expiresAt:'' });
      fetch();
    } catch { toast.error('Failed to post.'); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await api.delete(`/announcements/${id}`);
    toast.success('Removed.');
    fetch();
  };

  const typeColors = { general:'bg-gray-100 text-gray-700', deadline:'bg-red-100 text-red-700', placement:'bg-blue-100 text-blue-700', urgent:'bg-amber-100 text-amber-700' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>

      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Post New Announcement</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input className="input text-sm" required value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Content *</label>
              <textarea className="input text-sm h-24 resize-none" required value={form.content} onChange={e => setForm(p=>({...p,content:e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select className="input text-sm" value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))}>
                <option value="general">General</option>
                <option value="deadline">Deadline</option>
                <option value="placement">Placement</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expires On (optional)</label>
              <input type="date" className="input text-sm" value={form.expiresAt} onChange={e => setForm(p=>({...p,expiresAt:e.target.value}))} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary text-sm">
            {loading ? 'Posting…' : 'Post Announcement'}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {anns.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">No announcements posted yet.</div>
        ) : anns.map(a => (
          <div key={a._id} className="card p-4 flex items-start gap-4">
            <span className={`badge mt-0.5 ${typeColors[a.type]}`}>{a.type}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900">{a.title}</div>
              <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.content}</div>
              <div className="text-xs text-gray-400 mt-2">{new Date(a.createdAt).toLocaleString()}</div>
            </div>
            <button onClick={() => handleDelete(a._id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuditLogsPage() {
  const [logs, setLogs]   = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const LIMIT = 30;

  useEffect(() => {
    api.get('/admin/audit-logs', { params: { page, limit: LIMIT } })
      .then(res => { setLogs(res.data.logs); setTotal(res.data.total); })
      .catch(() => {});
  }, [page]);

  const actionColors = {
    CREATE_STUDENT:'bg-green-100 text-green-700',
    UPDATE_STUDENT:'bg-blue-100 text-blue-700',
    DELETE_STUDENT:'bg-red-100 text-red-700',
    BULK_UPDATE:'bg-amber-100 text-amber-700',
    RESET_PASSWORD:'bg-violet-100 text-violet-700',
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">{total} records</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Action','Performed By','Target Student','Changes','Time'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(l => (
                <tr key={l._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`badge ${actionColors[l.action] || 'bg-gray-100 text-gray-600'}`}>{l.action}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{l.performedBy?.name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{l.targetId || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                    {l.changes?.length > 0
                      ? l.changes.map((c, i) => <div key={i}><span className="font-medium">{c.field}</span>: {String(c.oldValue)} → {String(c.newValue)}</div>)
                      : l.description || '—'
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
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
    </div>
  );
}

export default AnnouncementsAdmin;
