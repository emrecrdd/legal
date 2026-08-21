import {
  Op,
} from 'sequelize';

import {
  TaskAssignee,
} from '../../models/TaskAssignee.js';

import {
  Task,
} from '../../models/Task.js';

import {
  User,
} from '../../models/User.js';

import {
  Case,
} from '../../models/Case.js';

// ======================================================
// CONSTANTS
// ======================================================

const PERFORMANCE_USER_ATTRIBUTES = [
  'id',
  'first_name',
  'last_name',
  'email',
  'role',
  'title',
  'avatar',
  'is_active',
];

const PERFORMANCE_TASK_ATTRIBUTES = [
  'id',
  'title',
  'status',
  'priority',
  'due_date',
  'created_at',
  'estimated_hours',
];

const VALID_ASSIGNMENT_STATUSES =
  new Set([
    'pending',
    'in_progress',
    'completed',
  ]);

// ======================================================
// NUMBER HELPERS
// ======================================================

const toNumber = (
  value,
  fallback = 0
) => {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return fallback;
  }

  return parsed;
};

const round = (
  value,
  digits = 2
) => {
  const number =
    toNumber(
      value,
      0
    );

  const factor =
    10 ** digits;

  return (
    Math.round(
      number *
        factor
    ) /
    factor
  );
};

const percentage = (
  numerator,
  denominator
) => {
  if (
    !denominator ||
    denominator <= 0
  ) {
    return 0;
  }

  return round(
    (
      numerator /
      denominator
    ) *
      100,
    1
  );
};

// ======================================================
// DATE HELPERS
// ======================================================

const toDate = (
  value
) => {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};

const isAssignmentOverdue = (
  assignment,
  now = new Date()
) => {
  if (
    !assignment ||
    assignment.status ===
      'completed'
  ) {
    return false;
  }

  const dueDate =
    toDate(
      assignment.task
        ?.due_date
    );

  if (!dueDate) {
    return false;
  }

  return (
    dueDate.getTime() <
    now.getTime()
  );
};

const isCompletedOnTime = (
  assignment
) => {
  if (
    !assignment ||
    assignment.status !==
      'completed'
  ) {
    return false;
  }

  const dueDate =
    toDate(
      assignment.task
        ?.due_date
    );

  const completedAt =
    toDate(
      assignment.completed_at
    );

  if (
    !dueDate ||
    !completedAt
  ) {
    return false;
  }

  return (
    completedAt.getTime() <=
    dueDate.getTime()
  );
};

const isCompletedLate = (
  assignment
) => {
  if (
    !assignment ||
    assignment.status !==
      'completed'
  ) {
    return false;
  }

  const dueDate =
    toDate(
      assignment.task
        ?.due_date
    );

  const completedAt =
    toDate(
      assignment.completed_at
    );

  if (
    !dueDate ||
    !completedAt
  ) {
    return false;
  }

  return (
    completedAt.getTime() >
    dueDate.getTime()
  );
};

// ======================================================
// METRIC CALCULATOR
// ======================================================

