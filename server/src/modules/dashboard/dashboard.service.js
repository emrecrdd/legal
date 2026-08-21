import { Client } from '../../models/Client.js';
import { Case } from '../../models/Case.js';
import { Document } from '../../models/Document.js';
import { Task } from '../../models/Task.js';
import { Event } from '../../models/Event.js';
import { Payment } from '../../models/Payment.js';
import { User } from '../../models/User.js';

import {
  Op,
} from 'sequelize';

export const dashboardService = {
  // ======================================================
  // DASHBOARD STATS
  // ======================================================

  async getStats() {
    const totalClients =
      await Client.count();

    const activeCases =
      await Case.count({
        where: {
          status: {
            [Op.notIn]: [
              'concluded',
              'archived',
            ],
          },
        },
      });

    const totalDocuments =
      await Document.count();

    const pendingTasks =
      await Task.count({
        where: {
          status:
            'pending',
        },
      });

    const totalReceived =
      (
        await Payment.sum(
          'amount',
          {
            where: {
              status:
                'completed',

              payment_type:
                'received',
            },
          }
        )
      ) || 0;

    const totalPendingPayments =
      (
        await Payment.sum(
          'amount',
          {
            where: {
              status:
                'pending',

              payment_type:
                'received',
            },
          }
        )
      ) || 0;

    return {
      totalClients,
      activeCases,
      totalDocuments,
      pendingTasks,
      totalReceived,
      totalPendingPayments,
    };
  },

  // ======================================================
  // TODAY HEARINGS
  // ======================================================

  async getTodayHearings() {
    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const tomorrow =
      new Date(
        today
      );

    tomorrow.setDate(
      tomorrow.getDate() +
        1
    );

    const events =
      await Event.findAll({
        where: {
          start_date: {
            [Op.between]: [
              today,
              tomorrow,
            ],
          },

          event_type:
            'hearing',
        },

        include: [
          {
            model:
              Case,

            as:
              'case',

            include: [
              {
                model:
                  Client,

                as:
                  'clients',

                attributes: [
                  'id',
                  'name',
                ],

                through: {
                  attributes:
                    [],
                },
              },
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

    return events;
  },

  // ======================================================
  // UPCOMING TASKS
  // ======================================================

  async getUpcomingTasks(
    userId,
    limit = 5
  ) {
    const now =
      new Date();

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

    /*
     * assigned_to artık tasks tablosunda yok.
     *
     * Yeni yapı:
     *
     * tasks
     *   ↓
     * task_assignees
     *   ↓
     * users
     *
     * Dashboard yalnız giriş yapan kullanıcıya
     * atanmış görevleri getirir.
     */

    const tasks =
      await Task.findAll({
        where: {
          status: {
            [Op.notIn]: [
              'completed',
              'cancelled',
            ],
          },

          due_date: {
            [Op.gte]:
              now,
          },
        },

        include: [
          {
            association:
              'assignees',

            where: {
              id:
                userId,
            },

            attributes:
              [],

            through: {
              attributes:
                [],
            },

            required:
              true,
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
        ],

        order: [
          [
            'due_date',
            'ASC',
          ],
        ],

        limit:
          safeLimit,

        subQuery:
          false,
      });

    return tasks;
  },

  // ======================================================
  // RECENT ACTIVITIES
  // ======================================================

  async getRecentActivities(
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

    const recentDocuments =
      await Document.findAll({
        include: [
          {
            model:
              User,

            as:
              'uploader',

            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],

        limit:
          safeLimit,
      });

    const recentCases =
      await Case.findAll({
        include: [
          {
            model:
              Client,

            as:
              'clients',

            attributes: [
              'id',
              'name',
            ],

            through: {
              attributes:
                [],
            },
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],

        limit:
          safeLimit,
      });

    return {
      recentDocuments,
      recentCases,
    };
  },
};