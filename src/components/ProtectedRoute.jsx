import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, requireRole }) {
  const { session, profile, loading, profileLoading } = useAuth();

  if (loading) return <div>Loading…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (profileLoading) return <div>Loading your profile…</div>;
  if (!profile) {
    return <div>No profile found for this account. Check the `profiles` table in Supabase.</div>;
  }
  if (requireRole && profile.role !== requireRole) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/'} replace />;
  }
  return children;
}