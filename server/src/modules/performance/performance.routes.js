import express from 'express';

import {
  getTeamOverview,
  getUsersPerformance,
  getUserPerformance,
  getMyPerformance,
} from './performance.controller.js';

import {
  authenticate,
} from '../../middlewares/auth.middleware.js';

const router =
  express.Router();

// ======================================================
// AUTH
// ======================================================

router.use(
  authenticate
);

// ======================================================
// PERFORMANCE ROUTES
// ======================================================

router.get(
  '/overview',
  getTeamOverview
);

router.get(
  '/users',
  getUsersPerformance
);

router.get(
  '/me',
  getMyPerformance
);

router.get(
  '/users/:userId',
  getUserPerformance
);

export default router;