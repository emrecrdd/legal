import {
  meetingService,
} from './meeting.service.js';

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

import {
  createIcsEvent,
  createIcsFileName,
} from '../../utils/ics.util.js';

// ======================================================
// HELPERS
// ======================================================

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
        'meeting',

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
  } catch (error) {
    /*
     * Audit log hatası ana işlemi bozmasın.
     * Ancak loglarda görünür olsun.
     */
    logger.error(
      'Meeting audit log error:',
      error
    );
  }
};

// ======================================================
// CALENDAR HELPERS
// ======================================================

const isDateOnly = (
  value
) => {
  return (
    typeof value ===
      'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value.trim()
    )
  );
};

/*
 * Meeting modelindeki tarih alanının adı projede
 * farklı olabilir.
 *
 * Aşağıdaki sıra mevcut/yaygın alan isimlerini
 * güvenli şekilde destekler.
 *
 * İlk bulunan dolu değer kullanılır.
 */
const getMeetingStart = (
  meeting
) => {
  return (
    meeting?.start_date ||
    meeting?.start_time ||
    meeting?.meeting_date ||
    meeting?.scheduled_at ||
    meeting?.date ||
    null
  );
};

const getMeetingEnd = (
  meeting
) => {
  return (
    meeting?.end_date ||
    meeting?.end_time ||
    null
  );
};

const getMeetingLocation = (
  meeting
) => {
  return (
    meeting?.location ||
    meeting?.meeting_location ||
    meeting?.address ||
    ''
  );
};

// ======================================================
// CONTROLLER
// ======================================================

