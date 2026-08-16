import {
  Op,
} from 'sequelize';

import {
  Meeting,
} from '../../models/Meeting.js';

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
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

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

const ALLOWED_STATUSES =
  new Set([
    'scheduled',
    'ongoing',
    'completed',
    'cancelled',
  ]);

const ALLOWED_MEETING_TYPES =
  new Set([
    'client',
    'internal',
    'phone',
    'other',
  ]);

const USER_SUMMARY_ATTRIBUTES = [
  'id',
  'first_name',
  'last_name',
];

const ASSIGNEE_ATTRIBUTES = [
  'id',
  'first_name',
  'last_name',
  'email',
];

const CASE_SUMMARY_ATTRIBUTES = [
  'id',
  'title',
  'case_number',
];

const CLIENT_SUMMARY_ATTRIBUTES = [
  'id',
  'name',
];

// ======================================================
// HELPERS
// ======================================================

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

const normalizeSearch = (
  value
) => {
  if (
    typeof value !==
    'string'
  ) {
    return '';
  }

  return value
    .trim()
    .slice(
      0,
      150
    );
};

const parseDate = (
  value,
  errorMessage
) => {
  if (!value) {
    return null;
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      errorMessage
    );
  }

  return parsed;
};

const validateMeetingDates = ({
  startDate,
  endDate,
}) => {
  if (!startDate) {
    throw new Error(
      'Meeting start date is required'
    );
  }

  const parsedStart =
    parseDate(
      startDate,
      'Invalid meeting start date'
    );

  if (!endDate) {
    return;
  }

  const parsedEnd =
    parseDate(
      endDate,
      'Invalid meeting end date'
    );

  if (
    parsedEnd <
    parsedStart
  ) {
    throw new Error(
      'Meeting end date cannot be before start date'
    );
  }
};

const validateStatus = (
  status
) => {
  if (
    !ALLOWED_STATUSES.has(
      status
    )
  ) {
    throw new Error(
      'Invalid meeting status'
    );
  }
};

const validateMeetingType = (
  meetingType
) => {
  if (
    meetingType &&
    !ALLOWED_MEETING_TYPES.has(
      meetingType
    )
  ) {
    throw new Error(
      'Invalid meeting type'
    );
  }
};

const shouldHaveReminders = (
  meeting
) => {
  return (
    Boolean(
      meeting?.start_date
    ) &&
    Boolean(
      meeting?.assigned_to ||
        meeting?.created_by
    ) &&
    !TERMINAL_STATUSES.has(
      meeting?.status
    )
  );
};

const prepareMeetingData = (
  data
) => {
  const prepared = {
    ...data,
  };

  /*
   * Server controlled alanları
   * body üzerinden değiştirmiyoruz.
   */
  delete prepared.id;
  delete prepared.created_at;
  delete prepared.updated_at;
  delete prepared.deleted_at;

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'title'
    )
  ) {
    prepared.title =
      String(
        prepared.title || ''
      ).trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'description'
    )
  ) {
    prepared.description =
      prepared.description
        ? String(
            prepared.description
          ).trim()
        : null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'location'
    )
  ) {
    prepared.location =
      prepared.location
        ? String(
            prepared.location
          ).trim()
        : null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'meeting_link'
    )
  ) {
    prepared.meeting_link =
      prepared.meeting_link
        ? String(
            prepared.meeting_link
          ).trim()
        : null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'notes'
    )
  ) {
    prepared.notes =
      prepared.notes
        ? String(
            prepared.notes
          ).trim()
        : null;
  }

  if (
    prepared.status
  ) {
    validateStatus(
      prepared.status
    );
  }

  if (
    prepared.meeting_type
  ) {
    validateMeetingType(
      prepared.meeting_type
    );
  }

  return prepared;
};

const buildIncludes = ({
  includeClient = true,
  includeCase = true,
  includeCreator = true,
  includeAssignee = true,
} = {}) => {
  const includes = [];

  if (includeCase) {
    includes.push({
      model:
        Case,

      as:
        'case',

      attributes:
        CASE_SUMMARY_ATTRIBUTES,

      required:
        false,
    });
  }

  if (includeClient) {
    includes.push({
      model:
        Client,

      as:
        'client',

      attributes:
        CLIENT_SUMMARY_ATTRIBUTES,

      required:
        false,
    });
  }

  if (includeCreator) {
    includes.push({
      model:
        User,

      as:
        'creator',

      attributes:
        USER_SUMMARY_ATTRIBUTES,

      required:
        false,
    });
  }

  if (includeAssignee) {
    includes.push({
      model:
        User,

      as:
        'assignee',

      attributes:
        ASSIGNEE_ATTRIBUTES,

      required:
        false,
    });
  }

  return includes;
};

// ======================================================
// SERVICE
// ======================================================

