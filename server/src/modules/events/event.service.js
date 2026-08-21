import {
  Op,
} from 'sequelize';

import {
  Event,
} from '../../models/Event.js';

import {
  Task,
} from '../../models/Task.js';

import {
  Case,
} from '../../models/Case.js';

import {
  Client,
} from '../../models/Client.js';

import {
  User,
} from '../../models/User.js';

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
import {
  googleCalendarSyncService,
} from '../calendar-integration/google-calendar-sync.service.js';
// ======================================================
// CONSTANTS
// ======================================================

const TERMINAL_STATUSES =
  new Set([
    'completed',
    'cancelled',
  ]);

const EVENT_STATUSES =
  new Set([
    'scheduled',
    'ongoing',
    'completed',
    'cancelled',
  ]);

const EVENT_TYPES =
  new Set([
    'hearing',
    'meeting',
    'deadline',
    'reminder',
    'other',
  ]);

const HEARING_TYPES =
  new Set([
    'preliminary',
    'investigation',
    'expert_examination',
    'witness_hearing',
    'final_decision',
    'other',
  ]);

const EXPENSE_STATUSES =
  new Set([
    'paid',
    'pending',
    'not_applicable',
  ]);

// ======================================================
// INCLUDES
// ======================================================

const CLIENT_ATTRIBUTES = [
  'id',
  'name',
  'client_type',
  'phone',
  'email',
  'status',
];

const CASE_INCLUDE = {
  model: Case,
  as: 'case',

  attributes: [
    'id',
    'title',
    'case_number',
    'court_name',
    'status',
    'judiciary_type',
    'judiciary_unit',
  ],

  required: false,

  include: [
    {
      model: Client,
      as: 'clients',

      attributes: [
        'id',
        'name',
        'client_type',
        'phone',
        'email',
        'status',
      ],

      through: {
        attributes: [],
      },

      required: false,
    },
  ],
};

const CREATOR_INCLUDE = {
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
};

const ASSIGNEE_INCLUDE = {
  model:
    User,

  as:
    'assignedTo',

  attributes: [
    'id',
    'first_name',
    'last_name',
    'email',
    'role',
  ],

  required:
    false,
};

// ======================================================
// HELPERS
// ======================================================

const shouldHaveReminders = (
  event
) => {
  return (
    Boolean(
      event?.start_date
    ) &&
    Boolean(
      event?.assigned_to ||
      event?.created_by
    ) &&
    !TERMINAL_STATUSES.has(
      event?.status
    )
  );
};

const normalizePagination = (
  page,
  limit
) => {
  const pageNumber =
    Math.max(
      Number.parseInt(
        page,
        10
      ) || 1,
      1
    );

  const limitNumber =
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

  return {
    pageNumber,
    limitNumber,
  };
};

