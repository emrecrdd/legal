import crypto from 'crypto';
import { Op } from 'sequelize';

import { Reminder } from '../../models/Reminder.js';
import { User } from '../../models/User.js';
import { Task } from '../../models/Task.js';
import { Event } from '../../models/Event.js';
import { Meeting } from '../../models/Meeting.js';
import { logger } from '../../config/logger.js';

export class ReminderServiceError extends Error {
  constructor(
    message,
    {
      code = 'REMINDER_SERVICE_ERROR',
      statusCode = 500,
      cause = null,
    } = {}
  ) {
    super(message);

    this.name = 'ReminderServiceError';
    this.code = code;
    this.statusCode = statusCode;

    if (cause) {
      this.cause = cause;
    }

    Error.captureStackTrace?.(
      this,
      ReminderServiceError
    );
  }
}

const REMINDER_CHANNELS = new Set([
  'in_app',
  'email',
  'both',
]);

const REMINDER_STATUSES = new Set([
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled',
]);

const SOURCE_FIELDS = {
  task: 'task_id',
  event: 'event_id',
  meeting: 'meeting_id',
};

const DEFAULT_OFFSETS = {
  task: [
    24 * 60,
    60,
  ],
  event: [
    24 * 60,
    60,
  ],
  meeting: [
    24 * 60,
    60,
  ],
};

const normalizeDate = (value, fieldName) => {
  const date = value instanceof Date
    ? value
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ReminderServiceError(
      `${fieldName} geçerli bir tarih olmalıdır.`,
      {
        code: 'INVALID_REMINDER_DATE',
        statusCode: 400,
      }
    );
  }

  return date;
};

const normalizeOffsets = (offsets) => {
  if (!Array.isArray(offsets)) {
    return [];
  }

  return [
    ...new Set(
      offsets
        .map((value) => Number(value))
        .filter(
          (value) =>
            Number.isInteger(value) &&
            value >= 0
        )
    ),
  ].sort((a, b) => b - a);
};

class ReminderService {
  /**
   * Tek bir hatırlatma kaydı oluşturur.
   */
  async create({
    userId,
    createdBy,
    sourceType,
    sourceId,
    title,
    message = null,
    remindAt,
    channel = 'both',
    metadata = {},
    transaction = null,
  }) {
    this.validateCreateInput({
      userId,
      createdBy,
      sourceType,
      sourceId,
      title,
      remindAt,
      channel,
    });

    const normalizedRemindAt =
      normalizeDate(remindAt, 'remindAt');

    const sourceField =
      SOURCE_FIELDS[sourceType];

    const deduplicationKey =
      this.createDeduplicationKey({
        userId,
        sourceType,
        sourceId,
        remindAt: normalizedRemindAt,
        channel,
      });

    const payload = {
      user_id: userId,
      created_by: createdBy,
      task_id: null,
      event_id: null,
      meeting_id: null,
      title: title.trim(),
      message:
        typeof message === 'string' &&
        message.trim()
          ? message.trim()
          : null,
      remind_at: normalizedRemindAt,
      channel,
      status: 'pending',
      attempt_count: 0,
      max_attempts: 3,
      next_attempt_at: normalizedRemindAt,
      deduplication_key: deduplicationKey,
      metadata:
        metadata &&
        typeof metadata === 'object' &&
        !Array.isArray(metadata)
          ? metadata
          : {},
    };

    payload[sourceField] = sourceId;

    try {
      const [reminder, created] =
        await Reminder.findOrCreate({
          where: {
            deduplication_key:
              deduplicationKey,
          },
          defaults: payload,
          transaction,
        });

      if (!created) {
        logger.debug(
          'Hatırlatma zaten mevcut',
          {
            reminderId: reminder.id,
            sourceType,
            sourceId,
            remindAt:
              normalizedRemindAt.toISOString(),
          }
        );
      }

      return reminder;
    } catch (error) {
      logger.error(
        'Hatırlatma oluşturulamadı',
        {
          sourceType,
          sourceId,
          userId,
          remindAt:
            normalizedRemindAt.toISOString(),
          message: error.message,
        }
      );

      throw new ReminderServiceError(
        'Hatırlatma oluşturulamadı.',
        {
          code: 'REMINDER_CREATE_FAILED',
          statusCode: 500,
          cause: error,
        }
      );
    }
  }

