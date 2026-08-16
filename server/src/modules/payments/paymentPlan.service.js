import {
  Op,
} from 'sequelize';

import {
  sequelize,
} from '../../config/database.js';

import {
  PaymentPlan,
} from '../../models/PaymentPlan.js';

import {
  PaymentInstallment,
} from '../../models/PaymentInstallment.js';

import {
  Payment,
} from '../../models/Payment.js';

import {
  Client,
} from '../../models/Client.js';

import {
  Case,
} from '../../models/Case.js';

import {
  User,
} from '../../models/User.js';

// ======================================================
// CONSTANTS
// ======================================================

const COMPLETED_PAYMENT_STATUS =
  'completed';

const SUPPORTED_PLAN_TYPES =
  new Set([
    'one_time',
    'installment',
  ]);

const SUPPORTED_PLAN_STATUSES =
  new Set([
    'draft',
    'active',
    'completed',
    'cancelled',
  ]);

const SUPPORTED_CURRENCIES =
  new Set([
    'TRY',
    'USD',
    'EUR',
    'GBP',
  ]);

// ======================================================
// MONEY HELPERS
//
// Finans hesaplarında float hassasiyet sorununu azaltmak
// için kuruş bazında integer hesaplıyoruz.
// ======================================================

const toCents = (
  value
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return Math.round(
    number * 100
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

const normalizeMoney = (
  value
) => {
  return fromCents(
    toCents(
      value
    )
  );
};

// ======================================================
// STRING HELPERS
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
    String(
      value
    ).trim();

  return (
    normalized ||
    null
  );
};

// ======================================================
// DATE HELPERS
// ======================================================

const parseDateOnly = (
  value
) => {
  if (!value) {
    return null;
  }

  const normalized =
    String(
      value
    ).slice(
      0,
      10
    );

  const [
    year,
    month,
    day,
  ] =
    normalized
      .split('-')
      .map(
        Number
      );

  if (
    !year ||
    !month ||
    !day
  ) {
    throw new Error(
      'Geçersiz tarih'
    );
  }

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new Error(
      'Geçersiz tarih'
    );
  }

  /*
   * 2026-02-31 gibi JS tarafından başka aya taşınan
   * geçersiz tarihleri de yakalıyoruz.
   */
  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    throw new Error(
      'Geçersiz tarih'
    );
  }

  return date;
};

const formatDateOnly = (
  date
) => {
  return date
    .toISOString()
    .slice(
      0,
      10
    );
};

const getTodayUTC = () => {
  const now =
    new Date();

  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
};

const addMonthsUTC = (
  date,
  months
) => {
  const result =
    new Date(
      date.getTime()
    );

  const originalDay =
    result.getUTCDate();

  result.setUTCDate(
    1
  );

  result.setUTCMonth(
    result.getUTCMonth() +
      months
  );

  const lastDay =
    new Date(
      Date.UTC(
        result.getUTCFullYear(),
        result.getUTCMonth() +
          1,
        0
      )
    ).getUTCDate();

  result.setUTCDate(
    Math.min(
      originalDay,
      lastDay
    )
  );

  return result;
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

    offset:
      (
        safePage - 1
      ) *
      safeLimit,
  };
};

// ======================================================
// VALIDATION
// ======================================================

