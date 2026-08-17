import {
  casePartyService,
} from './case-party.service.js';

import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

import {
  AuditLog,
} from '../../models/AuditLog.js';

// ======================================================
// HELPERS
// ======================================================

const getHttpStatusFromError = (
  error,
  fallback = 400
) => {
  const message =
    String(
      error?.message || ''
    ).toLowerCase();

  if (
    message.includes('bulunamadı') ||
    message.includes('not found')
  ) {
    return 404;
  }

  if (
    message.includes('yetki') ||
    message.includes('forbidden')
  ) {
    return 403;
  }

  if (
    message.includes('unauthorized')
  ) {
    return 401;
  }

  return fallback;
};

const createAuditLog = async ({
  req,
  action,
  entityId,
  description,
}) => {
  try {
    await AuditLog.create({
      action,

      entity_type:
        'case_party',

      entity_id:
        entityId,

      user_id:
        req.user.id,

      description,

      ip_address:
        req.ip,

      user_agent:
        req.headers[
          'user-agent'
        ],
    });
  } catch (auditError) {
    /*
     * Audit log hatası ana CRUD işlemini bozmasın.
     */
    logger.error(
      'Case party audit log error:',
      auditError
    );
  }
};

// ======================================================
// CONTROLLER
// ======================================================

export const casePartyController = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      const {
        caseId,
      } =
        req.params;

      const partyData = {
        ...req.body,

        case_id:
          caseId,
      };

      const party =
        await casePartyService.create(
          partyData
        );

      await createAuditLog({
        req,

        action:
          'create',

        entityId:
          party.id,

        description:
          `"${party.name}" davaya ${party.party_type} sıfatıyla eklendi`,
      });

      return successResponse(
        res,
        party,
        'Taraf başarıyla oluşturuldu',
        201
      );
    } catch (error) {
      logger.error(
        'Create case party error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  // ====================================================
  // CASE PARTIES
  // ====================================================

  async getByCase(
    req,
    res
  ) {
    try {
      const {
        caseId,
      } =
        req.params;

      const parties =
        await casePartyService
          .findByCase(
            caseId
          );

      return successResponse(
        res,
        parties,
        'Taraflar başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get case parties error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  // ====================================================
  // LIST
  // ====================================================

  async findAll(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        case_id,
        party_type,
        search,
      } =
        req.query;

      const result =
        await casePartyService.findAll({
          page,
          limit,
          case_id,
          party_type,
          search,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Taraflar başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get all case parties error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    req,
    res
  ) {
    try {
      const party =
        await casePartyService.findOne(
          req.params.id
        );

      return successResponse(
        res,
        party,
        'Taraf başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get case party error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error,
          404
        )
      );
    }
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    req,
    res
  ) {
    try {
      const party =
        await casePartyService.update(
          req.params.id,
          req.body
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          party.id,

        description:
          `"${party.name}" taraf bilgileri güncellendi`,
      });

      return successResponse(
        res,
        party,
        'Taraf başarıyla güncellendi'
      );
    } catch (error) {
      logger.error(
        'Update case party error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  // ====================================================
  // DELETE
  // ====================================================

  async remove(
    req,
    res
  ) {
    try {
      /*
       * Service zaten silinen kaydı döndürüyor.
       * Ayrı findOne sorgusuna gerek yok.
       */
      const party =
        await casePartyService.remove(
          req.params.id
        );

      await createAuditLog({
        req,

        action:
          'delete',

        entityId:
          party.id,

        description:
          `"${party.name}" taraf kaydı silindi`,
      });

      return successResponse(
        res,
        null,
        'Taraf başarıyla silindi'
      );
    } catch (error) {
      logger.error(
        'Delete case party error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        getHttpStatusFromError(
          error
        )
      );
    }
  },
};

export default casePartyController;