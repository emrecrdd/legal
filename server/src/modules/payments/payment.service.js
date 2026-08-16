import {
  Op,
} from 'sequelize';

import {
  sequelize,
} from '../../config/database.js';

import {
  Payment,
} from '../../models/Payment.js';

import {
  PaymentPlan,
} from '../../models/PaymentPlan.js';

import {
  PaymentInstallment,
} from '../../models/PaymentInstallment.js';

import {
  Client,
} from '../../models/Client.js';

import {
  Case,
} from '../../models/Case.js';

import {
  User,
} from '../../models/User.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

// ======================================================
// CONSTANTS
// ======================================================

const COMPLETED_STATUS =
  'completed';

const TERMINAL_PLAN_STATUSES =
  new Set([
    'completed',
    'cancelled',
  ]);

const SUPPORTED_PAYMENT_TYPES =
  new Set([
    'received',
    'refund',
    'expense',
    'adjustment',

    // LEGACY
    'agreed',
  ]);

const SUPPORTED_PAYMENT_METHODS =
  new Set([
    'cash',
    'bank_transfer',
    'credit_card',
    'check',
    'other',
  ]);

// ======================================================
// MONEY
// ======================================================

const toCents = (
  value
) => {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return 0;
  }

  return Math.round(
    parsed * 100
  );
};

const fromCents = (
  value
) => {
  return Number(
    (
      Number(
        value || 0
      ) / 100
    ).toFixed(2)
  );
};

const normalizeAmount = (
  value
) => {
  const cents =
    toCents(
      value
    );

  if (
    cents <= 0
  ) {
    throw new Error(
      'Finans hareketi tutarı 0’dan büyük olmalıdır'
    );
  }

  return fromCents(
    cents
  );
};

// ======================================================
// PAGINATION
// ======================================================

const normalizePagination = (
  page,
  limit
) => {
  const safePage =
    Math.max(
      Number.parseInt(
        page,
        10
      ) || 1,
      1
    );

  const safeLimit =
    Math.min(
      Math.max(
        Number.parseInt(
          limit,
          10
        ) || 20,
        1
      ),
      100
    );

  return {
    page:
      safePage,

    limit:
      safeLimit,
  };
};

// ======================================================
// HELPERS
// ======================================================

const normalizeNullableString = (
  value
) => {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return (
    normalized ||
    null
  );
};

const validatePaymentType = (
  type
) => {
  if (
    !SUPPORTED_PAYMENT_TYPES.has(
      type
    )
  ) {
    throw new Error(
      'Geçersiz finans hareketi türü'
    );
  }
};

const validatePaymentMethod = (
  method
) => {
  if (
    !SUPPORTED_PAYMENT_METHODS.has(
      method
    )
  ) {
    throw new Error(
      'Geçersiz ödeme yöntemi'
    );
  }
};

// ======================================================
// RELATION VALIDATION
// ======================================================