const validatePlanData = (
  data
) => {
  if (
    !data?.client_id
  ) {
    throw new Error(
      'Müvekkil seçilmelidir'
    );
  }

  const title =
    String(
      data?.title ||
      ''
    ).trim();

  if (
    title.length <
    2
  ) {
    throw new Error(
      'Ödeme planı başlığı gereklidir'
    );
  }

  if (
    title.length >
    255
  ) {
    throw new Error(
      'Ödeme planı başlığı en fazla 255 karakter olabilir'
    );
  }

  const totalAmount =
    toCents(
      data?.total_amount
    );

  if (
    totalAmount <=
    0
  ) {
    throw new Error(
      'Toplam ücret 0’dan büyük olmalıdır'
    );
  }

  const downPayment =
    toCents(
      data?.down_payment_amount ||
      0
    );

  if (
    downPayment <
    0
  ) {
    throw new Error(
      'Peşinat tutarı negatif olamaz'
    );
  }

  if (
    downPayment >
    totalAmount
  ) {
    throw new Error(
      'Peşinat toplam ücretten büyük olamaz'
    );
  }

  const planType =
    data?.plan_type ||
    'installment';

  if (
    !SUPPORTED_PLAN_TYPES.has(
      planType
    )
  ) {
    throw new Error(
      'Geçersiz ödeme planı türü'
    );
  }

  const status =
    data?.status ||
    'draft';

  if (
    !SUPPORTED_PLAN_STATUSES.has(
      status
    )
  ) {
    throw new Error(
      'Geçersiz ödeme planı durumu'
    );
  }

  /*
   * Create sırasında completed/cancelled plan
   * oluşturmak muhasebe akışını atlatır.
   */
  if (
    [
      'completed',
      'cancelled',
    ].includes(
      status
    )
  ) {
    throw new Error(
      'Yeni ödeme planı yalnızca taslak veya aktif olarak oluşturulabilir'
    );
  }

  const currency =
    String(
      data?.currency ||
      'TRY'
    ).toUpperCase();

  if (
    !SUPPORTED_CURRENCIES.has(
      currency
    )
  ) {
    throw new Error(
      'Desteklenmeyen para birimi'
    );
  }

  if (
    data?.start_date
  ) {
    parseDateOnly(
      data.start_date
    );
  }

  if (
    data?.end_date
  ) {
    parseDateOnly(
      data.end_date
    );
  }

  if (
    data?.start_date &&
    data?.end_date
  ) {
    const start =
      parseDateOnly(
        data.start_date
      );

    const end =
      parseDateOnly(
        data.end_date
      );

    if (
      end <
      start
    ) {
      throw new Error(
        'Plan bitiş tarihi başlangıç tarihinden önce olamaz'
      );
    }
  }

  const remindDaysBefore =
    Number.parseInt(
      data?.remind_days_before ??
      3,
      10
    );

  if (
    !Number.isInteger(
      remindDaysBefore
    ) ||
    remindDaysBefore <
      0 ||
    remindDaysBefore >
      365
  ) {
    throw new Error(
      'Hatırlatma günü 0 ile 365 arasında olmalıdır'
    );
  }
};

// ======================================================
// ENTITY VALIDATION
// ======================================================

const validateRelations = async (
  {
    clientId,
    caseId,
  },
  transaction
) => {
  const client =
    await Client.findByPk(
      clientId,
      {
        transaction,

        attributes: [
          'id',
          'name',
          'status',
        ],
      }
    );

  if (!client) {
    throw new Error(
      'Müvekkil bulunamadı'
    );
  }

  if (!caseId) {
    return {
      client,

      caseItem:
        null,
    };
  }

  const caseItem =
    await Case.findByPk(
      caseId,
      {
        transaction,

        attributes: [
          'id',
          'title',
          'status',
        ],
      }
    );

  if (!caseItem) {
    throw new Error(
      'Dava bulunamadı'
    );
  }

  /*
   * Case <-> Client N:N.
   *
   * Seçilen davanın gerçekten bu müvekkille ilişkili
   * olup olmadığını ayrıca doğruluyoruz.
   */
  const linkedClients =
    await caseItem.getClients({
      where: {
        id:
          clientId,
      },

      attributes: [
        'id',
      ],

      joinTableAttributes:
        [],

      transaction,
    });

  if (
    linkedClients.length ===
    0
  ) {
    throw new Error(
      'Seçilen dava bu müvekkille ilişkili değil'
    );
  }

  return {
    client,
    caseItem,
  };
};

// ======================================================
// INSTALLMENT GENERATION
// ======================================================

