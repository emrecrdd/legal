import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

// ======================================================
// MAIN INSTANCE
// ======================================================

const axiosInstance = axios.create({
  baseURL: API_URL,

  withCredentials: true,

  headers: {
    'Content-Type':
      'application/json',
  },
});

// ======================================================
// REFRESH INSTANCE
//
// Ana interceptor zincirine girmez.
// Refresh loop riskini engeller.
// ======================================================

const refreshClient = axios.create({
  baseURL: API_URL,

  withCredentials: true,

  headers: {
    'Content-Type':
      'application/json',
  },
});

// ======================================================
// TOKEN HELPERS
// ======================================================

const getTokens = () => {
  try {
    return JSON.parse(
      localStorage.getItem(
        'tokens'
      ) || '{}'
    );
  } catch {
    return {};
  }
};

const setTokens = (
  tokens
) => {
  localStorage.setItem(
    'tokens',
    JSON.stringify(
      tokens
    )
  );
};

const clearAuth = () => {
  localStorage.removeItem(
    'tokens'
  );

  localStorage.removeItem(
    'user'
  );
};

// ======================================================
// URL HELPERS
// ======================================================

const isAuthRoute = (
  config,
  route
) => {
  return Boolean(
    config?.url?.includes(
      route
    )
  );
};

// ======================================================
// REFRESH QUEUE
//
// Aynı anda birden fazla 401 gelirse
// yalnızca tek refresh isteği çalışır.
// ======================================================

let isRefreshing =
  false;

let refreshQueue = [];

const processQueue = (
  error,
  accessToken = null
) => {
  refreshQueue.forEach(
    ({
      resolve,
      reject,
    }) => {
      if (error) {
        reject(
          error
        );
      } else {
        resolve(
          accessToken
        );
      }
    }
  );

  refreshQueue = [];
};

// ======================================================
// REDIRECT LOGIN
// ======================================================

const redirectToLogin =
  () => {
    if (
      window.location.pathname !==
      '/login'
    ) {
      window.location.replace(
        '/login'
      );
    }
  };

// ======================================================
// REQUEST INTERCEPTOR
// ======================================================

axiosInstance.interceptors.request.use(
  (
    requestConfig
  ) => {
    const tokens =
      getTokens();

    /*
     * Logout public endpoint olsa da Authorization header
     * göndermemiz teknik olarak sorun değildir.
     *
     * Access token varsa diğer korumalı endpointlere eklenir.
     */
    if (
      tokens?.accessToken
    ) {
      requestConfig.headers =
        requestConfig.headers ||
        {};

      requestConfig.headers.Authorization =
        `Bearer ${tokens.accessToken}`;
    }

    return requestConfig;
  },

  (error) =>
    Promise.reject(
      error
    )
);

// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================

axiosInstance.interceptors.response.use(
  (response) =>
    response,

  async (error) => {
    const originalRequest =
      error.config;

    const status =
      error.response
        ?.status;

    // ==================================================
    // NETWORK / UNKNOWN ERROR
    // ==================================================

    if (
      !originalRequest
    ) {
      return Promise.reject(
        error
      );
    }

    // ==================================================
    // AUTH ROUTE DETECTION
    // ==================================================

    const isLogoutRequest =
      isAuthRoute(
        originalRequest,
        '/auth/logout'
      );

    /*
     * Logout sırasında 401 oluşursa refresh çalıştırmıyoruz.
     *
     * Kullanıcı zaten çıkış yapmak istiyor.
     * Logout -> refresh -> logout gibi gereksiz döngü
     * oluşmasını engeller.
     */
    if (
      status === 401 &&
      isLogoutRequest
    ) {
      return Promise.reject(
        error
      );
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

      // ================================================
      // REFRESH TOKEN YOK
      // ================================================

      if (
        !tokens
          ?.refreshToken
      ) {
        clearAuth();

        redirectToLogin();

        return Promise.reject(
          error
        );
      }

      // ================================================
      // REFRESH ZATEN DEVAM EDİYOR
      // ================================================

      if (
        isRefreshing
      ) {
        return new Promise(
          (
            resolve,
            reject
          ) => {
            refreshQueue.push({
              resolve,
              reject,
            });
          }
        ).then(
          (
            accessToken
          ) => {
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

      // ================================================
      // REFRESH BAŞLAT
      // ================================================

      originalRequest._retry =
        true;

      isRefreshing =
        true;

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
          refreshResponse
            ?.data
            ?.data;

        const accessToken =
          responseData
            ?.accessToken;

        const refreshToken =
          responseData
            ?.refreshToken ||
          tokens.refreshToken;

        if (
          !accessToken
        ) {
          throw new Error(
            'Yeni access token alınamadı'
          );
        }

        // ==============================================
        // TOKEN STORAGE
        // ==============================================

        setTokens({
          accessToken,
          refreshToken,
        });

        // ==============================================
        // DEFAULT HEADER
        // ==============================================

        axiosInstance
          .defaults
          .headers
          .common
          .Authorization =
          `Bearer ${accessToken}`;

        // ==============================================
        // ORIGINAL REQUEST HEADER
        // ==============================================

        originalRequest.headers =
          originalRequest.headers ||
          {};

        originalRequest.headers.Authorization =
          `Bearer ${accessToken}`;

        // ==============================================
        // WAITING REQUESTS
        // ==============================================

        processQueue(
          null,
          accessToken
        );

        // ==============================================
        // RETRY ORIGINAL REQUEST
        // ==============================================

        return axiosInstance(
          originalRequest
        );
      } catch (
        refreshError
      ) {
        processQueue(
          refreshError,
          null
        );

        clearAuth();

        redirectToLogin();

        return Promise.reject(
          refreshError
        );
      } finally {
        isRefreshing =
          false;
      }
    }

    // ==================================================
    // API ERROR TOAST
    // ==================================================

    const message =
      error.response
        ?.data
        ?.message;

    /*
     * 401 mesajlarını burada toastlamıyoruz.
     * Auth akışı zaten redirect / refresh yönetiyor.
     */
    if (
      message &&
      status !== 401
    ) {
      toast.error(
        message
      );
    }

    return Promise.reject(
      error
    );
  }
);

export default axiosInstance;