const validateRelations = async (
  data,
  transaction
) => {
  if (
    !data.client_id
  ) {
    throw new Error(
      'Müvekkil seçilmelidir'
    );
  }

  const client =
    await Client.findByPk(
      data.client_id,
      {
        attributes: [
          'id',
          'name',
          'status',
        ],

        transaction,
      }
    );

  if (!client) {
    throw new Error(
      'Müvekkil bulunamadı'
    );
  }

  let caseItem =
    null;

  let paymentPlan =
    null;

  let installment =
    null;

  if (
    data.case_id
  ) {
    caseItem =
      await Case.findByPk(
        data.case_id,
        {
          attributes: [
            'id',
            'title',
            'status',
          ],

          transaction,
        }
      );

    if (!caseItem) {
      throw new Error(
        'Dava bulunamadı'
      );
    }
  }

  if (
    data.payment_plan_id
  ) {
    paymentPlan =
      await PaymentPlan.findByPk(
        data.payment_plan_id,
        {
          transaction,

          lock:
            transaction.LOCK.UPDATE,
        }
      );

    if (!paymentPlan) {
      throw new Error(
        'Ödeme planı bulunamadı'
      );
    }

    if (
      paymentPlan.client_id !==
      data.client_id
    ) {
      throw new Error(
        'Ödeme planı seçilen müvekkile ait değil'
      );
    }

    if (
      paymentPlan.status ===
      'cancelled'
    ) {
      throw new Error(
        'İptal edilmiş ödeme planına finans hareketi eklenemez'
      );
    }

    if (
      data.case_id &&
      paymentPlan.case_id &&
      paymentPlan.case_id !==
      data.case_id
    ) {
      throw new Error(
        'Ödeme planı seçilen davaya ait değil'
      );
    }
  }

  if (
    data.installment_id
  ) {
    installment =
      await PaymentInstallment.findByPk(
        data.installment_id,
        {
          transaction,

          lock:
            transaction.LOCK.UPDATE,
        }
      );

    if (!installment) {
      throw new Error(
        'Taksit bulunamadı'
      );
    }

    if (
      installment.status ===
      'cancelled'
    ) {
      throw new Error(
        'İptal edilmiş taksite ödeme bağlanamaz'
      );
    }

    /*
     * installment gönderilip payment_plan_id gönderilmediyse
     * planı taksitten çözüyoruz.
     */
    if (
      !paymentPlan
    ) {
      paymentPlan =
        await PaymentPlan.findByPk(
          installment.payment_plan_id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!paymentPlan) {
        throw new Error(
          'Taksitin ödeme planı bulunamadı'
        );
      }
    }

    if (
      installment.payment_plan_id !==
      paymentPlan.id
    ) {
      throw new Error(
        'Taksit seçilen ödeme planına ait değil'
      );
    }

    if (
      paymentPlan.client_id !==
      data.client_id
    ) {
      throw new Error(
        'Taksit seçilen müvekkile ait değil'
      );
    }
  }

  return {
    client,
    caseItem,
    paymentPlan,
    installment,
  };
};

// ======================================================
// INSTALLMENT SYNC
//
// paid_amount her zaman Payment kayıtlarından yeniden
// hesaplanır. Böylece drift oluşursa kendini düzeltebilir.
// ======================================================

const syncInstallment = async (
  installmentId,
  transaction
) => {
  if (
    !installmentId
  ) {
    return null;
  }

  const installment =
    await PaymentInstallment.findByPk(
      installmentId,
      {
        transaction,

        lock:
          transaction.LOCK.UPDATE,
      }
    );

  if (!installment) {
    throw new Error(
      'Taksit bulunamadı'
    );
  }

  if (
    installment.status ===
    'cancelled'
  ) {
    return installment;
  }

  const payments =
    await Payment.findAll({
      where: {
        installment_id:
          installmentId,

        status:
          COMPLETED_STATUS,

        payment_type: {
          [Op.in]: [
            'received',
            'refund',
            'adjustment',
          ],
        },
      },

      attributes: [
        'amount',
        'payment_type',
      ],

      transaction,
    });

  let paidCents =
    0;

  payments.forEach(
    (payment) => {
      const amount =
        toCents(
          payment.amount
        );

      if (
        payment.payment_type ===
          'received' ||
        payment.payment_type ===
          'adjustment'
      ) {
        paidCents +=
          amount;
      }

      if (
        payment.payment_type ===
        'refund'
      ) {
        paidCents -=
          amount;
      }
    }
  );

  paidCents =
    Math.max(
      paidCents,
      0
    );

  const installmentCents =
    toCents(
      installment.amount
    );

  let status =
    'pending';

  let paidAt =
    null;

  if (
    paidCents >=
    installmentCents
  ) {
    status =
      'paid';

    paidAt =
      installment.paid_at ||
      new Date();
  } else if (
    paidCents > 0
  ) {
    status =
      'partial';
  } else {
    const today =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );

    status =
      installment.due_date <
      today
        ? 'overdue'
        : 'pending';
  }

  await installment.update(
    {
      paid_amount:
        fromCents(
          paidCents
        ),

      status,

      paid_at:
        paidAt,
    },
    {
      transaction,
    }
  );

  return installment;
};

// ======================================================
// PAYMENT PLAN SYNC
// ======================================================

