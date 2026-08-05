import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import { app } from './app.js';
import { config } from './config/env.js';
import {
  connectDB,
  disconnectDB,
} from './config/database.js';
import { logger } from './config/logger.js';

import { setIo } from './modules/notifications/notification.service.js';
import { reminderJob } from './jobs/reminder.job.js';

const PORT = config.PORT;

const httpServer = createServer(app);

const allowedOrigins = [
  ...config.CORS_ORIGINS,
  config.CLIENT_URL,
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  },

  transports: ['websocket', 'polling'],

  pingInterval: 25_000,
  pingTimeout: 20_000,

  maxHttpBufferSize: 1_000_000,
});

let serverStarted = false;
let shuttingDown = false;

/**
 * Socket kimlik doğrulaması.
 *
 * Token yalnızca handshake auth alanından alınır:
 *
 * io(url, {
 *   auth: { token }
 * })
 */
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (
    !token ||
    typeof token !== 'string'
  ) {
    logger.warn('Socket bağlantısı reddedildi: token bulunamadı', {
      socketId: socket.id,
      address: socket.handshake.address,
    });

    const error = new Error('Kimlik doğrulaması gerekli.');
    error.data = {
      code: 'SOCKET_AUTH_REQUIRED',
    };

    return next(error);
  }

  try {
    const decoded = jwt.verify(
      token,
      config.JWT_SECRET,
      {
        algorithms: ['HS256'],
      }
    );

    const userId =
      decoded.id ||
      decoded.userId ||
      decoded.sub;

    if (!userId) {
      const error = new Error(
        'Token içinde kullanıcı bilgisi bulunamadı.'
      );

      error.data = {
        code: 'SOCKET_INVALID_TOKEN',
      };

      return next(error);
    }

    socket.data.userId = userId;
    socket.data.tokenPayload = {
      id: userId,
      role: decoded.role || null,
    };

    return next();
  } catch (error) {
    logger.warn('Geçersiz socket tokenı', {
      socketId: socket.id,
      message: error.message,
      address: socket.handshake.address,
    });

    const authenticationError = new Error(
      'Geçersiz veya süresi dolmuş token.'
    );

    authenticationError.data = {
      code: 'SOCKET_INVALID_TOKEN',
    };

    return next(authenticationError);
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  const userRoom = `user-${userId}`;

  /*
   * Kullanıcı yalnızca token ile doğrulanan kendi odasına alınır.
   * İstemciden gelen keyfi userId ile oda katılımına izin verilmez.
   */
  socket.join(userRoom);

  logger.info('Socket bağlantısı kuruldu', {
    socketId: socket.id,
    userId,
    room: userRoom,
    transport: socket.conn.transport.name,
  });

  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({
        pong: true,
        timestamp: new Date().toISOString(),
      });
    }
  });

  socket.on('disconnect', (reason) => {
    logger.info('Socket bağlantısı kapandı', {
      socketId: socket.id,
      userId,
      reason,
    });
  });

  socket.on('error', (error) => {
    logger.error('Socket hatası', {
      socketId: socket.id,
      userId,
      message: error.message,
    });
  });
});

io.engine.on('connection_error', (error) => {
  logger.warn('Socket.IO bağlantı hatası', {
    code: error.code,
    message: error.message,
    context: error.context,
  });
});

/*
 * Notification service ve controller'lar Socket.IO instance'ına
 * bu noktadan erişebilir.
 */
setIo(io);
app.set('io', io);

const startJobs = () => {
  try {
    reminderJob.start();

    logger.info('Hatırlatma görevleri başlatıldı');
  } catch (error) {
    /*
     * Reminder job kritik değilse server'ın açılmasını engellemiyoruz.
     * Ancak hata loglanır.
     */
    logger.error('Hatırlatma görevleri başlatılamadı', {
      name: error.name,
      message: error.message,
      stack:
        config.NODE_ENV === 'development'
          ? error.stack
          : undefined,
    });
  }
};

const stopJobs = () => {
  try {
    if (typeof reminderJob.stop === 'function') {
      reminderJob.stop();
      logger.info('Hatırlatma görevleri durduruldu');
    }
  } catch (error) {
    logger.error('Hatırlatma görevleri durdurulamadı', {
      message: error.message,
    });
  }
};

const listen = () =>
  new Promise((resolve, reject) => {
    const onError = (error) => {
      httpServer.off('listening', onListening);
      reject(error);
    };

    const onListening = () => {
      httpServer.off('error', onError);
      resolve();
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);

    httpServer.listen(PORT);
  });

const startServer = async () => {
  try {
    /*
     * Modeller initialize edilir ve veritabanı bağlantısı
     * HTTP sunucusu açılmadan önce doğrulanır.
     */
    await connectDB();

    await listen();

    serverStarted = true;

    startJobs();

    logger.info('Sunucu başarıyla başlatıldı', {
      port: PORT,
      environment: config.NODE_ENV,
      healthUrl:
        config.NODE_ENV === 'development'
          ? `http://localhost:${PORT}/health`
          : '/health',
    });
  } catch (error) {
    logger.error('Sunucu başlatılamadı', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack:
        config.NODE_ENV === 'development'
          ? error.stack
          : undefined,
    });

    process.exitCode = 1;

    try {
      await disconnectDB();
    } catch {
      // Başlangıç hatasında ek kapanış hatasını yutmamız yeterli.
    }

    process.exit(1);
  }
};

const closeHttpServer = () =>
  new Promise((resolve, reject) => {
    if (!serverStarted || !httpServer.listening) {
      resolve();
      return;
    }

    httpServer.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const closeSocketServer = () =>
  new Promise((resolve) => {
    io.close(() => {
      resolve();
    });
  });

const shutdown = async (
  signal,
  exitCode = 0
) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  logger.info('Uygulama kapatılıyor', {
    signal,
    exitCode,
  });

  /*
   * Kapanmanın sonsuza kadar beklememesi için güvenlik zaman aşımı.
   */
  const forceShutdownTimer = setTimeout(() => {
    logger.error('Zorunlu kapanış gerçekleştiriliyor', {
      signal,
    });

    process.exit(1);
  }, 15_000);

  forceShutdownTimer.unref();

  try {
    stopJobs();

    await closeSocketServer();
    logger.info('Socket.IO bağlantıları kapatıldı');

    await closeHttpServer();
    logger.info('HTTP sunucusu kapatıldı');

    await disconnectDB();
    logger.info('Veritabanı bağlantıları kapatıldı');

    clearTimeout(forceShutdownTimer);

    process.exit(exitCode);
  } catch (error) {
    logger.error('Uygulama düzgün kapatılamadı', {
      signal,
      name: error.name,
      message: error.message,
    });

    clearTimeout(forceShutdownTimer);

    process.exit(1);
  }
};

process.on('SIGINT', () => {
  void shutdown('SIGINT', 0);
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM', 0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Yakalanmamış Promise rejection', {
    reason:
      reason instanceof Error
        ? reason.message
        : String(reason),
    stack:
      reason instanceof Error &&
      config.NODE_ENV === 'development'
        ? reason.stack
        : undefined,
  });

  void shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (error) => {
  logger.error('Yakalanmamış exception', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });

  void shutdown('uncaughtException', 1);
});

void startServer();