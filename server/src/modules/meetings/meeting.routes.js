import express from 'express';

import {
  meetingController,
} from './meeting.controller.js';

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

// ======================================================
// SPECIAL ROUTES
//
// Bunlar mutlaka /:id route'undan önce tanımlanmalı.
// ======================================================

// Kullanıcının toplantıları
router.get(
  '/my',
  authorize(
    ...CAN_READ
  ),
  meetingController.getMyMeetings
);

// Yaklaşan toplantılar
router.get(
  '/upcoming',
  authorize(
    ...CAN_READ
  ),
  meetingController.getUpcoming
);

// Dava bazlı toplantılar
router.get(
  '/case/:caseId',
  authorize(
    ...CAN_READ
  ),
  meetingController.getByCase
);

// ======================================================
// CLIENT ROUTES
// ======================================================

// Client cockpit için hafif timeline.
//
// ÖNEMLİ:
// /client/:clientId route'undan önce tanımlıyoruz.
router.get(
  '/client/:clientId/timeline',
  authorize(
    ...CAN_READ
  ),
  meetingController.getClientTimeline
);

// Müvekkilin tüm toplantıları - paginated
router.get(
  '/client/:clientId',
  authorize(
    ...CAN_READ
  ),
  meetingController.getByClient
);

// ======================================================
// CRUD
// ======================================================

// Oluştur
router.post(
  '/',
  authorize(
    ...CAN_WRITE
  ),
  meetingController.create
);

// Liste
router.get(
  '/',
  authorize(
    ...CAN_READ
  ),
  meetingController.findAll
);

// Detay
router.get(
  '/:id',
  authorize(
    ...CAN_READ
  ),
  meetingController.findOne
);

// Güncelle
router.put(
  '/:id',
  authorize(
    ...CAN_WRITE
  ),
  meetingController.update
);

// Durum değiştir
router.patch(
  '/:id/status',
  authorize(
    ...CAN_WRITE
  ),
  meetingController.updateStatus
);

// Sil
router.delete(
  '/:id',
  authorize(
    ...CAN_DELETE
  ),
  meetingController.remove
);

export {
  router as meetingRoutes,
};