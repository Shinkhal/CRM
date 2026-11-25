import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/authContext.js';

export default function AuthSuccess() {
  const { accessToken, loading } = useAuth();
  if (loading) return <div className="p-6 text-center">Signing you in...</div>;
  return <Navigate to={accessToken ? '/home' : '/login?error=session_failed'} replace />;
}