const syncPaymentPlan = async (
  paymentPlanId,
  userId,
  transaction
) => {
  if (
    !paymentPlanId
  ) {
    return null;
  }

  const plan =
    await PaymentPlan.findByPk(
      paymentPlanId,
      {
        transaction,

        lock:
          transaction.LOCK.UPDATE,
      }
    );

  if (!plan) {
    throw new Error(
      'Ödeme planı bulunamadı'
    );
  }

  if (
    plan.status ===
    'cancelled'
  ) {
    return plan;
  }

  const installments =
    await PaymentInstallment.findAll({
      where: {
        payment_plan_id:
          paymentPlanId,

        status: {
          [Op.ne]:
            'cancelled',
        },
      },

      attributes: [
        'id',
        'status',
        'amount',
        'paid_amount',
      ],

      transaction,
    });

  if (
    installments.length ===
    0
  ) {
    return plan;
  }

  const allPaid =
    installments.every(
      (installment) =>
        installment.status ===
        'paid'
    );

  if (
    allPaid
  ) {
    await plan.update(
      {
        status:
          'completed',

        completed_at:
          plan.completed_at ||
          new Date(),

        updated_by:
          userId ||
          plan.updated_by ||
          plan.created_by,
      },
      {
        transaction,
      }
    );

    return plan;
  }

  /*
   * Daha önce completed olmuş planın reversal/refund
   * sonrası tekrar açık hale gelmesi gerekebilir.
   */
  if (
    plan.status ===
    'completed'
  ) {
    await plan.update(
      {
        status:
          'active',

        completed_at:
          null,

        updated_by:
          userId ||
          plan.updated_by ||
          plan.created_by,
      },
      {
        transaction,
      }
    );
  }

  return plan;
};

// ======================================================
// COMMON INCLUDE
// ======================================================

const PAYMENT_INCLUDE = [
  {
    model:
      Client,

    as:
      'client',

    attributes: [
      'id',
      'name',
      'client_type',
      'phone',
      'email',
    ],
  },

  {
    model:
      Case,

    as:
      'case',

    attributes: [
      'id',
      'title',
      'case_number',
      'status',
    ],

    required:
      false,
  },

  {
    model:
      PaymentPlan,

    as:
      'paymentPlan',

    attributes: [
      'id',
      'title',
      'reference_number',
      'total_amount',
      'currency',
      'status',
    ],

    required:
      false,
  },

  {
    model:
      PaymentInstallment,

    as:
      'installment',

    attributes: [
      'id',
      'installment_number',
      'title',
      'amount',
      'paid_amount',
      'due_date',
      'status',
    ],

    required:
      false,
  },

  {
    model:
      User,

    as:
      'creator',

    attributes: [
      'id',
      'first_name',
      'last_name',
    ],
  },

  {
    model:
      User,

    as:
      'reverser',

    attributes: [
      'id',
      'first_name',
      'last_name',
    ],

    required:
      false,
  },
];

// ======================================================
// SERVICE
// ======================================================

