import {
  Sequelize,
} from 'sequelize';

import {
  config,
} from './env.js';

import {
  logger,
} from './logger.js';

import {
  initModels,
} from '../models/index.js';

// ======================================================
// REQUIRED CONFIG
// ======================================================

if (
  !config.DATABASE_URL
) {
  throw new Error(
    'DATABASE_URL ortam değişkeni tanımlanmamış.'
  );
}

const isProduction =
  config.NODE_ENV ===
  'production';

// ======================================================
// SEQUELIZE
// ======================================================

export const sequelize =
  new Sequelize(
    config.DATABASE_URL,
    {
      dialect:
        'postgres',

      dialectOptions:
        isProduction
          ? {
              ssl: {
                require:
                  true,

                rejectUnauthorized:
                  false,
              },
            }
          : {},

      logging:
        config.NODE_ENV ===
        'development'
          ? (
              message
            ) =>
              logger.debug(
                message
              )
          : false,

      pool: {
        max:
          isProduction
            ? 10
            : 5,

        min:
          0,

        acquire:
          30000,

        idle:
          10000,

        evict:
          1000,
      },

      retry: {
        max:
          3,

        match: [
          /SequelizeConnectionError/,
          /SequelizeConnectionRefusedError/,
          /SequelizeHostNotFoundError/,
          /SequelizeHostNotReachableError/,
          /SequelizeInvalidConnectionError/,
          /SequelizeConnectionTimedOutError/,
          /Connection terminated unexpectedly/,
          /ECONNRESET/,
          /ETIMEDOUT/,
        ],
      },

      define: {
        underscored:
          true,

        timestamps:
          true,

        createdAt:
          'created_at',

        updatedAt:
          'updated_at',

        deletedAt:
          'deleted_at',

        paranoid:
          true,

        freezeTableName:
          true,
      },

      timezone:
        '+00:00',

      benchmark:
        config.NODE_ENV ===
        'development',
    }
  );

// ======================================================
// INTERNAL STATE
// ======================================================

let modelsInitialized =
  false;

let databaseConnected =
  false;

// ======================================================
// HEALTH CHECK CONFIG
// ======================================================

/*
 * Readiness endpointi public olarak çağrılabildiği için
 * her HTTP isteğinde ayrı SELECT 1 çalıştırmıyoruz.
 *
 * Başarılı sonuç:
 * 5 saniye cache.
 *
 * Hatalı sonuç:
 * 2 saniye cache.
 *
 * Böylece gerçekten DB problemi olduğunda da
 * toparlanmayı çok uzun süre geciktirmiyoruz.
 */
const HEALTH_SUCCESS_CACHE_MS =
  5000;

const HEALTH_FAILURE_CACHE_MS =
  2000;

/*
 * DB kapalıyken health endpointi sık çağrılırsa
 * aynı hatayı sürekli loglamıyoruz.
 */
const HEALTH_ERROR_LOG_INTERVAL_MS =
  30_000;

let healthCache = {
  result:
    null,

  expiresAt:
    0,
};

let healthCheckPromise =
  null;

let lastHealthErrorLogAt =
  0;

// ======================================================
// MODEL INITIALIZATION
// ======================================================

const initializeModels = () => {
  if (
    modelsInitialized
  ) {
    return;
  }

  initModels(
    sequelize
  );

  modelsInitialized =
    true;

  logger.info(
    'Sequelize modelleri başlatıldı'
  );
};

// ======================================================
// DEVELOPMENT SYNC
// ======================================================

const syncDevelopmentDatabase =
  async () => {
    if (
      config.NODE_ENV !==
      'development'
    ) {
      return;
    }

    await sequelize.sync({
      alter:
        false,
    });

    logger.info(
      'Development veritabanı şeması senkronize edildi'
    );
  };

// ======================================================
// CONNECT
// ======================================================

