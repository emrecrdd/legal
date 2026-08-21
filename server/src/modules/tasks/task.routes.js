import express from 'express';

import {
  taskController,
} from './task.controller.js';

import {
  authenticate,
  authorizePermission,
} from '../../middlewares/auth.middleware.js';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';

const router =
  express.Router();

// ======================================================
// AUTH
// ======================================================

router.use(
  authenticate
);

// ======================================================
// MY TASKS
// Özel route'lar /:id'den önce olmalı
// ======================================================

router.get(
  '/my',
  authorizePermission(
    PERMISSION_KEYS.VIEW_TASKS
  ),
  taskController.getMyTasks
);

router.get(
  '/my/overdue',
  authorizePermission(
    PERMISSION_KEYS.VIEW_TASKS
  ),
  taskController.getOverdue
);

router.get(
  '/my/upcoming',
  authorizePermission(
    PERMISSION_KEYS.VIEW_TASKS
  ),
  taskController.getUpcoming
);

// ======================================================
// ASSIGNABLE USERS
// ======================================================

router.get(
  '/assignable-users',
  authorizePermission(
    PERMISSION_KEYS.ASSIGN_TASKS
  ),
  taskController.getAssignableUsers
);

// ======================================================
// STATISTICS
// ======================================================

router.get(
  '/statistics',
  authorizePermission(
    PERMISSION_KEYS.VIEW_TASKS
  ),
  taskController.getStatistics
);

// ======================================================
// CLIENT TASKS
// ======================================================

// ClientDetail cockpit için optimize özet.
// /client/:clientId route'undan önce olmalı.

router.get(
  '/client/:clientId/overview',
  authorizePermission(
    PERMISSION_KEYS.VIEW_TASKS
  ),
  taskController.getClientOverview
);

// Müvekkilin tüm görevleri

router.get(
  '/client/:clientId',
  authorizePermission(
    PERMISSION_KEYS.VIEW_TASKS
  ),
  taskController.getByClient
);

// ======================================================
// MAIN COLLECTION CRUD
// ======================================================

// Görev oluştur.
// Çoklu atama body:
// {
//   "assignee_ids": [
//     "user-uuid-1",
//     "user-uuid-2"
//   ]
// }

router.post(
  '/',
  authorizePermission(
    PERMISSION_KEYS.CREATE_TASKS
  ),
  taskController.create
);

// Görevleri listele

router.get(
  '/',
  authorizePermission(
    PERMISSION_KEYS.VIEW_TASKS
  ),
  taskController.findAll
);

// ======================================================
// SINGLE TASK ACTIONS
// ======================================================

// Durum güncelle

router.patch(
  '/:id/status',
  authorizePermission(
    PERMISSION_KEYS.EDIT_TASKS
  ),
  taskController.updateStatus
);

// ======================================================
// MULTIPLE TASK ASSIGNMENT
// ======================================================

// Görev sorumlularını güncelle.
//
// Body:
// {
//   "assignee_ids": [
//     "user-uuid-1",
//     "user-uuid-2",
//     "user-uuid-3"
//   ]
// }
//
// Eski frontend geçiş sürecinde:
// {
//   "assigned_to": "user-uuid-1"
// }
//
// gönderirse controller bunu da destekler.

router.patch(
  '/:id/assign',
  authorizePermission(
    PERMISSION_KEYS.ASSIGN_TASKS
  ),
  taskController.assignTask
);

// Görevi başlat

router.post(
  '/:id/start',
  authorizePermission(
    PERMISSION_KEYS.WORK_ON_TASKS
  ),
  taskController.startTask
);

// Görevi tamamla

router.post(
  '/:id/complete',
  authorizePermission(
    PERMISSION_KEYS.WORK_ON_TASKS
  ),
  taskController.completeTask
);

// İlerleme güncelle

router.patch(
  '/:id/progress',
  authorizePermission(
    PERMISSION_KEYS.WORK_ON_TASKS
  ),
  taskController.updateProgress
);

// Görev onayla

router.post(
  '/:id/approve',
  authorizePermission(
    PERMISSION_KEYS.APPROVE_TASKS
  ),
  taskController.approveTask
);

// ======================================================
// TASK NOTES
// ======================================================

// Not ekle

router.post(
  '/:id/notes',
  authorizePermission(
    PERMISSION_KEYS.CREATE_NOTES
  ),
  taskController.addNote
);

// Notları getir

router.get(
  '/:id/notes',
  authorizePermission(
    PERMISSION_KEYS.VIEW_NOTES
  ),
  taskController.getNotes
);

// ======================================================
// SINGLE TASK CRUD
// Genel /:id route'ları en sona
// ======================================================

// Görev detayı

router.get(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.VIEW_TASKS
  ),
  taskController.findOne
);

// Görev güncelle

router.put(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.EDIT_TASKS
  ),
  taskController.update
);

// Görev sil

router.delete(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.DELETE_TASKS
  ),
  taskController.remove
);

export {
  router as taskRoutes,
};