export const paymentService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data,
    userId
  ) {
    const transaction =
      await sequelize.transaction();

    try {
      if (
        !userId
      ) {
        throw new Error(
          'Finans hareketini oluşturan kullanıcı bulunamadı'
        );
      }

      const paymentType =
        data.payment_type ||
        'received';

      const paymentMethod =
        data.payment_method ||
        'cash';

      validatePaymentType(
        paymentType
      );

      validatePaymentMethod(
        paymentMethod
      );

      const amount =
        normalizeAmount(
          data.amount
        );

      const {
        paymentPlan,
        installment,
      } =
        await validateRelations(
          data,
          transaction
        );

      /*
       * Gider hareketini takside bağlamıyoruz.
       */
      if (
        paymentType ===
          'expense' &&
        installment
      ) {
        throw new Error(
          'Gider hareketi taksite bağlanamaz'
        );
      }

      /*
       * Yeni agreed kayıtları artık oluşturulmamalı.
       * Sadece legacy datayı okuyabilmek için enumda tutuyoruz.
       */
      if (
        paymentType ===
        'agreed'
      ) {
        throw new Error(
          'Yeni finans mimarisinde anlaşma tutarı PaymentPlan üzerinden oluşturulmalıdır'
        );
      }

      const payment =
        await Payment.create(
          {
            amount,

            description:
              normalizeNullableString(
                data.description
              ),

            payment_type:
              paymentType,

            payment_method:
              paymentMethod,

            status:
              data.status ||
              'completed',

            payment_date:
              data.payment_date ||
              new Date(),

            transaction_id:
              normalizeNullableString(
                data.transaction_id
              ),

            receipt_number:
              normalizeNullableString(
                data.receipt_number
              ),

            client_id:
              data.client_id,

            case_id:
              data.case_id ||
              paymentPlan?.case_id ||
              null,

            payment_plan_id:
              paymentPlan?.id ||
              null,

            installment_id:
              installment?.id ||
              null,

            created_by:
              userId,

            notes:
              normalizeNullableString(
                data.notes
              ),
          },
          {
            transaction,
          }
        );

      if (
        payment.installment_id
      ) {
        await syncInstallment(
          payment.installment_id,
          transaction
        );
      }

      if (
        payment.payment_plan_id
      ) {
        await syncPaymentPlan(
          payment.payment_plan_id,
          userId,
          transaction
        );
      }

      await transaction.commit();

      return this.findOne(
        payment.id
      );
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // LIST
  // ====================================================

  async findAll({
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
  }) {
    const {
      page:
        safePage,

      limit:
        safeLimit,
    } =
      normalizePagination(
        page,
        limit
      );

    const where = {};

    if (
      client_id
    ) {
      where.client_id =
        client_id;
    }

    if (
      case_id
    ) {
      where.case_id =
        case_id;
    }

    if (
      payment_plan_id
    ) {
      where.payment_plan_id =
        payment_plan_id;
    }

    if (
      installment_id
    ) {
      where.installment_id =
        installment_id;
    }

    if (
      payment_type
    ) {
      where.payment_type =
        payment_type;
    }

    if (
      payment_method
    ) {
      where.payment_method =
        payment_method;
    }

    if (
      status
    ) {
      where.status =
        status;
    }

    if (
      start_date ||
      end_date
    ) {
      where.payment_date =
        {};

      if (
        start_date
      ) {
        const startDate =
          new Date(
            start_date
          );

        if (
          Number.isNaN(
            startDate.getTime()
          )
        ) {
          throw new Error(
            'Geçersiz başlangıç tarihi'
          );
        }

        where.payment_date[
          Op.gte
        ] =
          startDate;
      }

      if (
        end_date
      ) {
        const endDate =
          new Date(
            end_date
          );

        if (
          Number.isNaN(
            endDate.getTime()
          )
        ) {
          throw new Error(
            'Geçersiz bitiş tarihi'
          );
        }

        where.payment_date[
          Op.lte
        ] =
          endDate;
      }
    }

    const normalizedSearch =
      String(
        search || ''
      )
        .trim()
        .slice(
          0,
          150
        );

    if (
      normalizedSearch
    ) {
      where[Op.or] = [
        {
          description: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          receipt_number: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          transaction_id: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          '$client.name$': {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          '$case.title$': {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          '$paymentPlan.title$':
            {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
        },
      ];
    }

    const query =
      paginate(
        {
          where,
        },
        safePage,
        safeLimit
      );

    const {
      count,
      rows,
    } =
      await Payment.findAndCountAll({
        ...query,

        include:
          PAYMENT_INCLUDE,

        distinct:
          true,

        subQuery:
          false,

        order: [
          [
            'payment_date',
            'DESC',
          ],

          [
            'created_at',
            'DESC',
          ],
        ],
      });

    return {
      data:
        rows,

      pagination:
        getPaginationData(
          count,
          safePage,
          safeLimit
        ),
    };
  },

  // ====================================================
  // GLOBAL FINANCIAL SUMMARY
  //
  // Bu method pagination'dan bağımsızdır.
  // Dashboard kartlarının gerçek finans değerlerini
  // doğrudan veritabanından hesaplar.
  // ====================================================

  async getSummary() {
    const today =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );

    const [
      totalAgreedRaw,

      totalReceivedRaw,

      totalRefundedRaw,

      totalExpenseRaw,

      totalPendingRaw,

      receivedCount,

      totalPaymentCount,

      activePlanCount,

      draftPlanCount,

      completedPlanCount,

      overdueInstallments,

      completedAdjustments,
    ] =
      await Promise.all([
        // ================================================
        // ANLAŞILAN TOPLAM ÜCRET
        //
        // Cancelled planlar finansal beklentiye dahil
        // edilmez.
        // ================================================

        PaymentPlan.sum(
          'total_amount',
          {
            where: {
              status: {
                [Op.ne]:
                  'cancelled',
              },
            },
          }
        ),

        // ================================================
        // TAMAMLANMIŞ TAHSİLAT
        // ================================================

        Payment.sum(
          'amount',
          {
            where: {
              status:
                COMPLETED_STATUS,

              payment_type:
                'received',
            },
          }
        ),

        // ================================================
        // TAMAMLANMIŞ İADE
        // ================================================

        Payment.sum(
          'amount',
          {
            where: {
              status:
                COMPLETED_STATUS,

              payment_type:
                'refund',
            },
          }
        ),

        // ================================================
        // TAMAMLANMIŞ GİDER
        // ================================================

        Payment.sum(
          'amount',
          {
            where: {
              status:
                COMPLETED_STATUS,

              payment_type:
                'expense',
            },
          }
        ),

        // ================================================
        // BEKLEYEN TAHSİLAT
        // ================================================

        Payment.sum(
          'amount',
          {
            where: {
              status:
                'pending',

              payment_type:
                'received',
            },
          }
        ),

        // ================================================
        // ORTALAMA TAHSİLAT İÇİN ADET
        // ================================================

        Payment.count({
          where: {
            status:
              COMPLETED_STATUS,

            payment_type:
              'received',
          },
        }),

        // ================================================
        // TOPLAM HAREKET
        // ================================================

        Payment.count(),

        // ================================================
        // PLAN COUNTS
        // ================================================

        PaymentPlan.count({
          where: {
            status:
              'active',
          },
        }),

        PaymentPlan.count({
          where: {
            status:
              'draft',
          },
        }),

        PaymentPlan.count({
          where: {
            status:
              'completed',
          },
        }),

        // ================================================
        // GECİKMİŞ TAKSİTLER
        //
        // Status alanına tek başına güvenmiyoruz.
        // Tarih geçmiş ve halen açık olan taksitleri
        // doğrudan hesaba katıyoruz.
        // ================================================

        PaymentInstallment.findAll({
          where: {
            due_date: {
              [Op.lt]:
                today,
            },

            status: {
              [Op.notIn]: [
                'paid',
                'cancelled',
              ],
            },
          },

          attributes: [
            'id',
            'amount',
            'paid_amount',
            'status',
            'due_date',
          ],

          raw:
            true,
        }),

        // ================================================
        // ADJUSTMENTS
        //
        // adjustment tek başına yön ifade etmez.
        //
        // refund reversal -> tahsilata geri eklenir.
        // expense reversal -> giderden düşülür.
        //
        // Bu nedenle reversedPayment tipini okuyup
        // ayrı sınıflandırıyoruz.
        // ================================================

        Payment.findAll({
          where: {
            status:
              COMPLETED_STATUS,

            payment_type:
              'adjustment',
          },

          attributes: [
            'id',
            'amount',
            'reversed_payment_id',
          ],

          include: [
            {
              model:
                Payment,

              as:
                'reversedPayment',

              attributes: [
                'id',
                'payment_type',
              ],

              required:
                false,
            },
          ],
        }),
      ]);

    // ==================================================
    // BASE VALUES
    // ==================================================

    const totalAgreed =
      fromCents(
        toCents(
          totalAgreedRaw
        )
      );

    const grossReceived =
      fromCents(
        toCents(
          totalReceivedRaw
        )
      );

    const grossRefunded =
      fromCents(
        toCents(
          totalRefundedRaw
        )
      );

    const grossExpense =
      fromCents(
        toCents(
          totalExpenseRaw
        )
      );

    const pendingReceived =
      fromCents(
        toCents(
          totalPendingRaw
        )
      );

    // ==================================================
    // ADJUSTMENT CLASSIFICATION
    // ==================================================

    let refundReversalCents =
      0;

    let expenseReversalCents =
      0;

    let otherAdjustmentCents =
      0;

    completedAdjustments.forEach(
      (adjustment) => {
        const amountCents =
          toCents(
            adjustment.amount
          );

        const reversedType =
          adjustment
            .reversedPayment
            ?.payment_type;

        if (
          reversedType ===
          'refund'
        ) {
          refundReversalCents +=
            amountCents;

          return;
        }

        if (
          reversedType ===
          'expense'
        ) {
          expenseReversalCents +=
            amountCents;

          return;
        }

        /*
         * Manuel / farklı adjustment ileride eklenirse
         * ayrı gösterilir. Sessizce tahsilata veya gidere
         * yazılmaz.
         */
        otherAdjustmentCents +=
          amountCents;
      }
    );

    const refundReversals =
      fromCents(
        refundReversalCents
      );

    const expenseReversals =
      fromCents(
        expenseReversalCents
      );

    const otherAdjustments =
      fromCents(
        otherAdjustmentCents
      );

    // ==================================================
    // NET VALUES
    // ==================================================

    const effectiveRefunded =
      Math.max(
        grossRefunded -
          refundReversals,
        0
      );

    const effectiveExpense =
      Math.max(
        grossExpense -
          expenseReversals,
        0
      );

    const netCollected =
      Math.max(
        grossReceived -
          effectiveRefunded,
        0
      );

    const outstandingBalance =
      Math.max(
        totalAgreed -
          netCollected,
        0
      );

    /*
     * Net nakit performansı.
     *
     * Tahsilat
     * - geçerli iadeler
     * - geçerli giderler
     *
     * Manuel adjustment bilinçli şekilde dahil edilmez.
     */
    const netRevenue =
      grossReceived -
      effectiveRefunded -
      effectiveExpense;

    const averagePayment =
      receivedCount > 0
        ? Number(
            (
              grossReceived /
              receivedCount
            ).toFixed(2)
          )
        : 0;

    // ==================================================
    // OVERDUE
    // ==================================================

    let overdueAmountCents =
      0;

    overdueInstallments.forEach(
      (
        installment
      ) => {
        const amountCents =
          toCents(
            installment.amount
          );

        const paidCents =
          toCents(
            installment.paid_amount
          );

        overdueAmountCents +=
          Math.max(
            amountCents -
              paidCents,
            0
          );
      }
    );

    const overdueAmount =
      fromCents(
        overdueAmountCents
      );

    // ==================================================
    // PLAN COUNTS
    // ==================================================

    const totalPlanCount =
      activePlanCount +
      draftPlanCount +
      completedPlanCount;

    // ==================================================
    // RETURN
    // ==================================================

    return {
      currency:
        'TRY',

      // ----------------------------------------------
      // CONTRACT / EXPECTATION
      // ----------------------------------------------

      totalAgreed,

      outstandingBalance,

      // ----------------------------------------------
      // COLLECTION
      // ----------------------------------------------

      grossReceived,

      grossRefunded,

      refundReversals,

      effectiveRefunded,

      netCollected,

      pendingReceived,

      averagePayment,

      // ----------------------------------------------
      // EXPENSE
      // ----------------------------------------------

      grossExpense,

      expenseReversals,

      effectiveExpense,

      netRevenue,

      // ----------------------------------------------
      // ADJUSTMENTS
      // ----------------------------------------------

      otherAdjustments,

      // ----------------------------------------------
      // OVERDUE
      // ----------------------------------------------

      overdueAmount,

      overdueInstallmentCount:
        overdueInstallments.length,

      // ----------------------------------------------
      // PLAN STATISTICS
      // ----------------------------------------------

      plans: {
        total:
          totalPlanCount,

        active:
          activePlanCount,

        draft:
          draftPlanCount,

        completed:
          completedPlanCount,
      },

      // ----------------------------------------------
      // PAYMENT STATISTICS
      // ----------------------------------------------

      payments: {
        total:
          totalPaymentCount,

        completedReceived:
          receivedCount,
      },
    };
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    id
  ) {
    const payment =
      await Payment.findByPk(
        id,
        {
          include: [
            ...PAYMENT_INCLUDE,

            {
              model:
                Payment,

              as:
                'reversedPayment',

              attributes: [
                'id',
                'amount',
                'payment_type',
                'status',
                'payment_date',
                'reversal_reason',
              ],

              required:
                false,
            },

            {
              model:
                Payment,

              as:
                'reversals',

              attributes: [
                'id',
                'amount',
                'payment_type',
                'status',
                'payment_date',
                'reversal_reason',
              ],

              required:
                false,
            },
          ],
        }
      );

    if (
      !payment
    ) {
      throw new Error(
        'Finans hareketi bulunamadı'
      );
    }

    return payment;
  },

  // ====================================================
  // UPDATE METADATA
  //
  // Para miktarı ve temel muhasebe ilişkileri completed
  // kayıtta değiştirilemez.
  // ====================================================

  async update(
    id,
    data
  ) {
    const transaction =
      await sequelize.transaction();

    try {
      const payment =
        await Payment.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (
        !payment
      ) {
        throw new Error(
          'Finans hareketi bulunamadı'
        );
      }

      /*
       * req.body gibi dışarıdan gelen objeyi doğrudan
       * mutate etmiyoruz.
       */
      const updateData = {
        ...data,
      };

      const immutableFields = [
        'id',
        'created_by',
        'reversed_payment_id',
        'reversed_at',
        'reversed_by',
      ];

      immutableFields.forEach(
        (field) => {
          delete updateData[
            field
          ];
        }
      );

      const financialFields = [
        'amount',
        'payment_type',
        'client_id',
        'case_id',
        'payment_plan_id',
        'installment_id',
      ];

      if (
        payment.status ===
        'completed'
      ) {
        const financialChange =
          financialFields.some(
            (field) => {
              if (
                !Object.prototype.hasOwnProperty.call(
                  updateData,
                  field
                )
              ) {
                return false;
              }

              return (
                String(
                  updateData[
                    field
                  ] ?? ''
                ) !==
                String(
                  payment[
                    field
                  ] ?? ''
                )
              );
            }
          );

        if (
          financialChange
        ) {
          throw new Error(
            'Tamamlanmış finans hareketinin tutarı veya temel ilişkileri değiştirilemez. Ters kayıt kullanılmalıdır.'
          );
        }
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          'description'
        )
      ) {
        updateData.description =
          normalizeNullableString(
            updateData.description
          );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          'transaction_id'
        )
      ) {
        updateData.transaction_id =
          normalizeNullableString(
            updateData.transaction_id
          );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          'receipt_number'
        )
      ) {
        updateData.receipt_number =
          normalizeNullableString(
            updateData.receipt_number
          );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          'notes'
        )
      ) {
        updateData.notes =
          normalizeNullableString(
            updateData.notes
          );
      }

      await payment.update(
        updateData,
        {
          transaction,
        }
      );

      if (
        payment.installment_id
      ) {
        await syncInstallment(
          payment.installment_id,
          transaction
        );
      }

      if (
        payment.payment_plan_id
      ) {
        await syncPaymentPlan(
          payment.payment_plan_id,
          payment.created_by,
          transaction
        );
      }

      await transaction.commit();

      return this.findOne(
        id
      );
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // REVERSAL
  // ====================================================

  async reverse(
    id,
    {
      reason,
      userId,
      paymentDate,
    }
  ) {
    const transaction =
      await sequelize.transaction();

    try {
      const payment =
        await Payment.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (
        !payment
      ) {
        throw new Error(
          'Finans hareketi bulunamadı'
        );
      }

      if (
        payment.status !==
        'completed'
      ) {
        throw new Error(
          'Sadece tamamlanmış finans hareketi ters kayda alınabilir'
        );
      }

      if (
        payment.reversed_at
      ) {
        throw new Error(
          'Bu finans hareketi zaten ters kayda alınmış'
        );
      }

      if (
        !reason?.trim()
      ) {
        throw new Error(
          'Ters kayıt nedeni gereklidir'
        );
      }

      if (
        !userId
      ) {
        throw new Error(
          'Ters kaydı oluşturan kullanıcı bulunamadı'
        );
      }

      /*
       * received -> refund
       * refund -> adjustment
       * expense -> adjustment
       *
       * adjustment reversalını şimdilik engelliyoruz.
       */
      let reversalType;

      switch (
        payment.payment_type
      ) {
        case 'received':
          reversalType =
            'refund';
          break;

        case 'refund':
        case 'expense':
          reversalType =
            'adjustment';
          break;

        default:
          throw new Error(
            'Bu finans hareketi ters kayda uygun değil'
          );
      }

      const reversal =
        await Payment.create(
          {
            amount:
              payment.amount,

            description:
              `Ters kayıt: ${
                payment.description ||
                payment.id
              }`,

            payment_type:
              reversalType,

            payment_method:
              payment.payment_method,

            status:
              'completed',

            payment_date:
              paymentDate ||
              new Date(),

            client_id:
              payment.client_id,

            case_id:
              payment.case_id,

            payment_plan_id:
              payment.payment_plan_id,

            installment_id:
              payment.installment_id,

            created_by:
              userId,

            reversed_payment_id:
              payment.id,

            reversal_reason:
              reason.trim(),

            notes:
              `Orijinal finans hareketi: ${payment.id}`,
          },
          {
            transaction,
          }
        );

      await payment.update(
        {
          reversed_at:
            new Date(),

          reversed_by:
            userId,

          reversal_reason:
            reason.trim(),
        },
        {
          transaction,
        }
      );

      if (
        payment.installment_id
      ) {
        await syncInstallment(
          payment.installment_id,
          transaction
        );
      }

      if (
        payment.payment_plan_id
      ) {
        await syncPaymentPlan(
          payment.payment_plan_id,
          userId,
          transaction
        );
      }

      await transaction.commit();

      return this.findOne(
        reversal.id
      );
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // DELETE
  //
  // Pending/cancelled kayıt soft-delete olabilir.
  // Completed kayıt reversal ister.
  // ====================================================

  async remove(
    id
  ) {
    const transaction =
      await sequelize.transaction();

    try {
      const payment =
        await Payment.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (
        !payment
      ) {
        throw new Error(
          'Finans hareketi bulunamadı'
        );
      }

      if (
        payment.status ===
        'completed'
      ) {
        throw new Error(
          'Tamamlanmış finans hareketi silinemez. Ters kayıt oluşturulmalıdır.'
        );
      }

      const installmentId =
        payment.installment_id;

      const paymentPlanId =
        payment.payment_plan_id;

      await payment.destroy({
        transaction,
      });

      if (
        installmentId
      ) {
        await syncInstallment(
          installmentId,
          transaction
        );
      }

      if (
        paymentPlanId
      ) {
        await syncPaymentPlan(
          paymentPlanId,
          payment.created_by,
          transaction
        );
      }

      await transaction.commit();

      return payment;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // CLIENT PAYMENTS
  // ====================================================

  async getByClient(
    clientId,
    limit = 100
  ) {
    const safeLimit =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 100,
          1
        ),
        500
      );

    return Payment.findAll({
      where: {
        client_id:
          clientId,
      },

      include: [
        {
          model:
            Case,

          as:
            'case',

          attributes: [
            'id',
            'title',
            'case_number',
          ],

          required:
            false,
        },

        {
          model:
            PaymentPlan,

          as:
            'paymentPlan',

          attributes: [
            'id',
            'title',
            'currency',
          ],

          required:
            false,
        },

        {
          model:
            PaymentInstallment,

          as:
            'installment',

          attributes: [
            'id',
            'installment_number',
            'due_date',
            'status',
          ],

          required:
            false,
        },
      ],

      order: [
        [
          'payment_date',
          'DESC',
        ],
      ],

      limit:
        safeLimit,
    });
  },

  // ====================================================
  // CASE PAYMENTS
  // ====================================================

  async getByCase(
    caseId,
    limit = 100
  ) {
    const safeLimit =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 100,
          1
        ),
        500
      );

    return Payment.findAll({
      where: {
        case_id:
          caseId,
      },

      include: [
        {
          model:
            Client,

          as:
            'client',

          attributes: [
            'id',
            'name',
            'client_type',
          ],
        },

        {
          model:
            PaymentPlan,

          as:
            'paymentPlan',

          attributes: [
            'id',
            'title',
            'currency',
          ],

          required:
            false,
        },
      ],

      order: [
        [
          'payment_date',
          'DESC',
        ],
      ],

      limit:
        safeLimit,
    });
  },
};

export default paymentService;