  /**
   * Bir kaydın tarihine göre birden fazla
   * hatırlatma oluşturur.
   *
   * offsetsMinutes örneği:
   * [1440, 60, 15]
   */
  async createForSource({
    userId,
    createdBy,
    sourceType,
    sourceId,
    sourceTitle,
    targetDate,
    offsetsMinutes,
    channel = 'both',
    metadata = {},
    transaction = null,
  }) {
    const normalizedTargetDate =
      normalizeDate(
        targetDate,
        'targetDate'
      );

    const offsets = normalizeOffsets(
      offsetsMinutes ??
        DEFAULT_OFFSETS[sourceType] ??
        []
    );

    if (offsets.length === 0) {
      return [];
    }

    const now = new Date();
    const reminders = [];

    for (const offsetMinutes of offsets) {
      const remindAt = new Date(
        normalizedTargetDate.getTime() -
          offsetMinutes * 60 * 1000
      );

      /*
       * Geçmişte kalan hatırlatmaları oluşturma.
       * Böylece eski görevler sisteme eklendiğinde
       * anında bildirim yağmuru oluşmaz.
       */
      if (remindAt <= now) {
        continue;
      }

      const reminderLabel =
        this.formatOffsetLabel(
          offsetMinutes
        );

      const reminder =
        await this.create({
          userId,
          createdBy,
          sourceType,
          sourceId,
          title:
            `${sourceTitle} – ${reminderLabel}`,
          message:
            `"${sourceTitle}" için ${reminderLabel.toLowerCase()} hatırlatma.`,
          remindAt,
          channel,
          metadata: {
            ...metadata,
            targetDate:
              normalizedTargetDate.toISOString(),
            offsetMinutes,
            reminderLabel,
          },
          transaction,
        });

      reminders.push(reminder);
    }

    return reminders;
  }

  async createTaskReminders(
    task,
    {
      offsetsMinutes =
        DEFAULT_OFFSETS.task,
      channel = 'both',
      transaction = null,
    } = {}
  ) {
    if (!task?.id) {
      throw new ReminderServiceError(
        'Geçerli bir görev zorunludur.',
        {
          code: 'INVALID_TASK',
          statusCode: 400,
        }
      );
    }

    if (!task.due_date) {
      return [];
    }

    const userId =
      task.assigned_to ||
      task.created_by;

    if (!userId) {
      return [];
    }

    return this.createForSource({
      userId,
      createdBy: task.created_by,
      sourceType: 'task',
      sourceId: task.id,
      sourceTitle: task.title,
      targetDate: task.due_date,
      offsetsMinutes,
      channel,
      metadata: {
        taskId: task.id,
        priority: task.priority,
        caseId: task.case_id,
        clientId: task.client_id,
        link: `/tasks/${task.id}`,
      },
      transaction,
    });
  }

  async createEventReminders(
    event,
    {
      offsetsMinutes =
        DEFAULT_OFFSETS.event,
      channel = 'both',
      transaction = null,
    } = {}
  ) {
    if (!event?.id) {
      throw new ReminderServiceError(
        'Geçerli bir etkinlik zorunludur.',
        {
          code: 'INVALID_EVENT',
          statusCode: 400,
        }
      );
    }

    if (!event.start_date) {
      return [];
    }

    const userId =
      event.assigned_to ||
      event.created_by;

    if (!userId) {
      return [];
    }

    return this.createForSource({
      userId,
      createdBy: event.created_by,
      sourceType: 'event',
      sourceId: event.id,
      sourceTitle: event.title,
      targetDate: event.start_date,
      offsetsMinutes,
      channel,
      metadata: {
        eventId: event.id,
        eventType: event.event_type,
        location: event.location,
        caseId: event.case_id,
        link: `/events/${event.id}`,
      },
      transaction,
    });
  }

