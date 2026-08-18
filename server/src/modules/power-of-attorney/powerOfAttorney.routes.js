import {
  Router,
} from 'express';

import {
  powerOfAttorneyController,
} from './powerOfAttorney.controller.js';

import {
  authenticate,
  authorizePermission,
} from '../../middlewares/auth.middleware.js';

import {
  uploadSingle,
} from '../../middlewares/upload.middleware.js';

import {
  validate,
} from '../../middlewares/validate.middleware.js';

import {
  body,
} from 'express-validator';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';

const router =
  Router();

// ======================================================
// VALIDATION
// ======================================================

const createValidation = [
  body('client_id')
    .notEmpty()
    .withMessage(
      'Müvekkil seçimi zorunludur'
    ),

  body('title')
    .notEmpty()
    .withMessage(
      'Başlık zorunludur'
    ),
];

const updateValidation = [
  body('title')
    .optional()
    .notEmpty()
    .withMessage(
      'Başlık boş olamaz'
    ),
];

// ======================================================
// AUTH
// ======================================================

router.use(
  authenticate
);

// ======================================================
// LIST / STATISTICS
//
// Özel route'lar /:id'den önce tutulmalı.
// ======================================================

// Tüm vekaletnameleri listele
router.get(
  '/',

  authorizePermission(
    PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY
  ),

  powerOfAttorneyController.findAll
);

// İstatistikler
router.get(
  '/statistics',

  authorizePermission(
    PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY
  ),

  powerOfAttorneyController.getStatistics
);

// Müvekkile göre vekaletnameler
router.get(
  '/client/:clientId',

  authorizePermission(
    PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY
  ),

  powerOfAttorneyController.findByClient
);

// ======================================================
// CREATE
// ======================================================

router.post(
  '/',

  authorizePermission(
    PERMISSION_KEYS.CREATE_POWER_OF_ATTORNEY
  ),

  uploadSingle(
    'file'
  ),

  validate(
    createValidation
  ),

  powerOfAttorneyController.create
);

// ======================================================
// DETAIL
// ======================================================

// Tek vekaletname
router.get(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY
  ),

  powerOfAttorneyController.findOne
);

// ======================================================
// UPDATE
// ======================================================

router.put(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.EDIT_POWER_OF_ATTORNEY
  ),

  validate(
    updateValidation
  ),

  powerOfAttorneyController.update
);

// Durum değiştir
router.patch(
  '/:id/status',

  authorizePermission(
    PERMISSION_KEYS.EDIT_POWER_OF_ATTORNEY
  ),

  powerOfAttorneyController.updateStatus
);

// ======================================================
// DELETE
// ======================================================

router.delete(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.DELETE_POWER_OF_ATTORNEY
  ),

  powerOfAttorneyController.delete
);

export {
  router as powerOfAttorneyRoutes,
};