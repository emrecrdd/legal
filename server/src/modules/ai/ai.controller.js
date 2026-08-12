import { aiService, AIServiceError } from './ai.service.js';

import {
  successResponse,
  errorResponse,
} from '../../utils/response.js';

import { logger } from '../../config/logger.js';
import { AuditLog } from '../../models/AuditLog.js';

const parseBoolean = (
  value,
  fallback = false
) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return (
    String(value)
      .trim()
      .toLowerCase() === 'true'
  );
};

const getRequestContext = (req) => ({
  userId: req.user?.id || null,
  ipAddress: req.ip || null,
  userAgent:
    req.get('user-agent') || null,
});

const createAuditLogSafely = async ({
  req,
  action,
  entityType,
  entityId,
  description,
  metadata = {},
}) => {
  try {
    const context =
      getRequestContext(req);

    await AuditLog.create({
      action,
      entity_type: entityType,
      entity_id: entityId,
      user_id: context.userId,
      description,
      ip_address:
        context.ipAddress,
      user_agent:
        context.userAgent,
      metadata,
    });
  } catch (error) {
    /*
     * Audit log hatası başarılı AI işlemini
     * kullanıcı açısından başarısız yapmamalı.
     */
    logger.error(
      'AI audit log kaydedilemedi',
      {
        action,
        entityType,
        entityId,
        userId: req.user?.id,
        message: error.message,
      }
    );
  }
};

const handleControllerError = (
  res,
  error,
  operation
) => {
  const statusCode =
    error instanceof AIServiceError
      ? error.statusCode
      : Number(error?.statusCode) ||
        500;

  const code =
    error instanceof AIServiceError
      ? error.code
      : error?.code ||
        'INTERNAL_SERVER_ERROR';

  logger.error(
    `AI controller hatası: ${operation}`,
    {
      name: error?.name,
      code,
      statusCode,
      message: error?.message,

      requestId:
        error?.requestId ||
        null,

      retryable:
        error?.retryable ===
        true,

      stack:
        process.env.NODE_ENV ===
        'development'
          ? error?.stack
          : undefined,
    }
  );

  return errorResponse(
    res,
    error?.message ||
      'Yapay zekâ işlemi tamamlanamadı.',
    statusCode,
    {
      code,

      requestId:
        error?.requestId ||
        null,

      retryable:
        error?.retryable ===
        true,
    }
  );
};

