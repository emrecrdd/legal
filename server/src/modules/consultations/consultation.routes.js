import express from 'express';
import { consultationController } from './consultation.controller.js';
import {
  authenticate,
  authorizePermission,
} from '../../middlewares/auth.middleware.js';
import { PERMISSION_KEYS } from '../../constants/roles.js';
import {
  validateConsultationId,
  validateCreateConsultation,
  validateUpdateConsultation,
  validateConsultationStatus,
  validateConsultationListQuery,
  validateConsultationAssignee,
  validateConsultationAssigneeUserId,
  validateConvertConsultationToClient,
  validateConvertConsultationToCase,
} from './consultation.validation.js';

const router = express.Router();
router.use(authenticate);

router.post(
  '/',
  authorizePermission(PERMISSION_KEYS.CREATE_CONSULTATIONS),
  validateCreateConsultation,
  consultationController.create
);

router.get(
  '/',
  authorizePermission(PERMISSION_KEYS.VIEW_CONSULTATIONS),
  validateConsultationListQuery,
  consultationController.findAll
);

router.get(
  '/statistics',
  authorizePermission(PERMISSION_KEYS.VIEW_CONSULTATIONS),
  consultationController.getStatistics
);

router.get(
  '/:id',
  authorizePermission(PERMISSION_KEYS.VIEW_CONSULTATIONS),
  validateConsultationId,
  consultationController.findOne
);

router.patch(
  '/:id',
  authorizePermission(PERMISSION_KEYS.EDIT_CONSULTATIONS),
  validateConsultationId,
  validateUpdateConsultation,
  consultationController.update
);

router.delete(
  '/:id',
  authorizePermission(PERMISSION_KEYS.DELETE_CONSULTATIONS),
  validateConsultationId,
  consultationController.remove
);

router.patch(
  '/:id/status',
  authorizePermission(PERMISSION_KEYS.EDIT_CONSULTATIONS),
  validateConsultationId,
  validateConsultationStatus,
  consultationController.updateStatus
);

router.post(
  '/:id/assignees',
  authorizePermission(PERMISSION_KEYS.EDIT_CONSULTATIONS),
  validateConsultationId,
  validateConsultationAssignee,
  consultationController.addAssignee
);

router.delete(
  '/:id/assignees/:userId',
  authorizePermission(PERMISSION_KEYS.EDIT_CONSULTATIONS),
  validateConsultationId,
  validateConsultationAssigneeUserId,
  consultationController.removeAssignee
);

router.get(
  '/:id/tasks',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CONSULTATIONS,
    PERMISSION_KEYS.VIEW_TASKS
  ),
  validateConsultationId,
  consultationController.getTasks
);

router.get(
  '/:id/meetings',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CONSULTATIONS,
    PERMISSION_KEYS.VIEW_MEETINGS
  ),
  validateConsultationId,
  consultationController.getMeetings
);

router.get(
  '/:id/documents',
  authorizePermission(
    PERMISSION_KEYS.VIEW_CONSULTATIONS,
    PERMISSION_KEYS.VIEW_DOCUMENTS
  ),
  validateConsultationId,
  consultationController.getDocuments
);

router.post(
  '/:id/convert-to-client',
  authorizePermission(
    PERMISSION_KEYS.CONVERT_CONSULTATIONS,
    PERMISSION_KEYS.CREATE_CLIENTS
  ),
  validateConsultationId,
  validateConvertConsultationToClient,
  consultationController.convertToClient
);

router.post(
  '/:id/convert-to-case',
  authorizePermission(
    PERMISSION_KEYS.CONVERT_CONSULTATIONS,
    PERMISSION_KEYS.CREATE_CASES
  ),
  validateConsultationId,
  validateConvertConsultationToCase,
  consultationController.convertToCase
);

export { router as consultationRoutes };
