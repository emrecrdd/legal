import {
  Op,
} from 'sequelize';

import {
  Case,
} from '../../models/Case.js';

import {
  CaseParty,
} from '../../models/CaseParty.js';

import {
  Client,
} from '../../models/Client.js';

import {
  User,
} from '../../models/User.js';

import {
  Document,
} from '../../models/Document.js';

import {
  Task,
} from '../../models/Task.js';

import {
  Event,
} from '../../models/Event.js';

import {
  Meeting,
} from '../../models/Meeting.js';

import {
  Payment,
} from '../../models/Payment.js';

import {
  Note,
} from '../../models/Note.js';

import {
  sequelize,
} from '../../config/database.js';

import {
  reminderService,
} from '../reminders/reminder.service.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

import {
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

// ======================================================
// ACCESS CONTROL HELPERS
// ======================================================

const getActorId = (
  actor
) => {
  return (
    actor?.id ||
    null
  );
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

const canViewAllCases = (
  actor
) => {
  return getActorPermissions(
    actor
  ).includes(
    PERMISSION_KEYS.VIEW_ALL_CASES
  );
};

// ======================================================
// CASE ACCESS SCOPE
// ======================================================

const buildCaseAccessWhere = (
  actor
) => {
  const actorId =
    getActorId(
      actor
    );

  /*
   * FAIL CLOSED
   *
   * Service'e authenticated actor gelmediyse
   * unrestricted query çalıştırmıyoruz.
   */
  if (
    !actorId
  ) {
    throw new Error(
      'Case not found'
    );
  }

  /*
   * Admin veya VIEW_ALL_CASES sahibi kullanıcı
   * tüm dava kayıtlarını görebilir.
   */
  if (
    canViewAllCases(
      actor
    )
  ) {
    return {};
  }

  /*
   * Diğer kullanıcılar yalnızca:
   *
   * - kendisinin oluşturduğu
   * - kendisine atanmış
   *
   * davalara erişebilir.
   */
  return {
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
  };
};

// ======================================================
// WHERE COMBINER
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

  /*
   * Search de Op.or kullanıyor,
   * ownership scope da Op.or kullanıyor.
   *
   * Object spread ile birini diğerinin üzerine
   * yazmak yerine Op.and ile güvenli şekilde
   * birleştiriyoruz.
   */
  return {
    [Op.and]:
      validConditions,
  };
};

// ======================================================
// ASSERT CASE ACCESS
// ======================================================

const assertCaseAccess =
  async (
    caseId,
    actor,
    options = {}
  ) => {
    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    const caseItem =
      await Case.findOne({
        where:
          combineWhere(
            {
              id:
                caseId,
            },

            accessWhere
          ),

        attributes: [
          'id',
          'created_by',
          'assigned_to',
        ],

        transaction:
          options.transaction,

        lock:
          options.lock,
      });

    /*
     * Burada özellikle:
     *
     * "Dava var ama yetkin yok"
     *
     * demiyoruz.
     *
     * Böylece başka UUID'lerin varlığı da
     * dışarı sızmıyor.
     */
    if (
      !caseItem
    ) {
      throw new Error(
        'Case not found'
      );
    }

    return caseItem;
  };

// ======================================================
// SERVICE
// ======================================================

export const caseService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data,
    actor
  ) {
    const {
      client_ids,
      ...caseData
    } = data;

    /*
     * Controller created_by alanını actor'dan
     * oluşturuyor.
     *
     * Defense-in-depth:
     * service seviyesinde de authenticated actor
     * olmadan case oluşturulmaz.
     */
    const actorId =
      getActorId(
        actor
      );

    if (
      !actorId
    ) {
      throw new Error(
        'Case not found'
      );
    }

    const newCase =
      await Case.create({
        ...caseData,

        /*
         * created_by request içeriğine güvenmez.
         */
        created_by:
          actorId,
      });

    if (
      Array.isArray(
        client_ids
      ) &&
      client_ids.length >
        0
    ) {
      await newCase.setClients(
        client_ids
      );
    }

    return this.findOne(
      newCase.id,
      actor
    );
  },

  // ====================================================
  // FIND ALL
  // ====================================================

  async findAll({
    page,
    limit,
    search,
    status,
    actor,
  }) {
    const conditions =
      [];

    // ==================================================
    // RECORD-LEVEL ACCESS
    // ==================================================

    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    if (
      hasWhereContent(
        accessWhere
      )
    ) {
      conditions.push(
        accessWhere
      );
    }

    // ==================================================
    // SEARCH
    // ==================================================

    if (
      search &&
      search.trim()
    ) {
      const normalizedSearch =
        search.trim();

      conditions.push({
        [Op.or]: [
          {
            title: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },

          {
            case_number: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },

          {
            court_name: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },

          {
            subject: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },

          {
            judiciary_type: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },

          {
            judiciary_unit: {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
          },
        ],
      });
    }

    // ==================================================
    // STATUS
    // ==================================================

    if (
      status
    ) {
      conditions.push({
        status,
      });
    }

    const where =
      combineWhere(
        ...conditions
      );

    const pageNum =
      Number.parseInt(
        page,
        10
      ) ||
      1;

    const limitNum =
      Number.parseInt(
        limit,
        10
      ) ||
      10;

    const query =
      paginate(
        {
          where,
        },
        pageNum,
        limitNum
      );

    const {
      count,
      rows,
    } =
      await Case.findAndCountAll({
        ...query,

        include: [
          {
            model:
              Client,

            as:
              'clients',

            attributes: [
              'id',
              'name',
            ],

            through: {
              attributes:
                [],
            },
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
              'assignee',

            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
          },

          {
            model:
              CaseParty,

            as:
              'parties',

            attributes: [
              'id',
              'party_type',
              'name',
            ],
          },
        ],

        distinct:
          true,

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

      pagination:
        getPaginationData(
          count,
          pageNum,
          limitNum
        ),
    };
  },

  // ====================================================
  // FIND ONE
  // ====================================================

  async findOne(
    id,
    actor
  ) {
    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    /*
     * findByPk yerine findOne + ownership scope.
     *
     * Böylece başka UUID verilerek kayıt
     * alınamaz.
     */
    const caseItem =
      await Case.findOne({
        where:
          combineWhere(
            {
              id,
            },

            accessWhere
          ),

        include: [
          {
            model:
              Client,

            as:
              'clients',

            attributes: [
              'id',
              'name',
              'identification_number',
              'phone',
              'email',
            ],

            through: {
              attributes:
                [],
            },
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
              'assignee',

            attributes: [
              'id',
              'first_name',
              'last_name',
              'email',
            ],
          },

          {
            model:
              CaseParty,

            as:
              'parties',
          },

          {
            model:
              Document,

            as:
              'documents',

            include: [
              {
                model:
                  User,

                as:
                  'uploader',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },
            ],
          },

          // ==============================================
          // TASKS
          // ==============================================

          {
            model:
              Task,

            as:
              'tasks',

            include: [
              {
                association:
                  'assignees',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],

                through: {
                  attributes:
                    [],
                },
              },

              {
                association:
                  'creator',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },
            ],
          },

          {
            model:
              Event,

            as:
              'events',

            include: [
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
                  'assignedTo',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },
            ],
          },

          {
            model:
              Meeting,

            as:
              'meetings',

            include: [
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
                  'assignee',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },

              {
                model:
                  Client,

                as:
                  'client',

                attributes: [
                  'id',
                  'name',
                ],
              },
            ],
          },

          {
            model:
              Payment,

            as:
              'payments',
          },

          {
            model:
              Note,

            as:
              'notes',

            include: [
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
          },
        ],

        order: [
          [
            {
              model:
                Task,

              as:
                'tasks',
            },
            'created_at',
            'DESC',
          ],

          [
            {
              model:
                Event,

              as:
                'events',
            },
            'start_date',
            'ASC',
          ],

          [
            {
              model:
                Meeting,

              as:
                'meetings',
            },
            'start_date',
            'ASC',
          ],

          [
            {
              model:
                Note,

              as:
                'notes',
            },
            'created_at',
            'DESC',
          ],
        ],
      });

    if (
      !caseItem
    ) {
      throw new Error(
        'Case not found'
      );
    }

    return caseItem;
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data,
    actor
  ) {
    const {
      client_ids,
      ...updateData
    } = data;

    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    const caseItem =
      await Case.findOne({
        where:
          combineWhere(
            {
              id,
            },

            accessWhere
          ),
      });

    if (
      !caseItem
    ) {
      throw new Error(
        'Case not found'
      );
    }

    /*
     * created_by hiçbir zaman service update
     * üzerinden değiştirilemez.
     *
     * Controller zaten filtreliyor ama service
     * katmanında da defense-in-depth uygulanıyor.
     */
    delete updateData.created_by;

    delete updateData.id;

    await caseItem.update(
      updateData
    );

    if (
      Array.isArray(
        client_ids
      )
    ) {
      await caseItem.setClients(
        client_ids
      );
    }

    return this.findOne(
      id,
      actor
    );
  },

  // ====================================================
  // REMOVE
  // ====================================================

  async remove(
    id,
    actor
  ) {
    const transaction =
      await sequelize.transaction();

    try {
      const accessWhere =
        buildCaseAccessWhere(
          actor
        );

      /*
       * Ownership kontrolü transaction ve row lock
       * ile aynı sorguda uygulanır.
       */
      const caseItem =
        await Case.findOne({
          where:
            combineWhere(
              {
                id,
              },

              accessWhere
            ),

          transaction,

          lock:
            transaction.LOCK.UPDATE,
        });

      if (
        !caseItem
      ) {
        throw new Error(
          'Case not found'
        );
      }

      // ==================================================
      // EVENT / HEARING REMINDERS
      // ==================================================

      const events =
        await Event.findAll({
          where: {
            case_id:
              id,
          },

          attributes: [
            'id',
          ],

          transaction,
        });

      for (
        const event of
        events
      ) {
        await reminderService.cancelForSource({
          sourceType:
            'event',

          sourceId:
            event.id,

          transaction,
        });
      }

      // ==================================================
      // TASK REMINDERS
      // ==================================================

      const tasks =
        await Task.findAll({
          where: {
            case_id:
              id,
          },

          attributes: [
            'id',
          ],

          transaction,
        });

      for (
        const task of
        tasks
      ) {
        await reminderService.cancelForSource({
          sourceType:
            'task',

          sourceId:
            task.id,

          transaction,
        });
      }

      // ==================================================
      // MEETING REMINDERS
      // ==================================================

      const meetings =
        await Meeting.findAll({
          where: {
            case_id:
              id,
          },

          attributes: [
            'id',
          ],

          transaction,
        });

      for (
        const meeting of
        meetings
      ) {
        await reminderService.cancelForSource({
          sourceType:
            'meeting',

          sourceId:
            meeting.id,

          transaction,
        });
      }

      // ==================================================
      // OPERATIONAL CHILD RECORDS
      // ==================================================

      await Event.destroy({
        where: {
          case_id:
            id,
        },

        transaction,
      });

      await Task.destroy({
        where: {
          case_id:
            id,
        },

        transaction,
      });

      await Meeting.destroy({
        where: {
          case_id:
            id,
        },

        transaction,
      });

      await CaseParty.destroy({
        where: {
          case_id:
            id,
        },

        transaction,
      });

      await Note.destroy({
        where: {
          case_id:
            id,
        },

        transaction,
      });

      // ==================================================
      // CASE
      // ==================================================

      await caseItem.destroy({
        transaction,
      });

      // ==================================================
      // IMPORTANT
      //
      // Document ve Payment kayıtlarına dokunmuyoruz.
      // ==================================================

      await transaction.commit();

      return caseItem;
    } catch (
      error
    ) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // ADD PARTY
  // ====================================================

  async addParty(
    caseId,
    partyData,
    actor
  ) {
    /*
     * Önce dava erişimi doğrulanır.
     */
    await assertCaseAccess(
      caseId,
      actor
    );

    return CaseParty.create({
      ...partyData,

      /*
       * Body'den gelen case_id varsa üzerine
       * gerçek route caseId yazılır.
       */
      case_id:
        caseId,
    });
  },

  // ====================================================
  // REMOVE PARTY
  // ====================================================

  async removeParty(
    caseId,
    partyId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    const party =
      await CaseParty.findOne({
        where: {
          id:
            partyId,

          case_id:
            caseId,
        },
      });

    if (
      !party
    ) {
      throw new Error(
        'Party not found'
      );
    }

    await party.destroy();

    return true;
  },

  // ====================================================
  // GET PARTIES
  // ====================================================

  async getParties(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return CaseParty.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'created_at',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // GET DOCUMENTS
  // ====================================================

  async getDocuments(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return Document.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },

  // ====================================================
  // GET TASKS
  // ====================================================

  async getTasks(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return Task.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'due_date',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // GET EVENTS
  // ====================================================

  async getEvents(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return Event.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // GET MEETINGS
  // ====================================================

  async getMeetings(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return Meeting.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // GET PAYMENTS
  // ====================================================

  async getPayments(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return Payment.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },

  // ====================================================
  // GET NOTES
  // ====================================================

  async getNotes(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return Note.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },

  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics(
    actor
  ) {
    const actorId =
      getActorId(
        actor
      );

    if (
      !actorId
    ) {
      throw new Error(
        'Case not found'
      );
    }

    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    /*
     * Normal kullanıcı:
     *
     * istatistiklerde de yalnız erişebildiği davalar.
     *
     * VIEW_ALL_CASES:
     *
     * toplam sistem davaları.
     */
    const [
      totalCases,
      preparationCases,
      activeCases,
      concludedCases,
      myCases,
    ] =
      await Promise.all([
        Case.count({
          where:
            accessWhere,
        }),

        Case.count({
          where:
            combineWhere(
              accessWhere,
              {
                status:
                  'preparation',
              }
            ),
        }),

        Case.count({
          where:
            combineWhere(
              accessWhere,
              {
                status:
                  'active',
              }
            ),
        }),

        Case.count({
          where:
            combineWhere(
              accessWhere,
              {
                status:
                  'concluded',
              }
            ),
        }),

        Case.count({
          where:
            combineWhere(
              accessWhere,
              {
                assigned_to:
                  actorId,
              }
            ),
        }),
      ]);

    return {
      totalCases,

      preparation:
        preparationCases,

      active:
        activeCases,

      concluded:
        concludedCases,

      assignedToMe:
        myCases,
    };
  },

  // ====================================================
  // UPDATE STATUS
  // ====================================================

  async updateStatus(
    id,
    status,
    actor
  ) {
    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    const caseItem =
      await Case.findOne({
        where:
          combineWhere(
            {
              id,
            },

            accessWhere
          ),
      });

    if (
      !caseItem
    ) {
      throw new Error(
        'Case not found'
      );
    }

    await caseItem.update({
      status,
    });

    return caseItem;
  },
};