const calculateMetrics = (
  assignments = []
) => {
  const now =
    new Date();

  const validAssignments =
    assignments.filter(
      (assignment) =>
        assignment &&
        assignment.task &&
        VALID_ASSIGNMENT_STATUSES.has(
          assignment.status
        )
    );

  const total =
    validAssignments.length;

  const pending =
    validAssignments.filter(
      (assignment) =>
        assignment.status ===
        'pending'
    ).length;

  const inProgress =
    validAssignments.filter(
      (assignment) =>
        assignment.status ===
        'in_progress'
    ).length;

  const completed =
    validAssignments.filter(
      (assignment) =>
        assignment.status ===
        'completed'
    ).length;

  const overdue =
    validAssignments.filter(
      (assignment) =>
        isAssignmentOverdue(
          assignment,
          now
        )
    ).length;

  const completedWithDeadline =
    validAssignments.filter(
      (assignment) =>
        assignment.status ===
          'completed' &&
        Boolean(
          toDate(
            assignment.task
              ?.due_date
          )
        ) &&
        Boolean(
          toDate(
            assignment.completed_at
          )
        )
    );

  const completedOnTime =
    completedWithDeadline.filter(
      (assignment) =>
        isCompletedOnTime(
          assignment
        )
    ).length;

  const completedLate =
    completedWithDeadline.filter(
      (assignment) =>
        isCompletedLate(
          assignment
        )
    ).length;

  const assignmentsWithHours =
    validAssignments.filter(
      (assignment) => {
        const hours =
          Number(
            assignment.actual_hours
          );

        return (
          Number.isFinite(
            hours
          ) &&
          hours >= 0
        );
      }
    );

  const totalActualHours =
    assignmentsWithHours.reduce(
      (
        totalHours,
        assignment
      ) =>
        totalHours +
        Number(
          assignment.actual_hours
        ),
      0
    );

  const progressTotal =
    validAssignments.reduce(
      (
        totalProgress,
        assignment
      ) =>
        totalProgress +
        Math.min(
          100,
          Math.max(
            0,
            toNumber(
              assignment.progress,
              0
            )
          )
        ),
      0
    );

  return {
    total_assignments:
      total,

    pending,

    in_progress:
      inProgress,

    completed,

    active:
      pending +
      inProgress,

    overdue,

    completed_on_time:
      completedOnTime,

    completed_late:
      completedLate,

    completion_rate:
      percentage(
        completed,
        total
      ),

    on_time_completion_rate:
      percentage(
        completedOnTime,
        completedWithDeadline.length
      ),

    overdue_rate:
      percentage(
        overdue,
        total
      ),

    total_actual_hours:
      round(
        totalActualHours,
        2
      ),

    average_actual_hours:
      assignmentsWithHours.length >
      0
        ? round(
            totalActualHours /
              assignmentsWithHours.length,
            2
          )
        : 0,

    average_progress:
      total > 0
        ? round(
            progressTotal /
              total,
            1
          )
        : 0,
  };
};

// ======================================================
// QUERY INCLUDES
// ======================================================

const USER_INCLUDE = {
  model:
    User,

  as:
    'user',

  attributes:
    PERFORMANCE_USER_ATTRIBUTES,

  required:
    true,
};

