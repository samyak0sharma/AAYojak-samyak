import { Navigate, Outlet } from 'react-router-dom';
import type { AuthUser } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui/Spinner';

export function RoleProtectedRoute({ roles }: { roles: AuthUser['role'][] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="route-loading"><Spinner label="Checking permissions" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

