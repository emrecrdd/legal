import cron from 'node-cron';
import os from 'node:os';
import crypto from 'node:crypto';
import { Op } from 'sequelize';

import { Reminder } from '../models/Reminder.js';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { Event } from '../models/Event.js';
import { Meeting } from '../models/Meeting.js';

import { sequelize } from '../config/database.js';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

import {
  addEmailJob,
  addNotificationJob,
} from './queue.js';

const WORKER_INTERVAL = '*/1 * * * *';
const WORKER_TIMEZONE = 'Europe/Istanbul';

const BATCH_SIZE = 50;
const LOCK_TIMEOUT_MINUTES = 10;
const BASE_RETRY_MINUTES = 5;

const SOURCE_CONFIG = {
  task: {
    association: 'task',
    notificationType: 'task',
    label: 'Görev',
    dateField: 'due_date',
    linkPrefix: '/tasks',
  },
  event: {
    association: 'event',
    notificationType: 'event',
    label: 'Etkinlik',
    dateField: 'start_date',
    linkPrefix: '/events',
  },
  meeting: {
    association: 'meeting',
    notificationType: 'meeting',
    label: 'Toplantı',
    dateField: 'start_date',
    linkPrefix: '/meetings',
  },
};

const escapeHtml = (value) => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const formatDate = (value) => {
  if (!value) {
    return 'Belirtilmedi';
  }

  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: WORKER_TIMEZONE,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
};

class ReminderWorker {
  constructor() {
    this.workerId = `${os.hostname()}-${process.pid}-${crypto
      .randomUUID()
      .slice(0, 8)}`;

    this.cronTask = null;
    this.isProcessing = false;
  }