export const connectDB =
  async () => {
    if (
      databaseConnected
    ) {
      return sequelize;
    }

    initializeModels();

    try {
      await sequelize.authenticate();

      databaseConnected =
        true;

      /*
       * Başarılı bağlantı sonrası eski health cache
       * geçersiz kılınır.
       */
      healthCache = {
        result:
          null,

        expiresAt:
          0,
      };

      logger.info(
        'Neon PostgreSQL bağlantısı kuruldu',
        {
          environment:
            config.NODE_ENV,

          poolMax:
            isProduction
              ? 10
              : 5,
        }
      );

      /*
       * Production ortamında şema değişikliği
       * migration ile yapılmalıdır.
       */
      await syncDevelopmentDatabase();

      return sequelize;
    } catch (
      error
    ) {
      databaseConnected =
        false;

      logger.error(
        'Veritabanı bağlantısı kurulamadı',
        {
          name:
            error.name,

          message:
            error.message,

          originalCode:
            error.original
              ?.code,

          stack:
            config.NODE_ENV ===
            'development'
              ? error.stack
              : undefined,
        }
      );

      throw error;
    }
  };

// ======================================================
// HEALTH RESPONSE
// ======================================================

const createHealthResult = ({
  healthy,
  durationMs,
}) => {
  /*
   * Production readiness endpointinin DB latency,
   * bağlantı implementasyonu vb. detayları dışarı
   * vermesine gerek yok.
   */
  if (
    isProduction
  ) {
    return {
      healthy:
        healthy === true,
    };
  }

  /*
   * Development ortamında debugging için
   * biraz daha fazla bilgi tutulabilir.
   */
  return {
    healthy:
      healthy === true,

    connected:
      healthy === true,

    durationMs,
  };
};

// ======================================================
// HEALTH CHECK
// ======================================================

const executeDatabaseHealthCheck =
  async () => {
    const startedAt =
      Date.now();

    try {
      /*
       * Sağlık sorgusu Sequelize development
       * SQL loglarını da gereksiz şişirmesin.
       */
      await sequelize.query(
        'SELECT 1',
        {
          logging:
            false,
        }
      );

      databaseConnected =
        true;

      const result =
        createHealthResult({
          healthy:
            true,

          durationMs:
            Date.now() -
            startedAt,
        });

      healthCache = {
        result,

        expiresAt:
          Date.now() +
          HEALTH_SUCCESS_CACHE_MS,
      };

      return result;
    } catch (
      error
    ) {
      databaseConnected =
        false;

      const now =
        Date.now();

      /*
       * Readiness probe çok sık çalışırken
       * DB kapalıysa log spam oluşmasın.
       */
      if (
        now -
          lastHealthErrorLogAt >=
        HEALTH_ERROR_LOG_INTERVAL_MS
      ) {
        lastHealthErrorLogAt =
          now;

        logger.error(
          'Veritabanı sağlık kontrolü başarısız',
          {
            name:
              error.name,

            message:
              error.message,
          }
        );
      }

      const result =
        createHealthResult({
          healthy:
            false,

          durationMs:
            Date.now() -
            startedAt,
        });

      healthCache = {
        result,

        expiresAt:
          Date.now() +
          HEALTH_FAILURE_CACHE_MS,
      };

      return result;
    }
  };

// ======================================================
// PUBLIC HEALTH CHECK
// ======================================================

export const checkDatabaseHealth =
  async () => {
    const now =
      Date.now();

    // ==================================================
    // CACHE
    // ==================================================

    if (
      healthCache.result &&
      healthCache.expiresAt >
        now
    ) {
      return healthCache.result;
    }

    // ==================================================
    // SINGLE FLIGHT
    // ==================================================

    /*
     * Aynı anda örneğin 20 readiness isteği gelirse:
     *
     * Eski:
     * → 20 x SELECT 1
     *
     * Yeni:
     * → 1 x SELECT 1
     * → diğer 19 istek aynı Promise'i bekler.
     */
    if (
      healthCheckPromise
    ) {
      return healthCheckPromise;
    }

    healthCheckPromise =
      executeDatabaseHealthCheck();

    try {
      return await healthCheckPromise;
    } finally {
      healthCheckPromise =
        null;
    }
  };

// ======================================================
// DISCONNECT
// ======================================================

export const disconnectDB =
  async () => {
    if (
      !databaseConnected
    ) {
      return;
    }

    try {
      await sequelize.close();

      databaseConnected =
        false;

      /*
       * Kapanan bağlantının eski "healthy" sonucu
       * cache'de kalmasın.
       */
      healthCache = {
        result:
          null,

        expiresAt:
          0,
      };

      logger.info(
        'Veritabanı bağlantıları kapatıldı'
      );
    } catch (
      error
    ) {
      logger.error(
        'Veritabanı bağlantıları kapatılamadı',
        {
          name:
            error.name,

          message:
            error.message,
        }
      );

      throw error;
    }
  };

export default sequelize;