import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const { setAccessToken } = useAuth(); 

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');

    if (accessToken) {
  setAccessToken(accessToken);
  setTimeout(() => navigate('/home'), 100);
}
 else {
      console.error('No access token found in URL');
      
    }
  }, [setAccessToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-800 text-lg">
      Logging you in...
    </div>
  );
};

export default AuthSuccess;