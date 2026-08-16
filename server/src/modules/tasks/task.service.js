import { Op } from 'sequelize';

import { Task } from '../../models/Task.js';
import { Note } from '../../models/Note.js';
import { User } from '../../models/User.js';
import { Case } from '../../models/Case.js';
import { Client } from '../../models/Client.js';

import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';

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

const TERMINAL_STATUSES = new Set([
  'completed',
  'cancelled',
]);

const shouldHaveReminders = (task) => {
  return (
    Boolean(task?.due_date) &&
    Boolean(task?.assigned_to || task?.created_by) &&
    !TERMINAL_STATUSES.has(task?.status)
  );
};

const notifySafely = async (
  operation,
  callback,
  metadata = {}
) => {
  try {
    await callback();
  } catch (error) {
    /*
     * Bildirim hatası ana CRUD işlemini geri almamalıdır.
     * Notification altyapısı geçici olarak çalışmasa bile
     * görev kaydı korunur.
     */
    logger.error(`Task notification failed: ${operation}`, {
      ...metadata,
      message: error.message,
    });
  }
};

export const taskService = {
  async create(data) {
    const transaction = await sequelize.transaction();

    let task;

    try {
      task = await Task.create(data, {
        transaction,
      });

      if (shouldHaveReminders(task)) {
        await reminderService.createTaskReminders(task, {
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    /*
     * Kullanıcı bildirimi transaction sonrasında gönderilir.
     * Harici bildirim hatası görev kaydını bozmamalıdır.
     */
    if (task.assigned_to) {
      await notifySafely(
        'task-assigned-on-create',
        async () => {
          const creator = await User.findByPk(
            task.created_by,
            {
              attributes: [
                'id',
                'first_name',
                'last_name',
              ],
            }
          );

          const creatorName = creator
            ? `${creator.first_name} ${creator.last_name}`.trim()
            : 'Sistem';

          await notificationService.notifyTaskAssigned(
            task.assigned_to,
            task.id,
            task.title,
            creatorName
          );
        },
        {
          taskId: task.id,
          assignedTo: task.assigned_to,
        }
      );
    }

    return task;
  },

  async findAll({
  page,
  limit,
  search,
  status,
  priority,
  assigned_to,
  case_id,  
  client_id,
}) {
    const where = {};

    if (search?.trim()) {
      const normalizedSearch = search.trim();

      where[Op.or] = [
        {
          title: {
            [Op.iLike]: `%${normalizedSearch}%`,
          },
        },
        {
          description: {
            [Op.iLike]: `%${normalizedSearch}%`,
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assigned_to) {
  where.assigned_to = assigned_to;
}

if (case_id) {
  where.case_id = case_id;
}

if (client_id) {
  where.client_id = client_id;
}

    const pageNum = Math.max(
      Number.parseInt(page, 10) || 1,
      1
    );

    const limitNum = Math.min(
      Math.max(
        Number.parseInt(limit, 10) || 10,
        1
      ),
      100
    );

    const query = paginate(
      { where },
      pageNum,
      limitNum
    );

    const { count, rows } =
      await Task.findAndCountAll({
        ...query,

        include: [
          {
            model: User,
            as: 'assignee',
            attributes: [
              'id',
              'first_name',
              'last_name',
              'email',
            ],
          },
          {
            model: User,
            as: 'creator',
            attributes: [
              'id',
              'first_name',
              'last_name',
              'email',
            ],
          },
          {
            model: Case,
            as: 'case',
            attributes: [
              'id',
              'title',
            ],
          },
          {
            model: Client,
            as: 'client',
            attributes: [
              'id',
              'name',
            ],
          },
        ],

        distinct: true,

        order: [
          ['priority', 'DESC'],
          ['due_date', 'ASC'],
          ['created_at', 'DESC'],
        ],
      });

    return {
      data: rows,
      pagination: getPaginationData(
        count,
        pageNum,
        limitNum
      ),
    };
  },

  async findOne(id) {
    const task = await Task.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
          ],
        },
        {
          model: User,
          as: 'creator',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
          ],
        },
        {
          model: User,
          as: 'approver',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
          ],
        },
        {
          model: Case,
          as: 'case',
          attributes: [
            'id',
            'title',
          ],
        },
        {
          model: Client,
          as: 'client',
          attributes: [
            'id',
            'name',
          ],
        },
        {
          model: Task,
          as: 'parentTask',
          attributes: [
            'id',
            'title',
            'status',
          ],
        },
        {
          model: Task,
          as: 'subtasks',
          attributes: [
            'id',
            'title',
            'status',
            'due_date',
            'priority',
            'progress',
          ],
        },
        {
          model: Note,
          as: 'taskNotes',
          include: [
            {
              model: User,
              as: 'creator',
              attributes: [
                'id',
                'first_name',
                'last_name',
                'email',
              ],
            },
          ],
        },
      ],

      order: [
        [
          {
            model: Note,
            as: 'taskNotes',
          },
          'created_at',
          'ASC',
        ],
      ],
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  },

  async update(id, data) {
    const transaction = await sequelize.transaction();

    let task;
    let oldAssignee;
    let shouldNotifyNewAssignee = false;

    try {
      task = await Task.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task) {
        throw new Error('Task not found');
      }

      oldAssignee = task.assigned_to;

      const previousValues = {
        dueDate: task.due_date
          ? new Date(task.due_date).getTime()
          : null,

        assignedTo: task.assigned_to,
        createdBy: task.created_by,
        status: task.status,
        title: task.title,
      };

      await task.update(data, {
        transaction,
      });

      const currentValues = {
        dueDate: task.due_date
          ? new Date(task.due_date).getTime()
          : null,

        assignedTo: task.assigned_to,
        createdBy: task.created_by,
        status: task.status,
        title: task.title,
      };

      const schedulingChanged =
        previousValues.dueDate !== currentValues.dueDate ||
        previousValues.assignedTo !== currentValues.assignedTo ||
        previousValues.createdBy !== currentValues.createdBy ||
        previousValues.status !== currentValues.status ||
        previousValues.title !== currentValues.title;

      if (TERMINAL_STATUSES.has(task.status)) {
        await reminderService.cancelForSource({
          sourceType: 'task',
          sourceId: task.id,
          transaction,
        });
      } else if (
        schedulingChanged &&
        shouldHaveReminders(task)
      ) {
        await reminderService.rescheduleTask(task, {
          transaction,
        });
      } else if (
        schedulingChanged &&
        !shouldHaveReminders(task)
      ) {
        await reminderService.cancelForSource({
          sourceType: 'task',
          sourceId: task.id,
          transaction,
        });
      }

      shouldNotifyNewAssignee =
        Boolean(task.assigned_to) &&
        oldAssignee !== task.assigned_to;

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    if (shouldNotifyNewAssignee) {
      await notifySafely(
        'task-reassigned-on-update',
        async () => {
          const creator = await User.findByPk(
            task.created_by,
            {
              attributes: [
                'id',
                'first_name',
                'last_name',
              ],
            }
          );

          const creatorName = creator
            ? `${creator.first_name} ${creator.last_name}`.trim()
            : 'Sistem';

          await notificationService.notifyTaskAssigned(
            task.assigned_to,
            task.id,
            task.title,
            creatorName
          );
        },
        {
          taskId: task.id,
          previousAssignee: oldAssignee,
          assignedTo: task.assigned_to,
        }
      );
    }

    return task;
  },

  async remove(id) {
    const transaction = await sequelize.transaction();

    try {
      const task = await Task.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task) {
        throw new Error('Task not found');
      }

      await reminderService.cancelForSource({
        sourceType: 'task',
        sourceId: task.id,
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

  async updateStatus(id, status) {
    const transaction = await sequelize.transaction();

    try {
      const task = await Task.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task) {
        throw new Error('Task not found');
      }

      const updateData = {
        status,
      };

      if (status === 'completed') {
        updateData.completed_at = new Date();
        updateData.progress = 100;
      } else if (task.status === 'completed') {
        /*
         * Tamamlanan görev yeniden açılırsa kapanış bilgileri
         * temizlenir.
         */
        updateData.completed_at = null;

        if (task.progress === 100) {
          updateData.progress = 0;
        }
      }

      await task.update(updateData, {
        transaction,
      });

      if (TERMINAL_STATUSES.has(status)) {
        await reminderService.cancelForSource({
          sourceType: 'task',
          sourceId: task.id,
          transaction,
        });
      } else if (shouldHaveReminders(task)) {
        await reminderService.rescheduleTask(task, {
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

  async assignTask(
    id,
    assigned_to,
    assignedBy = null
  ) {
    const transaction = await sequelize.transaction();

    let task;
    let oldAssignee;
    let user;

    try {
      task = await Task.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task) {
        throw new Error('Task not found');
      }

      user = await User.findByPk(
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
        throw new Error('User not found');
      }

      if (!user.is_active) {
        throw new Error(
          'Task cannot be assigned to an inactive user'
        );
      }

      oldAssignee = task.assigned_to;

      await task.update(
        {
          assigned_to,
        },
        {
          transaction,
        }
      );

      if (shouldHaveReminders(task)) {
        await reminderService.rescheduleTask(task, {
          transaction,
        });
      } else {
        await reminderService.cancelForSource({
          sourceType: 'task',
          sourceId: task.id,
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    if (oldAssignee !== assigned_to) {
      await notifySafely(
        'task-assigned',
        async () => {
          let assignerName = 'Sistem';

          if (
            typeof assignedBy === 'string' &&
            assignedBy.trim()
          ) {
            assignerName = assignedBy.trim();
          }

          await notificationService.notifyTaskAssigned(
            assigned_to,
            task.id,
            task.title,
            assignerName
          );
        },
        {
          taskId: task.id,
          assignedTo: assigned_to,
          previousAssignee: oldAssignee,
        }
      );
    }

    return task;
  },

  async getMyTasks(
    userId,
    {
      page,
      limit,
      status,
    }
  ) {
    const where = {
      assigned_to: userId,
    };

    if (status) {
      where.status = status;
    }

    const pageNum = Math.max(
      Number.parseInt(page, 10) || 1,
      1
    );

    const limitNum = Math.min(
      Math.max(
        Number.parseInt(limit, 10) || 10,
        1
      ),
      100
    );

    const query = paginate(
      { where },
      pageNum,
      limitNum
    );

    const { count, rows } =
      await Task.findAndCountAll({
        ...query,

        include: [
          {
            model: Case,
            as: 'case',
            attributes: [
              'id',
              'title',
            ],
          },
          {
            model: Client,
            as: 'client',
            attributes: [
              'id',
              'name',
            ],
          },
          {
            model: User,
            as: 'creator',
            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
          },
        ],

        distinct: true,

        order: [
          ['priority', 'DESC'],
          ['due_date', 'ASC'],
          ['created_at', 'DESC'],
        ],
      });

    return {
      data: rows,
      pagination: getPaginationData(
        count,
        pageNum,
        limitNum
      ),
    };
  },
async getByClient(
  clientId,
  {
    page = 1,
    limit = 25,
    status,
  } = {}
) {
  return this.findAll({
    page,
    limit,
    status,
    client_id: clientId,
  });
},

async getClientOverview(
  clientId,
  {
    activeLimit = 5,
    recentLimit = 5,
  } = {}
) {
  const safeActiveLimit = Math.min(
    Math.max(
      Number.parseInt(
        activeLimit,
        10
      ) || 5,
      1
    ),
    20
  );

  const safeRecentLimit = Math.min(
    Math.max(
      Number.parseInt(
        recentLimit,
        10
      ) || 5,
      1
    ),
    20
  );

  const now = new Date();

  const [
    active,
    recent,
    total,
    pending,
    inProgress,
    completed,
    overdue,
  ] = await Promise.all([
    Task.findAll({
      where: {
        client_id: clientId,

        status: {
          [Op.notIn]: [
            'completed',
            'cancelled',
          ],
        },
      },

      include: [
        {
          model: User,
          as: 'assignee',
          attributes: [
            'id',
            'first_name',
            'last_name',
          ],
          required: false,
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
        ['priority', 'DESC'],
        ['due_date', 'ASC'],
        ['created_at', 'DESC'],
      ],

      limit: safeActiveLimit,
    }),

    Task.findAll({
      where: {
        client_id: clientId,

        status: {
          [Op.in]: [
            'completed',
            'cancelled',
          ],
        },
      },

      include: [
        {
          model: User,
          as: 'assignee',
          attributes: [
            'id',
            'first_name',
            'last_name',
          ],
          required: false,
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
        ['completed_at', 'DESC'],
        ['updated_at', 'DESC'],
      ],

      limit: safeRecentLimit,
    }),

    Task.count({
      where: {
        client_id: clientId,
      },
    }),

    Task.count({
      where: {
        client_id: clientId,
        status: 'pending',
      },
    }),

    Task.count({
      where: {
        client_id: clientId,
        status: 'in_progress',
      },
    }),

    Task.count({
      where: {
        client_id: clientId,
        status: 'completed',
      },
    }),

    Task.count({
      where: {
        client_id: clientId,

        due_date: {
          [Op.lt]: now,
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
    active,
    recent,

    summary: {
      total,
      pending,
      in_progress: inProgress,
      completed,
      overdue,
    },
  };
},
  async getStatistics(userId) {
    const now = new Date();

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
    ] = await Promise.all([
      Task.count(),

      Task.count({
        where: {
          status: 'pending',
        },
      }),

      Task.count({
        where: {
          status: 'in_progress',
        },
      }),

      Task.count({
        where: {
          status: 'completed',
        },
      }),

      Task.count({
        where: {
          due_date: {
            [Op.lt]: now,
          },
          status: {
            [Op.notIn]: [
              'completed',
              'cancelled',
            ],
          },
        },
      }),

      Task.count({
        where: {
          assigned_to: userId,
        },
      }),

      Task.count({
        where: {
          assigned_to: userId,
          status: 'pending',
        },
      }),

      Task.count({
        where: {
          assigned_to: userId,
          status: 'in_progress',
        },
      }),

      Task.count({
        where: {
          assigned_to: userId,
          status: 'completed',
        },
      }),

      Task.count({
        where: {
          assigned_to: userId,
          due_date: {
            [Op.lt]: now,
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
      total: {
        total: totalTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        overdue: overdueTasks,
      },

      my: {
        total: myTasks,
        pending: myPending,
        inProgress: myInProgress,
        completed: myCompleted,
        overdue: myOverdue,
      },
    };
  },

  async getOverdue(userId) {
    return Task.findAll({
      where: {
        assigned_to: userId,

        due_date: {
          [Op.lt]: new Date(),
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
          model: Case,
          as: 'case',
          attributes: [
            'id',
            'title',
          ],
        },
      ],

      order: [
        ['due_date', 'ASC'],
      ],
    });
  },

  async getUpcoming(userId) {
    const now = new Date();

    const weekLater = new Date(
      now.getTime() +
        7 * 24 * 60 * 60 * 1000
    );

    return Task.findAll({
      where: {
        assigned_to: userId,

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
          model: Case,
          as: 'case',
          attributes: [
            'id',
            'title',
          ],
        },
      ],

      order: [
        ['due_date', 'ASC'],
      ],
    });
  },

  async startTask(id, userId) {
    const transaction = await sequelize.transaction();

    try {
      const task = await Task.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.assigned_to !== userId) {
        throw new Error(
          'You are not assigned to this task'
        );
      }

      if (task.status === 'completed') {
        throw new Error(
          'Task already completed'
        );
      }

      if (task.status === 'cancelled') {
        throw new Error(
          'Cancelled task cannot be started'
        );
      }

      if (task.status === 'in_progress') {
        throw new Error(
          'Task already started'
        );
      }

      await task.update(
        {
          status: 'in_progress',
          started_at:
            task.started_at || new Date(),
        },
        {
          transaction,
        }
      );

      await Note.create(
        {
          task_id: id,
          created_by: userId,
          content:
            `Görev başlatıldı: ${task.title}`,
          note_type: 'task',
        },
        {
          transaction,
        }
      );

      /*
       * Başlatma işleminde tarih değişmez; mevcut reminderlar
       * korunur. Reminder yoksa oluşturulur.
       */
      if (shouldHaveReminders(task)) {
        await reminderService.createTaskReminders(task, {
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

  async completeTask(
    id,
    userId,
    {
      note,
      actual_hours,
    }
  ) {
    const transaction = await sequelize.transaction();

    let task;

    try {
      task = await Task.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.assigned_to !== userId) {
        throw new Error(
          'You are not assigned to this task'
        );
      }

      if (task.status === 'completed') {
        throw new Error(
          'Task already completed'
        );
      }

      if (task.status !== 'in_progress') {
        throw new Error(
          'Task must be started first'
        );
      }

      if (!note?.trim()) {
        throw new Error(
          'Completion note is required'
        );
      }

      let actualHours =
        Number(actual_hours);

      if (
        !Number.isFinite(actualHours) ||
        actualHours < 0
      ) {
        actualHours = null;
      }

      if (
        actualHours === null &&
        task.started_at
      ) {
        const diffMs =
          Date.now() -
          new Date(task.started_at).getTime();

        actualHours = Number(
          (
            diffMs /
            (1000 * 60 * 60)
          ).toFixed(2)
        );
      }

      await task.update(
        {
          status: 'completed',
          completed_at: new Date(),
          actual_hours: actualHours,
          progress: 100,
        },
        {
          transaction,
        }
      );

      await Note.create(
        {
          task_id: id,
          created_by: userId,
          content: note.trim(),
          note_type: 'task',
        },
        {
          transaction,
        }
      );

      await reminderService.cancelForSource({
        sourceType: 'task',
        sourceId: task.id,
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    if (task.created_by) {
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
          taskId: task.id,
          completedBy: userId,
        }
      );
    }

    return task;
  },

  async approveTask(id, userId) {
    const transaction = await sequelize.transaction();

    let task;
    let approver;

    try {
      task = await Task.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.status !== 'completed') {
        throw new Error(
          'Only completed tasks can be approved'
        );
      }

      if (task.approved_at) {
        throw new Error(
          'Task already approved'
        );
      }

      approver = await User.findByPk(
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
        throw new Error('User not found');
      }

      await task.update(
        {
          approved_by: userId,
          approved_at: new Date(),
        },
        {
          transaction,
        }
      );

      await Note.create(
        {
          task_id: id,
          created_by: userId,
          content:
            `Görev onaylandı: ${task.title}`,
          note_type: 'task',
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

    if (task.assigned_to) {
      await notifySafely(
        'task-approved',
        async () => {
          const approverName =
            `${approver.first_name} ${approver.last_name}`.trim();

          await notificationService.notifyTaskApproved(
            task.assigned_to,
            task.id,
            task.title,
            approverName || 'Admin'
          );
        },
        {
          taskId: task.id,
          approvedBy: userId,
        }
      );
    }

    return task;
  },

  async addNote(
    id,
    userId,
    {
      content,
    }
  ) {
    const task = await Task.findByPk(id);

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.assigned_to !== userId) {
      throw new Error(
        'You are not assigned to this task'
      );
    }

    if (!content?.trim()) {
      throw new Error(
        'Note content is required'
      );
    }

    const note = await Note.create({
      task_id: id,
      created_by: userId,
      content: content.trim(),
      note_type: 'task',
    });

    return Note.findByPk(note.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
          ],
        },
      ],
    });
  },

  async getNotes(id, userId) {
    const task = await Task.findByPk(id);

    if (!task) {
      throw new Error('Task not found');
    }

    const user = await User.findByPk(
      userId,
      {
        attributes: [
          'id',
          'role',
        ],
      }
    );

    const isAdmin =
      user?.role === 'admin';

    if (
      !isAdmin &&
      task.assigned_to !== userId &&
      task.created_by !== userId
    ) {
      throw new Error(
        'You do not have permission to view these notes'
      );
    }

    return Note.findAll({
      where: {
        task_id: id,
        note_type: 'task',
      },

      include: [
        {
          model: User,
          as: 'creator',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
            'role',
          ],
        },
      ],

      order: [
        ['created_at', 'ASC'],
      ],
    });
  },

  async updateProgress(
    id,
    userId,
    progress
  ) {
    const transaction = await sequelize.transaction();

    try {
      const task = await Task.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.assigned_to !== userId) {
        throw new Error(
          'You are not assigned to this task'
        );
      }

      if (
        task.status === 'completed' ||
        task.status === 'cancelled'
      ) {
        throw new Error(
          'Cannot update progress of completed/cancelled task'
        );
      }

      const parsedProgress =
        Number.parseInt(progress, 10);

      const validatedProgress =
        Math.min(
          99,
          Math.max(
            0,
            Number.isFinite(parsedProgress)
              ? parsedProgress
              : 0
          )
        );

      await task.update(
        {
          progress: validatedProgress,
        },
        {
          transaction,
        }
      );

      if (
        validatedProgress > 0 &&
        validatedProgress % 25 === 0
      ) {
        await Note.create(
          {
            task_id: id,
            created_by: userId,
            content:
              `Görev ilerlemesi %${validatedProgress} oldu`,
            note_type: 'task',
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