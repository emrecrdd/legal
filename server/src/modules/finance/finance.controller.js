import {
  financeService,
} from './finance.service.js';

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

const getAuditIp = (
  req
) => {
  return (
    req.realClientIp ||
    req.ip ||
    null
  );
};

const createAuditLogSafely =
  async ({
    req,
    action,
    entityId,
    description,
  }) => {
    try {
      await AuditLog.create({
        action,

        entity_type:
          'payment',

        entity_id:
          entityId,

        user_id:
          req.user.id,

        description,

        ip_address:
          getAuditIp(
            req
          ),

        user_agent:
          req.headers[
            'user-agent'
          ] ||
          null,
      });
    } catch (
      auditError
    ) {
      /*
       * Audit log hatası ana ödeme işlemini
       * başarısız göstermesin.
       */
      logger.error(
        'Finance audit log error:',
        auditError
      );
    }
  };

// ======================================================
// CONTROLLER
// ======================================================

export const financeController = {
  // ====================================================
  // CREATE PAYMENT
  // ====================================================

  async createPayment(
    req,
    res
  ) {
    try {
      const paymentData = {
        ...req.body,

        created_by:
          req.user.id,
      };

      const payment =
        await financeService.createPayment(
          paymentData
        );

      await createAuditLogSafely({
        req,

        action:
          'create',

        entityId:
          payment.id,

        description:
          `Payment of ${payment.amount} created for client ${payment.client_id}`,
      });

      return successResponse(
        res,
        payment,
        'Payment created successfully',
        201
      );
    } catch (
      error
    ) {
      logger.error(
        'Create payment error:',
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
  // LIST PAYMENTS
  // ====================================================

  async findAllPayments(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        client_id,
        case_id,
        status,
        start_date,
        end_date,
      } =
        req.query;

      const result =
        await financeService.findAllPayments({
          page,
          limit,
          search,
          client_id,
          case_id,
          status,
          start_date,
          end_date,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Payments fetched successfully'
      );
    } catch (
      error
    ) {
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

  // ====================================================
  // FIND ONE PAYMENT
  // ====================================================

  async findOnePayment(
    req,
    res
  ) {
    try {
      const payment =
        await financeService.findOnePayment(
          req.params.id
        );

      return successResponse(
        res,
        payment,
        'Payment fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get payment error:',
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
  // UPDATE PAYMENT
  // ====================================================

  async updatePayment(
    req,
    res
  ) {
    try {
      const payment =
        await financeService.updatePayment(
          req.params.id,
          req.body
        );

      await createAuditLogSafely({
        req,

        action:
          'update',

        entityId:
          payment.id,

        description:
          `Payment ${payment.id} updated`,
      });

      return successResponse(
        res,
        payment,
        'Payment updated successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Update payment error:',
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
  // REMOVE PAYMENT
  // ====================================================

  async removePayment(
    req,
    res
  ) {
    try {
      const payment =
        await financeService.findOnePayment(
          req.params.id
        );

      await financeService.removePayment(
        req.params.id
      );

      await createAuditLogSafely({
        req,

        action:
          'delete',

        entityId:
          payment.id,

        description:
          `Payment ${payment.id} deleted`,
      });

      return successResponse(
        res,
        null,
        'Payment deleted successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Delete payment error:',
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
  // CLIENT PAYMENTS
  // ====================================================

  async getClientPayments(
    req,
    res
  ) {
    try {
      const payments =
        await financeService.getClientPayments(
          req.params.clientId
        );

      return successResponse(
        res,
        payments,
        'Client payments fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get client payments error:',
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
  // CASE PAYMENTS
  // ====================================================

  async getCasePayments(
    req,
    res
  ) {
    try {
      const payments =
        await financeService.getCasePayments(
          req.params.caseId
        );

      return successResponse(
        res,
        payments,
        'Case payments fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get case payments error:',
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
  // FINANCIAL SUMMARY
  // ====================================================

  async getFinancialSummary(
    req,
    res
  ) {
    try {
      const summary =
        await financeService.getFinancialSummary();

      return successResponse(
        res,
        summary,
        'Financial summary fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get financial summary error:',
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
  // MONTHLY REVENUE
  // ====================================================

  async getMonthlyRevenue(
    req,
    res
  ) {
    try {
      const {
        year,
      } =
        req.query;

      const revenue =
        await financeService.getMonthlyRevenue(
          year
        );

      return successResponse(
        res,
        revenue,
        'Monthly revenue fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get monthly revenue error:',
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
  // CLIENT FINANCIAL SUMMARY
  // ====================================================

  async getClientFinancialSummary(
    req,
    res
  ) {
    try {
      const summary =
        await financeService.getClientFinancialSummary(
          req.params.clientId
        );

      return successResponse(
        res,
        summary,
        'Client financial summary fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get client financial summary error:',
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
  // OUTSTANDING PAYMENTS
  // ====================================================

  async getOutstandingPayments(
    req,
    res
  ) {
    try {
      const payments =
        await financeService.getOutstandingPayments();

      return successResponse(
        res,
        payments,
        'Outstanding payments fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get outstanding payments error:',
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
  // PAYMENT STATISTICS
  // ====================================================

  async getPaymentStatistics(
    req,
    res
  ) {
    try {
      const stats =
        await financeService.getPaymentStatistics();

      return successResponse(
        res,
        stats,
        'Payment statistics fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get payment statistics error:',
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