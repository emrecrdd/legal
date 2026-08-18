import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ======================================================
// MAIN INSTANCE
// ======================================================

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ======================================================
// REFRESH INSTANCE
// Interceptor loop riskini engeller
// ======================================================

const refreshClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ======================================================
// TOKEN HELPERS
// ======================================================

const getTokens = () => {
  try {
    return JSON.parse(
      localStorage.getItem('tokens') || '{}'
    );
  } catch {
    return {};
  }
};

const setTokens = (tokens) => {
  localStorage.setItem(
    'tokens',
    JSON.stringify(tokens)
  );
};

const clearAuth = () => {
  localStorage.removeItem('tokens');
  localStorage.removeItem('user');
};

// ======================================================
// REFRESH QUEUE
// Aynı anda birden fazla 401 gelirse tek refresh çalışır
// ======================================================

let isRefreshing = false;

let refreshQueue = [];

const processQueue = (
  error,
  accessToken = null
) => {
  refreshQueue.forEach(
    ({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(accessToken);
      }
    }
  );

  refreshQueue = [];
};

// ======================================================
// REQUEST INTERCEPTOR
// ======================================================

axiosInstance.interceptors.request.use(
  (config) => {
    const tokens = getTokens();

    if (tokens?.accessToken) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${tokens.accessToken}`;
    }

    return config;
  },
  (error) =>
    Promise.reject(error)
);

// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================

axiosInstance.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest =
      error.config;

    const status =
      error.response?.status;

    // Network error veya config yoksa
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // ==================================================
    // 401 HANDLING
    // ==================================================

    if (
      status === 401 &&
      !originalRequest._retry
    ) {
      const tokens =
        getTokens();

      if (!tokens?.refreshToken) {
        clearAuth();

        if (
          window.location.pathname !==
          '/login'
        ) {
          window.location.replace(
            '/login'
          );
        }

        return Promise.reject(error);
      }

      // Başka refresh zaten çalışıyorsa kuyruğa gir
      if (isRefreshing) {
        return new Promise(
          (resolve, reject) => {
            refreshQueue.push({
              resolve,
              reject,
            });
          }
        ).then(
          (accessToken) => {
            originalRequest.headers =
              originalRequest.headers ||
              {};

            originalRequest.headers.Authorization =
              `Bearer ${accessToken}`;

            return axiosInstance(
              originalRequest
            );
          }
        );
      }

      originalRequest._retry =
        true;

      isRefreshing = true;

      try {
        const refreshResponse =
          await refreshClient.post(
            '/auth/refresh-token',
            {
              refreshToken:
                tokens.refreshToken,
            }
          );

        const responseData =
          refreshResponse?.data?.data;

        const accessToken =
          responseData?.accessToken;

        const refreshToken =
          responseData?.refreshToken ||
          tokens.refreshToken;

        if (!accessToken) {
          throw new Error(
            'Yeni access token alınamadı'
          );
        }

        setTokens({
          accessToken,
          refreshToken,
        });

        axiosInstance.defaults.headers.common.Authorization =
          `Bearer ${accessToken}`;

        originalRequest.headers =
          originalRequest.headers || {};

        originalRequest.headers.Authorization =
          `Bearer ${accessToken}`;

        processQueue(
          null,
          accessToken
        );

        return axiosInstance(
          originalRequest
        );
      } catch (refreshError) {
        processQueue(
          refreshError,
          null
        );

        clearAuth();

        if (
          window.location.pathname !==
          '/login'
        ) {
          window.location.replace(
            '/login'
          );
        }

        return Promise.reject(
          refreshError
        );
      } finally {
        isRefreshing = false;
      }
    }

    // ==================================================
    // API ERROR TOAST
    // ==================================================

    const message =
      error.response?.data?.message;

    if (
      message &&
      status !== 401
    ) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;