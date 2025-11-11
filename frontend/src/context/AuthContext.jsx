import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { setAccessToken as setAxiosToken } from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const updateAccessToken = (token) => {
    setAccessToken(token);
    setAxiosToken(token);
  };

  const logout = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
    } catch (err) {
      console.error('Logout failed:', err);
    }
    updateAccessToken(null);
  };

  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        updateAccessToken(res.data.accessToken);
      } catch (err) {
        console.error('Failed to fetch access token:', err);
        updateAccessToken(null);
        // ❌ Do NOT redirect here! Let AuthSuccess handle inviteToken
      } finally {
        setLoading(false);
      }
    };

    fetchAccessToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{ accessToken, setAccessToken: updateAccessToken, loading, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
