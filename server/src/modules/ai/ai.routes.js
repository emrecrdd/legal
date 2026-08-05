import express from 'express';
import {
  rateLimit,
  ipKeyGenerator,
} from 'express-rate-limit';

import { aiController } from './ai.controller.js';
import {
  authenticate,
  authorize,
} from '../../middlewares/auth.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

const allowedRoles = authorize(
  ROLES.ADMIN,
  ROLES.LAWYER
);

const createRateLimitKey = (req) => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  return `ip:${ipKeyGenerator(req.ip)}`;
};

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: createRateLimitKey,
  message: {
    success: false,
    message:
      'Çok fazla yapay zekâ isteği gönderildi. Lütfen daha sonra tekrar deneyin.',
    code: 'AI_RATE_LIMIT_EXCEEDED',
  },
});

const expensiveAiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: createRateLimitKey,
  message: {
    success: false,
    message:
      'Belge ve dava analiz limiti aşıldı. Lütfen daha sonra tekrar deneyin.',
    code: 'AI_EXPENSIVE_RATE_LIMIT_EXCEEDED',
  },
});

/*
 * Önce kullanıcı doğrulanır.
 * Böylece rate-limit anahtarı kullanıcı ID'si üzerinden üretilebilir.
 */
router.use(authenticate);
router.use(allowedRoles);
router.use(aiRateLimiter);

/*
 * Document AI
 */

router.post(
  '/documents/:documentId/analyze',
  expensiveAiRateLimiter,
  aiController.analyzeDocument
);

router.post(
  '/documents/:documentId/classify',
  expensiveAiRateLimiter,
  aiController.classifyDocument
);

router.get(
  '/documents/:documentId/analyses',
  aiController.getDocumentAnalyses
);

/*
 * Case AI
 */

router.post(
  '/cases/:caseId/summary',
  expensiveAiRateLimiter,
  aiController.summarizeCase
);

/*
 * Legal research
 */

router.post(
  '/legal-research',
  aiController.generateLegalResearch
);

/*
 * Text entity extraction
 */

router.post(
  '/entities',
  aiController.extractEntities
);

/*
 * Draft generation
 */

router.post(
  '/drafts',
  aiController.generateDraft
);

/*
 * AI history
 */

router.get(
  '/analyses/:analysisId',
  aiController.getAnalysisById
);

export { router as aiRoutes };

export default router;