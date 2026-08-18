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
    useCallback(() => {
      removeUser();
      removeTokens();
    }, [
      removeUser,
      removeTokens,
    ]);

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
            clearAuth();
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

        /*
         * UI logout için backend başarısız olsa bile
         * local session temizlenmeli.
         */
        clearAuth();

        try {
          if (
            refreshToken
          ) {
            await authApi.logout(
              refreshToken
            );
          }
        } catch (error) {
          if (
            import.meta.env.DEV
          ) {
            console.error(
              'Logout error:',
              error
            );
          }
        }
      },
      [
        tokens?.refreshToken,
        clearAuth,
      ]
    );

  // ====================================================
  // REGISTER
  // ====================================================

  const register =
    useCallback(
      (userData) => {
        return authApi.register(
          userData
        );
      },
      []
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
          clearAuth();

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
          clearAuth();

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
        register,
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
        register,
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