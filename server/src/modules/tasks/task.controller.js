import {
  taskService,
} from './task.service.js';

import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';
import {
  hasPermission,
} from '../../middlewares/auth.middleware.js';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';
import {
  AuditLog,
} from '../../models/AuditLog.js';

// ======================================================
// HELPERS
// ======================================================

const createAuditLog = async ({
  req,
  action,
  entityType = 'task',
  entityId,
  description,
}) => {
  try {
    await AuditLog.create({
      action,

      entity_type:
        entityType,

      entity_id:
        entityId,

      user_id:
        req.user.id,

      description,

      ip_address:
        req.ip,

      user_agent:
        req.headers[
          'user-agent'
        ],
    });
  } catch (error) {
    /*
     * Audit log hatası ana CRUD işlemini bozmasın.
     *
     * Görev başarıyla oluşturulmuş/güncellenmişken
     * audit insert hatası yüzünden kullanıcıya
     * başarısız response dönmek duplicate işlem
     * riskine yol açabilir.
     */
    logger.error(
      'Task audit log error:',
      error
    );
  }
};

const getUserDisplayName = (
  user
) => {
  if (!user) {
    return 'Sistem';
  }

  const name = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    name ||
    'Sistem'
  );
};

// ======================================================
// CONTROLLER
// ======================================================