export const aiController = {
  /**
   * Sistemde daha önce yüklenmiş
   * bir belgeyi analiz eder.
   *
   * POST /ai/documents/:documentId/analyze
   */
  async analyzeDocument(
    req,
    res
  ) {
    try {
      const {
        documentId,
      } = req.params;

      const force =
        parseBoolean(
          req.body?.force,
          false
        );

      const result =
        await aiService.analyzeDocument({
          documentId,
          userId:
            req.user.id,
          force,
        });

      await createAuditLogSafely({
        req,

        action: 'create',

        entityType:
          'ai_analysis',

        entityId:
          result.id,

        description:
          'AI belge analizi gerçekleştirildi',

        metadata: {
          analysisType:
            result.type,

          documentId,

          cached:
            result.cached,

          model:
            result.model,

          totalTokens:
            result.usage
              ?.totalTokens ||
            0,

          durationMs:
            result.durationMs ||
            null,
        },
      });

      return successResponse(
        res,
        result,

        result.cached
          ? 'Kayıtlı belge analizi getirildi'
          : 'Belge analizi tamamlandı',

        result.cached
          ? 200
          : 201
      );
    } catch (error) {
      return handleControllerError(
        res,
        error,
        'analyzeDocument'
      );
    }
  },
async analyzeCaseCompletion(req, res) {
  try {
    const { caseId } = req.params;

    const force =
      parseBoolean(
        req.body?.force,
        false
      );

    const result =
      await aiService.analyzeCaseCompletion({
        caseId,
        userId:
          req.user.id,
        force,
      });

    await createAuditLogSafely({
      req,
      action: 'create',
      entityType: 'ai_analysis',
      entityId: result.id,
      description:
        'AI dava tamamlama analizi oluşturuldu',

      metadata: {
        analysisType:
          result.type,

        caseId,

        cached:
          result.cached,

        model:
          result.model,

        totalTokens:
          result.usage
            ?.totalTokens || 0,

        durationMs:
          result.durationMs || null,
      },
    });

    return successResponse(
      res,
      result,

      result.cached
        ? 'Kayıtlı dava tamamlama analizi getirildi'
        : 'Dava tamamlama analizi oluşturuldu',

      result.cached
        ? 200
        : 201
    );
  } catch (error) {
    return handleControllerError(
      res,
      error,
      'analyzeCaseCompletion'
    );
  }
},
  /**
   * Sistemde kayıtlı belgeyi
   * sınıflandırır.
   *
   * POST /ai/documents/:documentId/classify
   */
  async classifyDocument(
    req,
    res
  ) {
    try {
      const {
        documentId,
      } = req.params;

      const force =
        parseBoolean(
          req.body?.force,
          false
        );

      const result =
        await aiService.classifyDocument({
          documentId,
          userId:
            req.user.id,
          force,
        });

      await createAuditLogSafely({
        req,

        action: 'create',

        entityType:
          'ai_analysis',

        entityId:
          result.id,

        description:
          'AI belge sınıflandırması gerçekleştirildi',

        metadata: {
          analysisType:
            result.type,

          documentId,

          cached:
            result.cached,

          model:
            result.model,

          totalTokens:
            result.usage
              ?.totalTokens ||
            0,

          durationMs:
            result.durationMs ||
            null,
        },
      });

      return successResponse(
        res,
        result,

        result.cached
          ? 'Kayıtlı belge sınıflandırması getirildi'
          : 'Belge sınıflandırıldı',

        result.cached
          ? 200
          : 201
      );
    } catch (error) {
      return handleControllerError(
        res,
        error,
        'classifyDocument'
      );
    }
  },

  /**
   * Dava dosyasını görevler,
   * duruşmalar, toplantılar,
   * belgeler, taraflar ve notlarla
   * birlikte analiz eder.
   *
   * POST /ai/cases/:caseId/summary
   */
  async summarizeCase(
    req,
    res
  ) {
    try {
      const {
        caseId,
      } = req.params;

      /*
       * Hem body hem query destekliyoruz.
       *
       * POST .../summary
       * body: { force: true }
       *
       * veya
       *
       * POST .../summary?force=true
       */
      const force =
        parseBoolean(
          req.body?.force ??
            req.query?.force,
          false
        );

      const result =
        await aiService.summarizeCase({
          caseId,
          userId:
            req.user.id,
          force,
        });

      await createAuditLogSafely({
        req,

        action: 'create',

        entityType:
          'ai_analysis',

        entityId:
          result.id,

        description:
          result.cached
            ? 'Kayıtlı AI dava özeti görüntülendi'
            : 'AI dava özeti oluşturuldu',

        metadata: {
          analysisType:
            result.type,

          caseId,

          cached:
            result.cached,

          model:
            result.model,

          confidence:
            result.confidence ??
            null,

          totalTokens:
            result.usage
              ?.totalTokens ||
            0,

          durationMs:
            result.durationMs ||
            null,

          promptVersion:
            result.promptVersion ||
            null,
        },
      });

      return successResponse(
        res,
        result,

        result.cached
          ? 'Kayıtlı dava özeti getirildi'
          : 'Dava AI analizi tamamlandı',

        result.cached
          ? 200
          : 201
      );
    } catch (error) {
      return handleControllerError(
        res,
        error,
        'summarizeCase'
      );
    }
  },

  /**
   * Hukuki soru için avukat
   * kontrolüne tabi ön değerlendirme
   * üretir.
   *
   * POST /ai/legal-research
   */
  async generateLegalResearch(
    req,
    res
  ) {
    try {
      const {
        query,
        context = '',
      } = req.body;

      const result =
        await aiService.generateLegalResearch({
          query,
          context,
          userId:
            req.user.id,
        });

      await createAuditLogSafely({
        req,

        action: 'create',

        entityType:
          'ai_analysis',

        entityId:
          result.id,

        description:
          'AI hukuki ön değerlendirme oluşturuldu',

        metadata: {
          analysisType:
            result.type,

          model:
            result.model,

          totalTokens:
            result.usage
              ?.totalTokens ||
            0,

          durationMs:
            result.durationMs ||
            null,
        },
      });

      return successResponse(
        res,
        result,
        'Hukuki ön değerlendirme oluşturuldu',
        201
      );
    } catch (error) {
      return handleControllerError(
        res,
        error,
        'generateLegalResearch'
      );
    }
  },

  /**
   * Verilen hukuki metindeki kişi,
   * kurum, tarih ve tutarları çıkarır.
   *
   * POST /ai/entities
   */
  async extractEntities(
    req,
    res
  ) {
    try {
      const {
        text,
        documentId = null,
      } = req.body;

      const result =
        await aiService.extractEntities({
          text,
          documentId,
          userId:
            req.user.id,
        });

      await createAuditLogSafely({
        req,

        action: 'create',

        entityType:
          'ai_analysis',

        entityId:
          result.id,

        description:
          'AI hukuki varlık çıkarımı gerçekleştirildi',

        metadata: {
          analysisType:
            result.type,

          documentId,

          model:
            result.model,

          totalTokens:
            result.usage
              ?.totalTokens ||
            0,

          durationMs:
            result.durationMs ||
            null,
        },
      });

      return successResponse(
        res,
        result,
        'Hukuki varlıklar çıkarıldı',
        201
      );
    } catch (error) {
      return handleControllerError(
        res,
        error,
        'extractEntities'
      );
    }
  },

  /**
   * Dilekçe, sözleşme veya
   * ihtarname taslağı oluşturur.
   *
   * POST /ai/drafts
   */
  async generateDraft(
    req,
    res
  ) {
    try {
      const {
        type,
        data,
        caseId = null,
      } = req.body;

      const result =
        await aiService.generateDraft({
          type,
          data,
          caseId,
          userId:
            req.user.id,
        });

      await createAuditLogSafely({
        req,

        action: 'create',

        entityType:
          'ai_analysis',

        entityId:
          result.id,

        description:
          `AI ${type} taslağı oluşturuldu`,

        metadata: {
          analysisType:
            result.type,

          draftType:
            type,

          caseId,

          model:
            result.model,

          totalTokens:
            result.usage
              ?.totalTokens ||
            0,

          durationMs:
            result.durationMs ||
            null,
        },
      });

      return successResponse(
        res,
        result,
        'Hukuki belge taslağı oluşturuldu',
        201
      );
    } catch (error) {
      return handleControllerError(
        res,
        error,
        'generateDraft'
      );
    }
  },

  /**
   * Tek bir AI analiz kaydını
   * getirir.
   *
   * GET /ai/analyses/:analysisId
   */
  async getAnalysisById(
    req,
    res
  ) {
    try {
      const {
        analysisId,
      } = req.params;

      const result =
        await aiService.getAnalysisById({
          analysisId,
          userId:
            req.user.id,
        });

      return successResponse(
        res,
        result,
        'AI analiz kaydı getirildi'
      );
    } catch (error) {
      return handleControllerError(
        res,
        error,
        'getAnalysisById'
      );
    }
  },

  /**
   * Bir belgeye ait analiz
   * geçmişini getirir.
   *
   * GET /ai/documents/:documentId/analyses
   */
  async getDocumentAnalyses(
    req,
    res
  ) {
    try {
      const {
        documentId,
      } = req.params;

      const {
        limit = 20,
      } = req.query;

      const analyses =
        await aiService.getDocumentAnalyses({
          documentId,
          userId:
            req.user.id,
          limit,
        });

      return successResponse(
        res,
        analyses,
        'Belge analiz geçmişi getirildi'
      );
    } catch (error) {
      return handleControllerError(
        res,
        error,
        'getDocumentAnalyses'
      );
    }
  },
};

export default aiController;