import express from 'express';

import {
  eventController,
} from './event.controller.js';

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
// CALENDAR
// ======================================================

router.get(
  '/calendar',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CALENDAR
  ),
  eventController.getCalendarEvents
);

// ======================================================
// MY EVENTS
// ======================================================

router.get(
  '/my',
  authorizePermission(
    PERMISSION_KEYS.VIEW_EVENTS
  ),
  eventController.getMyEvents
);

// ======================================================
// CASE EVENTS
// ======================================================

router.get(
  '/case/:caseId',
  authorizePermission(
    PERMISSION_KEYS.VIEW_EVENTS
  ),
  eventController.getByCase
);

// ======================================================
// CREATE
// ======================================================

router.post(
  '/',
  authorizePermission(
    PERMISSION_KEYS.CREATE_EVENTS
  ),
  eventController.create
);

// ======================================================
// LIST
// ======================================================

router.get(
  '/',
  authorizePermission(
    PERMISSION_KEYS.VIEW_EVENTS
  ),
  eventController.findAll
);

// ======================================================
// STATUS
// ======================================================

router.patch(
  '/:id/status',
  authorizePermission(
    PERMISSION_KEYS.EDIT_EVENTS
  ),
  eventController.updateStatus
);

// ======================================================
// CALENDAR / ICS DOWNLOAD
// ======================================================

// Duruşma / etkinliği telefon veya harici takvime
// eklemek için .ics dosyası üretir.
//
// Genel /:id route'undan önce olmalı.

router.get(
  '/:id/calendar',
  authorizePermission(
    PERMISSION_KEYS.VIEW_EVENTS
  ),
  eventController.downloadCalendar
);

// ======================================================
// DETAIL
// ======================================================

router.get(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.VIEW_EVENTS
  ),
  eventController.findOne
);

// ======================================================
// UPDATE
// ======================================================

router.patch(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.EDIT_EVENTS
  ),
  eventController.update
);

// ======================================================
// DELETE
// ======================================================

router.delete(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.DELETE_EVENTS
  ),
  eventController.remove
);

export {
  router as eventRoutes,
};