  async createMeetingReminders(
    meeting,
    {
      offsetsMinutes =
        DEFAULT_OFFSETS.meeting,
      channel = 'both',
      transaction = null,
    } = {}
  ) {
    if (!meeting?.id) {
      throw new ReminderServiceError(
        'Geçerli bir toplantı zorunludur.',
        {
          code: 'INVALID_MEETING',
          statusCode: 400,
        }
      );
    }

    if (!meeting.start_date) {
      return [];
    }

    const userId =
      meeting.assigned_to ||
      meeting.created_by;

    if (!userId) {
      return [];
    }

    return this.createForSource({
      userId,
      createdBy: meeting.created_by,
      sourceType: 'meeting',
      sourceId: meeting.id,
      sourceTitle: meeting.title,
      targetDate: meeting.start_date,
      offsetsMinutes,
      channel,
      metadata: {
        meetingId: meeting.id,
        meetingType: meeting.meeting_type,
        location: meeting.location,
        meetingLink: meeting.meeting_link,
        caseId: meeting.case_id,
        clientId: meeting.client_id,
        link: `/meetings/${meeting.id}`,
      },
      transaction,
    });
  }

  /**
   * Kaynağın bekleyen hatırlatmalarını iptal eder.
   */
  async cancelForSource({
    sourceType,
    sourceId,
    transaction = null,
  }) {
    const sourceField =
      SOURCE_FIELDS[sourceType];

    if (!sourceField || !sourceId) {
      throw new ReminderServiceError(
        'Geçerli bir hatırlatma kaynağı zorunludur.',
        {
          code: 'INVALID_REMINDER_SOURCE',
          statusCode: 400,
        }
      );
    }

    const [affectedCount] =
      await Reminder.update(
        {
          status: 'cancelled',
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,
        },
        {
          where: {
            [sourceField]: sourceId,
            status: {
              [Op.in]: [
                'pending',
                'failed',
                'processing',
              ],
            },
          },
          transaction,
        }
      );

    return affectedCount;
  }

  /**
   * Tarihi veya kullanıcı ataması değişen kayıtların
   * hatırlatmalarını yeniden oluşturur.
   */
  async rescheduleTask(
    task,
    options = {}
  ) {
    await this.cancelForSource({
      sourceType: 'task',
      sourceId: task.id,
      transaction:
        options.transaction || null,
    });

    return this.createTaskReminders(
      task,
      options
    );
  }

  async rescheduleEvent(
    event,
    options = {}
  ) {
    await this.cancelForSource({
      sourceType: 'event',
      sourceId: event.id,
      transaction:
        options.transaction || null,
    });

    return this.createEventReminders(
      event,
      options
    );
  }

  async rescheduleMeeting(
    meeting,
    options = {}
  ) {
    await this.cancelForSource({
      sourceType: 'meeting',
      sourceId: meeting.id,
      transaction:
        options.transaction || null,
    });

    return this.createMeetingReminders(
      meeting,
      options
    );
  }

  /**
   * Bir hatırlatmayı kullanıcı tarafından iptal eder.
   */
  async cancelById(
    reminderId,
    userId
  ) {
    const reminder =
      await Reminder.findOne({
        where: {
          id: reminderId,
          user_id: userId,
        },
      });

    if (!reminder) {
      throw new ReminderServiceError(
        'Hatırlatma bulunamadı.',
        {
          code: 'REMINDER_NOT_FOUND',
          statusCode: 404,
        }
      );
    }

    if (
      ['sent', 'cancelled'].includes(
        reminder.status
      )
    ) {
      return reminder;
    }

    await reminder.update({
      status: 'cancelled',
      locked_at: null,
      locked_by: null,
      next_attempt_at: null,
    });

    return reminder;
  }

