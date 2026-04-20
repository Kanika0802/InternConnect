import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import api from '../../services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

import { Users, Briefcase, FileText, Award } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="card p-6 flex flex-col relative overflow-hidden group border-slate-100/80 bg-white shadow-xl shadow-slate-200/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/40 transition-all duration-300">
    <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 bg-gradient-to-br ${color} group-hover:scale-150 transition-transform duration-700 ease-out`} />
    <div className="flex items-center justify-between mb-4 relative z-10">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${color} shadow-lg text-white ring-4 ring-white`}>
        <Icon className="w-7 h-7" />
      </div>
    </div>
    <div className="relative z-10">
      <div className="text-4xl font-extrabold text-slate-800 tracking-tight font-display drop-shadow-sm">{value ?? '—'}</div>
      <div className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"/></div>;

  const appStatusChart = {
    labels: (data?.appByStatus || []).map(s => s._id),
    datasets: [{
      data: (data?.appByStatus || []).map(s => s.count),
      backgroundColor: ['#3b82f6','#22c55e','#ef4444','#8b5cf6','#94a3b8'],
      borderWidth: 0
    }]
  };

  const cgpaChart = {
    labels: (data?.cgpaDistribution || []).map(b => b._id === 'unknown' ? 'N/A' : `${b._id}–${b._id === 0 ? 5 : b._id + 1}`),
    datasets: [{
      label: 'Students',
      data: (data?.cgpaDistribution || []).map(b => b.count),
      backgroundColor: '#3b82f6',
      borderRadius: 6,
      borderSkipped: false
    }]
  };

  const companyChart = {
    labels: (data?.appPerCompany || []).map(c => c._id),
    datasets: [{
      label: 'Applications',
      data: (data?.appPerCompany || []).map(c => c.count),
      backgroundColor: '#8b5cf6',
      borderRadius: 6,
      borderSkipped: false
    }]
  };

  const { stats = {} } = data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of placement activity</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
        <StatCard label="Total Students" value={stats.totalStudents} icon={Users} color="from-blue-500 to-indigo-600" />
        <StatCard label="Opportunities" value={stats.totalOpportunities} icon={Briefcase} color="from-emerald-400 to-teal-500" />
        <StatCard label="Applications" value={stats.totalApplications} icon={FileText} color="from-violet-500 to-purple-600" />
        <StatCard label="Students Placed" value={stats.placedStudents} icon={Award} color="from-amber-400 to-orange-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Applications by Status</h3>
          <div className="h-52 flex items-center justify-center">
            <Doughnut data={appStatusChart} options={{ plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } } }, cutout: '65%' }} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">CGPA Distribution</h3>
          <div className="h-52">
            <Bar data={cgpaChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top Companies by Applications</h3>
          <div className="h-52">
            <Bar data={companyChart} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } }} />
          </div>
        </div>
      </div>
    </div>
  );
}
