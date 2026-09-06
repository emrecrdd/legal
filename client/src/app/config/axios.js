import axios from 'axios';
const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

// ======================================================
// MAIN INSTANCE
// ======================================================

const axiosInstance =
  axios.create({
    baseURL:
      API_URL,

    /*
     * HttpOnly refreshToken cookie'sinin
     * cross-origin backend'e gönderilebilmesi için
     * credentials açık olmalıdır.
     */
    withCredentials:
      true,
  });

// ======================================================
// REFRESH INSTANCE
//
// Ana interceptor zincirine girmez.
// Refresh loop riskini engeller.
// ======================================================

const refreshClient =
  axios.create({
    baseURL:
      API_URL,

    withCredentials:
      true,

    /*
     * Refresh isteği JSON tabanlıdır.
     * Bu instance upload için kullanılmadığı için
     * burada application/json kalabilir.
     */
    headers: {
      'Content-Type':
        'application/json',
    },
  });

// ======================================================
// TOKEN HELPERS
//
// Refresh token artık JavaScript tarafından
// saklanmaz veya okunmaz.
//
// localStorage yalnızca access token için
// geçici olarak kullanılmaya devam ediyor.
// ======================================================

const getAccessToken = () => {
  try {
    const stored =
      JSON.parse(
        localStorage.getItem(
          'tokens'
        ) || '{}'
      );

    return (
      stored?.accessToken ||
      null
    );
  } catch {
    return null;
  }
};

const setAccessToken = (
  accessToken
) => {
  if (
    !accessToken
  ) {
    localStorage.removeItem(
      'tokens'
    );

    return;
  }

  /*
   * KRİTİK:
   * refreshToken localStorage'a yazılmıyor.
   */
  localStorage.setItem(
    'tokens',
    JSON.stringify({
      accessToken,
    })
  );
};

const clearAuth = () => {
  localStorage.removeItem(
    'tokens'
  );

  localStorage.removeItem(
    'user'
  );

  /*
   * Bellekte kalmış eski Authorization header'ını
   * da temizle.
   */
  delete axiosInstance
    .defaults
    .headers
    .common
    .Authorization;
};

// ======================================================
// LEGACY REFRESH TOKEN CLEANUP
// ======================================================

/*
 * Önceki sürümlerde:
 *
 * {
 *   accessToken,
 *   refreshToken
 * }
 *
 * localStorage'a yazılıyordu.
 *
 * Yeni sürümde refresh token yalnızca
 * HttpOnly cookie'de tutulacak.
 *
 * Mevcut kullanıcının access tokenını koruyup
 * eski refresh token kopyasını localStorage'dan
 * temizliyoruz.
 */
try {
  const storedTokens =
    JSON.parse(
      localStorage.getItem(
        'tokens'
      ) || '{}'
    );

  if (
    storedTokens
      ?.refreshToken
  ) {
    if (
      storedTokens
        ?.accessToken
    ) {
      localStorage.setItem(
        'tokens',
        JSON.stringify({
          accessToken:
            storedTokens.accessToken,
        })
      );
    } else {
      localStorage.removeItem(
        'tokens'
      );
    }
  }
} catch {
  localStorage.removeItem(
    'tokens'
  );
}

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

const isNonRefreshableAuthRequest = (
  requestConfig
) => {
  return (
    isAuthRoute(
      requestConfig,
      '/auth/login'
    ) ||
    
    isAuthRoute(
      requestConfig,
      '/auth/refresh-token'
    ) ||
    isAuthRoute(
      requestConfig,
      '/auth/logout'
    ) ||
    isAuthRoute(
      requestConfig,
      '/auth/forgot-password'
    ) ||
    isAuthRoute(
      requestConfig,
      '/auth/reset-password'
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

let refreshQueue =
  [];

const processQueue = (
  error,
  accessToken = null
) => {
  refreshQueue.forEach(
    ({
      resolve,
      reject,
    }) => {
      if (
        error
      ) {
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

  refreshQueue =
    [];
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
    const accessToken =
      getAccessToken();

    requestConfig.headers =
      requestConfig.headers ||
      {};

    if (
      accessToken
    ) {
      requestConfig.headers.Authorization =
        `Bearer ${accessToken}`;
    }

    /*
     * KRİTİK:
     *
     * FormData gönderiliyorsa Content-Type'ı
     * manuel belirlemiyoruz.
     *
     * Browser/Axios:
     *
     * multipart/form-data;
     * boundary=...
     *
     * değerini otomatik oluşturur.
     *
     * Multer'ın req.file / req.files üretebilmesi
     * için boundary gereklidir.
     */
    if (
      typeof FormData !==
        'undefined' &&
      requestConfig.data instanceof
        FormData
    ) {
      delete requestConfig.headers[
        'Content-Type'
      ];
    }

    return requestConfig;
  },

  (
    error
  ) =>
    Promise.reject(
      error
    )
);

// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================

axiosInstance.interceptors.response.use(
  (
    response
  ) =>
    response,

  async (
    error
  ) => {
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
    // AUTH ROUTES
    // ==================================================

    /*
     * Login, logout, refresh, forgot/reset gibi
     * auth endpointlerinde 401 alınırsa tekrar
     * refresh denemiyoruz.
     *
     * Aksi halde hatalı login gibi durumlarda
     * gereksiz refresh isteği oluşabilir.
     */
    if (
      status === 401 &&
      isNonRefreshableAuthRequest(
        originalRequest
      )
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

            /*
             * Retry edilen istek FormData ise
             * multipart Content-Type yine browser
             * tarafından oluşturulmalıdır.
             */
            if (
              typeof FormData !==
                'undefined' &&
              originalRequest.data instanceof
                FormData
            ) {
              delete originalRequest.headers[
                'Content-Type'
              ];
            }

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
        /*
         * Refresh token body'ye gönderilmiyor.
         *
         * Browser HttpOnly refreshToken cookie'sini
         * withCredentials=true sayesinde otomatik
         * gönderiyor.
         */
        const refreshResponse =
          await refreshClient.post(
            '/auth/refresh-token',
            null
          );

        const responseData =
          refreshResponse
            ?.data
            ?.data;

        const accessToken =
          responseData
            ?.accessToken;

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

        setAccessToken(
          accessToken
        );

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

        /*
         * Retry edilen upload isteğinde eski JSON
         * Content-Type kalmışsa temizlenir.
         */
        if (
          typeof FormData !==
            'undefined' &&
          originalRequest.data instanceof
            FormData
        ) {
          delete originalRequest.headers[
            'Content-Type'
          ];
        }

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
    // API ERROR OWNERSHIP
    // ==================================================

    /*
     * Bu katman yalnız HTTP / auth taşıma sorumluluğunu yönetir.
     * Kullanıcıya gösterilecek hata mesajı ilgili query / mutation /
     * sayfa tarafından semantik olarak ele alınır.
     *
     * Böylece aynı hata hem Axios interceptor hem de feature hook
     * tarafından ikinci kez toast olarak gösterilmez.
     */

    return Promise.reject(
      error
    );
  }
);

export default axiosInstance;