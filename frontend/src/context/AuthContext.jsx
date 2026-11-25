import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { setAccessToken as setAxiosToken, subscribeToToken, refreshAccessToken, endSession } from '../api/axios';

import { AuthContext } from './authContext.js';

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const updateAccessToken = useCallback((token) => {
    setAxiosToken(token);
  }, []);

  useEffect(() => subscribeToToken(setAccessToken), []);

  const login = async (email, password) => {
    const res = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/auth/login`,
      { email, password },
      { withCredentials: true }
    );
    updateAccessToken(res.data.accessToken);
    return res.data;
  };

  const register = async (registrationData) => {
    const res = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/auth/register`,
      registrationData,
      { withCredentials: true }
    );
    updateAccessToken(res.data.accessToken);
    return res.data;
  };

  const acceptInvite = async ({ token, name, password }) => {
    const res = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/auth/accept-invite`,
      { token, name, password },
      { withCredentials: true }
    );
    updateAccessToken(res.data.accessToken);
    return res.data;
  };

  const demoLogin = async (role = 'admin') => {
    const res = await axios.post(
      `${import.meta.env.VITE_BACKEND_URL}/auth/demo-login`,
      { role },
      { withCredentials: true }
    );
    updateAccessToken(res.data.accessToken);
    return res.data;
  };

  const logout = async () => {
    await endSession();
  };

  useEffect(() => {
    let mounted = true;
    refreshAccessToken().catch(() => {}).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        setAccessToken: updateAccessToken,
        loading,
        login,
        register,
        acceptInvite,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
