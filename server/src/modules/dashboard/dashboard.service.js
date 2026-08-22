import {
  Op,
  Sequelize,
} from 'sequelize';

import { Client } from '../../models/Client.js';
import { Case } from '../../models/Case.js';
import { Document } from '../../models/Document.js';
import { Task } from '../../models/Task.js';
import { Event } from '../../models/Event.js';
import { Payment } from '../../models/Payment.js';
import { User } from '../../models/User.js';

import { sequelize } from '../../config/database.js';

import {
  ROLES,
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

// ======================================================
// AUTHORIZATION HELPERS
// ======================================================

const getActorId = (actor) =>
  actor?.id || null;

const requireActor = (actor) => {
  const actorId = getActorId(actor);

  if (!actorId) {
    throw new Error(
      'Dashboard user not found'
    );
  }

  return actorId;
};

const getActorPermissions = (actor) => {
  if (!actor) {
    return [];
  }

  return getEffectivePermissions(
    actor.role,
    actor.permissions || {}
  );
};

const isAdmin = (actor) =>
  actor?.role === ROLES.ADMIN;

const hasActorPermission = (
  actor,
  permission
) =>
  isAdmin(actor) ||
  getActorPermissions(actor).includes(
    permission
  );

const canViewAllCases = (actor) =>
  hasActorPermission(
    actor,
    PERMISSION_KEYS.VIEW_ALL_CASES
  );

const canViewAllTasks = (actor) =>
  hasActorPermission(
    actor,
    PERMISSION_KEYS.VIEW_ALL_TASKS
  );

// ======================================================
// WHERE HELPERS
// ======================================================

const hasWhereContent = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      Reflect.ownKeys(value).length > 0
  );

const combineWhere = (
  ...conditions
) => {
  const validConditions =
    conditions.filter(
      hasWhereContent
    );

  if (validConditions.length === 0) {
    return {};
  }

  if (validConditions.length === 1) {
    return validConditions[0];
  }

  return {
    [Op.and]: validConditions,
  };
};

// ======================================================
// CASE ACCESS
// ======================================================

const buildCaseAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(actor);

  if (canViewAllCases(actor)) {
    return {};
  }

  return {
    [Op.or]: [
      {
        created_by: actorId,
      },
      {
        assigned_to: actorId,
      },
    ],
  };
};

// ======================================================
// CLIENT ACCESS
// ======================================================

const buildClientAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(actor);

  if (isAdmin(actor)) {
    return {};
  }

  const escapedActorId =
    sequelize.escape(actorId);

  const relatedCasePredicate =
    canViewAllCases(actor)
      ? `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Client"."id"
        )
      `
      : `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Client"."id"
            AND (
              c.created_by = ${escapedActorId}
              OR c.assigned_to = ${escapedActorId}
            )
        )
      `;

  return {
    [Op.or]: [
      {
        created_by: actorId,
      },
      Sequelize.where(
        Sequelize.literal(
          relatedCasePredicate
        ),
        true
      ),
    ],
  };
};

// ======================================================
// DOCUMENT READ ACCESS
//
// is_public = büro içi genel OKUMA erişimi.
// Yazma yetkisi değildir.
// ======================================================

const buildDocumentReadAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(actor);

  if (isAdmin(actor)) {
    return {};
  }

  const caseLinkedScope =
    canViewAllCases(actor)
      ? {
          case_id: {
            [Op.ne]: null,
          },
        }
      : {
          [Op.and]: [
            {
              case_id: {
                [Op.ne]: null,
              },
            },
            {
              [Op.or]: [
                {
                  '$case.created_by$':
                    actorId,
                },
                {
                  '$case.assigned_to$':
                    actorId,
                },
              ],
            },
          ],
        };

  const clientCasePredicate =
    canViewAllCases(actor)
      ? `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Document"."client_id"
        )
      `
      : `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Document"."client_id"
            AND (
              c.created_by = ${sequelize.escape(
                actorId
              )}
              OR c.assigned_to = ${sequelize.escape(
                actorId
              )}
            )
        )
      `;

  const clientLinkedScope = {
    [Op.and]: [
      {
        case_id: null,
      },
      {
        client_id: {
          [Op.ne]: null,
        },
      },
      {
        [Op.or]: [
          {
            '$client.created_by$':
              actorId,
          },
          Sequelize.where(
            Sequelize.literal(
              clientCasePredicate
            ),
            true
          ),
        ],
      },
    ],
  };

  const standaloneScope = {
    [Op.and]: [
      {
        case_id: null,
      },
      {
        client_id: null,
      },
      {
        uploaded_by: actorId,
      },
    ],
  };

  return {
    [Op.or]: [
      {
        is_public: true,
      },
      caseLinkedScope,
      clientLinkedScope,
      standaloneScope,
    ],
  };
};

