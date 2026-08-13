import { caseService } from './case.service.js';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../utils/response.js';
import { logger } from '../../config/logger.js';
import { AuditLog } from '../../models/AuditLog.js';

export const caseController = {
  async create(req, res) {
    try {
      const title =
        req.body.title ||
        `${req.body.judiciary_type || 'Dava'} - ${
          req.body.judiciary_unit || 'Birim'
        }`;

      const caseData = {
        ...req.body,
        created_by: req.user.id,
        assigned_to: req.body.assigned_to || null,

        title,

        judiciary_type:
          req.body.judiciary_type || null,

        judiciary_unit:
          req.body.judiciary_unit || null,

        opening_date:
          req.body.opening_date || null,

        court_name:
          req.body.court_name || null,

        case_number:
          req.body.case_number || null,

        subject:
          req.body.subject || null,

        description:
          req.body.description || null,

        status:
          req.body.status || 'preparation',

        priority:
          req.body.priority || 'normal',

        client_ids:
          req.body.client_ids || [],
      };

      const caseItem =
        await caseService.create(caseData);

      await AuditLog.create({
        action: 'create',
        entity_type: 'case',
        entity_id: caseItem.id,
        user_id: req.user.id,
        description: `"${caseItem.title}" davası oluşturuldu`,
        ip_address: req.ip,
        user_agent:
          req.headers['user-agent'],
      });

      return successResponse(
        res,
        caseItem,
        'Case created successfully',
        201
      );
    } catch (error) {
      logger.error(
        'Create case error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async findAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
      } = req.query;

      const result =
        await caseService.findAll({
          page,
          limit,
          search,
          status,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Cases fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get cases error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async findOne(req, res) {
    try {
      const caseItem =
        await caseService.findOne(
          req.params.id
        );

      return successResponse(
        res,
        caseItem,
        'Case fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get case error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ======================================================
  // TAM GÜNCELLEME
  // ======================================================
  async update(req, res) {
    try {
      const title =
        req.body.title ||
        `${req.body.judiciary_type || 'Dava'} - ${
          req.body.judiciary_unit || 'Birim'
        }`;

      const updateData = {
        ...req.body,

        title,

        judiciary_type:
          req.body.judiciary_type || null,

        judiciary_unit:
          req.body.judiciary_unit || null,

        opening_date:
          req.body.opening_date || null,

        court_name:
          req.body.court_name || null,

        case_number:
          req.body.case_number || null,

        subject:
          req.body.subject || null,

        description:
          req.body.description || null,

        status:
          req.body.status || 'preparation',

        priority:
          req.body.priority || 'normal',

        assigned_to:
          req.body.assigned_to || null,

        client_ids:
          req.body.client_ids || [],
      };

      const caseItem =
        await caseService.update(
          req.params.id,
          updateData
        );

      await AuditLog.create({
        action: 'update',
        entity_type: 'case',
        entity_id: caseItem.id,
        user_id: req.user.id,
        description: `"${caseItem.title}" davası güncellendi`,
        ip_address: req.ip,
        user_agent:
          req.headers['user-agent'],
      });

      return successResponse(
        res,
        caseItem,
        'Case updated successfully'
      );
    } catch (error) {
      logger.error(
        'Update case error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ======================================================
  // KISMİ / AI GÜNCELLEMESİ
  // Sadece gönderilen alanları değiştirir.
  // ======================================================
  async patch(req, res) {
    try {
      const allowedFields = [
        'title',
        'judiciary_type',
        'judiciary_unit',
        'opening_date',
        'court_name',
        'case_number',
        'subject',
        'description',
        'status',
        'priority',
        'assigned_to',
      ];

      const updateData = {};

      for (const field of allowedFields) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          updateData[field] =
            req.body[field];
        }
      }

      if (
        Object.keys(updateData).length === 0
      ) {
        return errorResponse(
          res,
          'Güncellenecek geçerli bir alan bulunamadı.',
          400
        );
      }

      const caseItem =
        await caseService.update(
          req.params.id,
          updateData
        );

      await AuditLog.create({
        action: 'update',
        entity_type: 'case',
        entity_id: caseItem.id,
        user_id: req.user.id,
        description: `"${caseItem.title}" davasında kısmi güncelleme yapıldı`,
        ip_address: req.ip,
        user_agent:
          req.headers['user-agent'],
      });

      return successResponse(
        res,
        caseItem,
        'Case partially updated successfully'
      );
    } catch (error) {
      logger.error(
        'Patch case error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async remove(req, res) {
    try {
      const caseItem =
        await caseService.findOne(
          req.params.id
        );

      await caseService.remove(
        req.params.id
      );

      await AuditLog.create({
        action: 'delete',
        entity_type: 'case',
        entity_id: req.params.id,
        user_id: req.user.id,
        description: `"${caseItem.title}" davası silindi`,
        ip_address: req.ip,
        user_agent:
          req.headers['user-agent'],
      });

      return successResponse(
        res,
        null,
        'Case deleted successfully'
      );
    } catch (error) {
      logger.error(
        'Delete case error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async addParty(req, res) {
    try {
      const party =
        await caseService.addParty(
          req.params.id,
          req.body
        );

      return successResponse(
        res,
        party,
        'Party added successfully',
        201
      );
    } catch (error) {
      logger.error(
        'Add party error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async removeParty(req, res) {
    try {
      await caseService.removeParty(
        req.params.id,
        req.params.partyId
      );

      return successResponse(
        res,
        null,
        'Party removed successfully'
      );
    } catch (error) {
      logger.error(
        'Remove party error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async getParties(req, res) {
    try {
      const parties =
        await caseService.getParties(
          req.params.id
        );

      return successResponse(
        res,
        parties,
        'Parties fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get parties error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async getDocuments(req, res) {
    try {
      const documents =
        await caseService.getDocuments(
          req.params.id
        );

      return successResponse(
        res,
        documents,
        'Documents fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get documents error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async getTasks(req, res) {
    try {
      const tasks =
        await caseService.getTasks(
          req.params.id
        );

      return successResponse(
        res,
        tasks,
        'Tasks fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async getEvents(req, res) {
    try {
      const events =
        await caseService.getEvents(
          req.params.id
        );

      return successResponse(
        res,
        events,
        'Events fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get events error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async getPayments(req, res) {
    try {
      const payments =
        await caseService.getPayments(
          req.params.id
        );

      return successResponse(
        res,
        payments,
        'Payments fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get payments error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async getNotes(req, res) {
    try {
      const notes =
        await caseService.getNotes(
          req.params.id
        );

      return successResponse(
        res,
        notes,
        'Notes fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get notes error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async getStatistics(req, res) {
    try {
      const stats =
        await caseService.getStatistics(
          req.user.id
        );

      return successResponse(
        res,
        stats,
        'Case statistics fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get case statistics error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  async updateStatus(req, res) {
    try {
      const { status } = req.body;

      const caseItem =
        await caseService.updateStatus(
          req.params.id,
          status
        );

      await AuditLog.create({
        action: 'update',
        entity_type: 'case',
        entity_id: caseItem.id,
        user_id: req.user.id,
        description:
          `Case ${caseItem.title} status updated to ${status}`,
        ip_address: req.ip,
        user_agent:
          req.headers['user-agent'],
      });

      return successResponse(
        res,
        caseItem,
        'Case status updated successfully'
      );
    } catch (error) {
      logger.error(
        'Update case status error:',
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