const createEqualInstallments = ({
  paymentPlanId,
  totalAmount,
  downPaymentAmount,
  installmentCount,
  firstDueDate,
}) => {
  const totalCents =
    toCents(
      totalAmount
    );

  const downPaymentCents =
    toCents(
      downPaymentAmount
    );

  const financedCents =
    totalCents -
    downPaymentCents;

  const count =
    Number.parseInt(
      installmentCount,
      10
    );

  /*
   * Tamamı peşinat olarak belirlenmişse
   * taksit oluşturmaya gerek yok.
   */
  if (
    financedCents <=
    0
  ) {
    return [];
  }

  if (
    !Number.isInteger(
      count
    ) ||
    count <=
      0
  ) {
    throw new Error(
      'Taksit sayısı en az 1 olmalıdır'
    );
  }

  const dueDate =
    parseDateOnly(
      firstDueDate
    );

  if (!dueDate) {
    throw new Error(
      'İlk taksit tarihi gereklidir'
    );
  }

  const baseAmount =
    Math.floor(
      financedCents /
      count
    );

  let remainder =
    financedCents %
    count;

  return Array.from(
    {
      length:
        count,
    },
    (
      _,
      index
    ) => {
      let amount =
        baseAmount;

      if (
        remainder >
        0
      ) {
        amount +=
          1;

        remainder -=
          1;
      }

      return {
        payment_plan_id:
          paymentPlanId,

        installment_number:
          index + 1,

        title:
          `${index + 1}. Taksit`,

        amount:
          fromCents(
            amount
          ),

        paid_amount:
          0,

        due_date:
          formatDateOnly(
            addMonthsUTC(
              dueDate,
              index
            )
          ),

        status:
          'pending',
      };
    }
  );
};

// ======================================================
// CUSTOM INSTALLMENTS
// ======================================================

const normalizeCustomInstallments = (
  paymentPlanId,
  installments,
  expectedAmount
) => {
  if (
    !Array.isArray(
      installments
    ) ||
    installments.length ===
      0
  ) {
    throw new Error(
      'En az bir taksit tanımlanmalıdır'
    );
  }

  const normalized =
    installments.map(
      (
        installment,
        index
      ) => {
        const amount =
          toCents(
            installment?.amount
          );

        if (
          amount <=
          0
        ) {
          throw new Error(
            `${index + 1}. taksit tutarı 0’dan büyük olmalıdır`
          );
        }

        const dueDate =
          parseDateOnly(
            installment?.due_date
          );

        if (!dueDate) {
          throw new Error(
            `${index + 1}. taksit vade tarihi gereklidir`
          );
        }

        const title =
          String(
            installment?.title ||
            `${index + 1}. Taksit`
          )
            .trim()
            .slice(
              0,
              255
            );

        return {
          payment_plan_id:
            paymentPlanId,

          installment_number:
            index + 1,

          title,

          amount:
            fromCents(
              amount
            ),

          paid_amount:
            0,

          due_date:
            formatDateOnly(
              dueDate
            ),

          status:
            'pending',

          notes:
            normalizeNullableString(
              installment?.notes
            ),
        };
      }
    );

  /*
   * Kullanıcı özel taksitleri karışık sırayla gönderse bile
   * taksit numaraları vade sırasına göre oluşsun.
   */
  normalized.sort(
    (
      left,
      right
    ) =>
      String(
        left.due_date
      ).localeCompare(
        String(
          right.due_date
        )
      )
  );

  normalized.forEach(
    (
      installment,
      index
    ) => {
      installment.installment_number =
        index + 1;
    }
  );

  const total =
    normalized.reduce(
      (
        sum,
        installment
      ) =>
        sum +
        toCents(
          installment.amount
        ),
      0
    );

  if (
    total !==
    toCents(
      expectedAmount
    )
  ) {
    throw new Error(
      'Taksitlerin toplamı planın kalan tutarıyla eşleşmelidir'
    );
  }

  return normalized;
};

// ======================================================
// PAYMENT ACCOUNTING
//
// Payment.adjustment tek başına pozitif/negatif yön
// belirtmiyor.
//
// refund reversal:
//   iadeyi geri alır -> tahsilata geri eklenir.
//
// expense reversal:
//   gideri geri alır -> giderden düşülür.
//
// Manuel adjustment ileride desteklenirse sessizce
// tahsilata yazılmamalıdır.
// ======================================================

