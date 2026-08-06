import dotenv from 'dotenv';

dotenv.config();

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
};

const parseBoolean = (
  value,
  fallback = false
) => {
  if (
    value === undefined ||
    value === ''
  ) {
    return fallback;
  }

  return (
    String(value)
      .trim()
      .toLowerCase() === 'true'
  );
};

const parseList = (
  value,
  fallback = []
) => {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const config = {
  /*
   * Application
   */
  NODE_ENV:
    process.env.NODE_ENV ||
    'development',

  PORT: parseInteger(
    process.env.PORT,
    5000
  ),

  /*
   * Database
   */
  DATABASE_URL:
    process.env.DATABASE_URL || '',

  /*
   * JWT
   */
  JWT_SECRET:
    process.env.JWT_SECRET || '',

  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || '',

  JWT_EXPIRES_IN:
    process.env.JWT_EXPIRES_IN ||
    '7d',

  JWT_REFRESH_EXPIRES_IN:
    process.env.JWT_REFRESH_EXPIRES_IN ||
    '30d',

  /*
   * CORS
   */
  CLIENT_URL:
    process.env.CLIENT_URL ||
    'http://localhost:5173',

  CORS_ORIGINS: parseList(
    process.env.CORS_ORIGINS,
    [
      process.env.CLIENT_URL ||
        'http://localhost:5173',
    ]
  ),

  /*
   * Redis
   *
   * Şimdilik memory queue kullanılıyor.
   * Redis daha sonra etkinleştirilebilir.
   */
  REDIS_URL:
    process.env.REDIS_URL || '',

  REDIS_ENABLED: parseBoolean(
    process.env.REDIS_ENABLED,
    false
  ),

  /*
   * OpenAI
   */
  OPENAI_API_KEY:
    process.env.OPENAI_API_KEY || '',

  OPENAI_MODEL:
    process.env.OPENAI_MODEL ||
    'gpt-5-mini',

  OPENAI_MAX_OUTPUT_TOKENS:
    parseInteger(
      process.env
        .OPENAI_MAX_OUTPUT_TOKENS,
      4000
    ),

  OPENAI_TIMEOUT_MS:
    parseInteger(
      process.env.OPENAI_TIMEOUT_MS,
      120000
    ),

  OPENAI_MAX_RETRIES:
    parseInteger(
      process.env.OPENAI_MAX_RETRIES,
      2
    ),

  OPENAI_ENABLED:
    parseBoolean(
      process.env.OPENAI_ENABLED,
      true
    ),

  OPENAI_MOCK_ENABLED:
    parseBoolean(
      process.env.OPENAI_MOCK_ENABLED,
      false
    ),

  /*
   * Brevo Email API
   */
  BREVO_API_KEY:
    process.env.BREVO_API_KEY || '',

  BREVO_SENDER_NAME:
    process.env.BREVO_SENDER_NAME ||
    'Derkenar Hukuk Bürosu Yönetim Sistemi',

  BREVO_SENDER_EMAIL:
    process.env.BREVO_SENDER_EMAIL || '',

  BREVO_TIMEOUT_MS:
    parseInteger(
      process.env.BREVO_TIMEOUT_MS,
      20000
    ),

  BREVO_ENABLED:
    parseBoolean(
      process.env.BREVO_ENABLED,
      true
    ),

  /*
   * MinIO
   */
  MINIO_ENABLED:
    parseBoolean(
      process.env.MINIO_ENABLED,
      false
    ),

  MINIO_ENDPOINT:
    process.env.MINIO_ENDPOINT || '',

  MINIO_PORT:
    parseInteger(
      process.env.MINIO_PORT,
      9000
    ),

  MINIO_USE_SSL:
    parseBoolean(
      process.env.MINIO_USE_SSL,
      false
    ),

  MINIO_ACCESS_KEY:
    process.env.MINIO_ACCESS_KEY || '',

  MINIO_SECRET_KEY:
    process.env.MINIO_SECRET_KEY || '',

  MINIO_BUCKET:
    process.env.MINIO_BUCKET ||
    'legal-documents',

  /*
   * Upload
   */
  MAX_FILE_SIZE_MB:
    parseInteger(
      process.env.MAX_FILE_SIZE_MB,
      10
    ),

  MAX_UPLOAD_FILES:
    parseInteger(
      process.env.MAX_UPLOAD_FILES,
      5
    ),
};

const validateConfig = () => {
  const requiredFields = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missingFields =
    requiredFields.filter(
      (key) => !config[key]
    );

  if (missingFields.length > 0) {
    throw new Error(
      `Eksik zorunlu ortam değişkenleri: ${missingFields.join(
        ', '
      )}`
    );
  }

  /*
   * OpenAI doğrulaması
   */
  if (
    config.OPENAI_ENABLED &&
    !config.OPENAI_API_KEY &&
    !config.OPENAI_MOCK_ENABLED
  ) {
    throw new Error(
      'OPENAI_ENABLED=true ancak OPENAI_API_KEY tanımlanmamış.'
    );
  }

  /*
   * Brevo doğrulaması
   */
  if (config.BREVO_ENABLED) {
    const requiredBrevoFields = [
      'BREVO_API_KEY',
      'BREVO_SENDER_EMAIL',
    ];

    const missingBrevoFields =
      requiredBrevoFields.filter(
        (key) => !config[key]
      );

    if (
      missingBrevoFields.length > 0
    ) {
      throw new Error(
        `Eksik Brevo ortam değişkenleri: ${missingBrevoFields.join(
          ', '
        )}`
      );
    }

    const senderEmailIsValid =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        config.BREVO_SENDER_EMAIL
      );

    if (!senderEmailIsValid) {
      throw new Error(
        'BREVO_SENDER_EMAIL geçerli bir e-posta adresi olmalıdır.'
      );
    }

    if (
      config.BREVO_TIMEOUT_MS < 1000
    ) {
      throw new Error(
        'BREVO_TIMEOUT_MS en az 1000 olmalıdır.'
      );
    }
  }

  /*
   * MinIO doğrulaması
   */
  if (config.MINIO_ENABLED) {
    const requiredMinioFields = [
      'MINIO_ENDPOINT',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
      'MINIO_BUCKET',
    ];

    const missingMinioFields =
      requiredMinioFields.filter(
        (key) => !config[key]
      );

    if (
      missingMinioFields.length > 0
    ) {
      throw new Error(
        `Eksik MinIO ortam değişkenleri: ${missingMinioFields.join(
          ', '
        )}`
      );
    }
  }

  /*
   * Redis doğrulaması
   */
  if (
    config.REDIS_ENABLED &&
    !config.REDIS_URL
  ) {
    throw new Error(
      'REDIS_ENABLED=true ancak REDIS_URL tanımlanmamış.'
    );
  }

  /*
   * Production doğrulamaları
   */
  if (
    config.NODE_ENV ===
      'production' &&
    config.CLIENT_URL.includes(
      'localhost'
    )
  ) {
    throw new Error(
      'Production ortamında CLIENT_URL localhost olamaz.'
    );
  }

  if (
    config.NODE_ENV ===
      'production' &&
    !config.CLIENT_URL.startsWith(
      'https://'
    )
  ) {
    throw new Error(
      'Production ortamında CLIENT_URL HTTPS olmalıdır.'
    );
  }

  /*
   * Sayısal sınırlar
   */
  if (
    config.MAX_FILE_SIZE_MB < 1
  ) {
    throw new Error(
      'MAX_FILE_SIZE_MB en az 1 olmalıdır.'
    );
  }

  if (
    config.MAX_UPLOAD_FILES < 1
  ) {
    throw new Error(
      'MAX_UPLOAD_FILES en az 1 olmalıdır.'
    );
  }
};

validateConfig();

export default config;