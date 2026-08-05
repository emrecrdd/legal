import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { checkDatabaseHealth } from './config/database.js';

import { errorHandler } from './middlewares/error.middleware.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { clientRoutes } from './modules/clients/client.routes.js';
import { caseRoutes } from './modules/cases/case.routes.js';
import { casePartyRoutes } from './modules/case-parties/case-party.routes.js';
import { documentRoutes } from './modules/documents/document.routes.js';
import { taskRoutes } from './modules/tasks/task.routes.js';
import { financeRoutes } from './modules/finance/finance.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { eventRoutes } from './modules/events/event.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { meetingRoutes } from './modules/meetings/meeting.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { auditLogRoutes } from './modules/audit-logs/audit-log.routes.js';
import { powerOfAttorneyRoutes } from './modules/power-of-attorney/powerOfAttorney.routes.js';
import { templateRoutes } from './modules/templates/template.routes.js';

const app = express();

const isProduction = config.NODE_ENV === 'production';

app.disable('x-powered-by');

/*
 * Render, Nginx veya benzeri reverse proxy arkasında
 * gerçek istemci IP adresinin doğru alınmasını sağlar.
 */
app.set('trust proxy', 1);

/*
 * Güvenlik başlıkları.
 *
 * API sunucusunda crossOriginResourcePolicy bazı dosya önizleme
 * senaryolarında sorun çıkarabileceği için cross-origin olarak ayarlanır.
 */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

app.use(cookieParser());

/*
 * CORS
 */
const allowedOrigins = new Set([
  ...config.CORS_ORIGINS,
  config.CLIENT_URL,
  ...(isProduction
    ? []
    : [
        'http://localhost:5173',
        'http://localhost:3000',
      ]),
].filter(Boolean));

const corsOptions = {
  origin(origin, callback) {
    /*
     * Origin olmayan istekler:
     * - curl
     * - Postman
     * - mobil uygulamalar
     * - sunucudan sunucuya istekler
     */
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    logger.warn('CORS isteği engellendi', {
      origin,
    });

    const error = new Error('Bu kaynaktan gelen isteğe izin verilmiyor.');
    error.statusCode = 403;
    error.code = 'CORS_ORIGIN_DENIED';

    return callback(error);
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
  ],

  exposedHeaders: [
    'Content-Disposition',
    'RateLimit',
    'RateLimit-Policy',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
  ],

  maxAge: 86400,
};

app.use(cors(corsOptions));

/*
 * Request body limitleri.
 *
 * Dosyalar JSON body ile değil multer/form-data ile taşınacağı için
 * JSON limitini 10 MB tutmaya gerek yok.
 */
app.use(
  express.json({
    limit: '1mb',
    strict: true,
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb',
    parameterLimit: 1000,
  })
);

/*
 * HTTP logları.
 */
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write(message) {
          logger.info(message.trim());
        },
      },
      skip(req) {
        return req.path === '/health';
      },
    })
  );
}

/*
 * Genel API rate limit.
 *
 * AI route'larında ayrıca daha sıkı limit bulunuyor.
 */
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,

  standardHeaders: 'draft-8',
  legacyHeaders: false,

  skip(req) {
    return req.path === '/health';
  },

  message: {
    success: false,
    message:
      'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
    code: 'API_RATE_LIMIT_EXCEEDED',
  },
});

app.use('/api', apiRateLimiter);

/*
 * Basit liveness kontrolü.
 *
 * Bu endpoint yalnızca Node uygulamasının ayakta olup olmadığını gösterir.
 */
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    service: 'legal-system-api',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/*
 * Veritabanı dahil readiness kontrolü.
 */
app.get('/health/ready', async (req, res) => {
  const database = await checkDatabaseHealth();

  const healthy = database.healthy === true;

  return res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ready' : 'not_ready',
    service: 'legal-system-api',
    checks: {
      database,
    },
    timestamp: new Date().toISOString(),
  });
});

/*
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/case-parties', casePartyRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/power-of-attorney', powerOfAttorneyRoutes);
app.use('/api/templates', templateRoutes);

/*
 * 404
 */
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: 'İstenen API endpoint’i bulunamadı.',
    code: 'ROUTE_NOT_FOUND',
    path: req.originalUrl,
  });
});

/*
 * Global error handler her zaman en sonda olmalıdır.
 */
app.use(errorHandler);

export { app };

export default app;