export const meetingController = {

  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      const meetingData = {
        ...req.body,

        created_by:
          req.user.id,
      };

      const meeting =
        await meetingService.create(
          meetingData
        );

      await createAuditLog({
        req,

        action:
          'create',

        entityId:
          meeting.id,

        description:
          `"${meeting.title}" toplantısı oluşturuldu`,
      });

      return successResponse(
        res,
        meeting,
        'Meeting created successfully',
        201
      );
    } catch (error) {
      logger.error(
        'Create meeting error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
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
        search,
        status,
        meeting_type,
        case_id,
        client_id,
        assigned_to,
        start_date,
        end_date,
      } = req.query;

      const result =
        await meetingService.findAll({
          page,
          limit,
          search,
          status,
          meeting_type,
          case_id,
          client_id,
          assigned_to,
          start_date,
          end_date,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Meetings fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get meetings error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
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
      const meeting =
        await meetingService.findOne(
          req.params.id
        );

      return successResponse(
        res,
        meeting,
        'Meeting fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get meeting error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ====================================================
  // DOWNLOAD CALENDAR / ICS
  // ====================================================

  async downloadCalendar(
    req,
    res
  ) {
    try {
      /*
       * Normal toplantı detayında kullanılan service
       * metodunu kullanıyoruz.
       *
       * Route tarafındaki VIEW_MEETINGS yetkisi de
       * ayrıca korunacak.
       */
      const meeting =
        await meetingService.findOne(
          req.params.id
        );

      const start =
        getMeetingStart(
          meeting
        );

      const end =
        getMeetingEnd(
          meeting
        );

      if (!start) {
        return errorResponse(
          res,
          'Toplantının takvime eklenebilmesi için tarih bilgisi gereklidir',
          400
        );
      }

      // ==================================================
      // ALL DAY
      // ==================================================

      const allDay =
        isDateOnly(
          start
        );

      /*
       * Tam gün etkinlikte end değeri DATEONLY değilse
       * göndermiyoruz.
       *
       * ICS util başlangıç tarihinden sonraki günü
       * otomatik DTEND yapar.
       */
      const safeEnd =
        allDay
          ? (
              isDateOnly(
                end
              )
                ? end
                : null
            )
          : end;

      // ==================================================
      // DESCRIPTION
      // ==================================================

      const descriptionParts =
        [];

      descriptionParts.push(
        'Derkenar toplantı kaydı'
      );

      if (
        meeting.description
      ) {
        descriptionParts.push(
          '',
          String(
            meeting.description
          ).trim()
        );
      }

      if (
        meeting.meeting_type
      ) {
        descriptionParts.push(
          '',
          `Toplantı Türü: ${meeting.meeting_type}`
        );
      }

      if (
        meeting.case
      ) {
        const caseParts = [
          meeting.case
            .case_number,

          meeting.case
            .title,
        ].filter(
          Boolean
        );

        if (
          caseParts.length >
          0
        ) {
          descriptionParts.push(
            `Dava: ${caseParts.join(
              ' - '
            )}`
          );
        }
      }

      if (
        meeting.client
      ) {
        const clientName =
          meeting.client.name ||
          [
            meeting.client
              .first_name,

            meeting.client
              .last_name,
          ]
            .filter(
              Boolean
            )
            .join(' ')
            .trim();

        if (
          clientName
        ) {
          descriptionParts.push(
            `Müvekkil: ${clientName}`
          );
        }
      }

      // ==================================================
      // CREATE ICS
      // ==================================================

      const icsContent =
        createIcsEvent({
          entityType:
            'meeting',

          entityId:
            meeting.id,

          title:
            `Toplantı: ${meeting.title}`,

          description:
            descriptionParts.join(
              '\n'
            ),

          location:
            getMeetingLocation(
              meeting
            ),

          start,

          end:
            safeEnd,

          allDay,

          calendarName:
            'Derkenar Toplantıları',

          status:
            meeting.status ===
              'cancelled'
              ? 'CANCELLED'
              : 'CONFIRMED',
        });

      const fileName =
        createIcsFileName(
          `derkenar-toplanti-${meeting.title}`
        );

      // ==================================================
      // RESPONSE
      // ==================================================

      res.setHeader(
        'Content-Type',
        'text/calendar; charset=utf-8'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`
      );

      res.setHeader(
        'Cache-Control',
        'private, no-store'
      );

      return res
        .status(200)
        .send(
          icsContent
        );
    } catch (error) {
      logger.error(
        'Download meeting calendar error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Toplantı takvim dosyası oluşturulamadı',
        400
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
      const meeting =
        await meetingService.update(
          req.params.id,
          req.body
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          meeting.id,

        description:
          `"${meeting.title}" toplantısı güncellendi`,
      });

      return successResponse(
        res,
        meeting,
        'Meeting updated successfully'
      );
    } catch (error) {
      logger.error(
        'Update meeting error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
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
       * Audit açıklamasında title gerektiği için
       * önce kaydı okuyoruz.
       */
      const meeting =
        await meetingService.findOne(
          req.params.id
        );

      await meetingService.remove(
        req.params.id
      );

      await createAuditLog({
        req,

        action:
          'delete',

        entityId:
          req.params.id,

        description:
          `"${meeting.title}" toplantısı silindi`,
      });

      return successResponse(
        res,
        null,
        'Meeting deleted successfully'
      );
    } catch (error) {
      logger.error(
        'Delete meeting error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // MY MEETINGS
  // ====================================================

  async getMyMeetings(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 25,
        include_completed,
      } = req.query;

      const result =
        await meetingService.getMyMeetings(
          req.user.id,
          {
            page,
            limit,

            includeCompleted:
              include_completed ===
              'true',
          }
        );

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'My meetings fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get my meetings error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // BY CASE
  // ====================================================

  async getByCase(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 25,
      } = req.query;

      const result =
        await meetingService.getByCase(
          req.params.caseId,
          {
            page,
            limit,
          }
        );

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Case meetings fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get case meetings error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // BY CLIENT
  // ====================================================

  async getByClient(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 25,
      } = req.query;

      const result =
        await meetingService.getByClient(
          req.params.clientId,
          {
            page,
            limit,
          }
        );

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Client meetings fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get client meetings error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // CLIENT COCKPIT TIMELINE
  // ====================================================

  async getClientTimeline(
    req,
    res
  ) {
    try {
      const {
        upcoming_limit = 5,
        recent_limit = 5,
      } = req.query;

      const timeline =
        await meetingService.getClientTimeline(
          req.params.clientId,
          {
            upcomingLimit:
              upcoming_limit,

            recentLimit:
              recent_limit,
          }
        );

      return successResponse(
        res,
        timeline,
        'Client meeting timeline fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get client meeting timeline error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // UPCOMING
  // ====================================================

  async getUpcoming(
    req,
    res
  ) {
    try {
      const {
        limit = 5,
      } = req.query;

      const meetings =
        await meetingService.getUpcoming(
          req.user.id,
          limit
        );

      return successResponse(
        res,
        meetings,
        'Upcoming meetings fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get upcoming meetings error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // UPDATE STATUS
  // ====================================================

  async updateStatus(
    req,
    res
  ) {
    try {
      const {
        status,
      } = req.body;

      if (!status) {
        return errorResponse(
          res,
          'Meeting status is required',
          400
        );
      }

      const meeting =
        await meetingService.updateStatus(
          req.params.id,
          status
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          meeting.id,

        description:
          `"${meeting.title}" toplantı durumu "${status}" olarak güncellendi`,
      });

      return successResponse(
        res,
        meeting,
        'Meeting status updated successfully'
      );
    } catch (error) {
      logger.error(
        'Update meeting status error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },
};

export default meetingController;