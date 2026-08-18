import express from 'express';

import {
  financeController,
} from './finance.controller.js';

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
// COLLECTION
// ======================================================

// Ödeme oluştur
router.post(
  '/',
  authorizePermission(
    PERMISSION_KEYS.CREATE_PAYMENTS
  ),
  financeController.createPayment
);

// Ödemeleri listele
router.get(
  '/',
  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),
  financeController.findAllPayments
);

// ======================================================
// FINANCIAL REPORTS
//
// Bunlar /:id route'undan önce olmalı.
// ======================================================

// Genel finans özeti
router.get(
  '/summary',
  authorizePermission(
    PERMISSION_KEYS.VIEW_FINANCE_REPORTS
  ),
  financeController.getFinancialSummary
);

// Aylık gelir
router.get(
  '/monthly-revenue',
  authorizePermission(
    PERMISSION_KEYS.VIEW_FINANCE_REPORTS
  ),
  financeController.getMonthlyRevenue
);

// Bekleyen / tahsil edilmemiş ödemeler
router.get(
  '/outstanding',
  authorizePermission(
    PERMISSION_KEYS.VIEW_FINANCE_REPORTS
  ),
  financeController.getOutstandingPayments
);

// Finans istatistikleri
router.get(
  '/statistics',
  authorizePermission(
    PERMISSION_KEYS.VIEW_FINANCE_REPORTS
  ),
  financeController.getPaymentStatistics
);

// ======================================================
// CLIENT-SPECIFIC
//
// Bunlar genel /:id route'undan önce olmalı.
// ======================================================

// Müvekkilin ödemeleri
router.get(
  '/client/:clientId',
  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),
  financeController.getClientPayments
);

// Müvekkilin finans özeti
router.get(
  '/client/:clientId/summary',
  authorizePermission(
    PERMISSION_KEYS.VIEW_FINANCE_REPORTS
  ),
  financeController.getClientFinancialSummary
);

// ======================================================
// CASE-SPECIFIC
// ======================================================

// Davaya ait ödemeler
router.get(
  '/case/:caseId',
  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),
  financeController.getCasePayments
);

// ======================================================
// SINGLE PAYMENT
//
// Genel /:id route'ları en sonda.
// ======================================================

// Ödeme detayı
router.get(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.VIEW_PAYMENTS
  ),
  financeController.findOnePayment
);

// Ödeme güncelle
router.put(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.EDIT_PAYMENTS
  ),
  financeController.updatePayment
);

// Ödeme sil
router.delete(
  '/:id',
  authorizePermission(
    PERMISSION_KEYS.DELETE_PAYMENTS
  ),
  financeController.removePayment
);

export {
  router as financeRoutes,
};