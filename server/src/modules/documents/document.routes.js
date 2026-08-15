import express from 'express';

import {
  documentController,
} from './document.controller.js';

import {
  documentUpload,
} from './document.upload.js';

import {
  authenticate,
  authorize,
} from '../../middlewares/auth.middleware.js';

import {
  ROLES,
} from '../../constants/roles.js';

const router =
  express.Router();

router.use(
  authenticate
);

// ======================================================
// UPLOADS
// ======================================================

router.post(
  '/upload',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),

  documentUpload.single(
    'file'
  ),

  documentController.upload
);

router.post(
  '/upload-multiple',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),

  documentUpload.array(
    'files',
    10
  ),

  documentController.uploadMultiple
);

// ======================================================
// LIST / META
// Bunlar /:id route'undan ÖNCE olmalı.
// ======================================================

router.get(
  '/',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),

  documentController.findAll
);

router.get(
  '/categories',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),

  documentController.getCategories
);

router.get(
  '/statistics',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER
  ),

  documentController.getStatistics
);

// ======================================================
// DOCUMENT OPERATIONS
// ======================================================

router.get(
  '/:id/download',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),

  documentController.download
);

router.get(
  '/:id/preview',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),

  documentController.preview
);

// ======================================================
// VERSIONS
// ======================================================

router.get(
  '/:id/versions',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),

  documentController.getVersions
);

router.post(
  '/:id/versions',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),

  documentUpload.single(
    'file'
  ),

  documentController.uploadVersion
);

// ======================================================
// SINGLE DOCUMENT
// ======================================================

router.get(
  '/:id',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.INTERN,
    ROLES.SECRETARY
  ),

  documentController.findOne
);

/*
 * Metadata update için PATCH esas endpoint.
 */
router.patch(
  '/:id',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),

  documentController.update
);

/*
 * Eski frontend bozulmasın diye PUT'u şimdilik
 * backward compatibility olarak tutuyoruz.
 */
router.put(
  '/:id',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.SECRETARY
  ),

  documentController.update
);

router.delete(
  '/:id',

  authorize(
    ROLES.ADMIN,
    ROLES.LAWYER
  ),

  documentController.remove
);

export {
  router as documentRoutes,
};