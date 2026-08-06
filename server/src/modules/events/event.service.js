import { Op } from 'sequelize';

import { Event } from '../../models/Event.js';
import { Task } from '../../models/Task.js';
import { Case } from '../../models/Case.js';
import { User } from '../../models/User.js';

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

const shouldHaveReminders = (event) => {
  return (
    Boolean(event?.start_date) &&
    Boolean(event?.assigned_to || event?.created_by) &&
    !TERMINAL_STATUSES.has(event?.status)
  );
};

const normalizePagination = (page, limit) => {
  const pageNumber = Math.max(
    Number.parseInt(page, 10) || 1,
    1
  );

  const limitNumber = Math.min(
    Math.max(
      Number.parseInt(limit, 10) || 10,
      1
    ),
    100
  );

  return {
    pageNumber,
    limitNumber,
  };
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
     * Bildirim hatası event CRUD işlemini bozmamalıdır.
     */
    logger.error(`Event notification failed: ${operation}`, {
      ...metadata,
      message: error.message,
    });
  }
};

const validateEventDates = ({
  startDate,
  endDate,
}) => {
  if (!startDate) {
    throw new Error('Event start date is required');
  }

  const parsedStartDate = new Date(startDate);

  if (Number.isNaN(parsedStartDate.getTime())) {
    throw new Error('Invalid event start date');
  }

  if (!endDate) {
    return;
  }

  const parsedEndDate = new Date(endDate);

  if (Number.isNaN(parsedEndDate.getTime())) {
    throw new Error('Invalid event end date');
  }

  if (parsedEndDate < parsedStartDate) {
    throw new Error(
      'Event end date cannot be before start date'
    );
  }
};