  start() {
    if (this.cronTask) {
      logger.warn('Reminder worker zaten çalışıyor', {
        workerId: this.workerId,
      });
      return;
    }

    this.cronTask = cron.schedule(
      WORKER_INTERVAL,
      async () => {
        await this.run();
      },
      {
        timezone: WORKER_TIMEZONE,
      }
    );

    logger.info('Reminder worker başlatıldı', {
      workerId: this.workerId,
      interval: WORKER_INTERVAL,
      timezone: WORKER_TIMEZONE,
    });

    setTimeout(() => {
      this.run().catch((error) => {
        logger.error('Reminder worker ilk çalıştırma hatası', {
          message: error.message,
        });
      });
    }, 3000);
  }

  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask.destroy?.();
      this.cronTask = null;
    }

    logger.info('Reminder worker durduruldu', {
      workerId: this.workerId,
    });
  }

  async run() {
    if (this.isProcessing) {
      logger.debug('Reminder worker önceki işlemi sürdürüyor', {
        workerId: this.workerId,
      });
      return;
    }

    this.isProcessing = true;

    try {
      await this.releaseExpiredLocks();

      const reminderIds = await this.claimDueReminders();

      if (reminderIds.length === 0) {
        return;
      }

      logger.info('Hatırlatmalar işlenmek üzere alındı', {
        workerId: this.workerId,
        count: reminderIds.length,
      });

      for (const reminderId of reminderIds) {
        await this.processReminder(reminderId);
      }
    } catch (error) {
      logger.error('Reminder worker çalıştırma hatası', {
        workerId: this.workerId,
        message: error.message,
        stack:
          config.NODE_ENV === 'development'
            ? error.stack
            : undefined,
      });
    } finally {
      this.isProcessing = false;
    }
  }

  async claimDueReminders() {
    const transaction = await sequelize.transaction();

    try {
      const now = new Date();

      const reminders = await Reminder.findAll({
        where: {
          status: {
            [Op.in]: ['pending', 'failed'],
          },
          remind_at: {
            [Op.lte]: now,
          },
          attempt_count: {
            [Op.lt]: sequelize.col('max_attempts'),
          },
          [Op.or]: [
            {
              next_attempt_at: null,
            },
            {
              next_attempt_at: {
                [Op.lte]: now,
              },
            },
          ],
        },
        attributes: ['id'],
        order: [['remind_at', 'ASC']],
        limit: BATCH_SIZE,
        transaction,
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
      });

      const reminderIds = reminders.map(
        (reminder) => reminder.id
      );

      if (reminderIds.length > 0) {
        await Reminder.update(
          {
            status: 'processing',
            locked_at: now,
            locked_by: this.workerId,
          },
          {
            where: {
              id: {
                [Op.in]: reminderIds,
              },
            },
            transaction,
          }
        );
      }

      await transaction.commit();

      return reminderIds;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async processReminder(reminderId) {
    const reminder = await Reminder.findOne({
      where: {
        id: reminderId,
        status: 'processing',
        locked_by: this.workerId,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: [
            'id',
            'email',
            'first_name',
            'last_name',
            'is_active',
          ],
        },
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
      ],
    });

    if (!reminder) {
      return;
    }

    try {
      const source = this.resolveSource(reminder);

      if (!source) {
        await reminder.update({
          status: 'cancelled',
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,
          last_error:
            'Hatırlatmanın bağlı olduğu kayıt bulunamadı.',
        });

        return;
      }

      if (!reminder.user?.is_active) {
        await reminder.update({
          status: 'cancelled',
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,
          last_error:
            'Hatırlatma kullanıcısı aktif değil.',
        });

        return;
      }

      if (this.isSourceInactive(source.type, source.record)) {
        await reminder.update({
          status: 'cancelled',
          locked_at: null,
          locked_by: null,
          next_attempt_at: null,
          last_error:
            'Bağlı kayıt tamamlanmış veya iptal edilmiş.',
        });

        return;
      }

      const content = this.buildContent({
        reminder,
        source,
      });

      if (
        reminder.channel === 'in_app' ||
        reminder.channel === 'both'
      ) {
        await addNotificationJob({
          userId: reminder.user.id,
          type:
            SOURCE_CONFIG[source.type].notificationType,
          title: content.title,
          message: content.message,
          link: content.link,
          metadata: {
            ...reminder.metadata,
            reminderId: reminder.id,
            sourceType: source.type,
            sourceId: source.record.id,
            remindAt: reminder.remind_at,
            deduplicationKey:
              reminder.deduplication_key,
          },
        });
      }

      if (
        reminder.channel === 'email' ||
        reminder.channel === 'both'
      ) {
        if (!reminder.user.email) {
          throw new Error(
            'Hatırlatma kullanıcısının e-posta adresi bulunmuyor.'
          );
        }

        await addEmailJob({
          to: reminder.user.email,
          subject: content.emailSubject,
          html: content.emailHtml,
          text: content.emailText,
        });
      }

      await reminder.update({
        status: 'sent',
        sent_at: new Date(),
        locked_at: null,
        locked_by: null,
        next_attempt_at: null,
        last_error: null,
        attempt_count:
          Number(reminder.attempt_count || 0) + 1,
      });

      logger.info('Hatırlatma başarıyla gönderildi', {
        reminderId: reminder.id,
        workerId: this.workerId,
        sourceType: source.type,
        sourceId: source.record.id,
        userId: reminder.user.id,
        channel: reminder.channel,
      });
    } catch (error) {
      await this.markFailed(reminder, error);
    }
  }

  resolveSource(reminder) {
    if (reminder.task) {
      return {
        type: 'task',
        record: reminder.task,
      };
    }

    if (reminder.event) {
      return {
        type: 'event',
        record: reminder.event,
      };
    }

    if (reminder.meeting) {
      return {
        type: 'meeting',
        record: reminder.meeting,
      };
    }

    return null;
  }

  isSourceInactive(sourceType, source) {
    if (!source) {
      return true;
    }

    if (sourceType === 'task') {
      return ['completed', 'cancelled'].includes(
        source.status
      );
    }

    return ['completed', 'cancelled'].includes(
      source.status
    );
  }

  buildContent({ reminder, source }) {
    const sourceConfig = SOURCE_CONFIG[source.type];
    const sourceRecord = source.record;

    const title =
      reminder.title ||
      `${sourceConfig.label} Hatırlatması`;

    const targetDate =
      reminder.metadata?.targetDate ||
      sourceRecord[sourceConfig.dateField];

    const formattedDate = formatDate(targetDate);

    const message =
      reminder.message ||
      `"${sourceRecord.title}" için yaklaşan bir hatırlatmanız var.`;

    const link =
      reminder.metadata?.link ||
      `${sourceConfig.linkPrefix}/${sourceRecord.id}`;

    const absoluteLink = `${config.CLIENT_URL}${link}`;

    const safeFirstName = escapeHtml(
      reminder.user.first_name || 'Kullanıcı'
    );

    const safeTitle = escapeHtml(title);
    const safeSourceTitle = escapeHtml(
      sourceRecord.title
    );
    const safeMessage = escapeHtml(message);
    const safeDate = escapeHtml(formattedDate);
    const safeLink = escapeHtml(absoluteLink);

    return {
      title,
      message,
      link,

      emailSubject: `${title}: ${sourceRecord.title}`,

      emailText: [
        `Merhaba ${reminder.user.first_name || ''},`,
        '',
        message,
        `${sourceConfig.label}: ${sourceRecord.title}`,
        `Tarih: ${formattedDate}`,
        '',
        absoluteLink,
      ].join('\n'),

      emailHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937;">
          <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background: #111827; color: #ffffff; padding: 20px 24px;">
              <h1 style="font-size: 20px; margin: 0;">
                ${safeTitle}
              </h1>
            </div>

            <div style="padding: 24px;">
              <p>Merhaba ${safeFirstName},</p>

              <p>${safeMessage}</p>

              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 10px; font-weight: bold;">
                    ${escapeHtml(sourceConfig.label)}
                  </td>
                  <td style="border: 1px solid #e5e7eb; padding: 10px;">
                    ${safeSourceTitle}
                  </td>
                </tr>

                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 10px; font-weight: bold;">
                    Tarih
                  </td>
                  <td style="border: 1px solid #e5e7eb; padding: 10px;">
                    ${safeDate}
                  </td>
                </tr>
              </table>

              <a
                href="${safeLink}"
                style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none;"
              >
                Kaydı görüntüle
              </a>

              <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
                Bu bildirim Derkenar tarafından otomatik olarak gönderilmiştir.
              </p>
            </div>
          </div>
        </div>
      `,
    };
  }

  async markFailed(reminder, error) {
    const attemptCount =
      Number(reminder.attempt_count || 0) + 1;

    const maxAttempts =
      Number(reminder.max_attempts || 3);

    const exhausted =
      attemptCount >= maxAttempts;

    const retryDelayMinutes =
      BASE_RETRY_MINUTES *
      Math.pow(2, Math.max(attemptCount - 1, 0));

    const nextAttemptAt = exhausted
      ? null
      : new Date(
          Date.now() +
            retryDelayMinutes * 60 * 1000
        );

    await reminder.update({
      status: exhausted ? 'failed' : 'pending',
      attempt_count: attemptCount,
      next_attempt_at: nextAttemptAt,
      locked_at: null,
      locked_by: null,
      last_error: String(
        error?.message ||
          'Hatırlatma gönderilemedi.'
      ).slice(0, 2000),
    });

    logger.error('Hatırlatma gönderilemedi', {
      reminderId: reminder.id,
      workerId: this.workerId,
      attemptCount,
      maxAttempts,
      nextAttemptAt,
      message: error.message,
    });
  }

  async releaseExpiredLocks() {
    const expiredBefore = new Date(
      Date.now() -
        LOCK_TIMEOUT_MINUTES * 60 * 1000
    );

    const [releasedCount] = await Reminder.update(
      {
        status: 'pending',
        locked_at: null,
        locked_by: null,
        next_attempt_at: new Date(),
        last_error:
          'Süresi dolan worker kilidi otomatik olarak kaldırıldı.',
      },
      {
        where: {
          status: 'processing',
          locked_at: {
            [Op.lt]: expiredBefore,
          },
        },
      }
    );

    if (releasedCount > 0) {
      logger.warn(
        'Süresi dolan reminder kilitleri kaldırıldı',
        {
          count: releasedCount,
          workerId: this.workerId,
        }
      );
    }
  }
}

export const reminderWorker =
  new ReminderWorker();

export default reminderWorker;