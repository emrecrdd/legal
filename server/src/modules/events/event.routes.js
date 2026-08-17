import express from 'express';

import {
  eventController,
} from './event.controller.js';

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
// CALENDAR
// ======================================================

router.get(
  '/calendar',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  eventController.getCalendarEvents
);

// ======================================================
// MY EVENTS
// ======================================================

router.get(
  '/my',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  eventController.getMyEvents
);

// ======================================================
// CASE EVENTS
// ======================================================

router.get(
  '/case/:caseId',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  eventController.getByCase
);

// ======================================================
// CREATE
// ======================================================

router.post(
  '/',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  eventController.create
);

// ======================================================
// LIST
// ======================================================

router.get(
  '/',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  eventController.findAll
);

// ======================================================
// STATUS
// ======================================================

router.patch(
  '/:id/status',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  eventController.updateStatus
);

// ======================================================
// DETAIL
// ======================================================

router.get(
  '/:id',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  eventController.findOne
);

// ======================================================
// UPDATE
// ======================================================

router.patch(
  '/:id',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  eventController.update
);

// ======================================================
// DELETE
// ======================================================

router.delete(
  '/:id',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER
  ),
  eventController.remove
);

export {
  router as eventRoutes,
};