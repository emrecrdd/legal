import {
  Op,
} from 'sequelize';

import {
  Task,
} from '../../models/Task.js';

import {
  Note,
} from '../../models/Note.js';

import {
  User,
} from '../../models/User.js';

import {
  Case,
} from '../../models/Case.js';

import {
  Client,
} from '../../models/Client.js';

import {
  sequelize,
} from '../../config/database.js';

import {
  logger,
} from '../../config/logger.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

import {
  notificationService,
} from '../notifications/notification.service.js';

import {
  reminderService,
} from '../reminders/reminder.service.js';

// ======================================================
// CONSTANTS
// ======================================================

const TERMINAL_STATUSES =
  new Set([
    'completed',
    'cancelled',
  ]);

// ======================================================
// REMINDER HELPERS
// ======================================================

const shouldHaveReminders = (
  task
) => {
  return (
    Boolean(
      task?.due_date
    ) &&
    Boolean(
      task?.assigned_to ||
      task?.created_by
    ) &&
    !TERMINAL_STATUSES.has(
      task?.status
    )
  );
};

// ======================================================
// NOTIFICATION HELPER
// ======================================================

const notifySafely =
  async (
    operation,
    callback,
    metadata = {}
  ) => {
    try {
      await callback();
    } catch (error) {
      logger.error(
        `Task notification failed: ${operation}`,
        {
          ...metadata,

          message:
            error.message,
        }
      );
    }
  };

// ======================================================
// ACCESS HELPERS
// ======================================================

const buildTaskAccessWhere = ({
  userId,
  canViewAllTasks = false,
} = {}) => {
  if (
    canViewAllTasks
  ) {
    return null;
  }

  if (!userId) {
    /*
     * Access context beklenen yerde kullanıcı yoksa
     * fail-closed davran.
     */
    return {
      id: null,
    };
  }

  return {
    [Op.or]: [
      {
        assigned_to:
          userId,
      },

      {
        created_by:
          userId,
      },
    ],
  };
};

const applyTaskAccessScope = (
  where = {},
  {
    userId,
    canViewAllTasks = false,
  } = {}
) => {
  const accessWhere =
    buildTaskAccessWhere({
      userId,
      canViewAllTasks,
    });

  if (!accessWhere) {
    return where;
  }

  if (
    Object.keys(
      where
    ).length === 0 &&
    Object.getOwnPropertySymbols(
      where
    ).length === 0
  ) {
    return accessWhere;
  }

  return {
    [Op.and]: [
      where,
      accessWhere,
    ],
  };
};

const canAccessTask = (
  task,
  {
    userId,
    canViewAllTasks = false,
  } = {}
) => {
  if (!task) {
    return false;
  }

  if (
    canViewAllTasks
  ) {
    return true;
  }

  if (!userId) {
    return false;
  }

  return (
    task.assigned_to ===
      userId ||
    task.created_by ===
      userId
  );
};

const assertTaskAccess = (
  task,
  access = {}
) => {
  if (
    !canAccessTask(
      task,
      access
    )
  ) {
    throw new Error(
      'Bu göreve erişim yetkiniz bulunmuyor'
    );
  }
};

// ======================================================
// COMMON INCLUDE
// ======================================================

const LIST_INCLUDE = [
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
      'email',
    ],

    required:
      false,
  },

  {
    model:
      Case,

    as:
      'case',

    attributes: [
      'id',
      'title',
    ],

    required:
      false,
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

    required:
      false,
  },
];

// ======================================================
// SERVICE
// ======================================================

