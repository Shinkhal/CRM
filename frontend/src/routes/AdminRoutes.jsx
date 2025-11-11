import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';

const AdminRoute = ({ children }) => {
  const { accessToken, loading } = useAuth();
  const { user } = useUser();

  if (loading) {
    return <div className="p-6 text-center">Checking authentication...</div>;
  }

  if (!accessToken) {
    return <Navigate to="/" />;
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/home" />; // redirect non-admins
  }

  return children;
};

export default AdminRoute;
