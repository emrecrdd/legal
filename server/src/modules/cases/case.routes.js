import express from 'express';
import { caseController } from './case.controller.js';
import {
  authenticate,
  authorize,
} from '../../middlewares/auth.middleware.js';
import { ROLES } from '../../constants/roles.js';

const router = express.Router();

router.use(authenticate);

// ======================================================
// MAIN CRUD
// ======================================================

// Dava oluştur
router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.LAWYER),
  caseController.create
);

// Davaları listele
router.get(
  '/',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  caseController.findAll
);

// İstatistikler
// DİKKAT: /:id route'undan önce olmalı
router.get(
  '/statistics',
  authorize(ROLES.ADMIN, ROLES.LAWYER),
  caseController.getStatistics
);

// Tek dava
router.get(
  '/:id',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  caseController.findOne
);

// Tam güncelleme
router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.LAWYER),
  caseController.update
);

// Kısmi güncelleme
// AI ile Dosyayı Tamamla burayı kullanacak
router.patch(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.LAWYER),
  caseController.patch
);

// Dava sil
router.delete(
  '/:id',
  authorize(ROLES.ADMIN),
  caseController.remove
);

// ======================================================
// STATUS
// ======================================================

router.patch(
  '/:id/status',
  authorize(ROLES.ADMIN, ROLES.LAWYER),
  caseController.updateStatus
);

// ======================================================
// PARTIES
// ======================================================

router.post(
  '/:id/parties',
  authorize(ROLES.ADMIN, ROLES.LAWYER),
  caseController.addParty
);

router.delete(
  '/:id/parties/:partyId',
  authorize(ROLES.ADMIN, ROLES.LAWYER),
  caseController.removeParty
);

router.get(
  '/:id/parties',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  caseController.getParties
);

// ======================================================
// RELATED DATA
// ======================================================

router.get(
  '/:id/documents',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  caseController.getDocuments
);

router.get(
  '/:id/tasks',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  caseController.getTasks
);

router.get(
  '/:id/events',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  caseController.getEvents
);

router.get(
  '/:id/payments',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),
  caseController.getPayments
);

router.get(
  '/:id/notes',
  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),
  caseController.getNotes
);

export { router as caseRoutes };