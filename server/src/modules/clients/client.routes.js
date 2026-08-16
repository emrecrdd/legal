import express from 'express';

import {
  clientController,
} from './client.controller.js';

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
// COLLECTION
// ======================================================

// Müvekkil oluştur
router.post(
  '/',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  clientController.create
);

// Müvekkil listesi
router.get(
  '/',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  clientController.findAll
);

// İstatistik
router.get(
  '/statistics',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER
  ),
  clientController.getStatistics
);

// ======================================================
// CLIENT DETAIL SUBRESOURCES
// ======================================================

// Dava geçmişi
router.get(
  '/:id/cases',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  clientController.getCaseHistory
);

// Ödemeler
router.get(
  '/:id/payments',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  clientController.getPayments
);

// Notlar
router.get(
  '/:id/notes',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  clientController.getNotes
);

// ======================================================
// CLIENT DETAIL
// ======================================================

// Müvekkil detay
router.get(
  '/:id',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  clientController.findOne
);

// Metadata güncelle
router.patch(
  '/:id',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  clientController.update
);

// Soft delete
router.delete(
  '/:id',
  authorize(
    ROLES.ADMIN
  ),
  clientController.remove
);

export {
  router as clientRoutes,
};