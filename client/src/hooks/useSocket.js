import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  io,
} from 'socket.io-client';

import {
  useAuth,
} from '../app/providers/auth.provider.jsx';

import env from '../config/env.js';

// ======================================================
// HELPERS
// ======================================================

const normalizeNamespace = (
  namespace
) => {
  if (
    !namespace ||
    namespace === '/'
  ) {
    return '/';
  }

  return namespace.startsWith('/')
    ? namespace
    : `/${namespace}`;
};

// ======================================================
// HOOK
// ======================================================

export const useSocket = (
  namespace = '/'
) => {
  const {
    tokens,
  } = useAuth();

  const [
    isConnected,
    setIsConnected,
  ] = useState(false);

  const [
    connectionError,
    setConnectionError,
  ] = useState(null);

  const socketRef =
    useRef(null);

  // Component üzerinden eklenen
  // listener'ları takip ediyoruz.
  const listenersRef =
    useRef(
      new Map()
    );

  const normalizedNamespace =
    useMemo(
      () =>
        normalizeNamespace(
          namespace
        ),
      [namespace]
    );

  const accessToken =
    tokens?.accessToken;

  // ====================================================
  // CONNECTION
  // ====================================================

  useEffect(() => {
    if (!accessToken) {
      setIsConnected(
        false
      );

      setConnectionError(
        null
      );

      return undefined;
    }

    const socket =
      io(
        `${env.WS_URL}${normalizedNamespace}`,
        {
          auth: {
            token:
              accessToken,
          },

          /*
           * websocket tercih edilir.
           * polling fallback bırakmak bazı proxy /
           * mobil ağ senaryolarında daha dayanıklıdır.
           */
          transports: [
            'websocket',
            'polling',
          ],

          reconnection:
            true,

          reconnectionAttempts:
            10,

          reconnectionDelay:
            1000,

          reconnectionDelayMax:
            5000,

          timeout:
            10000,
        }
      );

    socketRef.current =
      socket;

    // ==================================================
    // BASE EVENTS
    // ==================================================

    const handleConnect =
      () => {
        setIsConnected(
          true
        );

        setConnectionError(
          null
        );

        if (
          import.meta.env.DEV
        ) {
          console.log(
            'Socket connected:',
            socket.id
          );
        }
      };

    const handleDisconnect =
      (reason) => {
        setIsConnected(
          false
        );

        if (
          import.meta.env.DEV
        ) {
          console.log(
            'Socket disconnected:',
            reason
          );
        }
      };

    const handleConnectError =
      (error) => {
        setIsConnected(
          false
        );

        setConnectionError(
          error
        );

        if (
          import.meta.env.DEV
        ) {
          console.error(
            'Socket connection error:',
            error
          );
        }
      };

    socket.on(
      'connect',
      handleConnect
    );

    socket.on(
      'disconnect',
      handleDisconnect
    );

    socket.on(
      'connect_error',
      handleConnectError
    );

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {
      listenersRef.current.forEach(
        (
          callbacks,
          event
        ) => {
          callbacks.forEach(
            (callback) => {
              socket.off(
                event,
                callback
              );
            }
          );
        }
      );

      listenersRef.current.clear();

      socket.off(
        'connect',
        handleConnect
      );

      socket.off(
        'disconnect',
        handleDisconnect
      );

      socket.off(
        'connect_error',
        handleConnectError
      );

      socket.disconnect();

      socketRef.current =
        null;

      setIsConnected(
        false
      );
    };
  }, [
    accessToken,
    normalizedNamespace,
  ]);

  // ====================================================
  // EMIT
  // ====================================================

  const emit =
    useCallback(
      (
        event,
        data,
        acknowledgement
      ) => {
        const socket =
          socketRef.current;

        if (
          !socket ||
          !socket.connected
        ) {
          if (
            import.meta.env.DEV
          ) {
            console.warn(
              `Socket emit skipped, not connected: ${event}`
            );
          }

          return false;
        }

        if (
          typeof acknowledgement ===
          'function'
        ) {
          socket.emit(
            event,
            data,
            acknowledgement
          );
        } else {
          socket.emit(
            event,
            data
          );
        }

        return true;
      },
      []
    );

  // ====================================================
  // ON
  // ====================================================

  const on =
    useCallback(
      (
        event,
        callback
      ) => {
        const socket =
          socketRef.current;

        if (
          !socket ||
          typeof callback !==
            'function'
        ) {
          return () => {};
        }

        socket.on(
          event,
          callback
        );

        const callbacks =
          listenersRef.current.get(
            event
          ) ||
          new Set();

        callbacks.add(
          callback
        );

        listenersRef.current.set(
          event,
          callbacks
        );

        /*
         * Böylece consumer:
         *
         * useEffect(() => {
         *   return on('notification', handler);
         * }, [on]);
         *
         * kullanabilir.
         */
        return () => {
          socket.off(
            event,
            callback
          );

          const currentCallbacks =
            listenersRef.current.get(
              event
            );

          if (
            !currentCallbacks
          ) {
            return;
          }

          currentCallbacks.delete(
            callback
          );

          if (
            currentCallbacks.size ===
            0
          ) {
            listenersRef.current.delete(
              event
            );
          }
        };
      },
      []
    );

  // ====================================================
  // OFF
  // ====================================================

  const off =
    useCallback(
      (
        event,
        callback
      ) => {
        const socket =
          socketRef.current;

        if (!socket) {
          return;
        }

        if (
          callback
        ) {
          socket.off(
            event,
            callback
          );

          const callbacks =
            listenersRef.current.get(
              event
            );

          callbacks?.delete(
            callback
          );

          if (
            callbacks?.size ===
            0
          ) {
            listenersRef.current.delete(
              event
            );
          }

          return;
        }

        socket.off(event);

        listenersRef.current.delete(
          event
        );
      },
      []
    );

  // ====================================================
  // RETURN
  // ====================================================

  return {
    socket:
      socketRef.current,

    isConnected,

    connectionError,

    emit,
    on,
    off,
  };
};

export default useSocket;