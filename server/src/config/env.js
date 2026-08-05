import dotenv from 'dotenv';

dotenv.config();

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === '') {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
};

const parseList = (value, fallback = []) => {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const config = {
  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInteger(process.env.PORT, 5000),

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN:
    process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // CORS
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CORS_ORIGINS: parseList(
    process.env.CORS_ORIGINS,
    [process.env.CLIENT_URL || 'http://localhost:5173']
  ),

  // Redis
  REDIS_URL: process.env.REDIS_URL || '',
  REDIS_ENABLED: parseBoolean(process.env.REDIS_ENABLED, false),

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-5-mini',
  OPENAI_MAX_OUTPUT_TOKENS: parseInteger(
    process.env.OPENAI_MAX_OUTPUT_TOKENS,
    4000
  ),
  OPENAI_TIMEOUT_MS: parseInteger(
    process.env.OPENAI_TIMEOUT_MS,
    120000
  ),
  OPENAI_MAX_RETRIES: parseInteger(
    process.env.OPENAI_MAX_RETRIES,
    2
  ),
  OPENAI_ENABLED: parseBoolean(process.env.OPENAI_ENABLED, true),
  OPENAI_MOCK_ENABLED: parseBoolean(
    process.env.OPENAI_MOCK_ENABLED,
    false
  ),

  // SMTP
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInteger(process.env.SMTP_PORT, 587),
  SMTP_SECURE: parseBoolean(process.env.SMTP_SECURE, false),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',

  // Brevo
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',

  // MinIO
  MINIO_ENABLED: parseBoolean(process.env.MINIO_ENABLED, false),
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || '',
  MINIO_PORT: parseInteger(process.env.MINIO_PORT, 9000),
  MINIO_USE_SSL: parseBoolean(process.env.MINIO_USE_SSL, false),
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || '',
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || '',
  MINIO_BUCKET: process.env.MINIO_BUCKET || 'legal-documents',

  // Upload
  MAX_FILE_SIZE_MB: parseInteger(
    process.env.MAX_FILE_SIZE_MB,
    10
  ),
  MAX_UPLOAD_FILES: parseInteger(
    process.env.MAX_UPLOAD_FILES,
    5
  ),
};

const validateConfig = () => {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Eksik zorunlu ortam değişkenleri: ${missing.join(', ')}`
    );
  }

  if (
    config.OPENAI_ENABLED &&
    !config.OPENAI_API_KEY &&
    !config.OPENAI_MOCK_ENABLED
  ) {
    throw new Error(
      'OPENAI_ENABLED=true ancak OPENAI_API_KEY tanımlanmamış.'
    );
  }

  if (config.MINIO_ENABLED) {
    const requiredMinioFields = [
      'MINIO_ENDPOINT',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
      'MINIO_BUCKET',
    ];

    const missingMinioFields = requiredMinioFields.filter(
      (key) => !config[key]
    );

    if (missingMinioFields.length > 0) {
      throw new Error(
        `Eksik MinIO ortam değişkenleri: ${missingMinioFields.join(', ')}`
      );
    }
  }

  if (
    config.NODE_ENV === 'production' &&
    config.CLIENT_URL.includes('localhost')
  ) {
    throw new Error(
      'Production ortamında CLIENT_URL localhost olamaz.'
    );
  }
};

validateConfig();

export default config;