export const eventService = {
  async create(data) {
    validateEventDates({
      startDate: data.start_date,
      endDate: data.end_date,
    });

    const transaction = await sequelize.transaction();

    let event;

    try {
      event = await Event.create(data, {
        transaction,
      });

      if (shouldHaveReminders(event)) {
        await reminderService.createEventReminders(event, {
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    /*
     * Duruşma oluşturuldu bildirimi, yaklaşan tarih
     * hatırlatmasından farklıdır. Bu nedenle korunur.
     */
    if (
      event.event_type === 'hearing' &&
      event.assigned_to
    ) {
      await notifySafely(
        'hearing-created',
        async () => {
          await notificationService.notifyHearingReminder(
            event.assigned_to,
            event.id,
            event.title,
            event.start_date
          );
        },
        {
          eventId: event.id,
          assignedTo: event.assigned_to,
        }
      );
    }

    return event;
  },

  async findAll({
    page,
    limit,
    case_id,
    status,
    event_type,
    assigned_to,
    start_date,
    end_date,
  }) {
    const where = {};

    if (case_id) {
      where.case_id = case_id;
    }

    if (status) {
      where.status = status;
    }

    if (event_type) {
      where.event_type = event_type;
    }

    if (assigned_to) {
      where.assigned_to = assigned_to;
    }

    if (start_date || end_date) {
      where.start_date = {};

      if (start_date) {
        const startDate = new Date(start_date);

        if (Number.isNaN(startDate.getTime())) {
          throw new Error('Invalid start date filter');
        }

        where.start_date[Op.gte] = startDate;
      }

      if (end_date) {
        const endDate = new Date(end_date);

        if (Number.isNaN(endDate.getTime())) {
          throw new Error('Invalid end date filter');
        }

        where.start_date[Op.lte] = endDate;
      }
    }

    const {
      pageNumber,
      limitNumber,
    } = normalizePagination(page, limit);

    const query = paginate(
      {
        where,
      },
      pageNumber,
      limitNumber
    );

    const { count, rows } =
      await Event.findAndCountAll({
        ...query,

        include: [
          {
            model: Case,
            as: 'case',
            attributes: [
              'id',
              'title',
              'case_number',
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
          {
            model: User,
            as: 'assignedTo',
            attributes: [
              'id',
              'first_name',
              'last_name',
              'email',
            ],
          },
        ],

        distinct: true,

        order: [
          ['start_date', 'ASC'],
          ['created_at', 'DESC'],
        ],
      });

    return {
      data: rows,

      pagination: getPaginationData(
        count,
        pageNumber,
        limitNumber
      ),
    };
  },

  async getMyEvents(userId) {
    return Event.findAll({
      where: {
        [Op.or]: [
          {
            assigned_to: userId,
          },
          {
            created_by: userId,
          },
        ],
      },

      include: [
        {
          model: Case,
          as: 'case',
          attributes: [
            'id',
            'title',
            'case_number',
          ],
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: [
            'id',
            'first_name',
            'last_name',
          ],
        },
      ],

      order: [
        ['start_date', 'ASC'],
      ],
    });
  },

  async getByCase(caseId) {
    return Event.findAll({
      where: {
        case_id: caseId,
      },

      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: [
            'id',
            'first_name',
            'last_name',
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

      order: [
        ['start_date', 'ASC'],
      ],
    });
  },

  async findOne(id) {
    const event = await Event.findByPk(id, {
      include: [
        {
          model: Case,
          as: 'case',
          attributes: [
            'id',
            'title',
            'case_number',
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
        {
          model: User,
          as: 'assignedTo',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
          ],
        },
      ],
    });

    if (!event) {
      throw new Error('Event not found');
    }

    return event;
  },

  async update(id, data) {
    const transaction = await sequelize.transaction();

    let event;
    let previousAssignedTo;
    let shouldNotifyAssignee = false;

    try {
      event = await Event.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!event) {
        throw new Error('Event not found');
      }

      validateEventDates({
        startDate:
          data.start_date ?? event.start_date,
        endDate:
          data.end_date !== undefined
            ? data.end_date
            : event.end_date,
      });

      const previousValues = {
        startDate: event.start_date
          ? new Date(event.start_date).getTime()
          : null,

        endDate: event.end_date
          ? new Date(event.end_date).getTime()
          : null,

        assignedTo: event.assigned_to,
        createdBy: event.created_by,
        status: event.status,
        title: event.title,
      };

      previousAssignedTo = event.assigned_to;

      await event.update(data, {
        transaction,
      });

      const currentValues = {
        startDate: event.start_date
          ? new Date(event.start_date).getTime()
          : null,

        endDate: event.end_date
          ? new Date(event.end_date).getTime()
          : null,

        assignedTo: event.assigned_to,
        createdBy: event.created_by,
        status: event.status,
        title: event.title,
      };

      const schedulingChanged =
        previousValues.startDate !==
          currentValues.startDate ||
        previousValues.endDate !==
          currentValues.endDate ||
        previousValues.assignedTo !==
          currentValues.assignedTo ||
        previousValues.createdBy !==
          currentValues.createdBy ||
        previousValues.status !==
          currentValues.status ||
        previousValues.title !==
          currentValues.title;

      if (TERMINAL_STATUSES.has(event.status)) {
        await reminderService.cancelForSource({
          sourceType: 'event',
          sourceId: event.id,
          transaction,
        });
      } else if (
        schedulingChanged &&
        shouldHaveReminders(event)
      ) {
        await reminderService.rescheduleEvent(event, {
          transaction,
        });
      } else if (
        schedulingChanged &&
        !shouldHaveReminders(event)
      ) {
        await reminderService.cancelForSource({
          sourceType: 'event',
          sourceId: event.id,
          transaction,
        });
      }

      shouldNotifyAssignee =
        event.event_type === 'hearing' &&
        Boolean(event.assigned_to) &&
        previousAssignedTo !== event.assigned_to;

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    if (shouldNotifyAssignee) {
      await notifySafely(
        'hearing-reassigned',
        async () => {
          await notificationService.notifyHearingReminder(
            event.assigned_to,
            event.id,
            event.title,
            event.start_date
          );
        },
        {
          eventId: event.id,
          previousAssignedTo,
          assignedTo: event.assigned_to,
        }
      );
    }

    return event;
  },

  async updateStatus(id, status) {
    const transaction = await sequelize.transaction();

    try {
      const event = await Event.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!event) {
        throw new Error('Event not found');
      }

      await event.update(
        {
          status,
        },
        {
          transaction,
        }
      );

      if (TERMINAL_STATUSES.has(status)) {
        await reminderService.cancelForSource({
          sourceType: 'event',
          sourceId: event.id,
          transaction,
        });
      } else if (shouldHaveReminders(event)) {
        await reminderService.rescheduleEvent(event, {
          transaction,
        });
      }

      await transaction.commit();

      return event;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async remove(id) {
    const transaction = await sequelize.transaction();

    try {
      const event = await Event.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!event) {
        throw new Error('Event not found');
      }

      await reminderService.cancelForSource({
        sourceType: 'event',
        sourceId: event.id,
        transaction,
      });

      await event.destroy({
        transaction,
      });

      await transaction.commit();

      return event;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async getCalendarEvents(
    userId,
    {
      year,
      month,
    }
  ) {
    const parsedYear =
      Number.parseInt(year, 10);

    const parsedMonth =
      Number.parseInt(month, 10);

    if (
      !Number.isInteger(parsedYear) ||
      parsedYear < 2000 ||
      parsedYear > 2200
    ) {
      throw new Error('Invalid calendar year');
    }

    if (
      !Number.isInteger(parsedMonth) ||
      parsedMonth < 1 ||
      parsedMonth > 12
    ) {
      throw new Error('Invalid calendar month');
    }

    /*
     * UTC başlangıç ve bir sonraki ay başlangıcı kullanılır.
     * Op.lt ile ay sonundaki saatlerin kaçması engellenir.
     */
    const rangeStart = new Date(
      Date.UTC(
        parsedYear,
        parsedMonth - 1,
        1,
        0,
        0,
        0,
        0
      )
    );

    const rangeEnd = new Date(
      Date.UTC(
        parsedYear,
        parsedMonth,
        1,
        0,
        0,
        0,
        0
      )
    );

    const [
      events,
      tasks,
    ] = await Promise.all([
      Event.findAll({
        where: {
          [Op.or]: [
            {
              created_by: userId,
            },
            {
              assigned_to: userId,
            },
          ],

          start_date: {
            [Op.gte]: rangeStart,
            [Op.lt]: rangeEnd,
          },
        },

        include: [
          {
            model: Case,
            as: 'case',
            attributes: [
              'id',
              'title',
              'case_number',
            ],
          },
        ],

        order: [
          ['start_date', 'ASC'],
        ],
      }),

      Task.findAll({
        where: {
          assigned_to: userId,

          due_date: {
            [Op.gte]: rangeStart,
            [Op.lt]: rangeEnd,
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
              'case_number',
            ],
          },
        ],

        order: [
          ['due_date', 'ASC'],
        ],
      }),
    ]);

    const formattedEvents = events.map(
      (event) => ({
        id: event.id,
        source_id: event.id,
        title: event.title,
        start: event.start_date,
        end:
          event.end_date ||
          event.start_date,

        type: 'event',
        event_type: event.event_type,
        hearing_type:
          event.hearing_type,

        status: event.status,
        location: event.location,
        court_room:
          event.court_room,

        is_all_day:
          event.is_all_day,

        case_id: event.case_id,
        case_title:
          event.case?.title || null,
        case_number:
          event.case?.case_number || null,

        color:
          event.event_type === 'hearing'
            ? '#ef4444'
            : event.event_type === 'deadline'
              ? '#f59e0b'
              : event.event_type === 'meeting'
                ? '#3b82f6'
                : event.event_type === 'reminder'
                  ? '#8b5cf6'
                  : '#6b7280',
      })
    );

    const formattedTasks = tasks.map(
      (task) => ({
        id: `task-${task.id}`,
        source_id: task.id,
        title: task.title,
        start: task.due_date,
        end: task.due_date,

        type: 'task',
        status: task.status,
        priority: task.priority,
        progress: task.progress,

        case_id: task.case_id,
        case_title:
          task.case?.title || null,
        case_number:
          task.case?.case_number || null,

        color:
          task.priority === 'critical'
            ? '#ef4444'
            : task.priority === 'high'
              ? '#f59e0b'
              : task.priority === 'normal'
                ? '#3b82f6'
                : '#6b7280',
      })
    );

    return [
      ...formattedEvents,
      ...formattedTasks,
    ].sort(
      (firstItem, secondItem) =>
        new Date(firstItem.start).getTime() -
        new Date(secondItem.start).getTime()
    );
  },
};

export default eventService;