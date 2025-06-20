import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { accessToken, loading } = useAuth();

  if (loading) return <div className="p-6 text-center">Checking authentication...</div>;

  return accessToken ? children : <Navigate to="/" />;
};

export default PrivateRoute;
