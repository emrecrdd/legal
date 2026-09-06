import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useLocalStorage,
} from '../../hooks/useLocalStorage.js';

import authApi from '../../features/auth/auth.api.js';

import {
  queryClient,
} from './query.provider.jsx';

const AuthContext =
  createContext(null);

export const AuthProvider = ({
  children,
}) => {
  const [
    user,
    setUser,
    removeUser,
  ] = useLocalStorage(
    'user',
    null
  );

  const [
    tokens,
    setTokens,
    removeTokens,
  ] = useLocalStorage(
    'tokens',
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  // ====================================================
  // CLEAR AUTH
  // ====================================================

  const clearAuth =
    useCallback(
      async () => {
        /*
         * Eski kullanıcıya ait devam eden
         * React Query isteklerini durdur.
         *
         * Böylece cache temizlendikten sonra
         * eski kullanıcının isteği tamamlanıp
         * cache'i tekrar dolduramaz.
         */
        await queryClient.cancelQueries();

        /*
         * Dashboard, davalar, müvekkiller,
         * görevler, etkinlikler vb. tüm
         * React Query cache'ini temizle.
         */
        queryClient.clear();

        /*
         * Kullanıcının auth bilgilerini temizle.
         */
        removeUser();
        removeTokens();
      },
      [
        removeUser,
        removeTokens,
      ]
    );

  // ====================================================
  // INIT / VERIFY AUTH
  // ====================================================

  useEffect(() => {
    let cancelled =
      false;

    const initAuth =
      async () => {
        setLoading(true);

        if (
          !tokens?.accessToken
        ) {
          if (
            !cancelled
          ) {
            setUser(null);
            setLoading(false);
          }

          return;
        }

        try {
          const response =
            await authApi.getProfile();

          const profile =
            response?.data?.data;

          if (
            !cancelled
          ) {
            setUser(
              profile || null
            );
          }
        } catch (error) {
          if (
            import.meta.env.DEV
          ) {
            console.error(
              'Auth init error:',
              error
            );
          }

          if (
            !cancelled
          ) {
            await clearAuth();
          }
        } finally {
          if (
            !cancelled
          ) {
            setLoading(false);
          }
        }
      };

    initAuth();

    return () => {
      cancelled =
        true;
    };
  }, [
    tokens?.accessToken,
    setUser,
    clearAuth,
  ]);

  // ====================================================
  // LOGIN
  // ====================================================

  const login =
    useCallback(
      async (
        email,
        password
      ) => {
        const response =
          await authApi.login(
            email,
            password
          );

        const data =
          response?.data?.data;

        /*
         * Önceki kullanıcıdan herhangi bir
         * cache kalmışsa yeni kullanıcıya
         * taşınmasını engelle.
         */
        await queryClient.cancelQueries();

        queryClient.clear();

        /*
         * Yeni oturumu oluştur.
         */
        setTokens({
          accessToken:
            data.accessToken,

          refreshToken:
            data.refreshToken,
        });

        setUser(
          data.user
        );

        return response;
      },
      [
        setTokens,
        setUser,
      ]
    );

  // ====================================================
  // LOGOUT
  // ====================================================

  const logout =
    useCallback(
      async () => {
        const refreshToken =
          tokens?.refreshToken;

        try {
          /*
           * Önce backend oturumunu kapat.
           */
          await authApi.logout(
            refreshToken
          );
        } catch (error) {
          if (
            import.meta.env.DEV
          ) {
            console.error(
              'Logout error:',
              error
            );
          }
        } finally {
          /*
           * Backend logout başarılı veya
           * başarısız olsa da cihazdaki
           * kullanıcı ve cache temizlenir.
           */
          await clearAuth();
        }
      },
      [
        tokens?.refreshToken,
        clearAuth,
      ]
    );

  

  // ====================================================
  // REFRESH
  // ====================================================

  const refreshToken =
    useCallback(
      async () => {
        const currentRefreshToken =
          tokens?.refreshToken;

        if (
          !currentRefreshToken
        ) {
          await clearAuth();

          throw new Error(
            'Refresh token bulunamadı'
          );
        }

        try {
          const response =
            await authApi.refreshToken(
              currentRefreshToken
            );

          const data =
            response?.data?.data;

          setTokens({
            accessToken:
              data.accessToken,

            refreshToken:
              data.refreshToken ||
              currentRefreshToken,
          });

          return response;
        } catch (error) {
          await clearAuth();

          throw error;
        }
      },
      [
        tokens?.refreshToken,
        setTokens,
        clearAuth,
      ]
    );

  // ====================================================
  // DERIVED STATE
  // ====================================================

  const isAuthenticated =
    Boolean(
      user &&
      tokens?.accessToken
    );

  // ====================================================
  // CONTEXT VALUE
  // ====================================================

  const value =
    useMemo(
      () => ({
        user,
        tokens,
        loading,

        isAuthenticated,

        login,
        logout,
       
        refreshToken,

        setUser,
      }),
      [
        user,
        tokens,
        loading,
        isAuthenticated,

        login,
        logout,
        
        refreshToken,

        setUser,
      ]
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
};

export default AuthContext;