const normalizeNullableString = (
  value
) => {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null
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

const notifySafely = async (
  operation,
  callback,
  metadata = {}
) => {
  try {
    await callback();
  } catch (error) {
    /*
     * Bildirim hatası event CRUD işlemini
     * bozmaz.
     */
    logger.error(
      `Event notification failed: ${operation}`,
      {
        ...metadata,

        message:
          error.message,
      }
    );
  }
};

// ======================================================
// DATE VALIDATION
// ======================================================

const validateEventDates = ({
  startDate,
  endDate,
}) => {
  if (
    !startDate
  ) {
    throw new Error(
      'Başlangıç tarihi gereklidir'
    );
  }

  const parsedStartDate =
    new Date(
      startDate
    );

  if (
    Number.isNaN(
      parsedStartDate.getTime()
    )
  ) {
    throw new Error(
      'Geçersiz başlangıç tarihi'
    );
  }

  if (
    !endDate
  ) {
    return;
  }

  const parsedEndDate =
    new Date(
      endDate
    );

  if (
    Number.isNaN(
      parsedEndDate.getTime()
    )
  ) {
    throw new Error(
      'Geçersiz bitiş tarihi'
    );
  }

  if (
    parsedEndDate <
    parsedStartDate
  ) {
    throw new Error(
      'Bitiş tarihi başlangıç tarihinden önce olamaz'
    );
  }
};

// ======================================================
// ENUM VALIDATION
// ======================================================

const validateEnums = (
  data
) => {
  if (
    data.event_type !==
      undefined &&
    !EVENT_TYPES.has(
      data.event_type
    )
  ) {
    throw new Error(
      'Geçersiz etkinlik türü'
    );
  }

  if (
    data.hearing_type !==
      undefined &&
    data.hearing_type !==
      null &&
    !HEARING_TYPES.has(
      data.hearing_type
    )
  ) {
    throw new Error(
      'Geçersiz duruşma türü'
    );
  }

  if (
    data.status !==
      undefined &&
    !EVENT_STATUSES.has(
      data.status
    )
  ) {
    throw new Error(
      'Geçersiz etkinlik durumu'
    );
  }

  if (
    data.expense_status !==
      undefined &&
    !EXPENSE_STATUSES.has(
      data.expense_status
    )
  ) {
    throw new Error(
      'Geçersiz masraf / harç durumu'
    );
  }
};

// ======================================================
// RELATION VALIDATION
// ======================================================

const validateRelations = async (
  data,
  transaction
) => {
  let caseItem =
    null;

  let assignedUser =
    null;

  if (
    data.case_id
  ) {
    caseItem =
      await Case.findByPk(
        data.case_id,
        {
          transaction,

          attributes: [
            'id',
            'title',
            'case_number',
            'status',
          ],
        }
      );

    if (
      !caseItem
    ) {
      throw new Error(
        'İlişkili dava bulunamadı'
      );
    }
  }

  if (
    data.assigned_to
  ) {
    assignedUser =
      await User.findByPk(
        data.assigned_to,
        {
          transaction,

          attributes: [
            'id',
            'first_name',
            'last_name',
            'email',
            'role',
          ],
        }
      );

    if (
      !assignedUser
    ) {
      throw new Error(
        'Atanan kullanıcı bulunamadı'
      );
    }
  }

  return {
    caseItem,
    assignedUser,
  };
};

// ======================================================
// INPUT NORMALIZATION
// ======================================================

const normalizeEventData = (
  data
) => {
  const normalized = {
    ...data,
  };

  [
    'title',
    'description',
    'last_hearing_result',
    'opposing_counsel',
    'location',
    'court_room',
    'judge_name',
  ].forEach(
    (
      field
    ) => {
      if (
        Object.prototype
          .hasOwnProperty
          .call(
            normalized,
            field
          )
      ) {
        normalized[field] =
          normalizeNullableString(
            normalized[
              field
            ]
          );
      }
    }
  );

  /*
   * hearing olmayan eventlerde hearing_type
   * taşımaya gerek yok.
   */
  if (
    normalized.event_type &&
    normalized.event_type !==
      'hearing'
  ) {
    normalized.hearing_type =
      null;
  }

  if (
    normalized.event_type ===
      'hearing' &&
    !normalized.hearing_type
  ) {
    normalized.hearing_type =
      'other';
  }

  if (
    normalized.attendees !==
      undefined &&
    !Array.isArray(
      normalized.attendees
    )
  ) {
    throw new Error(
      'Katılımcılar geçersiz formatta'
    );
  }

  if (
    normalized.todo_items !==
      undefined &&
    !Array.isArray(
      normalized.todo_items
    )
  ) {
    throw new Error(
      'Yapılacaklar listesi geçersiz formatta'
    );
  }

  return normalized;
};

// ======================================================
// CASE VISIBILITY
//
// case_id varsa fakat Case paranoid nedeniyle include
// içinde null geldiyse bağlı dava soft-delete edilmiştir.
// Böyle bir event kullanıcıya gösterilmemelidir.
// ======================================================

const assertCaseStillAvailable = (
  event
) => {
  if (
    event?.case_id &&
    !event?.case
  ) {
    throw new Error(
      'Bu duruşmanın bağlı olduğu dava kaldırılmış'
    );
  }
};
// ======================================================
// GOOGLE CALENDAR HELPERS
// ======================================================

const getEventCalendarUserIds = (
  event
) => {
  return [
    ...new Set(
      [
        event?.created_by,
        event?.assigned_to,
      ].filter(
        Boolean
      )
    ),
  ];
};

const getEventGoogleTitle = (
  event
) => {
  if (
    event?.event_type ===
    'hearing'
  ) {
    return `Duruşma: ${event.title}`;
  }

  if (
    event?.event_type ===
    'deadline'
  ) {
    return `Son Tarih: ${event.title}`;
  }

  if (
    event?.event_type ===
    'reminder'
  ) {
    return `Hatırlatma: ${event.title}`;
  }

  if (
    event?.event_type ===
    'meeting'
  ) {
    return `Toplantı: ${event.title}`;
  }

  return `Etkinlik: ${event.title}`;
};

const buildEventGoogleDescription = (
  event
) => {
  return [
    event?.event_type ===
      'hearing'
      ? 'Derkenar duruşması'
      : 'Derkenar etkinliği',

    event?.description ||
      null,

    event?.court_room
      ? `Duruşma salonu: ${event.court_room}`
      : null,

    event?.judge_name
      ? `Hakim: ${event.judge_name}`
      : null,

    event?.opposing_counsel
      ? `Karşı taraf vekili: ${event.opposing_counsel}`
      : null,
  ]
    .filter(
      Boolean
    )
    .join(
      '\n\n'
    );
};

const upsertEventToGoogleForUserSafely =
  async (
    event,
    userId
  ) => {
    if (
      !event?.id ||
      !event?.start_date ||
      !userId
    ) {
      return;
    }

    await googleCalendarSyncService
      .upsertEventSafely({
        userId,

        entityType:
          'event',

        entityId:
          event.id,

        title:
          getEventGoogleTitle(
            event
          ),

        description:
          buildEventGoogleDescription(
            event
          ),

        location:
          event.location ||
          '',

        start:
          event.start_date,

        end:
          event.end_date ||
          null,

        allDay:
          Boolean(
            event.is_all_day
          ),
      });
  };

const deleteEventFromGoogleForUserSafely =
  async (
    eventId,
    userId
  ) => {
    if (
      !eventId ||
      !userId
    ) {
      return;
    }

    await googleCalendarSyncService
      .deleteEventSafely({
        userId,

        entityType:
          'event',

        entityId:
          eventId,
      });
  };

const deleteEventFromGoogleForUsersSafely =
  async (
    eventId,
    userIds = []
  ) => {
    const uniqueUserIds = [
      ...new Set(
        userIds.filter(
          Boolean
        )
      ),
    ];

    if (
      !eventId ||
      uniqueUserIds.length ===
        0
    ) {
      return;
    }

    await Promise.all(
      uniqueUserIds.map(
        (
          userId
        ) =>
          deleteEventFromGoogleForUserSafely(
            eventId,
            userId
          )
      )
    );
  };

const syncEventToGoogleForUsersSafely =
  async (
    event,
    userIds = []
  ) => {
    if (!event?.id) {
      return;
    }

    const uniqueUserIds = [
      ...new Set(
        userIds.filter(
          Boolean
        )
      ),
    ];

    if (
      uniqueUserIds.length ===
      0
    ) {
      return;
    }

    /*
     * cancelled event Google'dan kaldırılır.
     *
     * completed event geçmiş kayıt olarak
     * Google Takvim'de kalır.
     */
    if (
      event.status ===
        'cancelled' ||
      !event.start_date
    ) {
      await deleteEventFromGoogleForUsersSafely(
        event.id,
        uniqueUserIds
      );

      return;
    }

    await Promise.all(
      uniqueUserIds.map(
        (
          userId
        ) =>
          upsertEventToGoogleForUserSafely(
            event,
            userId
          )
      )
    );
  };
// ======================================================
// SERVICE
// ======================================================

export const eventService = {
  // ====================================================
  // CREATE
  // ====================================================

    async create(
    data
  ) {
    const normalizedData =
      normalizeEventData(
        data
      );

    validateEnums(
      normalizedData
    );

    validateEventDates({
      startDate:
        normalizedData.start_date,

      endDate:
        normalizedData.end_date,
    });

    if (
      !normalizedData.created_by
    ) {
      throw new Error(
        'Kaydı oluşturan kullanıcı bulunamadı'
      );
    }

    const transaction =
      await sequelize.transaction();

    let event;

    try {
      await validateRelations(
        normalizedData,
        transaction
      );

      event =
        await Event.create(
          normalizedData,
          {
            transaction,
          }
        );

      if (
        shouldHaveReminders(
          event
        )
      ) {
        await reminderService
          .createEventReminders(
            event,
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

    /*
     * Oluşturma bildirimi ile tarih yaklaşma
     * reminder'ı farklı kavramlardır.
     */
    if (
      event.event_type ===
        'hearing' &&
      event.assigned_to
    ) {
      await notifySafely(
        'hearing-created',

        async () => {
          await notificationService
            .notifyHearingReminder(
              event.assigned_to,
              event.id,
              event.title,
              event.start_date
            );
        },

        {
          eventId:
            event.id,

          assignedTo:
            event.assigned_to,
        }
      );
    }

    // ==================================================
    // GOOGLE CALENDAR AUTO SYNC
    // ==================================================

    await syncEventToGoogleForUsersSafely(
      event,
      getEventCalendarUserIds(
        event
      )
    );

    return this.findOne(
      event.id
    );
  },

  // ====================================================
  // LIST
  // ====================================================

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

    if (
      case_id
    ) {
      where.case_id =
        case_id;
    }

    if (
      status
    ) {
      if (
        !EVENT_STATUSES.has(
          status
        )
      ) {
        throw new Error(
          'Geçersiz etkinlik durumu'
        );
      }

      where.status =
        status;
    }

    if (
      event_type
    ) {
      if (
        !EVENT_TYPES.has(
          event_type
        )
      ) {
        throw new Error(
          'Geçersiz etkinlik türü'
        );
      }

      where.event_type =
        event_type;
    }

    if (
      assigned_to
    ) {
      where.assigned_to =
        assigned_to;
    }

    if (
      start_date ||
      end_date
    ) {
      where.start_date =
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
            'Geçersiz başlangıç tarihi filtresi'
          );
        }

        where.start_date[
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
            'Geçersiz bitiş tarihi filtresi'
          );
        }

        where.start_date[
          Op.lte
        ] =
          endDate;
      }
    }

    const {
      pageNumber,
      limitNumber,
    } =
      normalizePagination(
        page,
        limit
      );

    const query =
      paginate(
        {
          where,
        },
        pageNumber,
        limitNumber
      );

    const {
      count,
      rows,
    } =
      await Event.findAndCountAll({
        ...query,

        include: [
          CASE_INCLUDE,
          CREATOR_INCLUDE,
          ASSIGNEE_INCLUDE,
        ],

        distinct:
          true,

        order: [
          [
            'start_date',
            'ASC',
          ],

          [
            'created_at',
            'DESC',
          ],
        ],
      });

    /*
     * Soft-delete olmuş davaya bağlı Event'leri
     * güvenlik amacıyla sonuçtan çıkarıyoruz.
     *
     * Standalone Event'ler case_id null olduğu için
     * korunur.
     */
    const visibleRows =
      rows.filter(
        (
          event
        ) =>
          !event.case_id ||
          Boolean(
            event.case
          )
      );

    return {
      data:
        visibleRows,

      pagination:
        getPaginationData(
          count,
          pageNumber,
          limitNumber
        ),
    };
  },

  // ====================================================
  // MY EVENTS
  // ====================================================

  async getMyEvents(
    userId
  ) {
    const events =
      await Event.findAll({
        where: {
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
        },

        include: [
          CASE_INCLUDE,
          ASSIGNEE_INCLUDE,
        ],

        order: [
          [
            'start_date',
            'ASC',
          ],
        ],
      });

    return events.filter(
      (
        event
      ) =>
        !event.case_id ||
        Boolean(
          event.case
        )
    );
  },

  // ====================================================
  // CASE EVENTS
  // ====================================================

  async getByCase(
    caseId
  ) {
    const caseItem =
      await Case.findByPk(
        caseId,
        {
          attributes: [
            'id',
          ],
        }
      );

    if (
      !caseItem
    ) {
      throw new Error(
        'Dava bulunamadı'
      );
    }

    return Event.findAll({
      where: {
        case_id:
          caseId,
      },

      include: [
        ASSIGNEE_INCLUDE,
        CREATOR_INCLUDE,
      ],

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],
    });
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    id
  ) {
    const event =
      await Event.findByPk(
        id,
        {
          include: [
            CASE_INCLUDE,
            CREATOR_INCLUDE,
            ASSIGNEE_INCLUDE,
          ],
        }
      );

    if (
      !event
    ) {
      throw new Error(
        'Duruşma / etkinlik bulunamadı'
      );
    }

    assertCaseStillAvailable(
      event
    );

    return event;
  },

  // ====================================================
  // UPDATE
  // ====================================================

    async update(
    id,
    data
  ) {
    const transaction =
      await sequelize.transaction();

    let event;
    let previousAssignedTo;
    let shouldNotifyAssignee =
      false;

    let previousCalendarUserIds =
      [];

    let currentCalendarUserIds =
      [];

    try {
      event =
        await Event.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (
        !event
      ) {
        throw new Error(
          'Duruşma / etkinlik bulunamadı'
        );
      }

      // ==================================================
      // GOOGLE USERS BEFORE UPDATE
      // ==================================================

      previousCalendarUserIds =
        getEventCalendarUserIds(
          event
        );

      /*
       * Sistem alanlarının body üzerinden
       * değiştirilmesini engelliyoruz.
       */
      const updateData =
        normalizeEventData({
          ...data,
        });

      delete updateData.id;
      delete updateData.created_by;
      delete updateData.created_at;
      delete updateData.updated_at;
      delete updateData.deleted_at;
      delete updateData.reminder_sent;

      validateEnums(
        updateData
      );

      validateEventDates({
        startDate:
          updateData.start_date ??
          event.start_date,

        endDate:
          updateData.end_date !==
          undefined
            ? updateData.end_date
            : event.end_date,
      });

      await validateRelations(
        {
          case_id:
            updateData.case_id !==
            undefined
              ? updateData.case_id
              : event.case_id,

          assigned_to:
            updateData.assigned_to !==
            undefined
              ? updateData.assigned_to
              : event.assigned_to,
        },
        transaction
      );

      const previousValues = {
        startDate:
          event.start_date
            ? new Date(
                event.start_date
              ).getTime()
            : null,

        endDate:
          event.end_date
            ? new Date(
                event.end_date
              ).getTime()
            : null,

        assignedTo:
          event.assigned_to,

        status:
          event.status,

        title:
          event.title,

        reminderMinutes:
          event.reminder_minutes,
      };

      previousAssignedTo =
        event.assigned_to;

      await event.update(
        updateData,
        {
          transaction,
        }
      );

      const currentValues = {
        startDate:
          event.start_date
            ? new Date(
                event.start_date
              ).getTime()
            : null,

        endDate:
          event.end_date
            ? new Date(
                event.end_date
              ).getTime()
            : null,

        assignedTo:
          event.assigned_to,

        status:
          event.status,

        title:
          event.title,

        reminderMinutes:
          event.reminder_minutes,
      };

      const schedulingChanged =
        previousValues.startDate !==
          currentValues.startDate ||
        previousValues.endDate !==
          currentValues.endDate ||
        previousValues.assignedTo !==
          currentValues.assignedTo ||
        previousValues.status !==
          currentValues.status ||
        previousValues.title !==
          currentValues.title ||
        previousValues.reminderMinutes !==
          currentValues.reminderMinutes;

      if (
        TERMINAL_STATUSES.has(
          event.status
        )
      ) {
        await reminderService
          .cancelForSource({
            sourceType:
              'event',

            sourceId:
              event.id,

            transaction,
          });
      } else if (
        schedulingChanged &&
        shouldHaveReminders(
          event
        )
      ) {
        await reminderService
          .rescheduleEvent(
            event,
            {
              transaction,
            }
          );
      } else if (
        schedulingChanged &&
        !shouldHaveReminders(
          event
        )
      ) {
        await reminderService
          .cancelForSource({
            sourceType:
              'event',

            sourceId:
              event.id,

            transaction,
          });
      }

      shouldNotifyAssignee =
        event.event_type ===
          'hearing' &&
        Boolean(
          event.assigned_to
        ) &&
        previousAssignedTo !==
          event.assigned_to;

      currentCalendarUserIds =
        getEventCalendarUserIds(
          event
        );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    // ==================================================
    // HEARING NOTIFICATION
    // ==================================================

    if (
      shouldNotifyAssignee
    ) {
      await notifySafely(
        'hearing-reassigned',

        async () => {
          await notificationService
            .notifyHearingReminder(
              event.assigned_to,
              event.id,
              event.title,
              event.start_date
            );
        },

        {
          eventId:
            event.id,

          previousAssignedTo,

          assignedTo:
            event.assigned_to,
        }
      );
    }

    // ==================================================
    // GOOGLE CALENDAR OLD USER CLEANUP
    // ==================================================

    const removedCalendarUserIds =
      previousCalendarUserIds.filter(
        (
          userId
        ) =>
          !currentCalendarUserIds.includes(
            userId
          )
      );

    await deleteEventFromGoogleForUsersSafely(
      event.id,
      removedCalendarUserIds
    );

    // ==================================================
    // GOOGLE CALENDAR AUTO UPDATE
    // ==================================================

    await syncEventToGoogleForUsersSafely(
      event,
      currentCalendarUserIds
    );

    return this.findOne(
      id
    );
  },

  // ====================================================
  // STATUS
  // ====================================================

    async updateStatus(
    id,
    status
  ) {
    if (
      !EVENT_STATUSES.has(
        status
      )
    ) {
      throw new Error(
        'Geçersiz etkinlik durumu'
      );
    }

    const transaction =
      await sequelize.transaction();

    let event;
    let calendarUserIds =
      [];

    try {
      event =
        await Event.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (
        !event
      ) {
        throw new Error(
          'Duruşma / etkinlik bulunamadı'
        );
      }

      await event.update(
        {
          status,
        },
        {
          transaction,
        }
      );

      if (
        TERMINAL_STATUSES.has(
          status
        )
      ) {
        await reminderService
          .cancelForSource({
            sourceType:
              'event',

            sourceId:
              event.id,

            transaction,
          });
      } else if (
        shouldHaveReminders(
          event
        )
      ) {
        await reminderService
          .rescheduleEvent(
            event,
            {
              transaction,
            }
          );
      }

      calendarUserIds =
        getEventCalendarUserIds(
          event
        );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    // ==================================================
    // GOOGLE CALENDAR STATUS SYNC
    // ==================================================

    await syncEventToGoogleForUsersSafely(
      event,
      calendarUserIds
    );

    return this.findOne(
      id
    );
  },

  // ====================================================
  // REMOVE
  // ====================================================

    async remove(
    id
  ) {
    const transaction =
      await sequelize.transaction();

    let event;
    let calendarUserIds =
      [];

    try {
      event =
        await Event.findByPk(
          id,
          {
            transaction,

            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (
        !event
      ) {
        throw new Error(
          'Duruşma / etkinlik bulunamadı'
        );
      }

      /*
       * Destroy'dan önce Google kullanıcılarını
       * saklıyoruz.
       */
      calendarUserIds =
        getEventCalendarUserIds(
          event
        );

      await reminderService
        .cancelForSource({
          sourceType:
            'event',

          sourceId:
            event.id,

          transaction,
        });

      await event.destroy({
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();

      throw error;
    }

    // ==================================================
    // GOOGLE CALENDAR DELETE
    // ==================================================

    await deleteEventFromGoogleForUsersSafely(
      event.id,
      calendarUserIds
    );

    return event;
  },

  // ====================================================
  // CALENDAR
  // ====================================================

  async getCalendarEvents(
    userId,
    {
      year,
      month,
    }
  ) {
    const parsedYear =
      Number.parseInt(
        year,
        10
      );

    const parsedMonth =
      Number.parseInt(
        month,
        10
      );

    if (
      !Number.isInteger(
        parsedYear
      ) ||
      parsedYear <
        2000 ||
      parsedYear >
        2200
    ) {
      throw new Error(
        'Geçersiz takvim yılı'
      );
    }

    if (
      !Number.isInteger(
        parsedMonth
      ) ||
      parsedMonth <
        1 ||
      parsedMonth >
        12
    ) {
      throw new Error(
        'Geçersiz takvim ayı'
      );
    }

    const rangeStart =
      new Date(
        Date.UTC(
          parsedYear,
          parsedMonth -
            1,
          1,
          0,
          0,
          0,
          0
        )
      );

    const rangeEnd =
      new Date(
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
] =
  await Promise.all([
    Event.findAll({
      where: {
        [Op.or]: [
          {
            created_by:
              userId,
          },

          {
            assigned_to:
              userId,
          },
        ],

        start_date: {
          [Op.gte]:
            rangeStart,

          [Op.lt]:
            rangeEnd,
        },
      },

      include: [
        CASE_INCLUDE,
      ],

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],
    }),

    Task.findAll({
      where: {
        // ==================================================
        // CREATOR OR ASSIGNEE
        // ==================================================

        [Op.or]: [
          {
            created_by:
              userId,
          },

          {
            id: {
              [Op.in]:
                sequelize.literal(
                  `(
                    SELECT "task_id"
                    FROM "task_assignees"
                    WHERE "user_id" = ${sequelize.escape(
                      userId
                    )}
                  )`
                ),
            },
          },
        ],

        due_date: {
          [Op.gte]:
            rangeStart,

          [Op.lt]:
            rangeEnd,
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
            'case_number',
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
    }),
  ]);

    const visibleEvents =
      events.filter(
        (
          event
        ) =>
          !event.case_id ||
          Boolean(
            event.case
          )
      );

    const visibleTasks =
      tasks.filter(
        (
          task
        ) =>
          !task.case_id ||
          Boolean(
            task.case
          )
      );

    const formattedEvents =
      visibleEvents.map(
        (
          event
        ) => ({
          id:
            event.id,

          source_id:
            event.id,

          title:
            event.title,

          start:
            event.start_date,

          end:
            event.end_date ||
            event.start_date,

          type:
            'event',

          event_type:
            event.event_type,

          hearing_type:
            event.hearing_type,

          status:
            event.status,

          location:
            event.location,

          court_room:
            event.court_room,

          judge_name:
            event.judge_name,

          is_all_day:
            event.is_all_day,

          case_id:
            event.case_id,

          case_title:
            event.case?.title ||
            null,

          case_number:
            event.case
              ?.case_number ||
            null,

          clients:
            event.case
              ?.clients ||
            [],

          color:
            event.event_type ===
            'hearing'
              ? '#ef4444'
              : event.event_type ===
                  'deadline'
                ? '#f59e0b'
                : event.event_type ===
                    'meeting'
                  ? '#3b82f6'
                  : event.event_type ===
                      'reminder'
                    ? '#8b5cf6'
                    : '#6b7280',
        })
      );

    const formattedTasks =
      visibleTasks.map(
        (
          task
        ) => ({
          id:
            `task-${task.id}`,

          source_id:
            task.id,

          title:
            task.title,

          start:
            task.due_date,

          end:
            task.due_date,

          type:
            'task',

          status:
            task.status,

          priority:
            task.priority,

          progress:
            task.progress,

          case_id:
            task.case_id,

          case_title:
            task.case
              ?.title ||
            null,

          case_number:
            task.case
              ?.case_number ||
            null,

          color:
            task.priority ===
            'critical'
              ? '#ef4444'
              : task.priority ===
                  'high'
                ? '#f59e0b'
                : task.priority ===
                    'normal'
                  ? '#3b82f6'
                  : '#6b7280',
        })
      );

    return [
      ...formattedEvents,
      ...formattedTasks,
    ].sort(
      (
        firstItem,
        secondItem
      ) =>
        new Date(
          firstItem.start
        ).getTime() -
        new Date(
          secondItem.start
        ).getTime()
    );
  },
};

export default eventService;