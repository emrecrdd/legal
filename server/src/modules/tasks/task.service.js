import {
  Op,
  Sequelize,
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

const ASSIGNEE_ATTRIBUTES = [
  'id',
  'first_name',
  'last_name',
  'email',
];

// ======================================================
// ASSIGNEE HELPERS
// ======================================================

const normalizeAssigneeIds = (
  value
) => {
  if (!value) {
    return [];
  }

  const values =
    Array.isArray(value)
      ? value
      : [value];

  return [
    ...new Set(
      values
        .map(
          (id) =>
            String(id).trim()
        )
        .filter(Boolean)
    ),
  ];
};

/*
 * Yeni frontend:
 *
 * assignee_ids: [
 *   "uuid-1",
 *   "uuid-2"
 * ]
 *
 * Eski frontend geçiş sürecinde:
 *
 * assigned_to: "uuid-1"
 *
 * gönderirse onu da destekliyoruz.
 */
const getRequestedAssigneeIds = (
  data = {}
) => {
  if (
    Object.prototype.hasOwnProperty.call(
      data,
      'assignee_ids'
    )
  ) {
    return normalizeAssigneeIds(
      data.assignee_ids
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      'assigned_to'
    )
  ) {
    return normalizeAssigneeIds(
      data.assigned_to
    );
  }

  return [];
};

const validateAssignees =
  async (
    assigneeIds,
    {
      transaction,
    } = {}
  ) => {
    const ids =
      normalizeAssigneeIds(
        assigneeIds
      );

    if (
      ids.length === 0
    ) {
      return [];
    }

    const users =
      await User.findAll({
        where: {
          id: {
            [Op.in]:
              ids,
          },
        },

        attributes: [
          'id',
          'first_name',
          'last_name',
          'email',
          'is_active',
        ],

        transaction,
      });

    if (
      users.length !==
      ids.length
    ) {
      throw new Error(
        'Görev atanacak kullanıcılardan biri veya birkaçı bulunamadı'
      );
    }

    const inactiveUser =
      users.find(
        (user) =>
          user.is_active !==
          true
      );

    if (
      inactiveUser
    ) {
      throw new Error(
        'Pasif kullanıcıya görev atanamaz'
      );
    }

    return users;
  };

const getLoadedAssigneeIds = (
  task
) => {
  if (
    !Array.isArray(
      task?.assignees
    )
  ) {
    return [];
  }

  return task.assignees
    .map(
      (user) =>
        user?.id
    )
    .filter(Boolean);
};

const getTaskAssigneeIds =
  async (
    task,
    {
      transaction,
    } = {}
  ) => {
    const loaded =
      getLoadedAssigneeIds(
        task
      );

    if (
      loaded.length >
      0
    ) {
      return loaded;
    }

    if (
      !task ||
      typeof task.getAssignees !==
        'function'
    ) {
      return [];
    }

    const assignees =
      await task.getAssignees({
        attributes: [
          'id',
        ],

        joinTableAttributes:
          [],

        transaction,
      });

    return assignees
      .map(
        (user) =>
          user.id
      )
      .filter(Boolean);
  };

const isTaskAssignee =
  async (
    task,
    userId,
    {
      transaction,
    } = {}
  ) => {
    if (
      !task ||
      !userId
    ) {
      return false;
    }

    if (
      Array.isArray(
        task.assignees
      )
    ) {
      return task.assignees.some(
        (user) =>
          user?.id ===
          userId
      );
    }

    if (
      typeof task.hasAssignee ===
      'function'
    ) {
      return task.hasAssignee(
        userId,
        {
          transaction,
        }
      );
    }

    return false;
  };

// ======================================================
// ASSIGNED TASK SQL SCOPE
// ======================================================

/*
 * JOIN ile assignee filtrelemek yerine junction tablosunu
 * subquery ile kullanıyoruz.
 *
 * Böylece include edilen assignees dizisi yalnız giriş
 * yapan kullanıcıya düşmez; görevin TÜM sorumluları
 * response içerisinde kalabilir.
 */
const buildAssignedTaskWhere = (
  userId
) => {
  if (!userId) {
    return {
      id: null,
    };
  }

  const escapedUserId =
    sequelize.escape(
      userId
    );

  return {
    id: {
      [Op.in]:
        Sequelize.literal(
          `(
            SELECT "task_id"
            FROM "task_assignees"
            WHERE "user_id" = ${escapedUserId}
          )`
        ),
    },
  };
};

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
      task?.created_by
    ) &&
    !TERMINAL_STATUSES.has(
      task?.status
    )
  );
};

/*
 * reminder.service şu anda büyük ihtimalle assigned_to
 * bekliyor.
 *
 * Task modelinden assigned_to kaldırıldığı için reminder
 * servisini güncelleyene kadar ilk assignee'yi geçici
 * olarak instance üzerinde assigned_to şeklinde sunuyoruz.
 *
 * Bu kalıcı çözüm değil.
 * Sonraki adım reminder.service.js olacak.
 */