const calculatePaymentTotals = (
  payments
) => {
  let receivedCents =
    0;

  let refundCents =
    0;

  let expenseCents =
    0;

  let refundReversalCents =
    0;

  let expenseReversalCents =
    0;

  let otherAdjustmentCents =
    0;

  payments
    .filter(
      (
        payment
      ) =>
        payment.status ===
        COMPLETED_PAYMENT_STATUS
    )
    .forEach(
      (
        payment
      ) => {
        const amount =
          toCents(
            payment.amount
          );

        switch (
          payment.payment_type
        ) {
          case 'received':
            receivedCents +=
              amount;
            break;

          case 'refund':
            refundCents +=
              amount;
            break;

          case 'expense':
            expenseCents +=
              amount;
            break;

          case 'adjustment': {
            const reversedType =
              payment
                .reversedPayment
                ?.payment_type;

            if (
              reversedType ===
              'refund'
            ) {
              refundReversalCents +=
                amount;

              break;
            }

            if (
              reversedType ===
              'expense'
            ) {
              expenseReversalCents +=
                amount;

              break;
            }

            otherAdjustmentCents +=
              amount;

            break;
          }

          default:
            break;
        }
      }
    );

  const effectiveRefundCents =
    Math.max(
      refundCents -
      refundReversalCents,
      0
    );

  const effectiveExpenseCents =
    Math.max(
      expenseCents -
      expenseReversalCents,
      0
    );

  const netCollectedCents =
    Math.max(
      receivedCents -
      effectiveRefundCents,
      0
    );

  return {
    receivedCents,

    refundCents,

    expenseCents,

    refundReversalCents,

    expenseReversalCents,

    otherAdjustmentCents,

    effectiveRefundCents,

    effectiveExpenseCents,

    netCollectedCents,
  };
};

// ======================================================
// PLAN SUMMARY
// ======================================================

const calculatePlanSummary = ({
  plan,
  installments,
  payments,
}) => {
  const totalAmount =
    toCents(
      plan.total_amount
    );

  const paymentTotals =
    calculatePaymentTotals(
      payments
    );

  const remaining =
    Math.max(
      totalAmount -
      paymentTotals.netCollectedCents,
      0
    );

  const today =
    getTodayUTC();

  let pendingInstallments =
    0;

  let partialInstallments =
    0;

  let paidInstallments =
    0;

  let overdueInstallments =
    0;

  let overdueAmount =
    0;

  let installmentPrincipal =
    0;

  let installmentPaid =
    0;

  installments.forEach(
    (
      installment
    ) => {
      if (
        installment.status ===
        'cancelled'
      ) {
        return;
      }

      const amount =
        toCents(
          installment.amount
        );

      const paid =
        Math.max(
          toCents(
            installment.paid_amount
          ),
          0
        );

      installmentPrincipal +=
        amount;

      installmentPaid +=
        Math.min(
          paid,
          amount
        );

      const remainingInstallment =
        Math.max(
          amount -
          paid,
          0
        );

      if (
        remainingInstallment ===
          0 ||
        installment.status ===
          'paid'
      ) {
        paidInstallments +=
          1;

        return;
      }

      if (
        paid >
        0
      ) {
        partialInstallments +=
          1;
      } else {
        pendingInstallments +=
          1;
      }

      const dueDate =
        parseDateOnly(
          installment.due_date
        );

      if (
        dueDate &&
        dueDate.getTime() <
          today
      ) {
        overdueInstallments +=
          1;

        overdueAmount +=
          remainingInstallment;
      }
    }
  );

  return {
    total_amount:
      fromCents(
        totalAmount
      ),

    down_payment_amount:
      normalizeMoney(
        plan.down_payment_amount ||
        0
      ),

    // ----------------------------------------------
    // COLLECTION
    // ----------------------------------------------

    collected_amount:
      fromCents(
        paymentTotals.receivedCents
      ),

    refund_amount:
      fromCents(
        paymentTotals.refundCents
      ),

    refund_reversal_amount:
      fromCents(
        paymentTotals.refundReversalCents
      ),

    effective_refund_amount:
      fromCents(
        paymentTotals.effectiveRefundCents
      ),

    net_collected_amount:
      fromCents(
        paymentTotals.netCollectedCents
      ),

    remaining_amount:
      fromCents(
        remaining
      ),

    // ----------------------------------------------
    // EXPENSE
    // ----------------------------------------------

    expense_amount:
      fromCents(
        paymentTotals.expenseCents
      ),

    expense_reversal_amount:
      fromCents(
        paymentTotals.expenseReversalCents
      ),

    effective_expense_amount:
      fromCents(
        paymentTotals.effectiveExpenseCents
      ),

    // ----------------------------------------------
    // ADJUSTMENTS
    // ----------------------------------------------

    adjustment_amount:
      fromCents(
        paymentTotals.otherAdjustmentCents
      ),

    // ----------------------------------------------
    // INSTALLMENTS
    // ----------------------------------------------

    installment_count:
      installments.filter(
        (
          installment
        ) =>
          installment.status !==
          'cancelled'
      ).length,

    installment_principal:
      fromCents(
        installmentPrincipal
      ),

    installment_paid_amount:
      fromCents(
        installmentPaid
      ),

    pending_installments:
      pendingInstallments,

    partial_installments:
      partialInstallments,

    paid_installments:
      paidInstallments,

    overdue_installments:
      overdueInstallments,

    overdue_amount:
      fromCents(
        overdueAmount
      ),

    collection_percentage:
      totalAmount >
      0
        ? Number(
            Math.min(
              100,
              Math.max(
                0,
                (
                  paymentTotals.netCollectedCents /
                  totalAmount
                ) *
                  100
              )
            ).toFixed(
              2
            )
          )
        : 0,
  };
};

