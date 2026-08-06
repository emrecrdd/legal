import { Op } from 'sequelize';

import { Meeting } from '../../models/Meeting.js';
import { Case } from '../../models/Case.js';
import { Client } from '../../models/Client.js';
import { User } from '../../models/User.js';

import { sequelize } from '../../config/database.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

import {
  reminderService,
} from '../reminders/reminder.service.js';

const TERMINAL_STATUSES = new Set([
  'completed',
  'cancelled',
]);

const shouldHaveReminders = (meeting) => {
  return (
    Boolean(meeting?.start_date) &&
    Boolean(meeting?.assigned_to || meeting?.created_by) &&
    !TERMINAL_STATUSES.has(meeting?.status)
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

const validateMeetingDates = ({
  startDate,
  endDate,
}) => {
  if (!startDate) {
    throw new Error(
      'Meeting start date is required'
    );
  }

  const parsedStartDate =
    new Date(startDate);

  if (
    Number.isNaN(
      parsedStartDate.getTime()
    )
  ) {
    throw new Error(
      'Invalid meeting start date'
    );
  }

  if (!endDate) {
    return;
  }

  const parsedEndDate =
    new Date(endDate);

  if (
    Number.isNaN(
      parsedEndDate.getTime()
    )
  ) {
    throw new Error(
      'Invalid meeting end date'
    );
  }

  if (
    parsedEndDate < parsedStartDate
  ) {
    throw new Error(
      'Meeting end date cannot be before start date'
    );
  }
};

export const meetingService = {
  async create(data) {
    validateMeetingDates({
      startDate: data.start_date,
      endDate: data.end_date,
    });

    const transaction =
      await sequelize.transaction();

    try {
      /*
       * Yeni reminder sistemi kullanıldığı için
       * reminder_sent_* alanlarını burada artık
       * elle sıfırlamıyoruz.
       */
      const meeting =
        await Meeting.create(
          data,
          {
            transaction,
          }
        );

      if (
        shouldHaveReminders(meeting)
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

  async findAll({
    page,
    limit,
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

    if (search?.trim()) {
      const normalizedSearch =
        search.trim();

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
      ];
    }

    if (status) {
      where.status = status;
    }

    if (meeting_type) {
      where.meeting_type =
        meeting_type;
    }

    if (case_id) {
      where.case_id = case_id;
    }

    if (client_id) {
      where.client_id = client_id;
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
        const startDate =
          new Date(start_date);

        if (
          Number.isNaN(
            startDate.getTime()
          )
        ) {
          throw new Error(
            'Invalid start date filter'
          );
        }

        where.start_date[Op.gte] =
          startDate;
      }

      if (end_date) {
        const endDate =
          new Date(end_date);

        if (
          Number.isNaN(
            endDate.getTime()
          )
        ) {
          throw new Error(
            'Invalid end date filter'
          );
        }

        where.start_date[Op.lte] =
          endDate;
      }
    }

    const {
      pageNumber,
      limitNumber,
    } = normalizePagination(
      page,
      limit
    );

    const query = paginate(
      {
        where,
      },
      pageNumber,
      limitNumber
    );

    const { count, rows } =
      await Meeting.findAndCountAll({
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
        ],

        distinct: true,

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
      data: rows,

      pagination:
        getPaginationData(
          count,
          pageNumber,
          limitNumber
        ),
    };
  },

  async findOne(id) {
    const meeting =
      await Meeting.findByPk(
        id,
        {
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
              model: Client,
              as: 'client',
              attributes: [
                'id',
                'name',
                'phone',
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
              ],
            },
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
          ],
        }
      );

    if (!meeting) {
      throw new Error(
        'Meeting not found'
      );
    }

    return meeting;
  },

  async update(id, data) {
    const transaction =
      await sequelize.transaction();

    try {
      const meeting =
        await Meeting.findByPk(
          id,
          {
            transaction,
            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!meeting) {
        throw new Error(
          'Meeting not found'
        );
      }

      validateMeetingDates({
        startDate:
          data.start_date ??
          meeting.start_date,

        endDate:
          data.end_date !== undefined
            ? data.end_date
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

        createdBy:
          meeting.created_by,

        status:
          meeting.status,

        title:
          meeting.title,
      };

      await meeting.update(
        data,
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

        createdBy:
          meeting.created_by,

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
        previousValues.createdBy !==
          currentValues.createdBy ||
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
            sourceType: 'meeting',
            sourceId: meeting.id,
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
        schedulingChanged &&
        !shouldHaveReminders(
          meeting
        )
      ) {
        await reminderService
          .cancelForSource({
            sourceType: 'meeting',
            sourceId: meeting.id,
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

  async remove(id) {
    const transaction =
      await sequelize.transaction();

    try {
      const meeting =
        await Meeting.findByPk(
          id,
          {
            transaction,
            lock:
              transaction.LOCK.UPDATE,
          }
        );

      if (!meeting) {
        throw new Error(
          'Meeting not found'
        );
      }

      await reminderService
        .cancelForSource({
          sourceType: 'meeting',
          sourceId: meeting.id,
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

  async getMyMeetings(userId) {
    return Meeting.findAll({
      where: {
        [Op.or]: [
          {
            created_by: userId,
          },
          {
            assigned_to: userId,
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
          model: Client,
          as: 'client',
          attributes: [
            'id',
            'name',
          ],
        },
        {
          model: User,
          as: 'assignee',
          attributes: [
            'id',
            'first_name',
            'last_name',
          ],
        },
      ],

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],
    });
  },

  async getByCase(caseId) {
    return Meeting.findAll({
      where: {
        case_id: caseId,
      },

      include: [
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
          as: 'assignee',
          attributes: [
            'id',
            'first_name',
            'last_name',
          ],
        },
      ],

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],
    });
  },

  async getByClient(clientId) {
    return Meeting.findAll({
      where: {
        client_id: clientId,
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
          as: 'assignee',
          attributes: [
            'id',
            'first_name',
            'last_name',
          ],
        },
      ],

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],
    });
  },

  async getUpcoming(
    userId,
    limit = 5
  ) {
    const safeLimit = Math.min(
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
            created_by: userId,
          },
          {
            assigned_to: userId,
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
          model: Client,
          as: 'client',
          attributes: [
            'id',
            'name',
          ],
        },
        {
          model: User,
          as: 'assignee',
          attributes: [
            'id',
            'first_name',
            'last_name',
          ],
        },
      ],

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],

      limit: safeLimit,
    });
  },

  async updateStatus(
    id,
    status
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
              transaction.LOCK.UPDATE,
          }
        );

      if (!meeting) {
        throw new Error(
          'Meeting not found'
        );
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
            sourceType: 'meeting',
            sourceId: meeting.id,
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