const documentAccessIncludes = [
  {
    model: Case,
    as: 'case',
    attributes: [],
    required: false,
  },
  {
    model: Client,
    as: 'client',
    attributes: [],
    required: false,
  },
];

// ======================================================
// PAYMENT ACCESS
//
// Payment service ile aynı temel BOLA:
// - admin -> tümü
// - VIEW_ALL_CASES -> tüm case-linked + erişilebilir
//   client'lardaki case'siz finans
// - normal kullanıcı -> kendi/atandığı case finansı +
//   kendi oluşturduğu client'ın case'siz finansı
// ======================================================

const buildPaymentAccessWhere =
  async (actor) => {
    const actorId =
      requireActor(actor);

    if (isAdmin(actor)) {
      return {};
    }

    const allCases =
      canViewAllCases(actor);

    let caseIds = [];

    if (!allCases) {
      const caseRows =
        await Case.findAll({
          where:
            buildCaseAccessWhere(actor),
          attributes: ['id'],
          raw: true,
        });

      caseIds = caseRows.map(
        (item) => item.id
      );
    }

    let standaloneClientIds = [];

    if (allCases) {
      const clientRows =
        await Client.findAll({
          where:
            buildClientAccessWhere(actor),
          attributes: ['id'],
          raw: true,
        });

      standaloneClientIds =
        clientRows.map(
          (item) => item.id
        );
    } else {
      const ownClientRows =
        await Client.findAll({
          where: {
            created_by: actorId,
          },
          attributes: ['id'],
          raw: true,
        });

      standaloneClientIds =
        ownClientRows.map(
          (item) => item.id
        );
    }

    const allowedScopes = [];

    if (allCases) {
      allowedScopes.push({
        case_id: {
          [Op.ne]: null,
        },
      });
    } else if (caseIds.length > 0) {
      allowedScopes.push({
        case_id: {
          [Op.in]: caseIds,
        },
      });
    }

    if (
      standaloneClientIds.length > 0
    ) {
      allowedScopes.push({
        [Op.and]: [
          {
            case_id: null,
          },
          {
            client_id: {
              [Op.in]:
                standaloneClientIds,
            },
          },
        ],
      });
    }

    if (allowedScopes.length === 0) {
      return {
        id: null,
      };
    }

    return {
      [Op.or]: allowedScopes,
    };
  };

// ======================================================
// EVENT ACCESS
// ======================================================

const buildEventAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(actor);

  if (isAdmin(actor)) {
    return {};
  }

  return {
    [Op.or]: [
      {
        created_by: actorId,
      },
      {
        assigned_to: actorId,
      },
    ],
  };
};

const buildEventCaseInclude = (
  actor
) => {
  const include = {
    model: Case,
    as: 'case',
    required: false,
    include: [
      {
        model: Client,
        as: 'clients',
        attributes: [
          'id',
          'name',
        ],
        through: {
          attributes: [],
        },
      },
    ],
  };

  if (!canViewAllCases(actor)) {
    include.where =
      buildCaseAccessWhere(actor);
  }

  return include;
};

// ======================================================
// TASK ACCESS
// ======================================================

const countPendingTasks =
  async (actor) => {
    const actorId =
      requireActor(actor);

    const where = {
      status: 'pending',
    };

    if (canViewAllTasks(actor)) {
      return Task.count({ where });
    }

    return Task.count({
      where,
      include: [
        {
          association: 'assignees',
          where: {
            id: actorId,
          },
          attributes: [],
          through: {
            attributes: [],
          },
          required: true,
        },
      ],
      distinct: true,
      col: 'id',
    });
  };

// ======================================================
// SERVICE
// ======================================================