  /**
   * Kullanıcının yaklaşan hatırlatmalarını listeler.
   */
  async listUpcoming({
    userId,
    limit = 50,
  }) {
    const safeLimit = Math.min(
      Math.max(Number(limit) || 50, 1),
      100
    );

    return Reminder.findAll({
      where: {
        user_id: userId,
        status: 'pending',
        remind_at: {
          [Op.gte]: new Date(),
        },
      },
      include: [
        {
          model: Task,
          as: 'task',
          required: false,
        },
        {
          model: Event,
          as: 'event',
          required: false,
        },
        {
          model: Meeting,
          as: 'meeting',
          required: false,
        },
        {
          model: User,
          as: 'user',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
          ],
        },
      ],
      order: [
        ['remind_at', 'ASC'],
      ],
      limit: safeLimit,
    });
  }

  validateCreateInput({
    userId,
    createdBy,
    sourceType,
    sourceId,
    title,
    remindAt,
    channel,
  }) {
    if (!userId) {
      throw new ReminderServiceError(
        'Hatırlatma kullanıcısı zorunludur.',
        {
          code: 'REMINDER_USER_REQUIRED',
          statusCode: 400,
        }
      );
    }

    if (!createdBy) {
      throw new ReminderServiceError(
        'Hatırlatmayı oluşturan kullanıcı zorunludur.',
        {
          code: 'REMINDER_CREATOR_REQUIRED',
          statusCode: 400,
        }
      );
    }

    if (!SOURCE_FIELDS[sourceType]) {
      throw new ReminderServiceError(
        'Geçersiz hatırlatma kaynak türü.',
        {
          code: 'INVALID_REMINDER_SOURCE_TYPE',
          statusCode: 400,
        }
      );
    }

    if (!sourceId) {
      throw new ReminderServiceError(
        'Hatırlatma kaynak kimliği zorunludur.',
        {
          code: 'REMINDER_SOURCE_REQUIRED',
          statusCode: 400,
        }
      );
    }

    if (
      typeof title !== 'string' ||
      !title.trim()
    ) {
      throw new ReminderServiceError(
        'Hatırlatma başlığı zorunludur.',
        {
          code: 'REMINDER_TITLE_REQUIRED',
          statusCode: 400,
        }
      );
    }

    if (!remindAt) {
      throw new ReminderServiceError(
        'Hatırlatma zamanı zorunludur.',
        {
          code: 'REMINDER_DATE_REQUIRED',
          statusCode: 400,
        }
      );
    }

    if (!REMINDER_CHANNELS.has(channel)) {
      throw new ReminderServiceError(
        'Geçersiz hatırlatma kanalı.',
        {
          code: 'INVALID_REMINDER_CHANNEL',
          statusCode: 400,
        }
      );
    }
  }

  createDeduplicationKey({
    userId,
    sourceType,
    sourceId,
    remindAt,
    channel,
  }) {
    return crypto
      .createHash('sha256')
      .update(
        [
          userId,
          sourceType,
          sourceId,
          remindAt.toISOString(),
          channel,
        ].join(':')
      )
      .digest('hex');
  }

  formatOffsetLabel(minutes) {
    if (minutes === 0) {
      return 'Tam zamanında';
    }

    if (
      minutes % (24 * 60) === 0
    ) {
      const days =
        minutes / (24 * 60);

      return `${days} gün önce`;
    }

    if (minutes % 60 === 0) {
      const hours = minutes / 60;

      return `${hours} saat önce`;
    }

    return `${minutes} dakika önce`;
  }

  isValidStatus(status) {
    return REMINDER_STATUSES.has(status);
  }
}

export const reminderService =
  new ReminderService();

export default reminderService;