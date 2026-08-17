import { Case } from '../../models/Case.js';
import { CaseParty } from '../../models/CaseParty.js';
import { Client } from '../../models/Client.js';
import { User } from '../../models/User.js';
import { Document } from '../../models/Document.js';
import { Task } from '../../models/Task.js';
import { Event } from '../../models/Event.js';
import { Meeting } from '../../models/Meeting.js';
import { Payment } from '../../models/Payment.js';
import { Note } from '../../models/Note.js';
import {
  sequelize,
} from '../../config/database.js';

import {
  reminderService,
} from '../reminders/reminder.service.js';
import { Op } from 'sequelize';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

export const caseService = {
  async create(data) {
    const {
      client_ids,
      ...caseData
    } = data;

    const newCase =
      await Case.create(caseData);

    if (
      Array.isArray(client_ids) &&
      client_ids.length > 0
    ) {
      await newCase.setClients(
        client_ids
      );
    }

    return this.findOne(
      newCase.id
    );
  },

  async findAll({
    page,
    limit,
    search,
    status,
  }) {
    const where = {};

    if (
      search &&
      search.trim()
    ) {
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
          case_number: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
        {
          court_name: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
        {
          subject: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
        {
          judiciary_type: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
        {
          judiciary_unit: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    const pageNum =
      Number.parseInt(page, 10) ||
      1;

    const limitNum =
      Number.parseInt(limit, 10) ||
      10;

    const query = paginate(
      { where },
      pageNum,
      limitNum
    );

    const {
      count,
      rows,
    } =
      await Case.findAndCountAll({
        ...query,

        include: [
          {
            model: Client,
            as: 'clients',

            attributes: [
              'id',
              'name',
            ],

            through: {
              attributes: [],
            },
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
            ],
          },

          {
            model: CaseParty,
            as: 'parties',

            attributes: [
              'id',
              'party_type',
              'name',
            ],
          },
        ],

        distinct: true,

        order: [
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
          pageNum,
          limitNum
        ),
    };
  },

  async findOne(id) {
    const caseItem =
      await Case.findByPk(id, {
        include: [
          {
            model: Client,
            as: 'clients',

            attributes: [
              'id',
              'name',
              'identification_number',
              'phone',
              'email',
            ],

            through: {
              attributes: [],
            },
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

          {
            model: CaseParty,
            as: 'parties',
          },

          {
            model: Document,
            as: 'documents',

            include: [
              {
                model: User,
                as: 'uploader',

                attributes: [
                  'id',
                  'first_name',
                  'last_name',
                ],
              },
            ],
          },

          {
            model: Task,
            as: 'tasks',

            include: [
              {
                model: User,
                as: 'assignee',

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
          },

          {
            model: Event,
            as: 'events',

            include: [
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
                ],
              },
            ],
          },

          {
            model: Meeting,
            as: 'meetings',

            include: [
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
          },

          {
            model: Payment,
            as: 'payments',
          },

          {
            model: Note,
            as: 'notes',

            include: [
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
          },
        ],

        order: [
          [
            {
              model: Task,
              as: 'tasks',
            },
            'created_at',
            'DESC',
          ],

          [
            {
              model: Event,
              as: 'events',
            },
            'start_date',
            'ASC',
          ],

          [
            {
              model: Meeting,
              as: 'meetings',
            },
            'start_date',
            'ASC',
          ],

          [
            {
              model: Note,
              as: 'notes',
            },
            'created_at',
            'DESC',
          ],
        ],
      });

    if (!caseItem) {
      throw new Error(
        'Case not found'
      );
    }

    return caseItem;
  },

  async update(id, data) {
    const {
      client_ids,
      ...updateData
    } = data;

    const caseItem =
      await Case.findByPk(id);

    if (!caseItem) {
      throw new Error(
        'Case not found'
      );
    }

    await caseItem.update(
      updateData
    );

    if (
      Array.isArray(client_ids)
    ) {
      await caseItem.setClients(
        client_ids
      );
    }

    return this.findOne(id);
  },

  async remove(id) {
  const transaction =
    await sequelize.transaction();

  try {
    const caseItem =
      await Case.findByPk(
        id,
        {
          transaction,

          lock:
            transaction.LOCK.UPDATE,
        }
      );

    if (!caseItem) {
      throw new Error(
        'Dava bulunamadı'
      );
    }

    // ==================================================
    // EVENT / HEARING REMINDERS
    // ==================================================

    const events =
      await Event.findAll({
        where: {
          case_id: id,
        },

        attributes: [
          'id',
        ],

        transaction,
      });

    for (
      const event
      of events
    ) {
      await reminderService.cancelForSource({
        sourceType:
          'event',

        sourceId:
          event.id,

        transaction,
      });
    }

    // ==================================================
    // TASK REMINDERS
    // ==================================================

    const tasks =
      await Task.findAll({
        where: {
          case_id: id,
        },

        attributes: [
          'id',
        ],

        transaction,
      });

    for (
      const task
      of tasks
    ) {
      await reminderService.cancelForSource({
        sourceType:
          'task',

        sourceId:
          task.id,

        transaction,
      });
    }

    // ==================================================
    // MEETING REMINDERS
    // ==================================================

    const meetings =
      await Meeting.findAll({
        where: {
          case_id: id,
        },

        attributes: [
          'id',
        ],

        transaction,
      });

    for (
      const meeting
      of meetings
    ) {
      await reminderService.cancelForSource({
        sourceType:
          'meeting',

        sourceId:
          meeting.id,

        transaction,
      });
    }

    // ==================================================
    // OPERATIONAL CHILD RECORDS
    //
    // Bunlar paranoid modellerse soft-delete olur.
    // Böylece takvim/görev/toplantı ekranında
    // hayalet kayıt bırakmayız.
    // ==================================================

    await Event.destroy({
      where: {
        case_id: id,
      },

      transaction,
    });

    await Task.destroy({
      where: {
        case_id: id,
      },

      transaction,
    });

    await Meeting.destroy({
      where: {
        case_id: id,
      },

      transaction,
    });

    /*
     * Taraflar ve notlar da dava çalışma alanına
     * ait operasyonel kayıtlardır.
     */
    await CaseParty.destroy({
      where: {
        case_id: id,
      },

      transaction,
    });

    await Note.destroy({
      where: {
        case_id: id,
      },

      transaction,
    });
    await caseItem.destroy({
  transaction,
});

    // ==================================================
    // IMPORTANT
    //
    // Document ve Payment kayıtlarına dokunmuyoruz.
    // Hukuki belge ve finans kayıtlarının dava silinmesi
    // nedeniyle kaybolmasını istemiyoruz.
    // ==================================================

    await caseItem.destroy({
      transaction,
    });

    await transaction.commit();

    return caseItem;
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
},

  async addParty(
    caseId,
    partyData
  ) {
    const caseItem =
      await Case.findByPk(
        caseId
      );

    if (!caseItem) {
      throw new Error(
        'Case not found'
      );
    }

    return CaseParty.create({
      ...partyData,
      case_id: caseId,
    });
  },

  async removeParty(
    caseId,
    partyId
  ) {
    const party =
      await CaseParty.findOne({
        where: {
          id: partyId,
          case_id: caseId,
        },
      });

    if (!party) {
      throw new Error(
        'Party not found'
      );
    }

    await party.destroy();

    return true;
  },

  async getParties(caseId) {
    return CaseParty.findAll({
      where: {
        case_id: caseId,
      },

      order: [
        [
          'created_at',
          'ASC',
        ],
      ],
    });
  },

  async getDocuments(caseId) {
    return Document.findAll({
      where: {
        case_id: caseId,
      },

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },

  async getTasks(caseId) {
    return Task.findAll({
      where: {
        case_id: caseId,
      },

      order: [
        [
          'due_date',
          'ASC',
        ],
      ],
    });
  },

  async getEvents(caseId) {
    return Event.findAll({
      where: {
        case_id: caseId,
      },

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],
    });
  },

  async getMeetings(caseId) {
    return Meeting.findAll({
      where: {
        case_id: caseId,
      },

      order: [
        [
          'start_date',
          'ASC',
        ],
      ],
    });
  },

  async getPayments(caseId) {
    return Payment.findAll({
      where: {
        case_id: caseId,
      },

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },

  async getNotes(caseId) {
    return Note.findAll({
      where: {
        case_id: caseId,
      },

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },

  async getStatistics(userId) {
    const [
      totalCases,
      preparationCases,
      activeCases,
      concludedCases,
      myCases,
    ] = await Promise.all([
      Case.count(),

      Case.count({
        where: {
          status:
            'preparation',
        },
      }),

      Case.count({
        where: {
          status:
            'active',
        },
      }),

      Case.count({
        where: {
          status:
            'concluded',
        },
      }),

      Case.count({
        where: {
          assigned_to:
            userId,
        },
      }),
    ]);

    return {
      totalCases,

      preparation:
        preparationCases,

      active:
        activeCases,

      concluded:
        concludedCases,

      assignedToMe:
        myCases,
    };
  },

  async updateStatus(
    id,
    status
  ) {
    const caseItem =
      await Case.findByPk(id);

    if (!caseItem) {
      throw new Error(
        'Case not found'
      );
    }

    await caseItem.update({
      status,
    });

    return caseItem;
  },
};