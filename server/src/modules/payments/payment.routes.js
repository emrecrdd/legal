import express from 'express';

import {
  paymentController,
} from './payment.controller.js';

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
// GLOBAL FINANCE SUMMARY
// ======================================================

router.get(
  '/summary',

  authorizePermission(
    PERMISSION_KEYS.VIEW_FINANCE_REPORTS
  ),

  paymentController.getSummary
);

// ======================================================
// PAYMENT PLANS
// ======================================================

// Plan oluştur
router.post(
  '/plans',

  authorizePermission(
    PERMISSION_KEYS.MANAGE_PAYMENT_PLANS
  ),

  paymentController.createPlan
);

// Plan listesi
router.get(
  '/plans',

  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),

  paymentController.findAllPlans
);

// ======================================================
// CLIENT FINANCE SUMMARY
//
// /client/:clientId route'undan önce olmalı.
// ======================================================

router.get(
  '/client/:clientId/summary',

  authorizePermission(
    PERMISSION_KEYS.VIEW_FINANCE_REPORTS
  ),

  paymentController.getClientPlanSummary
);

// ======================================================
// PAYMENT PLAN DETAIL
// ======================================================

// Plan detay
router.get(
  '/plans/:id',

  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),

  paymentController.findOnePlan
);

// Plan aktive et
router.patch(
  '/plans/:id/activate',

  authorizePermission(
    PERMISSION_KEYS.MANAGE_PAYMENT_PLANS
  ),

  paymentController.activatePlan
);

// Plan iptal et
router.patch(
  '/plans/:id/cancel',

  authorizePermission(
    PERMISSION_KEYS.MANAGE_PAYMENT_PLANS
  ),

  paymentController.cancelPlan
);

// ======================================================
// CLIENT / CASE PAYMENTS
// ======================================================

// Müvekkil finans hareketleri
router.get(
  '/client/:clientId',

  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),

  paymentController.getClientPayments
);

// Dava finans hareketleri
router.get(
  '/case/:caseId',

  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),

  paymentController.getCasePayments
);

// ======================================================
// MAIN PAYMENT CRUD
// ======================================================

// Finans hareketi oluştur
router.post(
  '/',

  authorizePermission(
    PERMISSION_KEYS.CREATE_PAYMENTS
  ),

  paymentController.createPayment
);

// Finans hareketlerini listele
router.get(
  '/',

  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),

  paymentController.findAllPayments
);

// ======================================================
// REVERSAL
//
// Finansal kaydı doğrudan silmek yerine
// muhasebesel ters kayıt oluşturur.
// ======================================================

router.post(
  '/:id/reverse',

  authorizePermission(
    PERMISSION_KEYS.REVERSE_PAYMENTS
  ),

  paymentController.reversePayment
);

// ======================================================
// PAYMENT DETAIL
// ======================================================

// Finans hareketi detay
router.get(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),

  paymentController.findOnePayment
);

// Metadata güncelle
router.patch(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.EDIT_PAYMENTS
  ),

  paymentController.updatePayment
);

// Pending / cancelled hareketi soft delete
router.delete(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.DELETE_PAYMENTS
  ),

  paymentController.removePayment
);

export {
  router as paymentRoutes,
};