import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

let accessToken = null; // store in memory

export const setAccessToken = (token) => {
  accessToken = token;
};

const instance = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true // send cookies for refreshToken
});

// ⬆️ Request Interceptor
instance.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔁 Response Interceptor for token refresh
instance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Check if access token expired
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = refreshResponse.data.accessToken;
        setAccessToken(newToken); // update in-memory token

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return instance(originalRequest); // retry original request
      } catch (refreshErr) {
        console.error('Refresh failed:', refreshErr);
        window.location.href = '/'; // redirect to login
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default instance;