export const dashboardService = {
  // ====================================================
  // DASHBOARD STATS
  // ====================================================

  async getStats(actor) {
    requireActor(actor);

    const paymentAccessWhere =
      await buildPaymentAccessWhere(
        actor
      );

    const [
      totalClients,
      activeCases,
      totalDocuments,
      pendingTasks,
      totalReceived,
      totalPendingPayments,
    ] = await Promise.all([
      Client.count({
        where:
          buildClientAccessWhere(actor),
      }),

      Case.count({
        where: combineWhere(
          buildCaseAccessWhere(actor),
          {
            status: {
              [Op.notIn]: [
                'concluded',
                'archived',
              ],
            },
          }
        ),
      }),

      Document.count({
        where:
          buildDocumentReadAccessWhere(
            actor
          ),
        include:
          documentAccessIncludes,
        distinct: true,
        col: 'id',
      }),

      countPendingTasks(actor),

      Payment.sum('amount', {
        where: combineWhere(
          paymentAccessWhere,
          {
            status: 'completed',
            payment_type: 'received',
          }
        ),
      }),

      Payment.sum('amount', {
        where: combineWhere(
          paymentAccessWhere,
          {
            status: 'pending',
            payment_type: 'received',
          }
        ),
      }),
    ]);

    return {
      totalClients,
      activeCases,
      totalDocuments,
      pendingTasks,
      totalReceived:
        totalReceived || 0,
      totalPendingPayments:
        totalPendingPayments || 0,
    };
  },

  // ====================================================
  // TODAY HEARINGS
  // ====================================================

  async getTodayHearings(actor) {
    requireActor(actor);

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const tomorrow =
      new Date(today);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const events =
      await Event.findAll({
        where: combineWhere(
          {
            start_date: {
              [Op.between]: [
                today,
                tomorrow,
              ],
            },
            event_type: 'hearing',
          },
          buildEventAccessWhere(actor)
        ),

        include: [
          buildEventCaseInclude(actor),
        ],

        order: [
          [
            'start_date',
            'ASC',
          ],
        ],
      });

    /*
     * Case bağlı eventte include null geldiyse kullanıcı
     * o case'e erişemiyordur (veya case kaldırılmıştır).
     * Kayıt varlığı sızdırılmaz.
     */
    return events.filter(
      (event) =>
        !event.case_id ||
        Boolean(event.case)
    );
  },

  // ====================================================
  // UPCOMING TASKS
  // ====================================================

  async getUpcomingTasks(
    userId,
    limit = 5
  ) {
    if (!userId) {
      throw new Error(
        'Dashboard user not found'
      );
    }

    const now = new Date();

    const safeLimit = Math.min(
      Math.max(
        Number.parseInt(
          limit,
          10
        ) || 5,
        1
      ),
      50
    );

    const tasks =
      await Task.findAll({
        where: {
          status: {
            [Op.notIn]: [
              'completed',
              'cancelled',
            ],
          },
          due_date: {
            [Op.gte]: now,
          },
        },

        include: [
          {
            association: 'assignees',
            where: {
              id: userId,
            },
            attributes: [],
            through: {
              attributes: [],
            },
            required: true,
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

        order: [
          [
            'due_date',
            'ASC',
          ],
        ],

        limit: safeLimit,
        subQuery: false,
      });

    return tasks;
  },

  // ====================================================
  // RECENT ACTIVITIES
  // ====================================================

  async getRecentActivities(
    limit = 5,
    actor
  ) {
    requireActor(actor);

    const safeLimit = Math.min(
      Math.max(
        Number.parseInt(
          limit,
          10
        ) || 5,
        1
      ),
      50
    );

    const [
      recentDocuments,
      recentCases,
    ] = await Promise.all([
      Document.findAll({
        where:
          buildDocumentReadAccessWhere(
            actor
          ),

        include: [
          ...documentAccessIncludes,
          {
            model: User,
            as: 'uploader',
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

        limit: safeLimit,
        subQuery: false,
      }),

      Case.findAll({
        where:
          buildCaseAccessWhere(actor),

        include: [
          {
            model: Client,
            as: 'clients',
            attributes: [
              'id',
              'name',
            ],
            through: {
              attributes: [],
            },
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],

        limit: safeLimit,
        subQuery: false,
      }),
    ]);

    return {
      recentDocuments,
      recentCases,
    };
  },
};
