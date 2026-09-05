import {
  Notification,
} from '../../models/Notification.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

let ioInstance = null;

// ======================================================
// SOCKET INSTANCE
// ======================================================

export const setIo = (
  io
) => {
  ioInstance =
    io;
};

// ======================================================
// HELPERS
// ======================================================

const findOwnedNotification =
  async (
    id,
    userId
  ) => {
    if (
      !id ||
      !userId
    ) {
      throw new Error(
        'Bildirim bulunamadı'
      );
    }

    const notification =
      await Notification.findOne({
        where: {
          id,
          user_id:
            userId,
        },
      });

    if (
      !notification
    ) {
      /*
       * Burada özellikle "yetkiniz yok" demiyoruz.
       * Böylece başka kullanıcıya ait bir notification
       * ID'sinin gerçekten var olup olmadığını sızdırmıyoruz.
       */
      throw new Error(
        'Bildirim bulunamadı'
      );
    }

    return notification;
  };

const formatDateForIstanbul = (
  value
) => {
  if (!value) {
    return '-';
  }

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return '-';
  }

  return parsed.toLocaleDateString(
    'tr-TR',
    {
      timeZone:
        'Europe/Istanbul',
    }
  );
};

// ======================================================
// SERVICE
// ======================================================

export const notificationService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    userId,
    type,
    title,
    message,
    link = null,
    metadata = {}
  ) {
    const notification =
      await Notification.create({
        user_id:
          userId,

        type,

        title,

        message,

        link,

        metadata,

        read:
          false,
      });

    // ==================================================
    // REAL-TIME SOCKET DELIVERY
    // ==================================================

    if (
      ioInstance
    ) {
      ioInstance
        .to(
          `user-${userId}`
        )
        .emit(
          'notification',
          {
            id:
              notification.id,

            title:
              notification.title,

            message:
              notification.message,

            type:
              notification.type,

            link:
              notification.link,

            read:
              notification.read,

            created_at:
              notification.created_at,

            metadata:
              notification.metadata,
          }
        );
    }

    return notification;
  },

  // ====================================================
  // USER NOTIFICATIONS
  // ====================================================

  async getByUser(
    userId,
    {
      page = 1,
      limit = 10,
      read = null,
    } = {}
  ) {
    const where = {
      user_id:
        userId,
    };

    if (
      read !== null
    ) {
      where.read =
        read;
    }

    const query =
      paginate(
        {
          where,

          order: [
            [
              'created_at',
              'DESC',
            ],
          ],
        },
        page,
        limit
      );

    const {
      count,
      rows,
    } =
      await Notification.findAndCountAll({
        ...query,
      });

    const pagination =
      getPaginationData(
        count,
        page,
        limit
      );

    return {
      data:
        rows,

      pagination,
    };
  },

  // ====================================================
  // UNREAD COUNT
  // ====================================================

  async getUnreadCount(
    userId
  ) {
    return Notification.count({
      where: {
        user_id:
          userId,

        read:
          false,
      },
    });
  },

  // ====================================================
  // GET ONE
  // ====================================================

  async getOne(
    id,
    userId
  ) {
    return findOwnedNotification(
      id,
      userId
    );
  },

  // ====================================================
  // MARK AS READ
  // ====================================================

  async markAsRead(
    id,
    userId
  ) {
    const notification =
      await findOwnedNotification(
        id,
        userId
      );

    if (
      notification.read !==
      true
    ) {
      await notification.update({
        read:
          true,
      });
    }

    return notification;
  },

  // ====================================================
  // MARK ALL AS READ
  // ====================================================

  async markAllAsRead(
    userId
  ) {
    const [
      affectedCount,
    ] =
      await Notification.update(
        {
          read:
            true,
        },
        {
          where: {
            user_id:
              userId,

            read:
              false,
          },
        }
      );

    return {
      success:
        true,

      affected:
        affectedCount,
    };
  },

  // ====================================================
  // REMOVE ONE
  // ====================================================

  async remove(
    id,
    userId
  ) {
    const notification =
      await findOwnedNotification(
        id,
        userId
      );

    await notification.destroy();

    return notification;
  },

  // ====================================================
  // REMOVE ALL
  // ====================================================

  async removeAll(
    userId
  ) {
    const deletedCount =
      await Notification.destroy({
        where: {
          user_id:
            userId,
        },
      });

    return {
      success:
        true,

      deleted:
        deletedCount,
    };
  },

  // ====================================================
  // TRIGGERS
  // ====================================================

  // Görev atama bildirimi
  async notifyTaskAssigned(
    userId,
    taskId,
    taskTitle,
    assignedBy
  ) {
    return this.create(
      userId,
      'task',
      'Yeni Görev Atandı',
      `${assignedBy} size "${taskTitle}" görevini atadı.`,
      `/tasks/${taskId}`,
      {
        taskId,
      }
    );
  },

  // Duruşma hatırlatıcı
  async notifyHearingReminder(
    userId,
    eventId,
    eventTitle,
    eventDate
  ) {
    const dateStr =
      formatDateForIstanbul(
        eventDate
      );

    return this.create(
      userId,
      'event',
      'Duruşma Hatırlatıcı',
      `"${eventTitle}" duruşmanız ${dateStr} tarihinde.`,
      `/events/${eventId}`,
      {
        eventId,
        eventDate,
        eventType:
          'hearing',
      }
    );
  },

  // Toplantıya kullanıcı ekleme / atama bildirimi
  async notifyMeetingAssigned(
    userId,
    meetingId,
    meetingTitle,
    assignedBy,
    meetingDate = null
  ) {
    const dateStr =
      formatDateForIstanbul(
        meetingDate
      );

    const dateSuffix =
      dateStr !== '-'
        ? ` Toplantı tarihi: ${dateStr}.`
        : '';

    return this.create(
      userId,
      'meeting',
      'Yeni Toplantı Atandı',
      `${assignedBy} sizi "${meetingTitle}" toplantısına ekledi.${dateSuffix}`,
      `/meetings/${meetingId}`,
      {
        meetingId,
        meetingDate,
        action:
          'assigned',
      }
    );
  },

  // Toplantı hatırlatıcı
  async notifyMeetingReminder(
    userId,
    meetingId,
    meetingTitle,
    meetingDate
  ) {
    const dateStr =
      formatDateForIstanbul(
        meetingDate
      );

    return this.create(
      userId,
      'meeting',
      'Toplantı Hatırlatıcı',
      `"${meetingTitle}" toplantınız ${dateStr} tarihinde.`,
      `/meetings/${meetingId}`,
      {
        meetingId,
        meetingDate,
      }
    );
  },

  // Yeni belge bildirimi
  async notifyDocumentUploaded(
    userId,
    documentId,
    documentName,
    uploadedBy,
    caseTitle
  ) {
    const destination =
      caseTitle
        ? `${caseTitle} davasına`
        : 'sisteme';

    return this.create(
      userId,
      'system',
      'Yeni Belge Yüklendi',
      `${uploadedBy} "${documentName}" belgesini ${destination} yükledi.`,
      `/documents/${documentId}`,
      {
        documentId,
      }
    );
  },

  // Dava durumu değişikliği
  async notifyCaseStatusChanged(
    userId,
    caseId,
    caseTitle,
    oldStatus,
    newStatus
  ) {
    const statusMap = {
      preparation:
        'Hazırlık',

      active:
        'Devam Ediyor',

      hearing:
        'Duruşmada',

      appeal:
        'İstinaf',

      cassation:
        'Temyiz',

      concluded:
        'Sonuçlandı',

      archived:
        'Arşivlendi',
    };

    return this.create(
      userId,
      'system',
      'Dava Durumu Değişti',
      `"${caseTitle}" davasının durumu "${statusMap[oldStatus] || oldStatus}" → "${statusMap[newStatus] || newStatus}" olarak değiştirildi.`,
      `/cases/${caseId}`,
      {
        caseId,
        oldStatus,
        newStatus,
      }
    );
  },
};

export default notificationService;
