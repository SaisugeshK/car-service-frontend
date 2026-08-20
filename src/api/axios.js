import axios from 'axios';
import toast from 'react-hot-toast';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 15000;

const ACCESS_TOKEN_KEY = 'erp_access_token';
const REFRESH_TOKEN_KEY = 'erp_refresh_token';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: ({ accessToken, refreshToken }) => {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// Simple global loading-state tracker so any component / hook can subscribe
// (used by hooks/useGlobalLoading.js).
let activeRequests = 0;
const loadingListeners = new Set();

const notifyLoading = () => {
  loadingListeners.forEach((cb) => cb(activeRequests > 0));
};

export const subscribeToLoading = (cb) => {
  loadingListeners.add(cb);
  return () => loadingListeners.delete(cb);
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- Request interceptor ----
api.interceptors.request.use(
  (config) => {
    activeRequests += 1;
    notifyLoading();

    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    notifyLoading();
    return Promise.reject(error);
  }
);

// ---- Refresh-token queue handling ----
let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

// ---- Response interceptor ----
api.interceptors.response.use(
  (response) => {
    activeRequests = Math.max(0, activeRequests - 1);
    notifyLoading();
    return response;
  },
  async (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    notifyLoading();

    const originalRequest = error.config || {};

    // Network / no response at all
    if (!error.response) {
      toast.error('Network error. Please check your connection or the server.');
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const serverMessage = data?.message || data?.error;

    // ---- 401: attempt refresh-token flow (ready for when backend adds it) ----
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        tokenStorage.clear();
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Backend refresh endpoint is not implemented yet; this is wired so it
        // works the moment POST /api/auth/refresh exists.
        const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        const newAccessToken = refreshResponse.data?.accessToken;
        const newRefreshToken = refreshResponse.data?.refreshToken;

        tokenStorage.setTokens({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });

        api.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clear();
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ---- Global error toasts ----
    switch (status) {
      case 400:
        toast.error(serverMessage || 'Invalid request. Please check the form.');
        break;
      case 403:
        toast.error(serverMessage || "You don't have permission to do that.");
        break;
      case 404:
        toast.error(serverMessage || 'Requested resource was not found.');
        break;
      case 409:
        toast.error(serverMessage || 'Conflict: this record already exists or is in use.');
        break;
      case 500:
        toast.error(serverMessage || 'Server error. Please try again later.');
        break;
      case 503:
        toast.error(serverMessage || 'Service unavailable. Please try again later.');
        break;
      default:
        if (status !== 401) {
          toast.error(serverMessage || `Something went wrong (${status}).`);
        }
    }

    return Promise.reject(error);
  }
);

export default api;
