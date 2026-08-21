import express from 'express';

import {
  meetingController,
} from './meeting.controller.js';

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
// SPECIAL ROUTES
//
// Bunlar /:id route'undan önce olmalı.
// ======================================================

// Kullanıcının toplantıları
router.get(
  '/my',
  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),
  meetingController.getMyMeetings
);

// Yaklaşan toplantılar
router.get(
  '/upcoming',
  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),
  meetingController.getUpcoming
);

// Dava bazlı toplantılar
router.get(
  '/case/:caseId',
  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),
  meetingController.getByCase
);

// ======================================================
// CLIENT ROUTES
// ======================================================

// Client cockpit timeline
router.get(
  '/client/:clientId/timeline',
  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),
  meetingController.getClientTimeline
);

// Müvekkilin tüm toplantıları
router.get(
  '/client/:clientId',
  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),
  meetingController.getByClient
);

// ======================================================
// CRUD
// ======================================================

// Toplantı oluştur
router.post(
  '/',
  authorizePermission(
    PERMISSION_KEYS.CREATE_MEETINGS
  ),
  meetingController.create
);

// Liste
router.get(
  '/',
  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),
  meetingController.findAll
);

// ======================================================
// CALENDAR / ICS
// ======================================================

// Toplantıyı telefon / harici takvime eklemek için
// .ics dosyası üretir.
//
// Genel /:id route'undan önce olmalı.

router.get(
  '/:id/calendar',
  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),
  meetingController.downloadCalendar
);

// ======================================================
// SINGLE MEETING
// ======================================================

// Detay
router.get(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.VIEW_MEETINGS
  ),
  meetingController.findOne
);

// Güncelle
router.put(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.EDIT_MEETINGS
  ),
  meetingController.update
);

// Durum değiştir
router.patch(
  '/:id/status',
  authorizePermission(
    PERMISSION_KEYS.EDIT_MEETINGS
  ),
  meetingController.updateStatus
);

// Sil
router.delete(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.DELETE_MEETINGS
  ),
  meetingController.remove
);

export {
  router as meetingRoutes,
};