import {
  Op,
  QueryTypes,
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

import {
  ROLES,
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

// ======================================================
// CONSTANTS
// ======================================================

const COMPLETED_STATUS =
  'completed';

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
    Number(
      value
    );

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
// GENERAL HELPERS
// ======================================================

const normalizeNullableString = (
  value
) => {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    value ===
    null
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

const hasOwn = (
  object,
  field
) => {
  return Object.prototype.hasOwnProperty.call(
    object,
    field
  );
};

// ======================================================
// AUTHORIZATION HELPERS
// ======================================================

const getActorId = (
  actor
) => {
  return (
    actor?.id ||
    null
  );
};

const requireActor = (
  actor
) => {
  const actorId =
    getActorId(
      actor
    );

  /*
   * FAIL CLOSED
   */
  if (
    !actorId
  ) {
    throw new Error(
      'Finans hareketi bulunamadı'
    );
  }

  return actorId;
};

const getActorPermissions = (
  actor
) => {
  if (
    !actor
  ) {
    return [];
  }

  return getEffectivePermissions(
    actor.role,
    actor.permissions ||
      {}
  );
};

const isAdmin = (
  actor
) => {
  return (
    actor?.role ===
    ROLES.ADMIN
  );
};

const canViewAllCases = (
  actor
) => {
  return (
    isAdmin(
      actor
    ) ||
    getActorPermissions(
      actor
    ).includes(
      PERMISSION_KEYS.VIEW_ALL_CASES
    )
  );
};

// ======================================================
// WHERE HELPERS
// ======================================================

const hasWhereContent = (
  value
) => {
  return Boolean(
    value &&
    typeof value ===
      'object' &&
    Reflect.ownKeys(
      value
    ).length >
      0
  );
};

const combineWhere = (
  ...conditions
) => {
  const validConditions =
    conditions.filter(
      hasWhereContent
    );

  if (
    validConditions.length ===
    0
  ) {
    return {};
  }

  if (
    validConditions.length ===
    1
  ) {
    return validConditions[0];
  }

  return {
    [Op.and]:
      validConditions,
  };
};

// ======================================================
// CASE ACCESS
// ======================================================

const assertCaseAccess =
  async (
    caseId,
    actor,
    options = {}
  ) => {
    if (
      !caseId
    ) {
      return null;
    }

    const actorId =
      requireActor(
        actor
      );

    const where = {
      id:
        caseId,
    };

    if (
      !canViewAllCases(
        actor
      )
    ) {
      where[Op.or] = [
        {
          created_by:
            actorId,
        },

        {
          assigned_to:
            actorId,
        },
      ];
    }

    const caseItem =
      await Case.findOne({
        where,

        attributes: [
          'id',
          'title',
          'status',
          'created_by',
          'assigned_to',
        ],

        transaction:
          options.transaction,

        lock:
          options.lock,
      });

    if (
      !caseItem
    ) {
      throw new Error(
        'Finans hareketi bulunamadı'
      );
    }

    return caseItem;
  };

// ======================================================
// CLIENT ACCESS
// ======================================================

const assertClientAccess =
  async (
    clientId,
    actor,
    options = {}
  ) => {
    const actorId =
      requireActor(
        actor
      );

    const client =
      await Client.findByPk(
        clientId,
        {
          attributes: [
            'id',
            'name',
            'status',
            'created_by',
          ],

          transaction:
            options.transaction,

          lock:
            options.lock,
        }
      );

    if (
      !client
    ) {
      throw new Error(
        'Finans hareketi bulunamadı'
      );
    }

    if (
      isAdmin(
        actor
      )
    ) {
      return client;
    }

    if (
      client.created_by ===
      actorId
    ) {
      return client;
    }

    /*
     * Client'ı oluşturmasa bile erişebildiği bir dava
     * üzerinden client'a erişebilir.
     */
    const replacements = {
      clientId,
      actorId,
    };

    const caseCondition =
      canViewAllCases(
        actor
      )
        ? ''
        : `
          AND (
            c.created_by = :actorId
            OR c.assigned_to = :actorId
          )
        `;

    const rows =
      await sequelize.query(
        `
          SELECT 1
          FROM case_clients cc

          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL

          WHERE cc.client_id = :clientId

          ${caseCondition}

          LIMIT 1
        `,
        {
          replacements,

          type:
            QueryTypes.SELECT,

          transaction:
            options.transaction,
        }
      );

    if (
      rows.length ===
      0
    ) {
      throw new Error(
        'Finans hareketi bulunamadı'
      );
    }

    return client;
  };

// ======================================================
// STANDALONE CLIENT FINANCE ACCESS
// ======================================================

const assertStandaloneClientFinanceAccess = (
  client,
  actor
) => {
  const actorId =
    requireActor(
      actor
    );

  if (
    isAdmin(
      actor
    ) ||
    canViewAllCases(
      actor
    )
  ) {
    return;
  }

  /*
   * Normal kullanıcı case'siz finans kaydını yalnızca
   * kendi oluşturduğu client üzerinde yönetebilir.
   *
   * Client'a yalnız başka bir dava üzerinden erişiyor
   * olmak bağımsız finans kaydına erişim vermez.
   */
  if (
    client.created_by !==
    actorId
  ) {
    throw new Error(
      'Finans hareketi bulunamadı'
    );
  }
};

// ======================================================
// CASE / CLIENT RELATION
// ======================================================

const assertCaseBelongsToClient =
  async (
    caseId,
    clientId,
    transaction
  ) => {
    const rows =
      await sequelize.query(
        `
          SELECT 1
          FROM case_clients
          WHERE case_id = :caseId
            AND client_id = :clientId
          LIMIT 1
        `,
        {
          replacements: {
            caseId,
            clientId,
          },

          type:
            QueryTypes.SELECT,

          transaction,
        }
      );

    if (
      rows.length ===
      0
    ) {
      throw new Error(
        'Seçilen dava seçilen müvekkile ait değil'
      );
    }
  };

// ======================================================
// FINANCIAL ACCESS SCOPE
// ======================================================

const getFinancialAccessScope =
  async (
    actor,
    transaction
  ) => {
    const actorId =
      requireActor(
        actor
      );

    if (
      isAdmin(
        actor
      )
    ) {
      return {
        unrestricted:
          true,

        allCases:
          true,

        caseIds:
          [],

        accessibleClientIds:
          [],

        standaloneClientIds:
          [],
      };
    }

    const allCases =
      canViewAllCases(
        actor
      );

    const caseRows =
      allCases
        ? []
        : await Case.findAll({
            where: {
              [Op.or]: [
                {
                  created_by:
                    actorId,
                },

                {
                  assigned_to:
                    actorId,
                },
              ],
            },

            attributes: [
              'id',
            ],

            raw:
              true,

            transaction,
          });

    const caseIds =
      caseRows.map(
        (
          item
        ) =>
          item.id
      );

    const caseCondition =
      allCases
        ? ''
        : `
          AND (
            c.created_by = :actorId
            OR c.assigned_to = :actorId
          )
        `;

    const accessibleClientRows =
      await sequelize.query(
        `
          SELECT DISTINCT
            cl.id

          FROM clients cl

          LEFT JOIN case_clients cc
            ON cc.client_id = cl.id

          LEFT JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL

          WHERE cl.deleted_at IS NULL
            AND (
              cl.created_by = :actorId

              OR (
                c.id IS NOT NULL
                ${caseCondition}
              )
            )
        `,
        {
          replacements: {
            actorId,
          },

          type:
            QueryTypes.SELECT,

          transaction,
        }
      );

    const ownClientRows =
      await Client.findAll({
        where: {
          created_by:
            actorId,
        },

        attributes: [
          'id',
        ],

        raw:
          true,

        transaction,
      });

    const accessibleClientIds =
      accessibleClientRows.map(
        (
          row
        ) =>
          row.id
      );

    /*
     * VIEW_ALL_CASES sahibi kullanıcı erişebildiği
     * client'ın case'siz finans kayıtlarını da görebilir.
     *
     * Normal kullanıcı için case'siz finans erişimi
     * yalnız kendi oluşturduğu client'larla sınırlı.
     */
    const standaloneClientIds =
      allCases
        ? accessibleClientIds
        : ownClientRows.map(
            (
              row
            ) =>
              row.id
          );

    return {
      unrestricted:
        false,

      allCases,

      caseIds,

      accessibleClientIds,

      standaloneClientIds,
    };
  };

// ======================================================
// PAYMENT ACCESS WHERE
// ======================================================

const buildPaymentAccessWhere = (
  scope
) => {
  if (
    scope.unrestricted
  ) {
    return {};
  }

  const allowedScopes =
    [];

  if (
    scope.allCases
  ) {
    allowedScopes.push({
      case_id: {
        [Op.ne]:
          null,
      },
    });
  } else if (
    scope.caseIds.length >
    0
  ) {
    allowedScopes.push({
      case_id: {
        [Op.in]:
          scope.caseIds,
      },
    });
  }

  if (
    scope.standaloneClientIds.length >
    0
  ) {
    allowedScopes.push({
      [Op.and]: [
        {
          case_id:
            null,
        },

        {
          client_id: {
            [Op.in]:
              scope.standaloneClientIds,
          },
        },
      ],
    });
  }

  if (
    allowedScopes.length ===
    0
  ) {
    return {
      id:
        null,
    };
  }

  return {
    [Op.or]:
      allowedScopes,
  };
};

// ======================================================
// PAYMENT PLAN ACCESS WHERE
// ======================================================

const buildPaymentPlanAccessWhere = (
  scope
) => {
  if (
    scope.unrestricted
  ) {
    return {};
  }

  const allowedScopes =
    [];

  if (
    scope.allCases
  ) {
    allowedScopes.push({
      case_id: {
        [Op.ne]:
          null,
      },
    });
  } else if (
    scope.caseIds.length >
    0
  ) {
    allowedScopes.push({
      case_id: {
        [Op.in]:
          scope.caseIds,
      },
    });
  }

  if (
    scope.standaloneClientIds.length >
    0
  ) {
    allowedScopes.push({
      [Op.and]: [
        {
          case_id:
            null,
        },

        {
          client_id: {
            [Op.in]:
              scope.standaloneClientIds,
          },
        },
      ],
    });
  }

  if (
    allowedScopes.length ===
    0
  ) {
    return {
      id:
        null,
    };
  }

  return {
    [Op.or]:
      allowedScopes,
  };
};

// ======================================================
// ASSERT PAYMENT ACCESS
// ======================================================

const assertPaymentAccess =
  async (
    id,
    actor,
    options = {}
  ) => {
    requireActor(
      actor
    );

    const payment =
      await Payment.findByPk(
        id,
        {
          transaction:
            options.transaction,

          lock:
            options.lock,
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
      isAdmin(
        actor
      )
    ) {
      return payment;
    }

    /*
     * CASE-LINKED payment:
     * case erişimi her şeyden üstündür.
     */
    if (
      payment.case_id
    ) {
      try {
        await assertCaseAccess(
          payment.case_id,
          actor,
          options
        );

        return payment;
      } catch {
        throw new Error(
          'Finans hareketi bulunamadı'
        );
      }
    }

    /*
     * CASE'SİZ payment:
     * client scope.
     */
    try {
      const client =
        await assertClientAccess(
          payment.client_id,
          actor,
          options
        );

      assertStandaloneClientFinanceAccess(
        client,
        actor
      );

      return payment;
    } catch {
      throw new Error(
        'Finans hareketi bulunamadı'
      );
    }
  };

// ======================================================
// RELATION VALIDATION
// ======================================================

const validateRelations =
  async (
    data,
    actor,
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
      await assertClientAccess(
        data.client_id,
        actor,
        {
          transaction,
        }
      );

    let caseItem =
      null;

    let paymentPlan =
      null;

    let installment =
      null;

    // ==================================================
    // EXPLICIT CASE
    // ==================================================

    if (
      data.case_id
    ) {
      caseItem =
        await assertCaseAccess(
          data.case_id,
          actor,
          {
            transaction,
          }
        );

      await assertCaseBelongsToClient(
        caseItem.id,
        client.id,
        transaction
      );
    }

    // ==================================================
    // PAYMENT PLAN
    // ==================================================

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

      if (
        !paymentPlan
      ) {
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
        paymentPlan.case_id
      ) {
        await assertCaseAccess(
          paymentPlan.case_id,
          actor,
          {
            transaction,
          }
        );

        await assertCaseBelongsToClient(
          paymentPlan.case_id,
          client.id,
          transaction
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

    // ==================================================
    // INSTALLMENT
    // ==================================================

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

      if (
        !installment
      ) {
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

        if (
          !paymentPlan
        ) {
          throw new Error(
            'Taksitin ödeme planı bulunamadı'
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

        if (
          paymentPlan.case_id
        ) {
          await assertCaseAccess(
            paymentPlan.case_id,
            actor,
            {
              transaction,
            }
          );

          await assertCaseBelongsToClient(
            paymentPlan.case_id,
            client.id,
            transaction
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

    // ==================================================
    // EFFECTIVE CASE
    // ==================================================

    const effectiveCaseId =
      data.case_id ||
      paymentPlan?.case_id ||
      null;

    if (
      effectiveCaseId &&
      !caseItem
    ) {
      caseItem =
        await assertCaseAccess(
          effectiveCaseId,
          actor,
          {
            transaction,
          }
        );

      await assertCaseBelongsToClient(
        caseItem.id,
        client.id,
        transaction
      );
    }

    /*
     * Case yoksa standalone client finance scope
     * uygulanır.
     */
    if (
      !effectiveCaseId
    ) {
      assertStandaloneClientFinanceAccess(
        client,
        actor
      );
    }

    return {
      client,
      caseItem,
      paymentPlan,
      installment,
      effectiveCaseId,
    };
  };

// ======================================================
// INSTALLMENT SYNC
// ======================================================

const syncInstallment =
  async (
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

    if (
      !installment
    ) {
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
      (
        payment
      ) => {
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
      paidCents >
      0
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

const syncPaymentPlan =
  async (
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

    if (
      !plan
    ) {
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
        (
          installment
        ) =>
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
    actor
  ) {
    const actorId =
      requireActor(
        actor
      );

    const transaction =
      await sequelize.transaction();

    try {
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

      if (
        paymentType ===
        'agreed'
      ) {
        throw new Error(
          'Yeni finans mimarisinde anlaşma tutarı PaymentPlan üzerinden oluşturulmalıdır'
        );
      }

      const amount =
        normalizeAmount(
          data.amount
        );

      const {
        paymentPlan,
        installment,
        effectiveCaseId,
      } =
        await validateRelations(
          data,
          actor,
          transaction
        );

      if (
        paymentType ===
          'expense' &&
        installment
      ) {
        throw new Error(
          'Gider hareketi taksite bağlanamaz'
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
              effectiveCaseId,

            payment_plan_id:
              paymentPlan?.id ||
              null,

            installment_id:
              installment?.id ||
              null,

            /*
             * created_by body'den alınmaz.
             */
            created_by:
              actorId,

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
          actorId,
          transaction
        );
      }

      await transaction.commit();

      return this.findOne(
        payment.id,
        actor
      );
    } catch (
      error
    ) {
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
    actor,
  }) {
    const scope =
      await getFinancialAccessScope(
        actor
      );

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

    const filters = {};

    if (
      client_id
    ) {
      filters.client_id =
        client_id;
    }

    if (
      case_id
    ) {
      filters.case_id =
        case_id;
    }

    if (
      payment_plan_id
    ) {
      filters.payment_plan_id =
        payment_plan_id;
    }

    if (
      installment_id
    ) {
      filters.installment_id =
        installment_id;
    }

    if (
      payment_type
    ) {
      filters.payment_type =
        payment_type;
    }

    if (
      payment_method
    ) {
      filters.payment_method =
        payment_method;
    }

    if (
      status
    ) {
      filters.status =
        status;
    }

    if (
      start_date ||
      end_date
    ) {
      filters.payment_date =
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

        filters.payment_date[
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

        filters.payment_date[
          Op.lte
        ] =
          endDate;
      }
    }

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
      filters[Op.or] = [
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

    const where =
      combineWhere(
        filters,
        buildPaymentAccessWhere(
          scope
        )
      );

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
  // ACTOR-SCOPED FINANCIAL SUMMARY
  // ====================================================

  async getSummary(
    actor
  ) {
    const scope =
      await getFinancialAccessScope(
        actor
      );

    const paymentWhere =
      buildPaymentAccessWhere(
        scope
      );

    const planWhere =
      buildPaymentPlanAccessWhere(
        scope
      );

    const accessiblePlans =
      await PaymentPlan.findAll({
        where:
          planWhere,

        attributes: [
          'id',
        ],

        raw:
          true,
      });

    const accessiblePlanIds =
      accessiblePlans.map(
        (
          plan
        ) =>
          plan.id
      );

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
        PaymentPlan.sum(
          'total_amount',
          {
            where:
              combineWhere(
                planWhere,
                {
                  status: {
                    [Op.ne]:
                      'cancelled',
                  },
                }
              ),
          }
        ),

        Payment.sum(
          'amount',
          {
            where:
              combineWhere(
                paymentWhere,
                {
                  status:
                    COMPLETED_STATUS,

                  payment_type:
                    'received',
                }
              ),
          }
        ),

        Payment.sum(
          'amount',
          {
            where:
              combineWhere(
                paymentWhere,
                {
                  status:
                    COMPLETED_STATUS,

                  payment_type:
                    'refund',
                }
              ),
          }
        ),

        Payment.sum(
          'amount',
          {
            where:
              combineWhere(
                paymentWhere,
                {
                  status:
                    COMPLETED_STATUS,

                  payment_type:
                    'expense',
                }
              ),
          }
        ),

        Payment.sum(
          'amount',
          {
            where:
              combineWhere(
                paymentWhere,
                {
                  status:
                    'pending',

                  payment_type:
                    'received',
                }
              ),
          }
        ),

        Payment.count({
          where:
            combineWhere(
              paymentWhere,
              {
                status:
                  COMPLETED_STATUS,

                payment_type:
                  'received',
              }
            ),
        }),

        Payment.count({
          where:
            paymentWhere,
        }),

        PaymentPlan.count({
          where:
            combineWhere(
              planWhere,
              {
                status:
                  'active',
              }
            ),
        }),

        PaymentPlan.count({
          where:
            combineWhere(
              planWhere,
              {
                status:
                  'draft',
              }
            ),
        }),

        PaymentPlan.count({
          where:
            combineWhere(
              planWhere,
              {
                status:
                  'completed',
              }
            ),
        }),

        accessiblePlanIds.length >
        0
          ? PaymentInstallment.findAll({
              where: {
                payment_plan_id: {
                  [Op.in]:
                    accessiblePlanIds,
                },

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
            })
          : [],

        Payment.findAll({
          where:
            combineWhere(
              paymentWhere,
              {
                status:
                  COMPLETED_STATUS,

                payment_type:
                  'adjustment',
              }
            ),

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

    let refundReversalCents =
      0;

    let expenseReversalCents =
      0;

    let otherAdjustmentCents =
      0;

    completedAdjustments.forEach(
      (
        adjustment
      ) => {
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

    const netRevenue =
      grossReceived -
      effectiveRefunded -
      effectiveExpense;

    const averagePayment =
      receivedCount >
      0
        ? Number(
            (
              grossReceived /
              receivedCount
            ).toFixed(2)
          )
        : 0;

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

    const totalPlanCount =
      activePlanCount +
      draftPlanCount +
      completedPlanCount;

    return {
      currency:
        'TRY',

      totalAgreed,

      outstandingBalance,

      grossReceived,

      grossRefunded,

      refundReversals,

      effectiveRefunded,

      netCollected,

      pendingReceived,

      averagePayment,

      grossExpense,

      expenseReversals,

      effectiveExpense,

      netRevenue,

      otherAdjustments,

      overdueAmount,

      overdueInstallmentCount:
        overdueInstallments.length,

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
    id,
    actor
  ) {
    await assertPaymentAccess(
      id,
      actor
    );

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
  // UPDATE
  // ====================================================

  async update(
    id,
    data,
    actor
  ) {
    const actorId =
      requireActor(
        actor
      );

    const transaction =
      await sequelize.transaction();

    try {
      const payment =
        await assertPaymentAccess(
          id,
          actor,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      /*
       * Mass-assignment engeli.
       */
      const allowedFields = [
        'amount',
        'description',
        'payment_type',
        'payment_method',
        'status',
        'payment_date',
        'transaction_id',
        'receipt_number',
        'client_id',
        'case_id',
        'payment_plan_id',
        'installment_id',
        'notes',
      ];

      const updateData =
        {};

      for (
        const field of
        allowedFields
      ) {
        if (
          hasOwn(
            data,
            field
          )
        ) {
          updateData[field] =
            data[field];
        }
      }

      /*
       * COMPLETED STATUS IMMUTABILITY
       *
       * Tamamlanmış bir finans hareketinin status'u normal
       * update endpoint'i üzerinden geri alınamaz.
       *
       * Aksi halde saldırgan:
       *   completed -> pending/cancelled
       * yaptıktan sonra ikinci bir update ile amount / relation
       * alanlarını değiştirebilirdi.
       *
       * Tamamlanmış kayıtların muhasebesel iptali/değişikliği
       * yalnız reversal akışı üzerinden yapılmalıdır.
       */
      if (
        payment.status ===
          COMPLETED_STATUS &&
        hasOwn(
          updateData,
          'status'
        ) &&
        updateData.status !==
          COMPLETED_STATUS
      ) {
        throw new Error(
          'Tamamlanmış finans hareketinin durumu değiştirilemez. Ters kayıt kullanılmalıdır.'
        );
      }

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
        COMPLETED_STATUS
      ) {
        const financialChange =
          financialFields.some(
            (
              field
            ) => {
              if (
                !hasOwn(
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
        hasOwn(
          updateData,
          'amount'
        )
      ) {
        updateData.amount =
          normalizeAmount(
            updateData.amount
          );
      }

      if (
        hasOwn(
          updateData,
          'payment_type'
        )
      ) {
        validatePaymentType(
          updateData.payment_type
        );

        if (
          updateData.payment_type ===
          'agreed'
        ) {
          throw new Error(
            'Yeni finans mimarisinde anlaşma tutarı PaymentPlan üzerinden oluşturulmalıdır'
          );
        }
      }

      if (
        hasOwn(
          updateData,
          'payment_method'
        )
      ) {
        validatePaymentMethod(
          updateData.payment_method
        );
      }

      if (
        hasOwn(
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
        hasOwn(
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
        hasOwn(
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
        hasOwn(
          updateData,
          'notes'
        )
      ) {
        updateData.notes =
          normalizeNullableString(
            updateData.notes
          );
      }

      const relationFields = [
        'client_id',
        'case_id',
        'payment_plan_id',
        'installment_id',
      ];

      const relationsChanged =
        relationFields.some(
          (
            field
          ) =>
            hasOwn(
              updateData,
              field
            )
        );

      const oldInstallmentId =
        payment.installment_id;

      const oldPaymentPlanId =
        payment.payment_plan_id;

      if (
        relationsChanged
      ) {
        const relationData = {
          client_id:
            hasOwn(
              updateData,
              'client_id'
            )
              ? updateData.client_id
              : payment.client_id,

          case_id:
            hasOwn(
              updateData,
              'case_id'
            )
              ? updateData.case_id
              : payment.case_id,

          payment_plan_id:
            hasOwn(
              updateData,
              'payment_plan_id'
            )
              ? updateData.payment_plan_id
              : payment.payment_plan_id,

          installment_id:
            hasOwn(
              updateData,
              'installment_id'
            )
              ? updateData.installment_id
              : payment.installment_id,
        };

        const {
          paymentPlan,
          installment,
          effectiveCaseId,
        } =
          await validateRelations(
            relationData,
            actor,
            transaction
          );

        updateData.client_id =
          relationData.client_id;

        updateData.case_id =
          effectiveCaseId;

        updateData.payment_plan_id =
          paymentPlan?.id ||
          null;

        updateData.installment_id =
          installment?.id ||
          null;
      }

      await payment.update(
        updateData,
        {
          transaction,
        }
      );

      const installmentIds =
        new Set(
          [
            oldInstallmentId,
            payment.installment_id,
          ].filter(
            Boolean
          )
        );

      for (
        const installmentId of
        installmentIds
      ) {
        await syncInstallment(
          installmentId,
          transaction
        );
      }

      const paymentPlanIds =
        new Set(
          [
            oldPaymentPlanId,
            payment.payment_plan_id,
          ].filter(
            Boolean
          )
        );

      for (
        const paymentPlanId of
        paymentPlanIds
      ) {
        await syncPaymentPlan(
          paymentPlanId,
          actorId,
          transaction
        );
      }

      await transaction.commit();

      return this.findOne(
        id,
        actor
      );
    } catch (
      error
    ) {
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
      paymentDate,
    },
    actor
  ) {
    const actorId =
      requireActor(
        actor
      );

    const transaction =
      await sequelize.transaction();

    try {
      const payment =
        await assertPaymentAccess(
          id,
          actor,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (
        payment.status !==
        COMPLETED_STATUS
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
              COMPLETED_STATUS,

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

            /*
             * userId body'den alınmaz.
             */
            created_by:
              actorId,

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
            actorId,

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
          actorId,
          transaction
        );
      }

      await transaction.commit();

      return this.findOne(
        reversal.id,
        actor
      );
    } catch (
      error
    ) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // DELETE
  // ====================================================

  async remove(
    id,
    actor
  ) {
    const actorId =
      requireActor(
        actor
      );

    const transaction =
      await sequelize.transaction();

    try {
      const payment =
        await assertPaymentAccess(
          id,
          actor,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (
        payment.status ===
        COMPLETED_STATUS
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
          actorId,
          transaction
        );
      }

      await transaction.commit();

      return payment;
    } catch (
      error
    ) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // CLIENT PAYMENTS
  // ====================================================

  async getByClient(
    clientId,
    limit = 100,
    actor
  ) {
    await assertClientAccess(
      clientId,
      actor
    );

    const scope =
      await getFinancialAccessScope(
        actor
      );

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
      where:
        combineWhere(
          {
            client_id:
              clientId,
          },

          buildPaymentAccessWhere(
            scope
          )
        ),

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
    limit = 100,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

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