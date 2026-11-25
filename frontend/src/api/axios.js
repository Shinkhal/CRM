import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

let accessToken = null;
let refreshPromise = null;
let sessionVersion = 0;
const listeners = new Set();

export const setAccessToken = (token) => {
  sessionVersion += 1;
  accessToken = token;
  listeners.forEach(listener => listener(token));
};

export const subscribeToToken = (listener) => {
  listeners.add(listener);
  listener(accessToken);
  return () => listeners.delete(listener);
};

export const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise;
  const version = sessionVersion;
  const exchange = async () => {
    if (version !== sessionVersion) return accessToken;
    try {
      const response = await axios.post(`${BASE_URL}/auth/refresh`, {},
        { withCredentials: true, timeout: 15000 });
      if (version !== sessionVersion) return accessToken;
      setAccessToken(response.data.accessToken);
      return response.data.accessToken;
    } catch (error) {
      if (version === sessionVersion) setAccessToken(null);
      throw error;
    }
  };
  // Serialize cookie rotation across tabs as well as concurrent API requests.
  refreshPromise = (globalThis.navigator?.locks
    ? navigator.locks.request('crm-refresh', exchange)
    : exchange()).finally(() => { refreshPromise = null; });
  return refreshPromise;
};

export const endSession = async () => {
  setAccessToken(null);
  // An in-flight exchange may set a cookie; revoke after it finishes.
  if (refreshPromise) await refreshPromise.catch(() => {});
  const revoke = () => axios.post(`${BASE_URL}/auth/logout`, {},
    { withCredentials: true, timeout: 15000 });
  if (globalThis.navigator?.locks) await navigator.locks.request('crm-refresh', revoke);
  else await revoke();
};

/**
 * The API surface is split across two mount points on the server:
 *  - `/api/*`  for tenant data (customers, deals, campaigns, ...)
 *  - `/auth/*` for session and account endpoints
 * `api` targets the first, `authClient` targets the second. Both share the
 * same token injection and refresh handling.
 */
const attachInterceptors = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && accessToken && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await refreshAccessToken();
          if (!newToken) return Promise.reject(error);

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        } catch (refreshErr) {
          console.error('Refresh failed:', refreshErr);
          window.location.href = '/';
          return Promise.reject(refreshErr);
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
  withCredentials: true // send cookies for refreshToken
});

const authClient = axios.create({
  baseURL: `${BASE_URL}`,
  timeout: 15000,
  withCredentials: true
});

attachInterceptors(api);
attachInterceptors(authClient);

export { authClient };
export default api;