export const meetingService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data
  ) {
    const preparedData =
      prepareMeetingData(
        data
      );

    validateMeetingDates({
      startDate:
        preparedData.start_date,

      endDate:
        preparedData.end_date,
    });

    const transaction =
      await sequelize.transaction();

    try {
      const meeting =
        await Meeting.create(
          preparedData,
          {
            transaction,
          }
        );

      if (
        shouldHaveReminders(
          meeting
        )
      ) {
        await reminderService
          .createMeetingReminders(
            meeting,
            {
              transaction,
            }
          );
      }

      await transaction.commit();

      return meeting;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // LIST
  // ====================================================

  async findAll({
    page = 1,
    limit = 10,
    search,
    status,
    meeting_type,
    case_id,
    client_id,
    assigned_to,
    start_date,
    end_date,
  }) {
    const where = {};

    const normalizedSearch =
      normalizeSearch(
        search
      );

    if (
      normalizedSearch
    ) {
      where[Op.or] = [
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

        {
          location: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
      ];
    }

    if (status) {
      validateStatus(
        status
      );

      where.status =
        status;
    }

    if (
      meeting_type
    ) {
      validateMeetingType(
        meeting_type
      );

      where.meeting_type =
        meeting_type;
    }

    if (case_id) {
      where.case_id =
        case_id;
    }

    if (client_id) {
      where.client_id =
        client_id;
    }

    if (assigned_to) {
      where.assigned_to =
        assigned_to;
    }

    if (
      start_date ||
      end_date
    ) {
      where.start_date = {};

      if (start_date) {
        where.start_date[
          Op.gte
        ] =
          parseDate(
            start_date,
            'Invalid start date filter'
          );
      }

      if (end_date) {
        where.start_date[
          Op.lte
        ] =
          parseDate(
            end_date,
            'Invalid end date filter'
          );
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
      await Meeting.findAndCountAll({
        ...query,

        include:
          buildIncludes(),

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

    return {
      data:
        rows,

      pagination:
        getPaginationData(
          count,
          pageNumber,
          limitNumber
        ),
    };
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    id
  ) {
    const meeting =
      await Meeting.findByPk(
        id,
        {
          include:
            buildIncludes(),
        }
      );

    if (!meeting) {
      throw new Error(
        'Meeting not found'
      );
    }

    return meeting;
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

    try {
      const meeting =
        await Meeting.findByPk(
          id,
          {
            transaction,

            lock:
              transaction
                .LOCK.UPDATE,
          }
        );

      if (!meeting) {
        throw new Error(
          'Meeting not found'
        );
      }

      const preparedData =
        prepareMeetingData(
          data
        );

      /*
       * created_by update endpoint üzerinden
       * değiştirilemez.
       */
      delete preparedData.created_by;

      validateMeetingDates({
        startDate:
          preparedData.start_date ??
          meeting.start_date,

        endDate:
          preparedData.end_date !==
          undefined
            ? preparedData.end_date
            : meeting.end_date,
      });

      const previousValues = {
        startDate:
          meeting.start_date
            ? new Date(
                meeting.start_date
              ).getTime()
            : null,

        endDate:
          meeting.end_date
            ? new Date(
                meeting.end_date
              ).getTime()
            : null,

        assignedTo:
          meeting.assigned_to,

        status:
          meeting.status,

        title:
          meeting.title,
      };

      await meeting.update(
        preparedData,
        {
          transaction,
        }
      );

      const currentValues = {
        startDate:
          meeting.start_date
            ? new Date(
                meeting.start_date
              ).getTime()
            : null,

        endDate:
          meeting.end_date
            ? new Date(
                meeting.end_date
              ).getTime()
            : null,

        assignedTo:
          meeting.assigned_to,

        status:
          meeting.status,

        title:
          meeting.title,
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
          currentValues.title;

      if (
        TERMINAL_STATUSES.has(
          meeting.status
        )
      ) {
        await reminderService
          .cancelForSource({
            sourceType:
              'meeting',

            sourceId:
              meeting.id,

            transaction,
          });
      } else if (
        schedulingChanged &&
        shouldHaveReminders(
          meeting
        )
      ) {
        await reminderService
          .rescheduleMeeting(
            meeting,
            {
              transaction,
            }
          );
      } else if (
        schedulingChanged
      ) {
        await reminderService
          .cancelForSource({
            sourceType:
              'meeting',

            sourceId:
              meeting.id,

            transaction,
          });
      }

      await transaction.commit();

      return meeting;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // REMOVE
  // ====================================================

  async remove(
    id
  ) {
    const transaction =
      await sequelize.transaction();

    try {
      const meeting =
        await Meeting.findByPk(
          id,
          {
            transaction,

            lock:
              transaction
                .LOCK.UPDATE,
          }
        );

      if (!meeting) {
        throw new Error(
          'Meeting not found'
        );
      }

      await reminderService
        .cancelForSource({
          sourceType:
            'meeting',

          sourceId:
            meeting.id,

          transaction,
        });

      await meeting.destroy({
        transaction,
      });

      await transaction.commit();

      return meeting;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },

  // ====================================================
  // MY MEETINGS
  // ====================================================

  async getMyMeetings(
    userId,
    {
      page = 1,
      limit = 25,
      includeCompleted = false,
    } = {}
  ) {
    const {
      pageNumber,
      limitNumber,
    } =
      normalizePagination(
        page,
        limit
      );

    const where = {
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
    };

    if (
      !includeCompleted
    ) {
      where.status = {
        [Op.notIn]: [
          'completed',
          'cancelled',
        ],
      };
    }

    const {
      count,
      rows,
    } =
      await Meeting.findAndCountAll({
        where,

        include:
          buildIncludes({
            includeCreator:
              false,
          }),

        distinct:
          true,

        order: [
          [
            'start_date',
            'ASC',
          ],
        ],

        limit:
          limitNumber,

        offset:
          (
            pageNumber -
            1
          ) *
          limitNumber,
      });

    return {
      data:
        rows,

      pagination:
        getPaginationData(
          count,
          pageNumber,
          limitNumber
        ),
    };
  },

  // ====================================================
  // BY CASE
  // ====================================================

  async getByCase(
    caseId,
    {
      page = 1,
      limit = 25,
    } = {}
  ) {
    return this.findAll({
      page,
      limit,

      case_id:
        caseId,
    });
  },

  // ====================================================
  // BY CLIENT
  // ====================================================

  async getByClient(
    clientId,
    {
      page = 1,
      limit = 25,
    } = {}
  ) {
    return this.findAll({
      page,
      limit,

      client_id:
        clientId,
    });
  },

  // ====================================================
  // CLIENT COCKPIT
  //
  // Müvekkil detay ekranı için bütün toplantı geçmişini
  // çekmek yerine yaklaşan ve son toplantıları getirir.
  // ====================================================

  async getClientTimeline(
    clientId,
    {
      upcomingLimit = 5,
      recentLimit = 5,
    } = {}
  ) {
    const safeUpcomingLimit =
      Math.min(
        Math.max(
          Number(
            upcomingLimit
          ) || 5,
          1
        ),
        20
      );

    const safeRecentLimit =
      Math.min(
        Math.max(
          Number(
            recentLimit
          ) || 5,
          1
        ),
        20
      );

    const now =
      new Date();

    const [
      upcoming,
      recent,
    ] =
      await Promise.all([
        Meeting.findAll({
          where: {
            client_id:
              clientId,

            start_date: {
              [Op.gte]:
                now,
            },

            status: {
              [Op.notIn]: [
                'completed',
                'cancelled',
              ],
            },
          },

          include:
            buildIncludes({
              includeClient:
                false,

              includeCreator:
                false,
            }),

          order: [
            [
              'start_date',
              'ASC',
            ],
          ],

          limit:
            safeUpcomingLimit,
        }),

        Meeting.findAll({
          where: {
            client_id:
              clientId,

            [Op.or]: [
              {
                start_date: {
                  [Op.lt]:
                    now,
                },
              },

              {
                status: {
                  [Op.in]: [
                    'completed',
                    'cancelled',
                  ],
                },
              },
            ],
          },

          include:
            buildIncludes({
              includeClient:
                false,

              includeCreator:
                false,
            }),

          order: [
            [
              'start_date',
              'DESC',
            ],
          ],

          limit:
            safeRecentLimit,
        }),
      ]);

    return {
      upcoming,
      recent,

      counts: {
        upcoming:
          upcoming.length,

        recent:
          recent.length,
      },
    };
  },

  // ====================================================
  // UPCOMING
  // ====================================================

  async getUpcoming(
    userId,
    limit = 5
  ) {
    const safeLimit =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 5,
          1
        ),
        50
      );

    return Meeting.findAll({
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
            new Date(),
        },

        status: {
          [Op.notIn]: [
            'completed',
            'cancelled',
          ],
        },
      },

      include:
        buildIncludes({
          includeCreator:
            false,
        }),

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],

      limit:
        safeLimit,
    });
  },

  // ====================================================
  // STATUS
  // ====================================================

  async updateStatus(
    id,
    status
  ) {
    validateStatus(
      status
    );

    const transaction =
      await sequelize.transaction();

    try {
      const meeting =
        await Meeting.findByPk(
          id,
          {
            transaction,

            lock:
              transaction
                .LOCK.UPDATE,
          }
        );

      if (!meeting) {
        throw new Error(
          'Meeting not found'
        );
      }

      /*
       * Gereksiz UPDATE + reminder işlemini önle.
       */
      if (
        meeting.status ===
        status
      ) {
        await transaction.commit();

        return meeting;
      }

      await meeting.update(
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
              'meeting',

            sourceId:
              meeting.id,

            transaction,
          });
      } else if (
        shouldHaveReminders(
          meeting
        )
      ) {
        await reminderService
          .rescheduleMeeting(
            meeting,
            {
              transaction,
            }
          );
      }

      await transaction.commit();

      return meeting;
    } catch (error) {
      await transaction.rollback();

      throw error;
    }
  },
};

export default meetingService;