// ======================================================
// DETAIL INCLUDE
// ======================================================

const DETAIL_INCLUDE = [
  {
    model:
      Client,

    as:
      'client',

    attributes: [
      'id',
      'name',
      'client_type',
      'email',
      'phone',
      'status',
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
      'updater',

    attributes: [
      'id',
      'first_name',
      'last_name',
    ],

    required:
      false,
  },

  {
    model:
      PaymentInstallment,

    as:
      'installments',

    separate:
      true,

    order: [
      [
        'installment_number',
        'ASC',
      ],
    ],
  },

  {
    model:
      Payment,

    as:
      'payments',

    separate:
      true,

    where: {
      status: {
        [Op.ne]:
          'cancelled',
      },
    },

    required:
      false,

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
  },
];

// ======================================================
// SERVICE
// ======================================================

export const paymentPlanService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data,
    userId
  ) {
    validatePlanData(
      data
    );

    if (
      !userId
    ) {
      throw new Error(
        'Ödeme planını oluşturan kullanıcı bulunamadı'
      );
    }

    const transaction =
      await sequelize.transaction();

    try {
      await validateRelations(
        {
          clientId:
            data.client_id,

          caseId:
            data.case_id,
        },
        transaction
      );

      const totalAmount =
        normalizeMoney(
          data.total_amount
        );

      const downPaymentAmount =
        normalizeMoney(
          data.down_payment_amount ||
          0
        );

      const status =
        data.status ||
        'draft';

      const currency =
        String(
          data.currency ||
          'TRY'
        ).toUpperCase();

      const plan =
        await PaymentPlan.create(
          {
            title:
              String(
                data.title
              ).trim(),

            description:
              normalizeNullableString(
                data.description
              ),

            total_amount:
              totalAmount,

            down_payment_amount:
              downPaymentAmount,

            currency,

            plan_type:
              data.plan_type ||
              'installment',

            status,

            start_date:
              data.start_date ||
              null,

            end_date:
              data.end_date ||
              null,

            auto_reminders_enabled:
              data.auto_reminders_enabled ??
              true,

            remind_days_before:
              Number.parseInt(
                data.remind_days_before ??
                3,
                10
              ),

            notify_on_due_date:
              data.notify_on_due_date ??
              true,

            notify_on_overdue:
              data.notify_on_overdue ??
              true,

            notify_by_email:
              data.notify_by_email ??
              true,

            notify_by_sms:
              data.notify_by_sms ??
              false,

            notify_in_app:
              data.notify_in_app ??
              true,

            client_id:
              data.client_id,

            case_id:
              data.case_id ||
              null,

            created_by:
              userId,

            updated_by:
              userId,

            reference_number:
              normalizeNullableString(
                data.reference_number
              ),

            notes:
              normalizeNullableString(
                data.notes
              ),

            activated_at:
              status ===
              'active'
                ? new Date()
                : null,
          },
          {
            transaction,
          }
        );

      const financedAmount =
        fromCents(
          toCents(
            totalAmount
          ) -
          toCents(
            downPaymentAmount
          )
        );

      let installments =
        [];

      if (
        financedAmount >
        0
      ) {
        if (
          Array.isArray(
            data.installments
          ) &&
          data.installments.length >
            0
        ) {
          installments =
            normalizeCustomInstallments(
              plan.id,
              data.installments,
              financedAmount
            );
        } else {
          const count =
            data.installment_count ||
            (
              data.plan_type ===
              'one_time'
                ? 1
                : null
            );

          installments =
            createEqualInstallments({
              paymentPlanId:
                plan.id,

              totalAmount,

              downPaymentAmount,

              installmentCount:
                count,

              firstDueDate:
                data.first_due_date ||
                data.start_date,
            });
        }

        if (
          installments.length >
          0
        ) {
          await PaymentInstallment.bulkCreate(
            installments,
            {
              transaction,

              validate:
                true,
            }
          );
        }
      }

      /*
       * Active oluşturulan planın kalan ana parası varsa
       * taksit bulunması zorunlu.
       */
      if (
        status ===
          'active' &&
        financedAmount >
          0 &&
        installments.length ===
          0
      ) {
        throw new Error(
          'Aktif ödeme planında en az bir taksit bulunmalıdır'
        );
      }

      await transaction.commit();

      return this.findOne(
        plan.id
      );
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // LIST
  //
  // Liste endpointinde installments/payments taşımıyoruz.
  // Plan seçildiğinde findOne kullanılır.
  // ====================================================

  async findAll({
    page = 1,
    limit = 20,
    search,
    status,
    client_id,
    case_id,
    plan_type,
  }) {
    const pagination =
      normalizePagination(
        page,
        limit
      );

    const where = {};

    const normalizedSearch =
      String(
        search ||
        ''
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
          title: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          reference_number:
            {
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
      ];
    }

    if (
      status
    ) {
      if (
        !SUPPORTED_PLAN_STATUSES.has(
          status
        )
      ) {
        throw new Error(
          'Geçersiz ödeme planı durumu'
        );
      }

      where.status =
        status;
    }

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
      plan_type
    ) {
      if (
        !SUPPORTED_PLAN_TYPES.has(
          plan_type
        )
      ) {
        throw new Error(
          'Geçersiz ödeme planı türü'
        );
      }

      where.plan_type =
        plan_type;
    }

    const {
      count,
      rows,
    } =
      await PaymentPlan.findAndCountAll({
        where,

        limit:
          pagination.limit,

        offset:
          pagination.offset,

        distinct:
          true,

        subQuery:
          false,

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
              User,

            as:
              'creator',

            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],
      });

    return {
      data:
        rows,

      pagination: {
        page:
          pagination.page,

        limit:
          pagination.limit,

        total:
          count,

        totalPages:
          Math.max(
            Math.ceil(
              count /
              pagination.limit
            ),
            1
          ),
      },
    };
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    id
  ) {
    const plan =
      await PaymentPlan.findByPk(
        id,
        {
          include:
            DETAIL_INCLUDE,
        }
      );

    if (!plan) {
      throw new Error(
        'Ödeme planı bulunamadı'
      );
    }

    const plain =
      plan.toJSON();

    plain.summary =
      calculatePlanSummary({
        plan:

          plain,

        installments:
          plain.installments ||
          [],

        payments:
          plain.payments ||
          [],
      });

    return plain;
  },

  // ====================================================
  // ACTIVATE
  // ====================================================

  async activate(
    id,
    userId
  ) {
    if (
      !userId
    ) {
      throw new Error(
        'İşlemi yapan kullanıcı bulunamadı'
      );
    }

    const transaction =
      await sequelize.transaction();

    try {
      const plan =
        await PaymentPlan.findByPk(
          id,
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
        throw new Error(
          'İptal edilmiş ödeme planı aktive edilemez'
        );
      }

      if (
        plan.status ===
        'completed'
      ) {
        throw new Error(
          'Tamamlanmış ödeme planı yeniden aktive edilemez'
        );
      }

      if (
        plan.status ===
        'active'
      ) {
        await transaction.commit();

        return this.findOne(
          id
        );
      }

      const installmentCount =
        await PaymentInstallment.count({
          where: {
            payment_plan_id:
              id,

            status: {
              [Op.ne]:
                'cancelled',
            },
          },

          transaction,
        });

      const remainingPrincipal =
        toCents(
          plan.total_amount
        ) -
        toCents(
          plan.down_payment_amount
        );

      if (
        remainingPrincipal >
          0 &&
        installmentCount ===
          0
      ) {
        throw new Error(
          'Taksitleri bulunmayan ödeme planı aktive edilemez'
        );
      }

      await plan.update(
        {
          status:
            'active',

          activated_at:
            plan.activated_at ||
            new Date(),

          cancelled_at:
            null,

          completed_at:
            null,

          updated_by:
            userId,
        },
        {
          transaction,
        }
      );

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
  // CANCEL
  // ====================================================

  async cancel(
    id,
    userId,
    reason = null
  ) {
    if (
      !userId
    ) {
      throw new Error(
        'İşlemi yapan kullanıcı bulunamadı'
      );
    }

    const transaction =
      await sequelize.transaction();

    try {
      const plan =
        await PaymentPlan.findByPk(
          id,
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
        'completed'
      ) {
        throw new Error(
          'Tamamlanmış ödeme planı iptal edilemez'
        );
      }

      if (
        plan.status ===
        'cancelled'
      ) {
        await transaction.commit();

        return this.findOne(
          id
        );
      }

      await PaymentInstallment.update(
        {
          status:
            'cancelled',
        },
        {
          where: {
            payment_plan_id:
              id,

            status: {
              [Op.notIn]: [
                'paid',
                'cancelled',
              ],
            },
          },

          transaction,
        }
      );

      const normalizedReason =
        normalizeNullableString(
          reason
        );

      const notes =
        [
          plan.notes,

          normalizedReason
            ? `İptal nedeni: ${normalizedReason}`
            : null,
        ]
          .filter(Boolean)
          .join('\n');

      await plan.update(
        {
          status:
            'cancelled',

          cancelled_at:
            new Date(),

          completed_at:
            null,

          updated_by:
            userId,

          notes:
            notes ||
            null,
        },
        {
          transaction,
        }
      );

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
  // MARK COMPLETED
  //
  // Frontend normalde bunu doğrudan çağırmaz.
  // Payment service plan tamamen kapanınca kullanabilir.
  // ====================================================

  async markCompleted(
    id,
    userId,
    {
      transaction:
        externalTransaction =
          null,
    } = {}
  ) {
    const ownsTransaction =
      !externalTransaction;

    const transaction =
      externalTransaction ||
      await sequelize.transaction();

    try {
      const plan =
        await PaymentPlan.findByPk(
          id,
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
        throw new Error(
          'İptal edilmiş ödeme planı tamamlanamaz'
        );
      }

      if (
        plan.status ===
        'completed'
      ) {
        if (
          ownsTransaction
        ) {
          await transaction.commit();
        }

        return plan;
      }

      const outstanding =
        await PaymentInstallment.count({
          where: {
            payment_plan_id:
              id,

            status: {
              [Op.notIn]: [
                'paid',
                'cancelled',
              ],
            },
          },

          transaction,
        });

      if (
        outstanding >
        0
      ) {
        throw new Error(
          'Ödenmemiş taksitler varken plan tamamlanamaz'
        );
      }

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

      if (
        ownsTransaction
      ) {
        await transaction.commit();
      }

      return plan;
    } catch (error) {
      if (
        ownsTransaction
      ) {
        await transaction.rollback();
      }

      throw error;
    }
  },

  // ====================================================
  // GET CLIENT FINANCE SUMMARY
  //
  // hasMany + hasMany tek JOIN'e sokulmuyor.
  // Böylece installment x payment cartesian büyümesi
  // oluşmuyor.
  // ====================================================

  async getClientSummary(
    clientId
  ) {
    const client =
      await Client.findByPk(
        clientId,
        {
          attributes: [
            'id',
            'name',
          ],
        }
      );

    if (!client) {
      throw new Error(
        'Müvekkil bulunamadı'
      );
    }

    const plans =
      await PaymentPlan.findAll({
        where: {
          client_id:
            clientId,

          status: {
            [Op.ne]:
              'cancelled',
          },
        },

        include: [
          {
            model:
              PaymentInstallment,

            as:
              'installments',

            separate:
              true,

            required:
              false,

            order: [
              [
                'installment_number',
                'ASC',
              ],
            ],
          },

          {
            model:
              Payment,

            as:
              'payments',

            separate:
              true,

            required:
              false,

            where: {
              status:
                COMPLETED_PAYMENT_STATUS,
            },

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

            order: [
              [
                'payment_date',
                'DESC',
              ],
            ],
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],
      });

    let agreed =
      0;

    let grossReceived =
      0;

    let netCollected =
      0;

    let grossRefunded =
      0;

    let effectiveRefunded =
      0;

    let grossExpenses =
      0;

    let effectiveExpenses =
      0;

    let overdue =
      0;

    let overdueInstallmentCount =
      0;

    let activePlans =
      0;

    let draftPlans =
      0;

    let completedPlans =
      0;

    plans.forEach(
      (
        plan
      ) => {
        const plain =
          plan.toJSON();

        const summary =
          calculatePlanSummary({
            plan:
              plain,

            installments:
              plain.installments ||
              [],

            payments:
              plain.payments ||
              [],
          });

        agreed +=
          toCents(
            summary.total_amount
          );

        grossReceived +=
          toCents(
            summary.collected_amount
          );

        netCollected +=
          toCents(
            summary.net_collected_amount
          );

        grossRefunded +=
          toCents(
            summary.refund_amount
          );

        effectiveRefunded +=
          toCents(
            summary.effective_refund_amount
          );

        grossExpenses +=
          toCents(
            summary.expense_amount
          );

        effectiveExpenses +=
          toCents(
            summary.effective_expense_amount
          );

        overdue +=
          toCents(
            summary.overdue_amount
          );

        overdueInstallmentCount +=
          Number(
            summary.overdue_installments ||
            0
          );

        switch (
          plain.status
        ) {
          case 'active':
            activePlans +=
              1;
            break;

          case 'draft':
            draftPlans +=
              1;
            break;

          case 'completed':
            completedPlans +=
              1;
            break;

          default:
            break;
        }
      }
    );

    return {
      client: {
        id:
          client.id,

        name:
          client.name,
      },

      currency:
        'TRY',

      plan_count:
        plans.length,

      plans: {
        active:
          activePlans,

        draft:
          draftPlans,

        completed:
          completedPlans,
      },

      agreed_amount:
        fromCents(
          agreed
        ),

      gross_received_amount:
        fromCents(
          grossReceived
        ),

      collected_amount:
        fromCents(
          netCollected
        ),

      remaining_amount:
        fromCents(
          Math.max(
            agreed -
            netCollected,
            0
          )
        ),

      gross_refunded_amount:
        fromCents(
          grossRefunded
        ),

      refunded_amount:
        fromCents(
          effectiveRefunded
        ),

      gross_expense_amount:
        fromCents(
          grossExpenses
        ),

      expense_amount:
        fromCents(
          effectiveExpenses
        ),

      overdue_amount:
        fromCents(
          overdue
        ),

      overdue_installment_count:
        overdueInstallmentCount,
    };
  },
};

export default paymentPlanService;