export const taskService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data
  ) {
    const transaction =
      await sequelize.transaction();

    let task;

    try {
      // ==================================================
      // ASSIGNEE VALIDATION
      // ==================================================

      if (
        data.assigned_to
      ) {
        const assignee =
          await User.findByPk(
            data.assigned_to,
            {
              transaction,

              attributes: [
                'id',
                'is_active',
              ],
            }
          );

        if (!assignee) {
          throw new Error(
            'Görev atanacak kullanıcı bulunamadı'
          );
        }

        if (
          assignee.is_active !==
          true
        ) {
          throw new Error(
            'Pasif kullanıcıya görev atanamaz'
          );
        }
      }

      // ==================================================
      // CREATE
      // ==================================================

      task =
        await Task.create(
          data,
          {
            transaction,
          }
        );

      // ==================================================
      // REMINDERS
      // ==================================================

      if (
        shouldHaveReminders(
          task
        )
      ) {
        await reminderService.createTaskReminders(
          task,
          {
            transaction,
          }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    // ==================================================
    // NOTIFICATION
    // ==================================================

    if (
      task.assigned_to
    ) {
      await notifySafely(
        'task-assigned-on-create',

        async () => {
          const creator =
            await User.findByPk(
              task.created_by,
              {
                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              }
            );

          const creatorName =
            creator
              ? [
                  creator.first_name,
                  creator.last_name,
                ]
                  .filter(
                    Boolean
                  )
                  .join(' ')
                  .trim()
              : 'Sistem';

          await notificationService.notifyTaskAssigned(
            task.assigned_to,
            task.id,
            task.title,
            creatorName ||
              'Sistem'
          );
        },

        {
          taskId:
            task.id,

          assignedTo:
            task.assigned_to,

          createdBy:
            task.created_by,
        }
      );
    }

    return task;
  },

  // ====================================================
  // LIST
  // ====================================================

  async findAll({
    page = 1,
    limit = 10,
    search,
    status,
    priority,
    assigned_to,
    case_id,
    client_id,

    userId,
    canViewAllTasks = false,
  }) {
    const filters = {};

    // ==================================================
    // SEARCH
    // ==================================================

    if (
      search?.trim()
    ) {
      const normalizedSearch =
        search.trim();

      filters[
        Op.or
      ] = [
        {
          title: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          description: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
      ];
    }

    // ==================================================
    // FILTERS
    // ==================================================

    if (status) {
      filters.status =
        status;
    }

    if (priority) {
      filters.priority =
        priority;
    }

    /*
     * VIEW_ALL_TASKS olmayan kullanıcı
     * assigned_to query parametresi göndererek
     * başka kişinin görevlerini açamaz.
     *
     * Access scope aşağıda ayrıca uygulanıyor.
     */
    if (assigned_to) {
      filters.assigned_to =
        assigned_to;
    }

    if (case_id) {
      filters.case_id =
        case_id;
    }

    if (client_id) {
      filters.client_id =
        client_id;
    }

    // ==================================================
    // RECORD-LEVEL ACCESS
    // ==================================================

    const where =
      applyTaskAccessScope(
        filters,
        {
          userId,
          canViewAllTasks,
        }
      );

    // ==================================================
    // PAGINATION
    // ==================================================

    const pageNum =
      Math.max(
        Number.parseInt(
          page,
          10
        ) || 1,
        1
      );

    const limitNum =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 10,
          1
        ),
        100
      );

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
      await Task.findAndCountAll({
        ...query,

        include:
          LIST_INCLUDE,

        distinct:
          true,

        order: [
          [
            'priority',
            'DESC',
          ],

          [
            'due_date',
            'ASC',
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
          pageNum,
          limitNum
        ),
    };
  },

  // ====================================================
  // ASSIGNABLE USERS
  // ====================================================

  async getAssignableUsers() {
    return User.findAll({
      where: {
        is_active:
          true,
      },

      attributes: [
        'id',
        'first_name',
        'last_name',
        'email',
        'role',
        'title',
      ],

      order: [
        [
          'first_name',
          'ASC',
        ],

        [
          'last_name',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    id,
    access = {}
  ) {
    const task =
      await Task.findByPk(
        id,
        {
          include: [
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
                'email',
              ],

              required:
                false,
            },

            {
              model:
                User,

              as:
                'approver',

              attributes: [
                'id',
                'first_name',
                'last_name',
                'email',
              ],

              required:
                false,
            },

            {
              model:
                Case,

              as:
                'case',

              attributes: [
                'id',
                'title',
              ],

              required:
                false,
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

              required:
                false,
            },

            {
              model:
                Task,

              as:
                'parentTask',

              attributes: [
                'id',
                'title',
                'status',
              ],

              required:
                false,
            },

            {
              model:
                Task,

              as:
                'subtasks',

              attributes: [
                'id',
                'title',
                'status',
                'due_date',
                'priority',
                'progress',
              ],

              required:
                false,
            },

            {
              model:
                Note,

              as:
                'taskNotes',

              required:
                false,

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
                    'email',
                  ],

                  required:
                    false,
                },
              ],
            },
          ],

          order: [
            [
              {
                model:
                  Note,

                as:
                  'taskNotes',
              },

              'created_at',
              'ASC',
            ],
          ],
        }
      );

    if (!task) {
      throw new Error(
        'Task not found'
      );
    }

    assertTaskAccess(
      task,
      access
    );

    return task;
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data,
    access = {}
  ) {
    const transaction =
      await sequelize.transaction();

    let task;

    try {
      task =
        await Task.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!task) {
        throw new Error(
          'Task not found'
        );
      }

      assertTaskAccess(
        task,
        access
      );

      /*
       * Controller zaten workflow alanlarını temizliyor.
       * Service de ikinci savunma hattı olarak koruyor.
       */
      const {
        assigned_to,
        created_by,
        status,
        progress,
        approved_by,
        approved_at,
        started_at,
        completed_at,
        actual_hours,
        ...safeData
      } = data || {};

      const previousValues = {
        dueDate:
          task.due_date
            ? new Date(
                task.due_date
              ).getTime()
            : null,

        title:
          task.title,
      };

      await task.update(
        safeData,
        {
          transaction,
        }
      );

      const currentValues = {
        dueDate:
          task.due_date
            ? new Date(
                task.due_date
              ).getTime()
            : null,

        title:
          task.title,
      };

      const schedulingChanged =
        previousValues.dueDate !==
          currentValues.dueDate ||
        previousValues.title !==
          currentValues.title;

      if (
        TERMINAL_STATUSES.has(
          task.status
        )
      ) {
        await reminderService.cancelForSource({
          sourceType:
            'task',

          sourceId:
            task.id,

          transaction,
        });
      } else if (
        schedulingChanged &&
        shouldHaveReminders(
          task
        )
      ) {
        await reminderService.rescheduleTask(
          task,
          {
            transaction,
          }
        );
      } else if (
        schedulingChanged &&
        !shouldHaveReminders(
          task
        )
      ) {
        await reminderService.cancelForSource({
          sourceType:
            'task',

          sourceId:
            task.id,

          transaction,
        });
      }

      await transaction.commit();

      return task;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // DELETE
  // ====================================================

  async remove(
    id,
    access = {}
  ) {
    const transaction =
      await sequelize.transaction();

    try {
      const task =
        await Task.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!task) {
        throw new Error(
          'Task not found'
        );
      }

      assertTaskAccess(
        task,
        access
      );

      await reminderService.cancelForSource({
        sourceType:
          'task',

        sourceId:
          task.id,

        transaction,
      });

      await task.destroy({
        transaction,
      });

      await transaction.commit();

      return task;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // UPDATE STATUS
  //
  // Controller doğrudan kullanılabilecek durumları
  // ayrıca sınırlar.
  // ====================================================

  async updateStatus(
    id,
    status,
    access = {}
  ) {
    const transaction =
      await sequelize.transaction();

    try {
      const task =
        await Task.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!task) {
        throw new Error(
          'Task not found'
        );
      }

      assertTaskAccess(
        task,
        access
      );

      const allowedStatuses = [
        'pending',
        'cancelled',
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        throw new Error(
          'Bu görev durumu doğrudan değiştirilemez'
        );
      }

      const updateData = {
        status,
      };

      /*
       * Yeniden pending yapılırsa workflow alanlarını
       * temizliyoruz.
       */
      if (
        status ===
        'pending'
      ) {
        updateData.started_at =
          null;

        updateData.completed_at =
          null;

        updateData.approved_at =
          null;

        updateData.approved_by =
          null;

        updateData.actual_hours =
          null;

        updateData.progress =
          0;
      }

      await task.update(
        updateData,
        {
          transaction,
        }
      );

      if (
        TERMINAL_STATUSES.has(
          status
        )
      ) {
        await reminderService.cancelForSource({
          sourceType:
            'task',

          sourceId:
            task.id,

          transaction,
        });
      } else if (
        shouldHaveReminders(
          task
        )
      ) {
        await reminderService.rescheduleTask(
          task,
          {
            transaction,
          }
        );
      }

      await transaction.commit();

      return task;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // ASSIGN
  // ====================================================

  async assignTask(
    id,
    assigned_to,
    assignedBy = null
  ) {
    const transaction =
      await sequelize.transaction();

    let task;
    let oldAssignee;

    try {
      task =
        await Task.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!task) {
        throw new Error(
          'Task not found'
        );
      }

      /*
       * Tamamlanmış / iptal edilmiş görev yeniden
       * atanmasın.
       */
      if (
        TERMINAL_STATUSES.has(
          task.status
        )
      ) {
        throw new Error(
          'Tamamlanmış veya iptal edilmiş görev yeniden atanamaz'
        );
      }

      const user =
        await User.findByPk(
          assigned_to,
          {
            transaction,

            attributes: [
              'id',
              'email',
              'first_name',
              'last_name',
              'is_active',
            ],
          }
        );

      if (!user) {
        throw new Error(
          'Atanacak kullanıcı bulunamadı'
        );
      }

      if (
        user.is_active !==
        true
      ) {
        throw new Error(
          'Pasif kullanıcıya görev atanamaz'
        );
      }

      oldAssignee =
        task.assigned_to;

      await task.update(
        {
          assigned_to,
        },
        {
          transaction,
        }
      );

      if (
        shouldHaveReminders(
          task
        )
      ) {
        await reminderService.rescheduleTask(
          task,
          {
            transaction,
          }
        );
      } else {
        await reminderService.cancelForSource({
          sourceType:
            'task',

          sourceId:
            task.id,

          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    if (
      oldAssignee !==
      assigned_to
    ) {
      await notifySafely(
        'task-assigned',

        async () => {
          let assignerName =
            'Sistem';

          if (
            typeof assignedBy ===
              'string' &&
            assignedBy.trim()
          ) {
            assignerName =
              assignedBy.trim();
          }

          await notificationService.notifyTaskAssigned(
            assigned_to,
            task.id,
            task.title,
            assignerName
          );
        },

        {
          taskId:
            task.id,

          assignedTo:
            assigned_to,

          previousAssignee:
            oldAssignee,
        }
      );
    }

    return task;
  },

  // ====================================================
  // MY TASKS
  // ====================================================

  async getMyTasks(
    userId,
    {
      page = 1,
      limit = 10,
      status,
    } = {}
  ) {
    const where = {
      assigned_to:
        userId,
    };

    if (status) {
      where.status =
        status;
    }

    const pageNum =
      Math.max(
        Number.parseInt(
          page,
          10
        ) || 1,
        1
      );

    const limitNum =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 10,
          1
        ),
        100
      );

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
      await Task.findAndCountAll({
        ...query,

        include: [
          {
            model:
              Case,

            as:
              'case',

            attributes: [
              'id',
              'title',
            ],

            required:
              false,
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

            required:
              false,
          },
        ],

        distinct:
          true,

        order: [
          [
            'priority',
            'DESC',
          ],

          [
            'due_date',
            'ASC',
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
          pageNum,
          limitNum
        ),
    };
  },

  // ====================================================
  // CLIENT TASKS
  // ====================================================

  async getByClient(
    clientId,
    {
      page = 1,
      limit = 25,
      status,

      userId,
      canViewAllTasks = false,
    } = {}
  ) {
    return this.findAll({
      page,
      limit,
      status,

      client_id:
        clientId,

      userId,
      canViewAllTasks,
    });
  },

  // ====================================================
  // CLIENT OVERVIEW
  // ====================================================

  async getClientOverview(
    clientId,
    {
      activeLimit = 5,
      recentLimit = 5,

      userId,
      canViewAllTasks = false,
    } = {}
  ) {
    const safeActiveLimit =
      Math.min(
        Math.max(
          Number.parseInt(
            activeLimit,
            10
          ) || 5,
          1
        ),
        20
      );

    const safeRecentLimit =
      Math.min(
        Math.max(
          Number.parseInt(
            recentLimit,
            10
          ) || 5,
          1
        ),
        20
      );

    const now =
      new Date();

    const baseWhere =
      applyTaskAccessScope(
        {
          client_id:
            clientId,
        },
        {
          userId,
          canViewAllTasks,
        }
      );

    const activeWhere = {
      [Op.and]: [
        baseWhere,

        {
          status: {
            [Op.notIn]: [
              'completed',
              'cancelled',
            ],
          },
        },
      ],
    };

    const recentWhere = {
      [Op.and]: [
        baseWhere,

        {
          status: {
            [Op.in]: [
              'completed',
              'cancelled',
            ],
          },
        },
      ],
    };

    const pendingWhere = {
      [Op.and]: [
        baseWhere,

        {
          status:
            'pending',
        },
      ],
    };

    const inProgressWhere = {
      [Op.and]: [
        baseWhere,

        {
          status:
            'in_progress',
        },
      ],
    };

    const completedWhere = {
      [Op.and]: [
        baseWhere,

        {
          status:
            'completed',
        },
      ],
    };

    const overdueWhere = {
      [Op.and]: [
        baseWhere,

        {
          due_date: {
            [Op.lt]:
              now,
          },

          status: {
            [Op.notIn]: [
              'completed',
              'cancelled',
            ],
          },
        },
      ],
    };

    const [
      active,
      recent,
      total,
      pending,
      inProgress,
      completed,
      overdue,
    ] =
      await Promise.all([
        Task.findAll({
          where:
            activeWhere,

          include: [
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

              required:
                false,
            },

            {
              model:
                Case,

              as:
                'case',

              attributes: [
                'id',
                'title',
              ],

              required:
                false,
            },
          ],

          order: [
            [
              'priority',
              'DESC',
            ],

            [
              'due_date',
              'ASC',
            ],

            [
              'created_at',
              'DESC',
            ],
          ],

          limit:
            safeActiveLimit,
        }),

        Task.findAll({
          where:
            recentWhere,

          include: [
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

              required:
                false,
            },

            {
              model:
                Case,

              as:
                'case',

              attributes: [
                'id',
                'title',
              ],

              required:
                false,
            },
          ],

          order: [
            [
              'completed_at',
              'DESC',
            ],

            [
              'updated_at',
              'DESC',
            ],
          ],

          limit:
            safeRecentLimit,
        }),

        Task.count({
          where:
            baseWhere,
        }),

        Task.count({
          where:
            pendingWhere,
        }),

        Task.count({
          where:
            inProgressWhere,
        }),

        Task.count({
          where:
            completedWhere,
        }),

        Task.count({
          where:
            overdueWhere,
        }),
      ]);

    return {
      active,
      recent,

      summary: {
        total,
        pending,

        in_progress:
          inProgress,

        completed,
        overdue,
      },
    };
  },

  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics(
    userId,
    {
      canViewAllTasks = false,
    } = {}
  ) {
    const now =
      new Date();

    const myScope = {
      assigned_to:
        userId,
    };

    const visibleScope =
      applyTaskAccessScope(
        {},
        {
          userId,
          canViewAllTasks,
        }
      );

    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,

      myTasks,
      myPending,
      myInProgress,
      myCompleted,
      myOverdue,
    ] =
      await Promise.all([
        Task.count({
          where:
            visibleScope,
        }),

        Task.count({
          where: {
            [Op.and]: [
              visibleScope,

              {
                status:
                  'pending',
              },
            ],
          },
        }),

        Task.count({
          where: {
            [Op.and]: [
              visibleScope,

              {
                status:
                  'in_progress',
              },
            ],
          },
        }),

        Task.count({
          where: {
            [Op.and]: [
              visibleScope,

              {
                status:
                  'completed',
              },
            ],
          },
        }),

        Task.count({
          where: {
            [Op.and]: [
              visibleScope,

              {
                due_date: {
                  [Op.lt]:
                    now,
                },

                status: {
                  [Op.notIn]: [
                    'completed',
                    'cancelled',
                  ],
                },
              },
            ],
          },
        }),

        Task.count({
          where:
            myScope,
        }),

        Task.count({
          where: {
            ...myScope,

            status:
              'pending',
          },
        }),

        Task.count({
          where: {
            ...myScope,

            status:
              'in_progress',
          },
        }),

        Task.count({
          where: {
            ...myScope,

            status:
              'completed',
          },
        }),

        Task.count({
          where: {
            ...myScope,

            due_date: {
              [Op.lt]:
                now,
            },

            status: {
              [Op.notIn]: [
                'completed',
                'cancelled',
              ],
            },
          },
        }),
      ]);

    return {
      /*
       * "total" artık kullanıcının görebildiği alanı
       * temsil eder.
       *
       * VIEW_ALL_TASKS varsa gerçek sistem toplamıdır.
       */
      total: {
        total:
          totalTasks,

        pending:
          pendingTasks,

        inProgress:
          inProgressTasks,

        completed:
          completedTasks,

        overdue:
          overdueTasks,
      },

      my: {
        total:
          myTasks,

        pending:
          myPending,

        inProgress:
          myInProgress,

        completed:
          myCompleted,

        overdue:
          myOverdue,
      },
    };
  },

  // ====================================================
  // OVERDUE
  // ====================================================

  async getOverdue(
    userId
  ) {
    return Task.findAll({
      where: {
        assigned_to:
          userId,

        due_date: {
          [Op.lt]:
            new Date(),
        },

        status: {
          [Op.notIn]: [
            'completed',
            'cancelled',
          ],
        },
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
          ],

          required:
            false,
        },
      ],

      order: [
        [
          'due_date',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // UPCOMING
  // ====================================================

  async getUpcoming(
    userId
  ) {
    const now =
      new Date();

    const weekLater =
      new Date(
        now.getTime() +
          7 *
            24 *
            60 *
            60 *
            1000
      );

    return Task.findAll({
      where: {
        assigned_to:
          userId,

        due_date: {
          [Op.between]: [
            now,
            weekLater,
          ],
        },

        status: {
          [Op.notIn]: [
            'completed',
            'cancelled',
          ],
        },
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
          ],

          required:
            false,
        },
      ],

      order: [
        [
          'due_date',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // START
  // ====================================================

  async startTask(
    id,
    userId
  ) {
    const transaction =
      await sequelize.transaction();

    try {
      const task =
        await Task.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!task) {
        throw new Error(
          'Task not found'
        );
      }

      if (
        task.assigned_to !==
        userId
      ) {
        throw new Error(
          'Bu görev size atanmamış'
        );
      }

      if (
        task.status ===
        'completed'
      ) {
        throw new Error(
          'Görev zaten tamamlanmış'
        );
      }

      if (
        task.status ===
        'cancelled'
      ) {
        throw new Error(
          'İptal edilmiş görev başlatılamaz'
        );
      }

      if (
        task.status ===
        'in_progress'
      ) {
        throw new Error(
          'Görev zaten başlatılmış'
        );
      }

      await task.update(
        {
          status:
            'in_progress',

          started_at:
            task.started_at ||
            new Date(),
        },
        {
          transaction,
        }
      );

      await Note.create(
        {
          task_id:
            id,

          created_by:
            userId,

          content:
            `Görev başlatıldı: ${task.title}`,

          note_type:
            'task',
        },
        {
          transaction,
        }
      );

      if (
        shouldHaveReminders(
          task
        )
      ) {
        await reminderService.createTaskReminders(
          task,
          {
            transaction,
          }
        );
      }

      await transaction.commit();

      return task;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // COMPLETE
  // ====================================================

  async completeTask(
    id,
    userId,
    {
      note,
      actual_hours,
    }
  ) {
    const transaction =
      await sequelize.transaction();

    let task;

    try {
      task =
        await Task.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!task) {
        throw new Error(
          'Task not found'
        );
      }

      if (
        task.assigned_to !==
        userId
      ) {
        throw new Error(
          'Bu görev size atanmamış'
        );
      }

      if (
        task.status ===
        'completed'
      ) {
        throw new Error(
          'Görev zaten tamamlanmış'
        );
      }

      if (
        task.status !==
        'in_progress'
      ) {
        throw new Error(
          'Görev önce başlatılmalıdır'
        );
      }

      if (
        !note?.trim()
      ) {
        throw new Error(
          'Tamamlama notu gereklidir'
        );
      }

      let actualHours =
        Number(
          actual_hours
        );

      if (
        !Number.isFinite(
          actualHours
        ) ||
        actualHours < 0
      ) {
        actualHours =
          null;
      }

      if (
        actualHours ===
          null &&
        task.started_at
      ) {
        const diffMs =
          Date.now() -
          new Date(
            task.started_at
          ).getTime();

        actualHours =
          Number(
            (
              diffMs /
              (
                1000 *
                60 *
                60
              )
            ).toFixed(
              2
            )
          );
      }

      await task.update(
        {
          status:
            'completed',

          completed_at:
            new Date(),

          actual_hours:
            actualHours,

          progress:
            100,
        },
        {
          transaction,
        }
      );

      await Note.create(
        {
          task_id:
            id,

          created_by:
            userId,

          content:
            note.trim(),

          note_type:
            'task',
        },
        {
          transaction,
        }
      );

      await reminderService.cancelForSource({
        sourceType:
          'task',

        sourceId:
          task.id,

        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    if (
      task.created_by
    ) {
      await notifySafely(
        'task-completed',

        async () => {
          await notificationService.notifyTaskCompleted(
            task.created_by,
            task.id,
            task.title,
            userId
          );
        },

        {
          taskId:
            task.id,

          completedBy:
            userId,
        }
      );
    }

    return task;
  },

  // ====================================================
  // APPROVE
  // ====================================================

  async approveTask(
    id,
    userId
  ) {
    const transaction =
      await sequelize.transaction();

    let task;
    let approver;

    try {
      task =
        await Task.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!task) {
        throw new Error(
          'Task not found'
        );
      }

      if (
        task.status !==
        'completed'
      ) {
        throw new Error(
          'Yalnızca tamamlanmış görevler onaylanabilir'
        );
      }

      if (
        task.approved_at
      ) {
        throw new Error(
          'Görev zaten onaylanmış'
        );
      }

      approver =
        await User.findByPk(
          userId,
          {
            transaction,

            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
          }
        );

      if (!approver) {
        throw new Error(
          'Kullanıcı bulunamadı'
        );
      }

      await task.update(
        {
          approved_by:
            userId,

          approved_at:
            new Date(),
        },
        {
          transaction,
        }
      );

      await Note.create(
        {
          task_id:
            id,

          created_by:
            userId,

          content:
            `Görev onaylandı: ${task.title}`,

          note_type:
            'task',
        },
        {
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    if (
      task.assigned_to
    ) {
      await notifySafely(
        'task-approved',

        async () => {
          const approverName =
            [
              approver.first_name,
              approver.last_name,
            ]
              .filter(
                Boolean
              )
              .join(' ')
              .trim();

          await notificationService.notifyTaskApproved(
            task.assigned_to,
            task.id,
            task.title,
            approverName ||
              'Yönetici'
          );
        },

        {
          taskId:
            task.id,

          approvedBy:
            userId,
        }
      );
    }

    return task;
  },

  // ====================================================
  // ADD NOTE
  // ====================================================

  async addNote(
    id,
    userId,
    {
      content,
    }
  ) {
    const task =
      await Task.findByPk(
        id
      );

    if (!task) {
      throw new Error(
        'Task not found'
      );
    }

    /*
     * Çalışma notunu yalnızca görevin sorumlusu ekler.
     * CREATE_NOTES route izni tek başına başka kişinin
     * görevine not eklemeye yetmez.
     */
    if (
      task.assigned_to !==
      userId
    ) {
      throw new Error(
        'Bu göreve not ekleme yetkiniz bulunmuyor'
      );
    }

    if (
      !content?.trim()
    ) {
      throw new Error(
        'Not içeriği gereklidir'
      );
    }

    const note =
      await Note.create({
        task_id:
          id,

        created_by:
          userId,

        content:
          content.trim(),

        note_type:
          'task',
      });

    return Note.findByPk(
      note.id,
      {
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
              'email',
            ],
          },
        ],
      }
    );
  },

  // ====================================================
  // NOTES
  // ====================================================

  async getNotes(
    id,
    userId,
    {
      canViewAllTasks = false,
    } = {}
  ) {
    const task =
      await Task.findByPk(
        id
      );

    if (!task) {
      throw new Error(
        'Task not found'
      );
    }

    if (
      !canAccessTask(
        task,
        {
          userId,
          canViewAllTasks,
        }
      )
    ) {
      throw new Error(
        'Bu görevin notlarını görüntüleme yetkiniz bulunmuyor'
      );
    }

    return Note.findAll({
      where: {
        task_id:
          id,

        note_type:
          'task',
      },

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
            'email',
            'role',
          ],

          required:
            false,
        },
      ],

      order: [
        [
          'created_at',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // PROGRESS
  // ====================================================

  async updateProgress(
    id,
    userId,
    progress
  ) {
    const transaction =
      await sequelize.transaction();

    try {
      const task =
        await Task.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!task) {
        throw new Error(
          'Task not found'
        );
      }

      if (
        task.assigned_to !==
        userId
      ) {
        throw new Error(
          'Bu görev size atanmamış'
        );
      }

      if (
        task.status !==
        'in_progress'
      ) {
        throw new Error(
          'Yalnızca devam eden görevlerin ilerlemesi güncellenebilir'
        );
      }

      const parsedProgress =
        Number.parseInt(
          progress,
          10
        );

      if (
        !Number.isFinite(
          parsedProgress
        )
      ) {
        throw new Error(
          'Geçerli bir ilerleme değeri girilmelidir'
        );
      }

      const validatedProgress =
        Math.min(
          99,
          Math.max(
            0,
            parsedProgress
          )
        );

      await task.update(
        {
          progress:
            validatedProgress,
        },
        {
          transaction,
        }
      );

      if (
        validatedProgress >
          0 &&
        validatedProgress %
          25 ===
          0
      ) {
        await Note.create(
          {
            task_id:
              id,

            created_by:
              userId,

            content:
              `Görev ilerlemesi %${validatedProgress} oldu`,

            note_type:
              'task',
          },
          {
            transaction,
          }
        );
      }

      await transaction.commit();

      return task;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },
};

export default taskService;