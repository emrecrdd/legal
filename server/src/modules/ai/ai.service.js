import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';

import { aiProvider, AIProviderError } from '../../integrations/ai.provider.js';

import { AIAnalysis } from '../../models/AIAnalysis.js';
import { Case } from '../../models/Case.js';
import { CaseParty } from '../../models/CaseParty.js';
import { Client } from '../../models/Client.js';
import { Document } from '../../models/Document.js';
import { Event } from '../../models/Event.js';
import { Meeting } from '../../models/Meeting.js';
import { Note } from '../../models/Note.js';
import { Task } from '../../models/Task.js';

import {
  caseSummarySchema,
  documentAnalysisSchema,
  documentClassificationSchema,
  draftGenerationSchema,
  entityExtractionSchema,
  legalResearchSchema,
} from './ai.schemas.js';

import {
  CASE_SUMMARY_PROMPT,
  DOCUMENT_ANALYSIS_PROMPT,
  DOCUMENT_CLASSIFICATION_PROMPT,
  ENTITY_EXTRACTION_PROMPT,
  LEGAL_RESEARCH_PROMPT,
  buildCaseSummaryInput,
  buildDraftInput,
  buildEntityExtractionInput,
  buildLegalResearchInput,
  getDraftPrompt,
} from './ai.prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIRECTORY = path.resolve(__dirname, '../../../uploads');

const PROMPT_VERSION = 'v1';

const ANALYSIS_TYPES = Object.freeze({
  DOCUMENT_ANALYSIS: 'document_analysis',
  DOCUMENT_CLASSIFICATION: 'document_classification',
  ENTITY_EXTRACTION: 'entity_extraction',
  CASE_SUMMARY: 'case_summary',
  LEGAL_RESEARCH: 'legal_research',
  DRAFT_GENERATION: 'draft_generation',
});

const DRAFT_TYPES = Object.freeze([
  'petition',
  'contract',
  'notice',
]);

const MAX_TEXT_INPUT_LENGTH = 100_000;

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'refresh_token',
  'refreshToken',
  'access_token',
  'accessToken',
  'reset_token',
  'resetToken',
  'verification_token',
  'verificationToken',
  'jwt',
  'secret',
]);

export class AIServiceError extends Error {
  constructor(
    message,
    {
      code = 'AI_SERVICE_ERROR',
      statusCode = 500,
      cause = null,
    } = {}
  ) {
    super(message);

    this.name = 'AIServiceError';
    this.code = code;
    this.statusCode = statusCode;

    if (cause) {
      this.cause = cause;
    }

    Error.captureStackTrace?.(this, AIServiceError);
  }
}

class AIService {
  /**
   * Kayıtlı bir belgeyi documentId üzerinden analiz eder.
   *
   * @param {object} params
   * @param {string} params.documentId
   * @param {string} params.userId
   * @param {boolean} [params.force=false]
   */
  async analyzeDocument({
    documentId,
    userId,
    force = false,
  }) {
    this.validateUuidLike(documentId, 'documentId');
    this.validateUuidLike(userId, 'userId');

    const document = await this.getDocument(documentId);
    const file = await this.readDocumentFile(document);
    const inputHash = this.createInputHash({
      buffer: file.buffer,
      operation: ANALYSIS_TYPES.DOCUMENT_ANALYSIS,
      promptVersion: PROMPT_VERSION,
    });

    if (!force) {
      const cached = await this.findCachedAnalysis({
        analysisType: ANALYSIS_TYPES.DOCUMENT_ANALYSIS,
        documentId,
        inputHash,
      });

      if (cached) {
        return this.formatAnalysisResponse(cached, true);
      }
    }

    const analysis = await this.createPendingAnalysis({
      analysisType: ANALYSIS_TYPES.DOCUMENT_ANALYSIS,
      documentId,
      caseId: document.case_id,
      userId,
      inputHash,
      metadata: {
        documentName: document.original_name,
        mimeType: document.mime_type,
        fileSize: document.file_size,
      },
    });

    let openAIFileId = null;

    try {
      const uploadedFile = await aiProvider.uploadFile({
        buffer: file.buffer,
        filename: document.original_name,
        mimeType: document.mime_type,
      });

      openAIFileId = uploadedFile.id;

      const providerResult =
        await aiProvider.createStructuredFileResponse({
          fileId: openAIFileId,
          instructions: DOCUMENT_ANALYSIS_PROMPT,
          prompt:
            'Bu dosyanın tamamını incele ve tanımlanan şemaya göre hukuki belge analizi oluştur.',
          schemaName: 'legal_document_analysis',
          schema: documentAnalysisSchema,
          schemaDescription:
            'Hukuki belgenin yapılandırılmış analiz sonucu.',
          metadata: {
            operation: ANALYSIS_TYPES.DOCUMENT_ANALYSIS,
            analysisId: analysis.id,
            documentId,
            userId,
          },
        });

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: providerResult.output.confidence,
        metadata: {
          ...analysis.metadata,
          openAIFileId,
        },
      });