export const taskController = {
  // ====================================================
  // CREATE
  // ====================================================

    // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      const canAssignTasks =
        hasPermission(
          req.user,
          PERMISSION_KEYS.ASSIGN_TASKS
        );

      const requestedAssignee =
        req.body?.assigned_to ||
        null;

      /*
       * assign_tasks yetkisi olmayan kullanıcı
       * request'i elle değiştirerek başka kullanıcıya
       * görev atayamaz.
       *
       * Yetkisi yoksa görev otomatik kendisine atanır.
       */
      const assignedTo =
        canAssignTasks
          ? requestedAssignee
          : req.user.id;

      /*
       * Workflow alanlarını client belirleyemez.
       * Yeni görev her zaman pending / %0 başlar.
       */
      const {
        created_by,
        status,
        progress,
        approved_by,
        approved_at,
        started_at,
        completed_at,
        actual_hours,
        ...safeBody
      } = req.body;

      const taskData = {
        ...safeBody,

        created_by:
          req.user.id,

        assigned_to:
          assignedTo,

        status:
          'pending',

        progress:
          0,
      };

      const task =
        await taskService.create(
          taskData
        );

      await createAuditLog({
        req,

        action:
          'create',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi oluşturuldu`,
      });

      return successResponse(
        res,
        task,
        'Task created successfully',
        201
      );
    } catch (error) {
      logger.error(
        'Create task error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Görev oluşturulamadı',
        400
      );
    }
  },

  // ====================================================
  // LIST
  // ====================================================

  async findAll(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        priority,
        assigned_to,
        case_id,
        client_id,
      } = req.query;

      const result =
        await taskService.findAll({
          page,
          limit,
          search,
          status,
          priority,
          assigned_to,
          case_id,
          client_id,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Tasks fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // CLIENT TASKS
  // ====================================================

  async getByClient(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 25,
        status,
      } = req.query;

      const result =
        await taskService.getByClient(
          req.params.clientId,
          {
            page,
            limit,
            status,
          }
        );

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Client tasks fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get client tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // CLIENT COCKPIT OVERVIEW
  // ====================================================

  async getClientOverview(
    req,
    res
  ) {
    try {
      const {
        active_limit = 5,
        recent_limit = 5,
      } = req.query;

      const overview =
        await taskService.getClientOverview(
          req.params.clientId,
          {
            activeLimit:
              active_limit,

            recentLimit:
              recent_limit,
          }
        );

      return successResponse(
        res,
        overview,
        'Client task overview fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get client task overview error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // DETAIL
  // ====================================================

  async findOne(
    req,
    res
  ) {
    try {
      const task =
        await taskService.findOne(
          req.params.id
        );

      return successResponse(
        res,
        task,
        'Task fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get task error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ====================================================
  // UPDATE
  // ====================================================

    // ====================================================
  // UPDATE
  // ====================================================

  async update(
    req,
    res
  ) {
    try {
      const {
        assigned_to,
        status,
        approved_by,
        approved_at,
        progress,
        started_at,
        completed_at,
        actual_hours,
        ...safeUpdateData
      } = req.body;

      /*
       * Genel update endpoint'i workflow veya assignment
       * alanlarını değiştiremez.
       *
       * Bunların ayrı endpoint'leri var:
       *
       * PATCH /tasks/:id/assign
       * POST  /tasks/:id/start
       * POST  /tasks/:id/complete
       * POST  /tasks/:id/approve
       * PATCH /tasks/:id/progress
       * PATCH /tasks/:id/status
       */

      const task =
        await taskService.update(
          req.params.id,
          safeUpdateData
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi güncellendi`,
      });

      return successResponse(
        res,
        task,
        'Task updated successfully'
      );
    } catch (error) {
      logger.error(
        'Update task error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // DELETE
  // ====================================================

  async remove(
    req,
    res
  ) {
    try {
      const task =
        await taskService.findOne(
          req.params.id
        );

      await taskService.remove(
        req.params.id
      );

      await createAuditLog({
        req,

        action:
          'delete',

        entityId:
          req.params.id,

        description:
          `"${task.title}" görevi silindi`,
      });

      return successResponse(
        res,
        null,
        'Task deleted successfully'
      );
    } catch (error) {
      logger.error(
        'Delete task error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // UPDATE STATUS
  // ====================================================

  async updateStatus(
    req,
    res
  ) {
    try {
      const {
        status,
      } = req.body;

      if (!status) {
        return errorResponse(
          res,
          'Task status is required',
          400
        );
      }

      const task =
        await taskService.updateStatus(
          req.params.id,
          status
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görev durumu "${status}" olarak güncellendi`,
      });

      return successResponse(
        res,
        task,
        'Task status updated successfully'
      );
    } catch (error) {
      logger.error(
        'Update task status error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // ASSIGN
  // ====================================================

  async assignTask(
    req,
    res
  ) {
    try {
      const {
        assigned_to,
      } = req.body;

      if (!assigned_to) {
        return errorResponse(
          res,
          'Assigned user is required',
          400
        );
      }

      /*
       * Service'in üçüncü parametresi assignedBy.
       *
       * Böylece notification içerisinde görevi
       * gerçekten kimin atadığı gösterilebilir.
       */
      const assignedBy =
        getUserDisplayName(
          req.user
        );

      const task =
        await taskService.assignTask(
          req.params.id,
          assigned_to,
          assignedBy
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi kullanıcıya atandı`,
      });

      return successResponse(
        res,
        task,
        'Task assigned successfully'
      );
    } catch (error) {
      logger.error(
        'Assign task error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // MY TASKS
  // ====================================================

  async getMyTasks(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
      } = req.query;

      const result =
        await taskService.getMyTasks(
          req.user.id,
          {
            page,
            limit,
            status,
          }
        );

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'My tasks fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get my tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },
  // ====================================================
  // ASSIGNABLE USERS
  // ====================================================

  async getAssignableUsers(
    req,
    res
  ) {
    try {
      const users =
        await taskService.getAssignableUsers();

      return successResponse(
        res,
        users,
        'Assignable users fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get assignable users error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },
  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics(
    req,
    res
  ) {
    try {
      const stats =
        await taskService.getStatistics(
          req.user.id
        );

      return successResponse(
        res,
        stats,
        'Task statistics fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get task statistics error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // OVERDUE
  // ====================================================

  async getOverdue(
    req,
    res
  ) {
    try {
      const tasks =
        await taskService.getOverdue(
          req.user.id
        );

      return successResponse(
        res,
        tasks,
        'Overdue tasks fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get overdue tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // UPCOMING
  // ====================================================

  async getUpcoming(
    req,
    res
  ) {
    try {
      const tasks =
        await taskService.getUpcoming(
          req.user.id
        );

      return successResponse(
        res,
        tasks,
        'Upcoming tasks fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get upcoming tasks error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // START
  // ====================================================

  async startTask(
    req,
    res
  ) {
    try {
      const task =
        await taskService.startTask(
          req.params.id,
          req.user.id
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi başlatıldı`,
      });

      return successResponse(
        res,
        task,
        'Task started successfully'
      );
    } catch (error) {
      logger.error(
        'Start task error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // COMPLETE
  // ====================================================

  async completeTask(
    req,
    res
  ) {
    try {
      const {
        note,
        actual_hours,
      } = req.body;

      const task =
        await taskService.completeTask(
          req.params.id,
          req.user.id,
          {
            note,
            actual_hours,
          }
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi tamamlandı`,
      });

      return successResponse(
        res,
        task,
        'Task completed successfully'
      );
    } catch (error) {
      logger.error(
        'Complete task error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // APPROVE
  // ====================================================

  async approveTask(
    req,
    res
  ) {
    try {
      const task =
        await taskService.approveTask(
          req.params.id,
          req.user.id
        );

      await createAuditLog({
        req,

        action:
          'update',

        entityId:
          task.id,

        description:
          `"${task.title}" görevi onaylandı`,
      });

      return successResponse(
        res,
        task,
        'Task approved successfully'
      );
    } catch (error) {
      logger.error(
        'Approve task error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // ADD NOTE
  // ====================================================

  async addNote(
    req,
    res
  ) {
    try {
      const {
        content,
      } = req.body;

      if (
        !content?.trim()
      ) {
        return errorResponse(
          res,
          'Note content is required',
          400
        );
      }

      const note =
        await taskService.addNote(
          req.params.id,
          req.user.id,
          {
            content,
          }
        );

      const preview =
        String(
          note.content ||
            ''
        )
          .slice(
            0,
            50
          )
          .trim();

      await createAuditLog({
        req,

        action:
          'create',

        entityType:
          'note',

        entityId:
          note.id,

        description:
          `"${preview}${note.content?.length > 50 ? '...' : ''}" notu eklendi`,
      });

      return successResponse(
        res,
        note,
        'Note added successfully',
        201
      );
    } catch (error) {
      logger.error(
        'Add note error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // NOTES
  // ====================================================

  async getNotes(
    req,
    res
  ) {
    try {
      const notes =
        await taskService.getNotes(
          req.params.id,
          req.user.id
        );

      return successResponse(
        res,
        notes,
        'Notes fetched successfully'
      );
    } catch (error) {
      logger.error(
        'Get notes error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // PROGRESS
  // ====================================================

  async updateProgress(
    req,
    res
  ) {
    try {
      const {
        progress,
      } = req.body;

      if (
        progress ===
          undefined ||
        progress ===
          null
      ) {
        return errorResponse(
          res,
          'Progress is required',
          400
        );
      }

      const task =
        await taskService.updateProgress(
          req.params.id,
          req.user.id,
          progress
        );

      return successResponse(
        res,
        task,
        'Progress updated successfully'
      );
    } catch (error) {
      logger.error(
        'Update progress error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },
};