import express from 'express';

import {
  authController,
} from './auth.controller.js';

import {
  authenticate,
} from '../../middlewares/auth.middleware.js';

import {
  validate,
} from '../../middlewares/validate.middleware.js';

import {
  authValidation,
} from './auth.validation.js';

const router =
  express.Router();

// ======================================================
// PUBLIC / TOKEN ROUTES
// ======================================================

router.post(
  '/login',
  validate(
    authValidation.login
  ),
  authController.login
);

router.post(
  '/refresh-token',
  authController.refreshToken
);

router.post(
  '/logout',
  authController.logout
);

router.post(
  '/forgot-password',
  validate(
    authValidation.forgotPassword
  ),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  validate(
    authValidation.resetPassword
  ),
  authController.resetPassword
);

// ======================================================
// USER INVITE
// ======================================================

/*
 * Daveti alan kullanıcı henüz oturum açmış değildir.
 * Bu endpoint authenticate middleware'inden önce kalmalıdır.
 */
router.post(
  '/accept-invite',
  authController.acceptInvite
);

// ======================================================
// EMAIL VERIFICATION
// ======================================================

router.post(
  '/verify-email',
  authController.verifyEmail
);

// ======================================================
// PROTECTED ROUTES
// ======================================================

router.use(
  authenticate
);

router.get(
  '/profile',
  authController.getProfile
);

router.patch(
  '/profile',
  authController.updateProfile
);

router.put(
  '/profile',
  authController.updateProfile
);

router.put(
  '/change-password',
  validate(
    authValidation.changePassword
  ),
  authController.changePassword
);

export {
  router as authRoutes,
};
