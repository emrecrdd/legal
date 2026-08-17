import {
  eventService,
} from './event.service.js';

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
        'event',

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
     * Audit log hatası ana işlemi bozmasın.
     */
    logger.error(
      'Event audit log error:',
      auditError
    );
  }
};

// ======================================================
// CONTROLLER
// ======================================================

export const eventController = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      const eventData = {
        ...req.body,

        created_by:
          req.user.id,
      };

      const event =
        await eventService.create(
          eventData
        );

      await createAuditLog({
        req,

        action:
          'create',

        entityId:
          event.id,

        description:
          `"${event.title}" ${
            event.event_type === 'hearing'
              ? 'duruşması'
              : 'etkinliği'
          } oluşturuldu`,
      });

      return successResponse(
        res,
        event,
        'Duruşma / etkinlik başarıyla oluşturuldu',
        201
      );
    } catch (error) {
      logger.error(
        'Create event error:',
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
        status,
        event_type,
        assigned_to,
        start_date,
        end_date,
      } = req.query;

      const result =
        await eventService.findAll({
          page,
          limit,
          case_id,
          status,
          event_type,
          assigned_to,
          start_date,
          end_date,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Duruşma / etkinlik kayıtları getirildi'
      );
    } catch (error) {
      logger.error(
        'Get events error:',
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
  // CALENDAR
  // ====================================================

  async getCalendarEvents(
    req,
    res
  ) {
    try {
      const {
        year,
        month,
      } = req.query;

      const currentYear =
        year ||
        new Date()
          .getFullYear();

      const currentMonth =
        month ||
        new Date()
          .getMonth() +
          1;

      const events =
        await eventService
          .getCalendarEvents(
            req.user.id,
            {
              year:
                Number.parseInt(
                  currentYear,
                  10
                ),

              month:
                Number.parseInt(
                  currentMonth,
                  10
                ),
            }
          );

      return successResponse(
        res,
        events,
        'Takvim kayıtları getirildi'
      );
    } catch (error) {
      logger.error(
        'Get calendar events error:',
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
  // MY EVENTS
  // ====================================================

  async getMyEvents(
    req,
    res
  ) {
    try {
      const events =
        await eventService
          .getMyEvents(
            req.user.id
          );

      return successResponse(
        res,
        events,
        'Kullanıcıya ait duruşma / etkinlik kayıtları getirildi'
      );
    } catch (error) {
      logger.error(
        'Get my events error:',
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
  // CASE EVENTS
  // ====================================================

  async getByCase(
    req,
    res
  ) {
    try {
      const events =
        await eventService.getByCase(
          req.params.caseId
        );

      return successResponse(
        res,
        events,
        'Davaya ait duruşmalar getirildi'
      );
    } catch (error) {
      logger.error(
        'Get case events error:',
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
      const event =
        await eventService.findOne(
          req.params.id
        );

      return successResponse(
        res,
        event,
        'Duruşma / etkinlik başarıyla getirildi'
      );
    } catch (error) {
      logger.error(
        'Get event error:',
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
      const event =
        await eventService.update(
          req.params.id,
          req.body
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          event.id,

        description:
          `"${event.title}" ${
            event.event_type === 'hearing'
              ? 'duruşması'
              : 'etkinliği'
          } güncellendi`,
      });

      return successResponse(
        res,
        event,
        'Duruşma / etkinlik başarıyla güncellendi'
      );
    } catch (error) {
      logger.error(
        'Update event error:',
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
  // STATUS
  // ====================================================

  async updateStatus(
    req,
    res
  ) {
    try {
      const {
        status,
      } =
        req.body;

      const event =
        await eventService
          .updateStatus(
            req.params.id,
            status
          );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          event.id,

        description:
          `"${event.title}" durumu "${status}" olarak güncellendi`,
      });

      return successResponse(
        res,
        event,
        'Durum başarıyla güncellendi'
      );
    } catch (error) {
      logger.error(
        'Update event status error:',
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
       * Service zaten kaydı bulup döndürüyor.
       * Önceden ayrı findOne çağırıp iki sorgu atmaya
       * gerek yok.
       */
      const event =
        await eventService.remove(
          req.params.id
        );

      await createAuditLog({
        req,

        action:
          'delete',

        entityId:
          event.id,

        description:
          `"${event.title}" ${
            event.event_type === 'hearing'
              ? 'duruşması'
              : 'etkinliği'
          } silindi`,
      });

      return successResponse(
        res,
        null,
        'Duruşma / etkinlik silindi'
      );
    } catch (error) {
      logger.error(
        'Delete event error:',
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

export default eventController;