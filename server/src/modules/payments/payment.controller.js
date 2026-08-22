import {
  paymentService,
} from './payment.service.js';

import {
  paymentPlanService,
} from './paymentPlan.service.js';

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
      error?.message ||
      ''
    ).toLowerCase();

  /*
   * BOLA tarafında yetkisiz kayıt da
   * "bulunamadı" / "not found" döner.
   *
   * Böylece kayıt varlığı sızdırılmaz.
   */
  if (
    message.includes(
      'bulunamadı'
    ) ||
    message.includes(
      'not found'
    )
  ) {
    return 404;
  }

  if (
    message.includes(
      'yetkiniz'
    ) ||
    message.includes(
      'forbidden'
    )
  ) {
    return 403;
  }

  if (
    message.includes(
      'unauthorized'
    )
  ) {
    return 401;
  }

  return fallback;
};

const getAuditIp = (
  req
) => {
  return (
    req.realClientIp ||
    req.ip ||
    null
  );
};

const createAuditLog = async ({
  req,
  action,
  entityType,
  entityId,
  description,
}) => {
  try {
    await AuditLog.create({
      action,

      entity_type:
        entityType,

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
        ],
    });
  } catch (
    auditError
  ) {
    /*
     * Audit hatası ana finans işlemini
     * başarısız göstermemelidir.
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

export const paymentController = {
  // ====================================================
  // GLOBAL / ACTOR-SCOPED SUMMARY
  // ====================================================

  async getSummary(
    req,
    res
  ) {
    try {
      const summary =
        await paymentService.getSummary(
          req.user
        );

      return successResponse(
        res,
        summary,
        'Finans özeti başarıyla getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get payment summary error:',
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
  // PAYMENTS
  // ====================================================

  async createPayment(
    req,
    res
  ) {
    try {
      const payment =
        await paymentService.create(
          req.body,
          req.user
        );

      await createAuditLog({
        req,

        action:
          'create',

        entityType:
          'payment',

        entityId:
          payment.id,

        description:
          `${payment.amount} tutarında finans hareketi oluşturuldu`,
      });

      return successResponse(
        res,
        payment,
        'Finans hareketi başarıyla oluşturuldu',
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
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  async findAllPayments(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        client_id,
        case_id,
        payment_plan_id,
        installment_id,
        payment_type,
        payment_method,
        status,
        start_date,
        end_date,
      } = req.query;

      const result =
        await paymentService.findAll({
          page,
          limit,
          search,
          client_id,
          case_id,
          payment_plan_id,
          installment_id,
          payment_type,
          payment_method,
          status,
          start_date,
          end_date,

          actor:
            req.user,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Finans hareketleri başarıyla getirildi'
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
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  async findOnePayment(
    req,
    res
  ) {
    try {
      const payment =
        await paymentService.findOne(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        payment,
        'Finans hareketi başarıyla getirildi'
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
        getHttpStatusFromError(
          error,
          404
        )
      );
    }
  },

  async updatePayment(
    req,
    res
  ) {
    try {
      const payment =
        await paymentService.update(
          req.params.id,
          req.body,
          req.user
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityType:
          'payment',

        entityId:
          payment.id,

        description:
          `${payment.amount} tutarındaki finans hareketi güncellendi`,
      });

      return successResponse(
        res,
        payment,
        'Finans hareketi başarıyla güncellendi'
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
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  async reversePayment(
    req,
    res
  ) {
    try {
      const {
        reason,
        payment_date,
      } =
        req.body;

      const reversal =
        await paymentService.reverse(
          req.params.id,
          {
            reason,

            paymentDate:
              payment_date,
          },
          req.user
        );

      await createAuditLog({
        req,

        action:
          'create',

        entityType:
          'payment',

        entityId:
          reversal.id,

        description:
          `Finans hareketi ters kayda alındı. Neden: ${reason}`,
      });

      return successResponse(
        res,
        reversal,
        'Finans hareketi ters kayda alındı',
        201
      );
    } catch (
      error
    ) {
      logger.error(
        'Reverse payment error:',
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

  async removePayment(
    req,
    res
  ) {
    try {
      const payment =
        await paymentService.remove(
          req.params.id,
          req.user
        );

      await createAuditLog({
        req,

        action:
          'delete',

        entityType:
          'payment',

        entityId:
          payment.id,

        description:
          `${payment.amount} tutarındaki finans hareketi kaldırıldı`,
      });

      return successResponse(
        res,
        null,
        'Finans hareketi kaldırıldı'
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
        getHttpStatusFromError(
          error
        )
      );
    }
  },

  async getClientPayments(
    req,
    res
  ) {
    try {
      const payments =
        await paymentService.getByClient(
          req.params.clientId,
          req.query.limit,
          req.user
        );

      return successResponse(
        res,
        payments,
        'Müvekkil finans hareketleri getirildi'
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
        getHttpStatusFromError(
          error,
          404
        )
      );
    }
  },

  async getCasePayments(
    req,
    res
  ) {
    try {
      const payments =
        await paymentService.getByCase(
          req.params.caseId,
          req.query.limit,
          req.user
        );

      return successResponse(
        res,
        payments,
        'Dava finans hareketleri getirildi'
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
        getHttpStatusFromError(
          error,
          404
        )
      );
    }
  },

  // ====================================================
  // PAYMENT PLANS
  // ====================================================

  async createPlan(
    req,
    res
  ) {
    try {
      /*
       * Service artık yalnız userId değil
       * authenticated actor alıyor.
       */
      const plan =
        await paymentPlanService.create(
          req.body,
          req.user
        );

      await createAuditLog({
        req,

        action:
          'create',

        entityType:
          'payment_plan',

        entityId:
          plan.id,

        description:
          `"${plan.title}" ödeme planı oluşturuldu`,
      });

      return successResponse(
        res,
        plan,
        'Ödeme planı başarıyla oluşturuldu',
        201
      );
    } catch (
      error
    ) {
      logger.error(
        'Create payment plan error:',
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

  async findAllPlans(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        client_id,
        case_id,
        plan_type,
      } = req.query;

      const result =
        await paymentPlanService.findAll({
          page,
          limit,
          search,
          status,
          client_id,
          case_id,
          plan_type,

          /*
           * Query-level PaymentPlan BOLA.
           */
          actor:
            req.user,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Ödeme planları başarıyla getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get payment plans error:',
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

  async findOnePlan(
    req,
    res
  ) {
    try {
      const plan =
        await paymentPlanService.findOne(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        plan,
        'Ödeme planı başarıyla getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get payment plan error:',
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

  async activatePlan(
    req,
    res
  ) {
    try {
      const plan =
        await paymentPlanService.activate(
          req.params.id,
          req.user
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityType:
          'payment_plan',

        entityId:
          plan.id,

        description:
          `"${plan.title}" ödeme planı aktive edildi`,
      });

      return successResponse(
        res,
        plan,
        'Ödeme planı aktive edildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Activate payment plan error:',
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

  async cancelPlan(
    req,
    res
  ) {
    try {
      const {
        reason,
      } =
        req.body;

      /*
       * Yeni imza:
       *
       * cancel(id, actor, reason)
       */
      const plan =
        await paymentPlanService.cancel(
          req.params.id,
          req.user,
          reason
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityType:
          'payment_plan',

        entityId:
          plan.id,

        description:
          reason
            ? `"${plan.title}" ödeme planı iptal edildi. Neden: ${reason}`
            : `"${plan.title}" ödeme planı iptal edildi`,
      });

      return successResponse(
        res,
        plan,
        'Ödeme planı iptal edildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Cancel payment plan error:',
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

  async getClientPlanSummary(
    req,
    res
  ) {
    try {
      const summary =
        await paymentPlanService.getClientSummary(
          req.params.clientId,
          req.user
        );

      return successResponse(
        res,
        summary,
        'Müvekkil finans özeti getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get client payment summary error:',
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
};

export default paymentController;