import express from 'express';

import {
  setupController,
} from './setup.controller.js';

import {
  setupValidation,
} from './setup.validation.js';

import {
  validate,
} from '../../middlewares/validate.middleware.js';

const router =
  express.Router();

router.post(
  '/verify-email',
  validate(
    setupValidation.verifyEmail
  ),
  setupController.verifyEmail
);

router.post(
  '/resend-verification',
  validate(
    setupValidation.resendVerification
  ),
  setupController.resendVerification
);

router.get(
  '/:token',
  validate(
    setupValidation.inspect
  ),
  setupController.inspect
);

router.post(
  '/:token/claim',
  validate(
    setupValidation.claim
  ),
  setupController.claim
);

export {
  router as setupRoutes,
};

export default router;