const TASK_INCLUDE = {
  model:
    Task,

  as:
    'task',

  attributes:
    PERFORMANCE_TASK_ATTRIBUTES,

  required:
    true,

  where: {
    status: {
      [Op.ne]:
        'cancelled',
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
};

// ======================================================
// SERIALIZERS
// ======================================================

const serializeUser = (
  user
) => {
  if (!user) {
    return null;
  }

  return {
    id:
      user.id,

    first_name:
      user.first_name,

    last_name:
      user.last_name,

    full_name:
      [
        user.first_name,
        user.last_name,
      ]
        .filter(
          Boolean
        )
        .join(' ')
        .trim(),

    email:
      user.email,

    role:
      user.role,

    title:
      user.title,

    avatar:
      user.avatar,

    is_active:
      user.is_active,
  };
};

const serializeAssignment = (
  assignment
) => {
  const task =
    assignment.task;

  return {
    task_id:
      assignment.task_id,

    user_id:
      assignment.user_id,

    status:
      assignment.status,

    progress:
      toNumber(
        assignment.progress,
        0
      ),

    started_at:
      assignment.started_at,

    completed_at:
      assignment.completed_at,

    actual_hours:
      assignment.actual_hours !=
      null
        ? toNumber(
            assignment.actual_hours,
            0
          )
        : null,

    overdue:
      isAssignmentOverdue(
        assignment
      ),

    completed_on_time:
      isCompletedOnTime(
        assignment
      ),

    completed_late:
      isCompletedLate(
        assignment
      ),

    task:
      task
        ? {
            id:
              task.id,

            title:
              task.title,

            status:
              task.status,

            priority:
              task.priority,

            due_date:
              task.due_date,

            estimated_hours:
              task.estimated_hours,

            created_at:
              task.created_at,

            case:
              task.case
                ? {
                    id:
                      task.case.id,

                    title:
                      task.case.title,

                    case_number:
                      task.case.case_number,
                  }
                : null,
          }
        : null,
  };
};

// ======================================================
// SERVICE
// ======================================================

export const performanceService = {
  // ====================================================
  // TEAM OVERVIEW
  // ====================================================

  async getTeamOverview() {
    const assignments =
      await TaskAssignee.findAll({
        include: [
          USER_INCLUDE,
          TASK_INCLUDE,
        ],
      });

    const userIds =
      new Set(
        assignments.map(
          (assignment) =>
            assignment.user_id
        )
      );

    return {
      users_with_assignments:
        userIds.size,

      ...calculateMetrics(
        assignments
      ),
    };
  },

  // ====================================================
  // ALL USER PERFORMANCE
  // ====================================================

  async getUsersPerformance() {
    /*
     * Aktif kullanıcıları ayrıca çekiyoruz.
     *
     * Böylece henüz hiç görev atanmamış kullanıcı da
     * performans ekranında 0 değerlerle görünebilir.
     */

    const [
      users,
      assignments,
    ] =
      await Promise.all([
        User.findAll({
          where: {
            is_active:
              true,
          },

          attributes:
            PERFORMANCE_USER_ATTRIBUTES,

          order: [
            [
              'first_name',
              'ASC',
            ],

            [
              'last_name',
              'ASC',
            ],
          ],
        }),

        TaskAssignee.findAll({
          include: [
            TASK_INCLUDE,
          ],
        }),
      ]);

    const assignmentsByUser =
      new Map();

    for (
      const assignment of
      assignments
    ) {
      const userId =
        assignment.user_id;

      if (
        !assignmentsByUser.has(
          userId
        )
      ) {
        assignmentsByUser.set(
          userId,
          []
        );
      }

      assignmentsByUser
        .get(
          userId
        )
        .push(
          assignment
        );
    }

    const data =
      users.map(
        (user) => {
          const userAssignments =
            assignmentsByUser.get(
              user.id
            ) || [];

          return {
            user:
              serializeUser(
                user
              ),

            metrics:
              calculateMetrics(
                userAssignments
              ),
          };
        }
      );

    /*
     * İlk sıralama:
     *
     * 1. Tamamlanan görev sayısı yüksek olan
     * 2. Zamanında tamamlama oranı yüksek olan
     * 3. Toplam atama sayısı yüksek olan
     *
     * Bu henüz "puanlama" değildir.
     * Sadece tabloyu anlamlı sıralar.
     */

    data.sort(
      (
        first,
        second
      ) => {
        const completedDifference =
          second.metrics
            .completed -
          first.metrics
            .completed;

        if (
          completedDifference !==
          0
        ) {
          return completedDifference;
        }

        const onTimeDifference =
          second.metrics
            .on_time_completion_rate -
          first.metrics
            .on_time_completion_rate;

        if (
          onTimeDifference !==
          0
        ) {
          return onTimeDifference;
        }

        return (
          second.metrics
            .total_assignments -
          first.metrics
            .total_assignments
        );
      }
    );

    return data;
  },

  // ====================================================
  // SINGLE USER PERFORMANCE
  // ====================================================

  async getUserPerformance(
    userId
  ) {
    if (!userId) {
      throw new Error(
        'Kullanıcı ID gereklidir'
      );
    }

    const user =
      await User.findByPk(
        userId,
        {
          attributes:
            PERFORMANCE_USER_ATTRIBUTES,
        }
      );

    if (!user) {
      throw new Error(
        'Kullanıcı bulunamadı'
      );
    }

    const assignments =
      await TaskAssignee.findAll({
        where: {
          user_id:
            userId,
        },

        include: [
          TASK_INCLUDE,
        ],
      });

    const sortedAssignments =
      [...assignments].sort(
        (
          first,
          second
        ) => {
          const firstDate =
            toDate(
              first.completed_at
            ) ||
            toDate(
              first.task
                ?.due_date
            ) ||
            toDate(
              first.task
                ?.created_at
            );

          const secondDate =
            toDate(
              second.completed_at
            ) ||
            toDate(
              second.task
                ?.due_date
            ) ||
            toDate(
              second.task
                ?.created_at
            );

          return (
            (
              secondDate
                ?.getTime() ||
              0
            ) -
            (
              firstDate
                ?.getTime() ||
              0
            )
          );
        }
      );

    return {
      user:
        serializeUser(
          user
        ),

      metrics:
        calculateMetrics(
          assignments
        ),

      assignments:
        sortedAssignments.map(
          serializeAssignment
        ),
    };
  },
};

export default performanceService;