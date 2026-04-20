import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth
import LoginPage        from './pages/auth/LoginPage';
import ChangePassword   from './pages/auth/ChangePassword';

// Admin
import AdminLayout      from './components/admin/AdminLayout';
import AdminDashboard   from './pages/admin/AdminDashboard';
import StudentsPage     from './pages/admin/StudentsPage';
import OpportunitiesAdmin from './pages/admin/OpportunitiesAdmin';
import ApplicationsAdmin  from './pages/admin/ApplicationsAdmin';
import AnnouncementsAdmin from './pages/admin/AnnouncementsAdmin';
import AuditLogsPage    from './pages/admin/AuditLogsPage';

// Student
import StudentLayout    from './components/student/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import OpportunitiesPage from './pages/student/OpportunitiesPage';
import MyApplications   from './pages/student/MyApplications';
import ProfilePage      from './pages/student/ProfilePage';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  if (user.isFirstLogin && window.location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace /> : <LoginPage />} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="opportunities" element={<OpportunitiesAdmin />} />
        <Route path="applications" element={<ApplicationsAdmin />} />
        <Route path="announcements" element={<AnnouncementsAdmin />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
      </Route>

      {/* Student routes */}
      <Route path="/student" element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="applications" element={<MyApplications />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontFamily: 'Inter, sans-serif', fontSize: '14px' } }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
