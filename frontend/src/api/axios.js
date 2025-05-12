import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

const instance = axios.create({
  baseURL: `${BASE_URL}/api`,
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
