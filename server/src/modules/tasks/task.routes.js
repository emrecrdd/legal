import express from 'express';

import {
  taskController,
} from './task.controller.js';

import {
  authenticate,
  authorize,
} from '../../middlewares/auth.middleware.js';

import {
  ROLES,
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
// ROLE GROUPS
// ======================================================

const CAN_READ = [
  ROLES.ADMIN,
  ROLES.LAWYER,
  ROLES.INTERN,
  ROLES.SECRETARY,
];

const CAN_WRITE = [
  ROLES.ADMIN,
  ROLES.LAWYER,
  ROLES.SECRETARY,
];

const CAN_DELETE = [
  ROLES.ADMIN,
  ROLES.LAWYER,
];

const CAN_WORK_ON_TASK = [
  ROLES.ADMIN,
  ROLES.LAWYER,
  ROLES.INTERN,
  ROLES.SECRETARY,
];

// ======================================================
// MY TASKS
// Özel route'lar /:id'den önce olmalı
// ======================================================

router.get(
  '/my',
  authorize(
    ...CAN_READ
  ),
  taskController.getMyTasks
);

router.get(
  '/my/overdue',
  authorize(
    ...CAN_READ
  ),
  taskController.getOverdue
);

router.get(
  '/my/upcoming',
  authorize(
    ...CAN_READ
  ),
  taskController.getUpcoming
);

// ======================================================
// STATISTICS
// ======================================================

router.get(
  '/statistics',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER
  ),
  taskController.getStatistics
);

// ======================================================
// CLIENT TASKS
// ======================================================

// ClientDetail cockpit için optimize özet.
//
// ÖNEMLİ:
// /client/:clientId route'undan önce gelmeli.
router.get(
  '/client/:clientId/overview',
  authorize(
    ...CAN_READ
  ),
  taskController.getClientOverview
);

// Müvekkilin tüm görevleri - paginated
router.get(
  '/client/:clientId',
  authorize(
    ...CAN_READ
  ),
  taskController.getByClient
);

// ======================================================
// MAIN COLLECTION CRUD
// ======================================================

router.post(
  '/',
  authorize(
    ...CAN_WRITE
  ),
  taskController.create
);

router.get(
  '/',
  authorize(
    ...CAN_READ
  ),
  taskController.findAll
);

// ======================================================
// SINGLE TASK ACTIONS
//
// Bunların tamamı /:id genel detail route'undan
// önce veya spesifik pattern olarak tanımlanabilir.
// ======================================================

// Durum
router.patch(
  '/:id/status',
  authorize(
    ...CAN_WRITE
  ),
  taskController.updateStatus
);

// Atama
router.patch(
  '/:id/assign',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER
  ),
  taskController.assignTask
);

// Başlat
router.post(
  '/:id/start',
  authorize(
    ...CAN_WORK_ON_TASK
  ),
  taskController.startTask
);

// Tamamla
router.post(
  '/:id/complete',
  authorize(
    ...CAN_WORK_ON_TASK
  ),
  taskController.completeTask
);

// İlerleme
router.patch(
  '/:id/progress',
  authorize(
    ...CAN_WORK_ON_TASK
  ),
  taskController.updateProgress
);

// Onay
router.post(
  '/:id/approve',
  authorize(
    ROLES.ADMIN
  ),
  taskController.approveTask
);

// Not ekle
router.post(
  '/:id/notes',
  authorize(
    ...CAN_READ
  ),
  taskController.addNote
);

// Notları getir
router.get(
  '/:id/notes',
  authorize(
    ...CAN_READ
  ),
  taskController.getNotes
);

// ======================================================
// SINGLE TASK CRUD
// Genel /:id route'ları en sona
// ======================================================

router.get(
  '/:id',
  authorize(
    ...CAN_READ
  ),
  taskController.findOne
);

router.put(
  '/:id',
  authorize(
    ...CAN_WRITE
  ),
  taskController.update
);

router.delete(
  '/:id',
  authorize(
    ...CAN_DELETE
  ),
  taskController.remove
);

export {
  router as taskRoutes,
};