      logger.info('Hukuki belge analizi tamamlandı', {
        analysisId: analysis.id,
        documentId,
        userId,
        model: providerResult.model,
        durationMs: providerResult.durationMs,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Belge analizi tamamlanamadı.'
      );
    } finally {
      if (openAIFileId) {
        await aiProvider.deleteFile(openAIFileId);
      }
    }
  }

  /**
   * Kayıtlı belgeyi ayrı bir işlem olarak sınıflandırır.
   *
   * Ana belge analizi zaten documentType alanını döndürür.
   * Bu metot yalnızca hızlı ve bağımsız sınıflandırma gereken
   * ekranlar için tutulmaktadır.
   */
  async classifyDocument({
    documentId,
    userId,
    force = false,
  }) {
    this.validateUuidLike(documentId, 'documentId');
    this.validateUuidLike(userId, 'userId');

    const document = await this.getDocument(documentId);
    const file = await this.readDocumentFile(document);
    const inputHash = this.createInputHash({
      buffer: file.buffer,
      operation: ANALYSIS_TYPES.DOCUMENT_CLASSIFICATION,
      promptVersion: PROMPT_VERSION,
    });

    if (!force) {
      const cached = await this.findCachedAnalysis({
        analysisType:
          ANALYSIS_TYPES.DOCUMENT_CLASSIFICATION,
        documentId,
        inputHash,
      });

      if (cached) {
        return this.formatAnalysisResponse(cached, true);
      }
    }

    const analysis = await this.createPendingAnalysis({
      analysisType:
        ANALYSIS_TYPES.DOCUMENT_CLASSIFICATION,
      documentId,
      caseId: document.case_id,
      userId,
      inputHash,
      metadata: {
        documentName: document.original_name,
        mimeType: document.mime_type,
      },
    });

    let openAIFileId = null;

    try {
      const uploadedFile = await aiProvider.uploadFile({
        buffer: file.buffer,
        filename: document.original_name,
        mimeType: document.mime_type,
      });

      openAIFileId = uploadedFile.id;

      const providerResult =
        await aiProvider.createStructuredFileResponse({
          fileId: openAIFileId,
          instructions: DOCUMENT_CLASSIFICATION_PROMPT,
          prompt:
            'Bu dosyanın hukuki belge türünü sınıflandır.',
          schemaName: 'legal_document_classification',
          schema: documentClassificationSchema,
          schemaDescription:
            'Hukuki belgenin sınıflandırma sonucu.',
          metadata: {
            operation:
              ANALYSIS_TYPES.DOCUMENT_CLASSIFICATION,
            analysisId: analysis.id,
            documentId,
            userId,
          },
        });

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: providerResult.output.confidence,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Belge sınıflandırılamadı.'
      );
    } finally {
      if (openAIFileId) {
        await aiProvider.deleteFile(openAIFileId);
      }
    }
  }

  /**
   * Dava kaydından kapsamlı özet oluşturur.
   */
  async summarizeCase({
    caseId,
    userId,
    force = false,
  }) {
    this.validateUuidLike(caseId, 'caseId');
    this.validateUuidLike(userId, 'userId');

    const caseRecord = await this.getCaseWithContext(caseId);
    const casePayload = this.prepareCasePayload(caseRecord);
    const input = buildCaseSummaryInput(casePayload);

    const inputHash = this.createInputHash({
      text: input,
      operation: ANALYSIS_TYPES.CASE_SUMMARY,
      promptVersion: PROMPT_VERSION,
    });

    if (!force) {
      const cached = await this.findCachedAnalysis({
        analysisType: ANALYSIS_TYPES.CASE_SUMMARY,
        caseId,
        inputHash,
      });

      if (cached) {
        return this.formatAnalysisResponse(cached, true);
      }
    }

    const analysis = await this.createPendingAnalysis({
      analysisType: ANALYSIS_TYPES.CASE_SUMMARY,
      caseId,
      userId,
      inputHash,
      metadata: {
        caseTitle:
          caseRecord.title ||
          caseRecord.case_number ||
          null,
      },
    });

    try {
      const providerResult =
        await aiProvider.createStructuredResponse({
          instructions: CASE_SUMMARY_PROMPT,
          input,
          schemaName: 'legal_case_summary',
          schema: caseSummarySchema,
          schemaDescription:
            'Dava dosyasının yapılandırılmış hukuki özeti.',
          metadata: {
            operation: ANALYSIS_TYPES.CASE_SUMMARY,
            analysisId: analysis.id,
            caseId,
            userId,
          },
        });

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: providerResult.output.confidence,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Dava özeti oluşturulamadı.'
      );
    }
  }

  /**
   * Hukuki soru hakkında kaynak doğrulaması gerektiren
   * bir ön değerlendirme oluşturur.
   */
  async generateLegalResearch({
    query,
    context = '',
    userId,
  }) {
    this.validateUuidLike(userId, 'userId');
    this.validateRequiredText(query, 'query', 10_000);
    this.validateOptionalText(context, 'context', 50_000);

    const input = buildLegalResearchInput({
      query: query.trim(),
      context: context.trim(),
    });

    const inputHash = this.createInputHash({
      text: input,
      operation: ANALYSIS_TYPES.LEGAL_RESEARCH,
      promptVersion: PROMPT_VERSION,
    });

    const analysis = await this.createPendingAnalysis({
      analysisType: ANALYSIS_TYPES.LEGAL_RESEARCH,
      userId,
      inputHash,
      metadata: {
        queryPreview: query.trim().slice(0, 250),
      },
    });

    try {
      const providerResult =
        await aiProvider.createStructuredResponse({
          instructions: LEGAL_RESEARCH_PROMPT,
          input,
          schemaName: 'legal_research_assessment',
          schema: legalResearchSchema,
          schemaDescription:
            'Avukat kontrolüne tabi hukuki ön değerlendirme.',
          metadata: {
            operation: ANALYSIS_TYPES.LEGAL_RESEARCH,
            analysisId: analysis.id,
            userId,
          },
        });

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: providerResult.output.confidence,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Hukuki ön değerlendirme oluşturulamadı.'
      );
    }
  }

  /**
   * Hukuki metinden kişi, kurum, tarih, tutar ve benzeri
   * varlıkları yapılandırılmış biçimde çıkarır.
   */
  async extractEntities({
    text,
    userId,
    documentId = null,
  }) {
    this.validateUuidLike(userId, 'userId');

    if (documentId) {
      this.validateUuidLike(documentId, 'documentId');
    }

    this.validateRequiredText(
      text,
      'text',
      MAX_TEXT_INPUT_LENGTH
    );

    const normalizedText = text.trim();
    const input = buildEntityExtractionInput(normalizedText);

    const inputHash = this.createInputHash({
      text: input,
      operation: ANALYSIS_TYPES.ENTITY_EXTRACTION,
      promptVersion: PROMPT_VERSION,
    });

    const analysis = await this.createPendingAnalysis({
      analysisType: ANALYSIS_TYPES.ENTITY_EXTRACTION,
      documentId,
      userId,
      inputHash,
      metadata: {
        characterCount: normalizedText.length,
      },
    });

    try {
      const providerResult =
        await aiProvider.createStructuredResponse({
          instructions: ENTITY_EXTRACTION_PROMPT,
          input,
          schemaName: 'legal_entity_extraction',
          schema: entityExtractionSchema,
          schemaDescription:
            'Hukuki metinden çıkarılan yapılandırılmış varlıklar.',
          metadata: {
            operation: ANALYSIS_TYPES.ENTITY_EXTRACTION,
            analysisId: analysis.id,
            documentId: documentId || 'none',
            userId,
          },
        });

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: providerResult.output.confidence,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Metindeki hukuki varlıklar çıkarılamadı.'
      );
    }
  }

  /**
   * Dilekçe, sözleşme veya ihtarname taslağı oluşturur.
   */
  async generateDraft({
    type,
    data,
    userId,
    caseId = null,
  }) {
    this.validateUuidLike(userId, 'userId');

    if (caseId) {
      this.validateUuidLike(caseId, 'caseId');
    }

    if (!DRAFT_TYPES.includes(type)) {
      throw new AIServiceError(
        `Desteklenmeyen taslak türü: ${type}`,
        {
          code: 'UNSUPPORTED_DRAFT_TYPE',
          statusCode: 400,
        }
      );
    }

    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data)
    ) {
      throw new AIServiceError(
        'Taslak oluşturmak için geçerli data nesnesi zorunludur.',
        {
          code: 'INVALID_DRAFT_DATA',
          statusCode: 400,
        }
      );
    }

    const sanitizedData = this.removeSensitiveFields(data);
    const input = buildDraftInput({
      type,
      data: sanitizedData,
    });

    const inputHash = this.createInputHash({
      text: input,
      operation: `${ANALYSIS_TYPES.DRAFT_GENERATION}:${type}`,
      promptVersion: PROMPT_VERSION,
    });

    const analysis = await this.createPendingAnalysis({
      analysisType: ANALYSIS_TYPES.DRAFT_GENERATION,
      caseId,
      userId,
      inputHash,
      metadata: {
        draftType: type,
      },
    });

    try {
      const providerResult =
        await aiProvider.createStructuredResponse({
          instructions: getDraftPrompt(type),
          input,
          schemaName: `legal_${type}_draft`,
          schema: draftGenerationSchema,
          schemaDescription:
            'Avukat incelemesine tabi hukuki belge taslağı.',
          metadata: {
            operation: ANALYSIS_TYPES.DRAFT_GENERATION,
            draftType: type,
            analysisId: analysis.id,
            caseId: caseId || 'none',
            userId,
          },
        });

      await this.completeAnalysis({
        analysis,
        providerResult,
        confidence: null,
      });

      return this.formatAnalysisResponse(analysis, false);
    } catch (error) {
      await this.failAnalysis(analysis, error);

      throw this.normalizeServiceError(
        error,
        'Hukuki belge taslağı oluşturulamadı.'
      );
    }
  }

  async getAnalysisById({
    analysisId,
    userId,
  }) {
    this.validateUuidLike(analysisId, 'analysisId');
    this.validateUuidLike(userId, 'userId');

    const analysis = await AIAnalysis.findOne({
      where: {
        id: analysisId,
        user_id: userId,
      },
      include: [
        {
          model: Document,
          as: 'document',
          attributes: [
            'id',
            'name',
            'original_name',
            'mime_type',
            'file_type',
            'case_id',
          ],
          required: false,
        },
        {
          model: Case,
          as: 'case',
          attributes: [
            'id',
            'title',
          ],
          required: false,
        },
      ],
    });

    if (!analysis) {
      throw new AIServiceError(
        'Yapay zekâ analiz kaydı bulunamadı.',
        {
          code: 'AI_ANALYSIS_NOT_FOUND',
          statusCode: 404,
        }
      );
    }

    return this.formatAnalysisResponse(analysis, false);
  }

  async getDocumentAnalyses({
    documentId,
    userId,
    limit = 20,
  }) {
    this.validateUuidLike(documentId, 'documentId');
    this.validateUuidLike(userId, 'userId');

    const safeLimit = Math.min(
      Math.max(Number.parseInt(limit, 10) || 20, 1),
      100
    );

    return AIAnalysis.findAll({
      where: {
        document_id: documentId,
        user_id: userId,
      },
      order: [['created_at', 'DESC']],
      limit: safeLimit,
    });
  }

  async getDocument(documentId) {
    const document = await Document.findByPk(documentId);

    if (!document) {
      throw new AIServiceError('Belge bulunamadı.', {
        code: 'DOCUMENT_NOT_FOUND',
        statusCode: 404,
      });
    }

    if (document.is_archived) {
      throw new AIServiceError(
        'Arşivlenmiş belge analiz edilemez.',
        {
          code: 'DOCUMENT_ARCHIVED',
          statusCode: 409,
        }
      );
    }

    return document;
  }

  async getCaseWithContext(caseId) {
    const caseRecord = await Case.findByPk(caseId, {
      include: [
        {
          model: Client,
          as: 'clients',
          required: false,
        },
        {
          model: CaseParty,
          as: 'parties',
          required: false,
        },
        {
          model: Document,
          as: 'documents',
          required: false,
          attributes: [
            'id',
            'name',
            'original_name',
            'file_type',
            'category',
            'description',
            'created_at',
          ],
        },
        {
          model: Task,
          as: 'tasks',
          required: false,
        },
        {
          model: Event,
          as: 'events',
          required: false,
        },
        {
          model: Note,
          as: 'notes',
          required: false,
        },
        {
          model: Meeting,
          as: 'meetings',
          required: false,
        },
      ],
    });

    if (!caseRecord) {
      throw new AIServiceError('Dava bulunamadı.', {
        code: 'CASE_NOT_FOUND',
        statusCode: 404,
      });
    }

    return caseRecord;
  }

  prepareCasePayload(caseRecord) {
    const rawData = caseRecord.toJSON();
    const sanitized = this.removeSensitiveFields(rawData);

    /*
     * AI'ye gereksiz teknik Sequelize alanlarını göndermiyoruz.
     * Dava metadatası içinde hassas alanlar varsa onları da
     * removeSensitiveFields temizler.
     */
    return {
      id: sanitized.id,
      title: sanitized.title || null,
      caseNumber:
        sanitized.case_number ||
        sanitized.caseNumber ||
        null,
      caseType:
        sanitized.case_type ||
        sanitized.caseType ||
        null,
      status: sanitized.status || null,
      description: sanitized.description || null,
      court: sanitized.court || null,
      opposingParty:
        sanitized.opposing_party ||
        sanitized.opposingParty ||
        null,
      filingDate:
        sanitized.filing_date ||
        sanitized.filingDate ||
        null,
      hearingDate:
        sanitized.hearing_date ||
        sanitized.hearingDate ||
        null,
      clients: sanitized.clients || [],
      parties: sanitized.parties || [],
      documents: sanitized.documents || [],
      tasks: sanitized.tasks || [],
      events: sanitized.events || [],
      notes: sanitized.notes || [],
      meetings: sanitized.meetings || [],
    };
  }

  async readDocumentFile(document) {
    if (!document.file_path) {
      throw new AIServiceError(
        'Belgenin dosya yolu bulunamadı.',
        {
          code: 'DOCUMENT_FILE_PATH_MISSING',
          statusCode: 422,
        }
      );
    }

    /*
     * Şu an DocumentService local uploads klasörü kullanıyor.
     * MinIO entegrasyonunda bu metot storage adapter üzerinden
     * okuyacak şekilde değiştirilecek.
     */
    const resolvedPath = path.resolve(
      UPLOAD_DIRECTORY,
      document.file_path
    );

    const relativePath = path.relative(
      UPLOAD_DIRECTORY,
      resolvedPath
    );

    if (
      relativePath.startsWith('..') ||
      path.isAbsolute(relativePath)
    ) {
      throw new AIServiceError(
        'Geçersiz belge dosya yolu.',
        {
          code: 'INVALID_DOCUMENT_PATH',
          statusCode: 400,
        }
      );
    }

    try {
      const buffer = await fs.readFile(resolvedPath);

      if (buffer.length === 0) {
        throw new AIServiceError('Belge dosyası boş.', {
          code: 'EMPTY_DOCUMENT_FILE',
          statusCode: 422,
        });
      }

      return {
        buffer,
        absolutePath: resolvedPath,
      };
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }

      if (error.code === 'ENOENT') {
        throw new AIServiceError(
          'Belge dosyası depolama alanında bulunamadı.',
          {
            code: 'DOCUMENT_FILE_NOT_FOUND',
            statusCode: 404,
            cause: error,
          }
        );
      }

      throw new AIServiceError(
        'Belge dosyası okunamadı.',
        {
          code: 'DOCUMENT_FILE_READ_ERROR',
          statusCode: 500,
          cause: error,
        }
      );
    }
  }

  createInputHash({
    buffer,
    text,
    operation,
    promptVersion,
  }) {
    const hash = crypto.createHash('sha256');

    hash.update(operation);
    hash.update(':');
    hash.update(promptVersion);

    if (buffer) {
      hash.update(buffer);
    }

    if (text) {
      hash.update(text);
    }

    return hash.digest('hex');
  }

  async findCachedAnalysis({
    analysisType,
    documentId = null,
    caseId = null,
    inputHash,
  }) {
    return AIAnalysis.findOne({
      where: {
        analysis_type: analysisType,
        status: 'completed',
        input_hash: inputHash,
        ...(documentId
          ? { document_id: documentId }
          : {}),
        ...(caseId ? { case_id: caseId } : {}),
      },
      order: [['created_at', 'DESC']],
    });
  }

  async createPendingAnalysis({
    analysisType,
    userId,
    inputHash,
    documentId = null,
    caseId = null,
    metadata = {},
  }) {
    return AIAnalysis.create({
      document_id: documentId,
      case_id: caseId,
      user_id: userId,
      analysis_type: analysisType,
      provider: 'openai',
      model: config.OPENAI_MODEL,
      status: 'pending',
      input_hash: inputHash,
      prompt_version: PROMPT_VERSION,
      metadata,
    });
  }

  async completeAnalysis({
    analysis,
    providerResult,
    confidence = null,
    metadata,
  }) {
    await analysis.update({
      status: 'completed',
      model: providerResult.model,
      openai_response_id: providerResult.responseId,
      confidence:
        typeof confidence === 'number'
          ? confidence
          : null,
      duration_ms: providerResult.durationMs,
      input_tokens:
        providerResult.usage?.inputTokens || 0,
      output_tokens:
        providerResult.usage?.outputTokens || 0,
      total_tokens:
        providerResult.usage?.totalTokens || 0,
      result: providerResult.output,
      error_message: null,
      metadata: metadata || analysis.metadata || {},
    });

    return analysis;
  }

  async failAnalysis(analysis, error) {
    try {
      await analysis.update({
        status: 'failed',
        error_message: this.getSafeErrorMessage(error),
        metadata: {
          ...(analysis.metadata || {}),
          errorCode:
            error?.code || 'AI_PROCESSING_ERROR',
          retryable:
            error?.retryable === true,
          requestId:
            error?.requestId || null,
        },
      });
    } catch (updateError) {
      logger.error(
        'Başarısız AI analiz kaydı güncellenemedi',
        {
          analysisId: analysis?.id,
          message: updateError.message,
        }
      );
    }
  }

  formatAnalysisResponse(analysis, cached) {
    const plain =
      typeof analysis.toJSON === 'function'
        ? analysis.toJSON()
        : analysis;

    return {
      id: plain.id,
      type: plain.analysis_type,
      status: plain.status,
      result: plain.result,
      confidence: plain.confidence,
      model: plain.model,
      usage: {
        inputTokens: plain.input_tokens || 0,
        outputTokens: plain.output_tokens || 0,
        totalTokens: plain.total_tokens || 0,
      },
      durationMs: plain.duration_ms,
      documentId: plain.document_id,
      caseId: plain.case_id,
      promptVersion: plain.prompt_version,
      cached,
      createdAt:
        plain.created_at ||
        plain.createdAt ||
        null,
      updatedAt:
        plain.updated_at ||
        plain.updatedAt ||
        null,
    };
  }

  removeSensitiveFields(value) {
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.removeSensitiveFields(item)
      );
    }

    if (
      !value ||
      typeof value !== 'object' ||
      value instanceof Date
    ) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !SENSITIVE_KEYS.has(key))
        .map(([key, nestedValue]) => [
          key,
          this.removeSensitiveFields(nestedValue),
        ])
    );
  }

  validateRequiredText(
    value,
    fieldName,
    maxLength
  ) {
    if (
      typeof value !== 'string' ||
      value.trim().length === 0
    ) {
      throw new AIServiceError(
        `${fieldName} alanı zorunludur.`,
        {
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        }
      );
    }

    if (value.length > maxLength) {
      throw new AIServiceError(
        `${fieldName} alanı en fazla ${maxLength} karakter olabilir.`,
        {
          code: 'INPUT_TOO_LARGE',
          statusCode: 413,
        }
      );
    }
  }

  validateOptionalText(
    value,
    fieldName,
    maxLength
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return;
    }

    if (typeof value !== 'string') {
      throw new AIServiceError(
        `${fieldName} metin olmalıdır.`,
        {
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        }
      );
    }

    if (value.length > maxLength) {
      throw new AIServiceError(
        `${fieldName} alanı en fazla ${maxLength} karakter olabilir.`,
        {
          code: 'INPUT_TOO_LARGE',
          statusCode: 413,
        }
      );
    }
  }

  validateUuidLike(value, fieldName) {
    if (
      typeof value !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
    ) {
      throw new AIServiceError(
        `Geçerli bir ${fieldName} zorunludur.`,
        {
          code: 'INVALID_IDENTIFIER',
          statusCode: 400,
        }
      );
    }
  }

  getSafeErrorMessage(error) {
    if (
      error instanceof AIProviderError ||
      error instanceof AIServiceError
    ) {
      return error.message;
    }

    return 'Yapay zekâ işlemi sırasında beklenmeyen bir hata oluştu.';
  }

  normalizeServiceError(error, fallbackMessage) {
    if (error instanceof AIServiceError) {
      return error;
    }

    if (error instanceof AIProviderError) {
      return new AIServiceError(error.message, {
        code: error.code,
        statusCode: error.statusCode,
        cause: error,
      });
    }

    logger.error('Beklenmeyen AI service hatası', {
      name: error?.name,
      message: error?.message,
      stack:
        config.NODE_ENV === 'development'
          ? error?.stack
          : undefined,
    });

    return new AIServiceError(fallbackMessage, {
      code: 'AI_PROCESSING_ERROR',
      statusCode: 500,
      cause: error,
    });
  }
}

export const aiService = new AIService();

export default aiService;