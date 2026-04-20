import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const [opps, setOpps]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all'); // 'all' | 'eligible' | 'ineligible'
  const [applying, setApplying] = useState(null);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const LIMIT = 12;

  const fetchOpps = async () => {
    setLoading(true);
    try {
      const res = await api.get('/opportunities', { params: { page, limit: LIMIT, search, status: 'active' } });
      setOpps(res.data.opportunities);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  };

  const fetchApplied = async () => {
    try {
      const res = await api.get('/applications/my');
      setAppliedIds(new Set(res.data.applications.filter(a => a.status !== 'withdrawn').map(a => a.opportunity?._id)));
    } catch {}
  };

  useEffect(() => { fetchOpps(); }, [page, search]);
  useEffect(() => { fetchApplied(); }, []);

  const handleApply = async (opp) => {
    if (!opp.eligible) return toast.error('You are not eligible for this opportunity.');
    if (appliedIds.has(opp._id)) return toast('Already applied!');
    setApplying(opp._id);
    try {
      await api.post(`/applications/${opp._id}/apply`);
      toast.success(`Applied to ${opp.companyName}!`);
      setAppliedIds(prev => new Set([...prev, opp._id]));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Application failed.');
    } finally {
      setApplying(null);
    }
  };

  const filtered = opps.filter(o => {
    if (filter === 'eligible') return o.eligible;
    if (filter === 'ineligible') return !o.eligible;
    return true;
  });

  const pages = Math.ceil(total / LIMIT);

  const jobTypeColors = {
    placement: 'bg-violet-100 text-violet-700',
    internship: 'bg-amber-100 text-amber-700',
    both: 'bg-teal-100 text-teal-700'
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
        <p className="text-sm text-gray-500 mt-1">{total} active opportunities</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input className="input pl-9 text-sm" placeholder="Search company, role…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {[['all','All'],['eligible','Eligible'],['ineligible','Not Eligible']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${filter === val ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"/></div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">No opportunities found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(o => {
            const applied = appliedIds.has(o._id);
            const isExpanded = expanded === o._id;
            return (
              <div key={o._id} className={`card p-5 flex flex-col transition-all ${o.eligible ? 'border-green-200' : 'opacity-80'}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${o.eligible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {o.companyName[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 leading-tight">{o.companyName}</div>
                      <div className="text-sm text-gray-500">{o.role}</div>
                    </div>
                  </div>
                  <span className={`badge flex-shrink-0 ${jobTypeColors[o.jobType]}`}>{o.jobType}</span>
                </div>

                {/* Eligibility banner */}
                {o.eligible ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    You are eligible to apply
                  </div>
                ) : (
                  <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3 space-y-0.5">
                    {o.ineligibilityReasons.map((r, i) => <div key={i}>✗ {r}</div>)}
                  </div>
                )}

                {/* Details */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                  {o.location && <span>📍 {o.location}</span>}
                  {o.salary && <span>💰 {o.salary}</span>}
                  {o.applicationDeadline && <span>⏰ {new Date(o.applicationDeadline).toLocaleDateString()}</span>}
                </div>

                {/* Eligibility criteria */}
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 mb-3 space-y-0.5">
                  <div className="flex gap-3">
                    <span>Min CGPA: <strong>{o.eligibility?.minCGPA || 0}</strong></span>
                    {o.eligibility?.minAMCAT > 0 && <span>AMCAT: <strong>{o.eligibility.minAMCAT}</strong></span>}
                  </div>
                  {o.eligibility?.departments?.length > 0 && (
                    <div>Depts: {o.eligibility.departments.join(', ')}</div>
                  )}
                </div>

                {/* Description toggle */}
                <button onClick={() => setExpanded(isExpanded ? null : o._id)}
                  className="text-xs text-primary-600 hover:text-primary-700 text-left mb-3">
                  {isExpanded ? '▲ Hide description' : '▼ Show description'}
                </button>
                {isExpanded && (
                  <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 mb-3 leading-relaxed whitespace-pre-wrap">
                    {o.description}
                  </div>
                )}

                {/* Apply button */}
                <div className="mt-auto">
                  {applied ? (
                    <div className="w-full py-2 text-center text-sm font-medium text-green-700 bg-green-50 rounded-lg border border-green-200">
                      ✓ Applied
                    </div>
                  ) : !user?.resume ? (
                    <div className="relative group w-full">
                      <button
                        disabled
                        className="w-full py-2 text-sm font-medium rounded-lg transition-colors bg-gray-100 text-gray-400 cursor-not-allowed">
                        Apply Now
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-xs bg-gray-800 text-white text-xs rounded py-1 px-2">
                        Please upload your resume before applying
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApply(o)}
                      disabled={!o.eligible || applying === o._id}
                      className={`w-full py-2 text-sm font-medium rounded-lg transition-colors ${
                        o.eligible
                          ? 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}>
                      {applying === o._id ? 'Applying…' : o.eligible ? 'Apply Now' : 'Not Eligible'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-secondary text-sm disabled:opacity-40">← Prev</button>
          <span className="text-sm text-gray-500 px-3">{page} / {pages}</span>
          <button disabled={page===pages} onClick={() => setPage(p=>p+1)} className="btn-secondary text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