const runWithReminderCompatibility =
  async (
    task,
    callback,
    {
      transaction,
    } = {}
  ) => {
    if (!task) {
      return callback(
        task
      );
    }

    const assigneeIds =
      await getTaskAssigneeIds(
        task,
        {
          transaction,
        }
      );

    const hadAssignedTo =
      Object.prototype.hasOwnProperty.call(
        task.dataValues ||
          {},
        'assigned_to'
      );

    const previousAssignedTo =
      task.dataValues
        ?.assigned_to;

    if (
      typeof task.setDataValue ===
      'function'
    ) {
      task.setDataValue(
        'assigned_to',
        assigneeIds[0] ||
          null
      );
    }

    try {
      return await callback(
        task
      );
    } finally {
      if (
        task.dataValues
      ) {
        if (
          hadAssignedTo
        ) {
          task.dataValues.assigned_to =
            previousAssignedTo;
        } else {
          delete task
            .dataValues
            .assigned_to;
        }
      }
    }
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
    return {
      id: null,
    };
  }

  return {
    [Op.or]: [
      {
        created_by:
          userId,
      },

      buildAssignedTaskWhere(
        userId
      ),
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

const canAccessTask =
  async (
    task,
    {
      userId,
      canViewAllTasks = false,
      transaction,
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

    if (
      task.created_by ===
      userId
    ) {
      return true;
    }

    return isTaskAssignee(
      task,
      userId,
      {
        transaction,
      }
    );
  };

const assertTaskAccess =
  async (
    task,
    access = {}
  ) => {
    const allowed =
      await canAccessTask(
        task,
        access
      );

    if (!allowed) {
      throw new Error(
        'Bu göreve erişim yetkiniz bulunmuyor'
      );
    }
  };

// ======================================================
// COMMON INCLUDE
// ======================================================

const ASSIGNEES_INCLUDE = {
  association:
    'assignees',

  attributes:
    ASSIGNEE_ATTRIBUTES,

  through: {
    attributes: [],
  },

  required:
    false,
};

const LIST_INCLUDE = [
  ASSIGNEES_INCLUDE,

  {
    association:
      'creator',

    attributes:
      ASSIGNEE_ATTRIBUTES,

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
    let assignees = [];

    try {
      const assigneeIds =
        getRequestedAssigneeIds(
          data
        );

      assignees =
        await validateAssignees(
          assigneeIds,
          {
            transaction,
          }
        );

      /*
       * assigned_to artık Task modelinde yok.
       *
       * assignee_ids de DB kolonu olmadığı için
       * Task.create içerisine göndermiyoruz.
       */
      const {
        assigned_to,
        assignee_ids,
        ...taskData
      } = data || {};

      task =
        await Task.create(
          taskData,
          {
            transaction,
          }
        );

      if (
        assignees.length >
        0
      ) {
        await task.setAssignees(
          assignees,
          {
            transaction,
          }
        );
      }

      task.setDataValue(
        'assignees',
        assignees
      );

      if (
        shouldHaveReminders(
          task
        )
      ) {
        await runWithReminderCompatibility(
          task,

          (
            reminderTask
          ) =>
            reminderService.createTaskReminders(
              reminderTask,
              {
                transaction,
              }
            ),

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
    // NOTIFICATIONS
    // ==================================================

    if (
      assignees.length >
      0
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

          for (
            const assignee of
            assignees
          ) {
            await notificationService.notifyTaskAssigned(
              assignee.id,
              task.id,
              task.title,
              creatorName ||
                'Sistem'
            );
          }
        },

        {
          taskId:
            task.id,

          assigneeIds:
            assignees.map(
              (user) =>
                user.id
            ),

          createdBy:
            task.created_by,
        }
      );
    }

    return this.findOne(
      task.id,
      {
        canViewAllTasks:
          true,
      }
    );
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

    /*
     * API geriye dönük uyumluluk için parametre adı
     * şimdilik assigned_to kalabilir.
     */
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

    if (
      assigned_to
    ) {
      if (
        !canViewAllTasks &&
        assigned_to !==
          userId
      ) {
        throw new Error(
          'Başka bir kullanıcının görevleri filtrelenemez'
        );
      }

      filters[
        Op.and
      ] = [
        ...(filters[
          Op.and
        ] || []),

        buildAssignedTaskWhere(
          assigned_to
        ),
      ];
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
    // ACCESS
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
            ASSIGNEES_INCLUDE,

            {
              association:
                'creator',

              attributes:
                ASSIGNEE_ATTRIBUTES,

              required:
                false,
            },

            {
              association:
                'approver',

              attributes:
                ASSIGNEE_ATTRIBUTES,

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

                  attributes:
                    ASSIGNEE_ATTRIBUTES,

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

    await assertTaskAccess(
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

      await assertTaskAccess(
        task,
        {
          ...access,
          transaction,
        }
      );

      /*
       * Atama ayrı endpoint üzerinden yönetiliyor.
       */
      const {
        assigned_to,
        assignee_ids,
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
        await runWithReminderCompatibility(
          task,

          (
            reminderTask
          ) =>
            reminderService.rescheduleTask(
              reminderTask,
              {
                transaction,
              }
            ),

          {
            transaction,
          }
        );
      } else if (
        schedulingChanged
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

      return this.findOne(
        id,
        {
          canViewAllTasks:
            true,
        }
      );
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

      await assertTaskAccess(
        task,
        {
          ...access,
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

      await assertTaskAccess(
        task,
        {
          ...access,
          transaction,
        }
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
        await runWithReminderCompatibility(
          task,

          (
            reminderTask
          ) =>
            reminderService.rescheduleTask(
              reminderTask,
              {
                transaction,
              }
            ),

          {
            transaction,
          }
        );
      }

      await transaction.commit();

      return this.findOne(
        id,
        {
          canViewAllTasks:
            true,
        }
      );
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // ASSIGN MULTIPLE USERS
  // ====================================================

  async assignTask(
    id,
    assigneeIds,
    assignedBy = null
  ) {
    const transaction =
      await sequelize.transaction();

    let task;
    let previousAssigneeIds = [];
    let newAssignees = [];

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
        TERMINAL_STATUSES.has(
          task.status
        )
      ) {
        throw new Error(
          'Tamamlanmış veya iptal edilmiş görev yeniden atanamaz'
        );
      }

      const normalizedIds =
        normalizeAssigneeIds(
          assigneeIds
        );

      const previousAssignees =
        await task.getAssignees({
          attributes: [
            'id',
          ],

          joinTableAttributes:
            [],

          transaction,
        });

      previousAssigneeIds =
        previousAssignees.map(
          (user) =>
            user.id
        );

      newAssignees =
        await validateAssignees(
          normalizedIds,
          {
            transaction,
          }
        );

      await task.setAssignees(
        newAssignees,
        {
          transaction,
        }
      );

      task.setDataValue(
        'assignees',
        newAssignees
      );

      if (
        shouldHaveReminders(
          task
        )
      ) {
        await runWithReminderCompatibility(
          task,

          (
            reminderTask
          ) =>
            reminderService.rescheduleTask(
              reminderTask,
              {
                transaction,
              }
            ),

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

    // ==================================================
    // NOTIFY NEWLY ADDED USERS
    // ==================================================

    const newlyAdded =
      newAssignees.filter(
        (user) =>
          !previousAssigneeIds.includes(
            user.id
          )
      );

    if (
      newlyAdded.length >
      0
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

          for (
            const user of
            newlyAdded
          ) {
            await notificationService.notifyTaskAssigned(
              user.id,
              task.id,
              task.title,
              assignerName
            );
          }
        },

        {
          taskId:
            task.id,

          assignedTo:
            newlyAdded.map(
              (user) =>
                user.id
            ),

          previousAssignees:
            previousAssigneeIds,
        }
      );
    }

    return this.findOne(
      id,
      {
        canViewAllTasks:
          true,
      }
    );
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
      ...buildAssignedTaskWhere(
        userId
      ),
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
          ASSIGNEES_INCLUDE,

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
            association:
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
            ASSIGNEES_INCLUDE,

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

          distinct:
            true,
        }),

        Task.findAll({
          where:
            recentWhere,

          include: [
            ASSIGNEES_INCLUDE,

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

    const myScope =
      buildAssignedTaskWhere(
        userId
      );

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
            [Op.and]: [
              myScope,
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
              myScope,
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
              myScope,
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
              myScope,

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
      ]);

    return {
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
        [Op.and]: [
          buildAssignedTaskWhere(
            userId
          ),

          {
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
        ],
      },

      include: [
        ASSIGNEES_INCLUDE,

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
        [Op.and]: [
          buildAssignedTaskWhere(
            userId
          ),

          {
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
        ],
      },

      include: [
        ASSIGNEES_INCLUDE,

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

      const assigned =
        await isTaskAssignee(
          task,
          userId,
          {
            transaction,
          }
        );

      if (!assigned) {
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
        await runWithReminderCompatibility(
          task,

          (
            reminderTask
          ) =>
            reminderService.createTaskReminders(
              reminderTask,
              {
                transaction,
              }
            ),

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

      const assigned =
        await isTaskAssignee(
          task,
          userId,
          {
            transaction,
          }
        );

      if (!assigned) {
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
    let assigneeIds = [];

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

      assigneeIds =
        await getTaskAssigneeIds(
          task,
          {
            transaction,
          }
        );

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
      assigneeIds.length >
      0
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

          for (
            const assigneeId of
            assigneeIds
          ) {
            await notificationService.notifyTaskApproved(
              assigneeId,
              task.id,
              task.title,
              approverName ||
                'Yönetici'
            );
          }
        },

        {
          taskId:
            task.id,

          approvedBy:
            userId,

          assigneeIds,
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

    const assigned =
      await isTaskAssignee(
        task,
        userId
      );

    if (!assigned) {
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

            attributes:
              ASSIGNEE_ATTRIBUTES,
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

    const allowed =
      await canAccessTask(
        task,
        {
          userId,
          canViewAllTasks,
        }
      );

    if (!allowed) {
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

      const assigned =
        await isTaskAssignee(
          task,
          userId,
          {
            transaction,
          }
        );

      if (!assigned) {
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