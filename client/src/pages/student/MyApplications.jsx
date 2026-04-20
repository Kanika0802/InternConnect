import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const statusConfig = {
  applied:     { label: 'Applied',     color: 'bg-blue-100 text-blue-700',   icon: '📤' },
  shortlisted: { label: 'Shortlisted', color: 'bg-green-100 text-green-700', icon: '✅' },
  rejected:    { label: 'Better luck next time',    color: 'bg-red-100 text-red-700',     icon: '❌' },
  selected:    { label: 'Selected',    color: 'bg-violet-100 text-violet-700',icon: '🏆' },
  withdrawn:   { label: 'Withdrawn',   color: 'bg-gray-100 text-gray-500',   icon: '↩️' },
};

export default function MyApplications() {
  const [apps, setApps]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [withdrawing, setWithdrawing] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/applications/my');
      setApps(res.data.applications);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleWithdraw = async (id, company) => {
    if (!window.confirm(`Withdraw application for ${company}?`)) return;
    setWithdrawing(id);
    try {
      await api.delete(`/applications/${id}/withdraw`);
      toast.success('Application withdrawn.');
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw.');
    } finally {
      setWithdrawing(null);
    }
  };

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter);

  const counts = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
        <p className="text-sm text-gray-500 mt-1">{apps.length} total applications</p>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(statusConfig).filter(([k]) => k !== 'withdrawn').map(([status, cfg]) => (
          <button key={status} onClick={() => setFilter(filter === status ? 'all' : status)}
            className={`card p-3 text-left transition-all hover:shadow-md ${filter === status ? 'ring-2 ring-primary-500' : ''}`}>
            <div className="text-2xl font-bold font-display text-gray-900">{counts[status] || 0}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`badge ${cfg.color}`}>{cfg.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
          All ({apps.length})
        </button>
        {Object.entries(statusConfig).map(([status, cfg]) => (
          counts[status] > 0 && (
            <button key={status} onClick={() => setFilter(filter === status ? 'all' : status)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === status ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {cfg.label} ({counts[status]})
            </button>
          )
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"/></div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          {filter === 'all' ? 'No applications yet. Browse opportunities to apply!' : `No ${filter} applications.`}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const cfg = statusConfig[a.status] || statusConfig.applied;
            return (
              <div key={a._id} className={`card p-5 hover:shadow-md transition-shadow animate-slide-up ${a.status === 'selected' ? 'border-violet-200 bg-violet-50/30' : ''}`}>
                <div className="flex items-start gap-4">
                  {/* Company initial */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${a.status === 'selected' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'}`}>
                    {a.opportunity?.companyName?.[0] || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-semibold text-gray-900 text-base">{a.opportunity?.companyName}</div>
                        <div className="text-sm text-gray-500">{a.opportunity?.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cfg.icon}</span>
                        <span className={`badge ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    </div>

                    {/* Details row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      {a.opportunity?.location && <span>📍 {a.opportunity.location}</span>}
                      {a.opportunity?.salary && <span>💰 {a.opportunity.salary}</span>}
                      <span>Applied: {new Date(a.createdAt).toLocaleDateString()}</span>
                      {a.cgpaAtApplication !== undefined && <span>CGPA at apply: {a.cgpaAtApplication}</span>}
                    </div>

                    {/* Status message */}
                    {a.status === 'shortlisted' && !a.currentRound && (
                      <div className="mt-3 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                        🎉 Congratulations! You have been shortlisted. Watch for further updates.
                      </div>
                    )}
                    {a.status === 'shortlisted' && a.currentRound && (
                      <div className="mt-3 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 font-medium border border-green-200">
                        <div className="mb-1 text-green-800 font-bold uppercase tracking-wide text-[10px]">Current Status: {a.currentRound}</div>
                        🎉 Congratulations! You have been selected for {a.currentRound} at {a.opportunity?.companyName}
                      </div>
                    )}
                    {a.status === 'selected' && (
                      <div className="mt-3 text-xs text-violet-700 bg-violet-100 rounded-lg px-3 py-2 font-medium border border-violet-200">
                        <div className="mb-1 text-violet-900 font-bold uppercase tracking-wide text-[10px]">Final Selection Status: Placed</div>
                        🎉 Congratulations! You are finally selected at {a.opportunity?.companyName}
                      </div>
                    )}
                    {a.status === 'rejected' && (
                      <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        😔 Better luck next time for {a.opportunity?.companyName}
                      </div>
                    )}

                    {/* Status history */}
                    {a.statusHistory?.length > 1 && (
                      <details className="mt-3">
                        <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">View status history</summary>
                        <div className="mt-2 space-y-1 pl-3 border-l-2 border-gray-100">
                          {a.statusHistory.map((h, i) => (
                            <div key={i} className="text-xs text-gray-500">
                              <span className="font-medium capitalize">{h.status === 'rejected' ? 'Better luck next time' : h.status}</span>
                              {h.changedAt && <span className="text-gray-400"> — {new Date(h.changedAt).toLocaleString()}</span>}
                              {h.note && <span className="text-gray-500"> · {h.note}</span>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>

                {/* Withdraw button */}
                {a.status === 'applied' && (
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => handleWithdraw(a._id, a.opportunity?.companyName)}
                      disabled={withdrawing === a._id}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                      {withdrawing === a._id ? 'Withdrawing…' : 'Withdraw Application'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
