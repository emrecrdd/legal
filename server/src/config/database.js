import { Sequelize } from 'sequelize';
import { config } from './env.js';
import { logger } from './logger.js';
import { initModels } from '../models/index.js';

if (!config.DATABASE_URL) {
  throw new Error('DATABASE_URL ortam değişkeni tanımlanmamış.');
}

const isProduction = config.NODE_ENV === 'production';

export const sequelize = new Sequelize(config.DATABASE_URL, {
  dialect: 'postgres',

  dialectOptions: isProduction
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},

  logging:
    config.NODE_ENV === 'development'
      ? (message) => logger.debug(message)
      : false,

  pool: {
    max: isProduction ? 10 : 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
    evict: 1000,
  },

  retry: {
    max: 3,
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
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
    freezeTableName: true,
  },

  timezone: '+00:00',

  benchmark: config.NODE_ENV === 'development',
});

let modelsInitialized = false;
let databaseConnected = false;

const initializeModels = () => {
  if (modelsInitialized) {
    return;
  }

  initModels(sequelize);
  modelsInitialized = true;

  logger.info('Sequelize modelleri başlatıldı');
};

const syncDevelopmentDatabase = async () => {
  if (config.NODE_ENV !== 'development') {
    return;
  }

  await sequelize.sync({
    alter: false,
  });

  logger.info('Development veritabanı şeması senkronize edildi');
};

export const connectDB = async () => {
  if (databaseConnected) {
    return sequelize;
  }

  initializeModels();

  try {
    await sequelize.authenticate();

    databaseConnected = true;

    logger.info('Neon PostgreSQL bağlantısı kuruldu', {
      environment: config.NODE_ENV,
      poolMax: isProduction ? 10 : 5,
    });

    /*
     * Yalnızca development ortamında güvenli sync.
     *
     * Production ortamında tablo değişiklikleri migration ile yapılmalıdır.
     */
    await syncDevelopmentDatabase();

    return sequelize;
  } catch (error) {
    databaseConnected = false;

    logger.error('Veritabanı bağlantısı kurulamadı', {
      name: error.name,
      message: error.message,
      originalCode: error.original?.code,
      stack:
        config.NODE_ENV === 'development'
          ? error.stack
          : undefined,
    });

    /*
     * Veritabanı olmadan uygulamanın çalışmasına izin vermiyoruz.
     * Aksi hâlde API ayakta görünür ama veri işlemleri sürekli hata verir.
     */
    throw error;
  }
};

export const checkDatabaseHealth = async () => {
  const startedAt = Date.now();

  try {
    await sequelize.query('SELECT 1');

    return {
      healthy: true,
      connected: true,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    logger.error('Veritabanı sağlık kontrolü başarısız', {
      name: error.name,
      message: error.message,
    });

    return {
      healthy: false,
      connected: false,
      durationMs: Date.now() - startedAt,
    };
  }
};

export const disconnectDB = async () => {
  if (!databaseConnected) {
    return;
  }

  try {
    await sequelize.close();
    databaseConnected = false;

    logger.info('Veritabanı bağlantıları kapatıldı');
  } catch (error) {
    logger.error('Veritabanı bağlantıları kapatılamadı', {
      name: error.name,
      message: error.message,
    });

    throw error;
  }
};

export default sequelize;