import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

import { Eye, EyeOff, GraduationCap } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ studentId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // ... (submit handler stays the same)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentId.trim() || !form.password) return toast.error('Please fill in all fields.');
    setLoading(true);
    try {
      const { user, requiresPasswordChange } = await login(form.studentId, form.password);
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`);
      if (requiresPasswordChange) return navigate('/change-password');
      navigate(user.role === 'admin' ? '/admin' : '/student');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500 opacity-20 blur-3xl mix-blend-screen"/>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-purple-500 opacity-20 blur-3xl mix-blend-screen"/>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-cyan-500 opacity-10 blur-3xl mix-blend-screen"/>
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl mb-6 ring-1 ring-white/20">
            <GraduationCap className="w-10 h-10 text-blue-300" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">InternConnect</h1>
          <p className="text-primary-200 mt-1 text-sm">College Placement Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sign in to your account</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your Student ID and password</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <input
                id="studentId"
                className="input text-base pt-6 pb-2 peer"
                placeholder=" "
                value={form.studentId}
                onChange={e => setForm(f => ({ ...f, studentId: e.target.value.toUpperCase() }))}
                autoComplete="username"
                disabled={loading}
              />
              <label 
                htmlFor="studentId" 
                className="absolute left-4 top-4 text-slate-400 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:top-3.5 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-indigo-500 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-indigo-500 cursor-text pointer-events-none"
              >
                Student / Admin ID
              </label>
            </div>
            
            <div className="relative group">
              <input
                id="password"
                className="input text-base pt-6 pb-2 pr-12 peer"
                type={showPass ? 'text' : 'password'}
                placeholder=" "
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
                disabled={loading}
              />
              <label 
                htmlFor="password" 
                className="absolute left-4 top-4 text-slate-400 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:top-3.5 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-indigo-500 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-indigo-500 cursor-text pointer-events-none"
              >
                Password
              </label>
              <button 
                type="button" 
                onClick={() => setShowPass(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                tabIndex="-1"
              >
                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 text-base" disabled={loading}>
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs text-gray-400">
            Contact your placement cell if you've forgotten your credentials.
          </div>
        </div>
      </div>
    </div>
  );
}
