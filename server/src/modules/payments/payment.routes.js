import express from 'express';

import {
  paymentController,
} from './payment.controller.js';

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
// GLOBAL FINANCE SUMMARY
// ======================================================

router.get(
  '/summary',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  paymentController.getSummary
);

// ======================================================
// PAYMENT PLANS
// ======================================================

// Plan oluştur
router.post(
  '/plans',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  paymentController.createPlan
);

// Plan listesi
router.get(
  '/plans',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  paymentController.findAllPlans
);

// Müvekkil finans özeti
router.get(
  '/client/:clientId/summary',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  paymentController.getClientPlanSummary
);

// Plan detay
router.get(
  '/plans/:id',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  paymentController.findOnePlan
);

// Plan aktive et
router.patch(
  '/plans/:id/activate',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER
  ),
  paymentController.activatePlan
);

// Plan iptal et
router.patch(
  '/plans/:id/cancel',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER
  ),
  paymentController.cancelPlan
);

// ======================================================
// CLIENT / CASE PAYMENTS
// ======================================================

// Müvekkil hareketleri
router.get(
  '/client/:clientId',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  paymentController.getClientPayments
);

// Dava hareketleri
router.get(
  '/case/:caseId',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  paymentController.getCasePayments
);

// ======================================================
// MAIN PAYMENT CRUD
// ======================================================

// Finans hareketi oluştur
router.post(
  '/',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  paymentController.createPayment
);

// Finans hareketleri listesi
router.get(
  '/',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  paymentController.findAllPayments
);

// ======================================================
// REVERSAL
// ======================================================

// Tamamlanmış hareketi ters kayda al
router.post(
  '/:id/reverse',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER
  ),
  paymentController.reversePayment
);

// ======================================================
// PAYMENT DETAIL
// ======================================================

// Finans hareketi detay
router.get(
  '/:id',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  paymentController.findOnePayment
);

// Metadata güncelle
router.patch(
  '/:id',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  paymentController.updatePayment
);

// Pending/cancelled hareketi soft delete
router.delete(
  '/:id',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER
  ),
  paymentController.removePayment
);

export {
  router as paymentRoutes,
};