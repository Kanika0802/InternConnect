import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Send, CheckCircle, Trophy, Briefcase } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [apps, setApps]   = useState([]);
  const [opps, setOpps]   = useState([]);
  const [anns, setAnns]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/applications/my'),
      api.get('/opportunities', { params: { limit: 5, status: 'active' } }),
      api.get('/announcements')
    ]).then(([a, o, n]) => {
      setApps(a.data.applications);
      setOpps(o.data.opportunities);
      setAnns(n.data.announcements.slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const statusColors = {
    applied:'bg-blue-100 text-blue-700', shortlisted:'bg-green-100 text-green-700',
    rejected:'bg-red-100 text-red-700', selected:'bg-purple-100 text-purple-700', withdrawn:'bg-gray-100 text-gray-600'
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"/></div>;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white animate-slide-up border-0 shadow-xl shadow-indigo-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400 opacity-20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="relative z-10">
          <div className="text-sm font-medium text-indigo-100 mb-1 uppercase tracking-wider">Welcome back</div>
          <h1 className="text-3xl font-extrabold font-display drop-shadow-md">{user?.name}</h1>
          <div className="flex flex-wrap gap-3 mt-5 text-sm font-medium">
            <span className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 shadow-sm">{user?.studentId}</span>
            <span className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 shadow-sm">{user?.department || 'Dept not set'}</span>
            <span className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 shadow-sm">CGPA: {user?.cgpa ?? 'N/A'}</span>
            {user?.amcatScore > 0 && <span className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 shadow-sm">AMCAT: {user?.amcatScore}</span>}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 animate-slide-up">
        {[
          { label: 'Total Applied', value: apps.length, color: 'from-blue-500 to-indigo-600', icon: Send },
          { label: 'Shortlisted', value: apps.filter(a=>a.status==='shortlisted').length, color: 'from-emerald-400 to-teal-500', icon: CheckCircle },
          { label: 'Selected', value: apps.filter(a=>a.status==='selected').length, color: 'from-violet-500 to-purple-600', icon: Trophy },
          { label: 'Eligible Jobs', value: opps.filter(o=>o.eligible && !apps.some(a=>a.opportunity?._id === o._id)).length, color: 'from-amber-400 to-orange-500', icon: Briefcase },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-6 flex flex-col relative overflow-hidden group border-slate-100/80 bg-white shadow-xl shadow-slate-200/40 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
              <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 bg-gradient-to-br ${s.color} group-hover:scale-150 transition-transform duration-700 ease-out`} />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${s.color} shadow-lg text-white ring-4 ring-white`}>
                  <Icon className="w-7 h-7" />
                </div>
              </div>
              <div className="relative z-10">
                <div className="text-4xl font-extrabold text-slate-800 tracking-tight font-display drop-shadow-sm">{s.value}</div>
                <div className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent applications */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Applications</h2>
            <Link to="/student/applications" className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all →</Link>
          </div>
          {apps.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              No applications yet. <Link to="/student/opportunities" className="text-primary-600">Browse opportunities →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {apps.slice(0, 4).map(a => (
                <div key={a._id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 text-sm font-bold text-gray-700 flex-shrink-0">
                    {a.opportunity?.companyName?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{a.opportunity?.companyName}</div>
                    <div className="text-xs text-gray-500 truncate">{a.opportunity?.role}</div>
                  </div>
                  <span className={`badge flex-shrink-0 ${statusColors[a.status]}`}>{a.status === 'rejected' ? 'better luck next time' : a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Announcements</h2>
          </div>
          {anns.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No announcements.</div>
          ) : (
            <div className="space-y-3">
              {anns.map(a => (
                <div key={a._id} className="border-l-4 border-primary-400 pl-3 py-1">
                  <div className="font-medium text-sm text-gray-900">{a.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.content}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Eligible opportunities preview */}
      {opps.filter(o=>o.eligible && !apps.some(a=>a.opportunity?._id === o._id)).length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">🎯 Eligible Opportunities</h2>
            <Link to="/student/opportunities" className="text-sm text-primary-600 hover:text-primary-700 font-medium">Browse all →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {opps.filter(o=>o.eligible && !apps.some(a=>a.opportunity?._id === o._id)).slice(0, 4).map(o => (
              <div key={o._id} className="flex items-center gap-3 p-3 rounded-xl border border-green-100 bg-green-50">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-green-200 text-sm font-bold text-green-700 flex-shrink-0">
                  {o.companyName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{o.companyName}</div>
                  <div className="text-xs text-gray-500">{o.role} · {o.salary || 'Salary TBD'}</div>
                </div>
                <Link to="/student/opportunities" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex-shrink-0">Apply</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
