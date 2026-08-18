import {
  Router,
} from 'express';

import {
  templateController,
} from './template.controller.js';

import {
  authenticate,
  authorizePermission,
} from '../../middlewares/auth.middleware.js';

import {
  uploadSingle,
} from '../../middlewares/upload.middleware.js';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';

const router =
  Router();

// ======================================================
// AUTH
// ======================================================

router.use(
  authenticate
);

// ======================================================
// LIST / META
//
// Özel route'lar /:id'den önce tutulmalı.
// ======================================================

// Şablon listesi
router.get(
  '/',

  authorizePermission(
    PERMISSION_KEYS.VIEW_TEMPLATES
  ),

  templateController.findAll
);

// Kategoriler
router.get(
  '/categories',

  authorizePermission(
    PERMISSION_KEYS.VIEW_TEMPLATES
  ),

  templateController.getCategories
);

// Hukuk alanları
router.get(
  '/law-areas',

  authorizePermission(
    PERMISSION_KEYS.VIEW_TEMPLATES
  ),

  templateController.getLawAreas
);

// ======================================================
// CREATE
// ======================================================

router.post(
  '/',

  authorizePermission(
    PERMISSION_KEYS.CREATE_TEMPLATES
  ),

  uploadSingle(
    'file'
  ),

  templateController.create
);

// ======================================================
// DOWNLOAD
//
// Ayrı download permission tanımlamadığımız için
// şimdilik VIEW_TEMPLATES ile korunuyor.
// ======================================================

router.get(
  '/:id/download',

  authorizePermission(
    PERMISSION_KEYS.VIEW_TEMPLATES
  ),

  templateController.download
);

// ======================================================
// DETAIL
// ======================================================

router.get(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.VIEW_TEMPLATES
  ),

  templateController.findOne
);

// ======================================================
// UPDATE
// ======================================================

router.put(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.EDIT_TEMPLATES
  ),

  uploadSingle(
    'file'
  ),

  templateController.update
);

// ======================================================
// DELETE
// ======================================================

router.delete(
  '/:id',

  authorizePermission(
    PERMISSION_KEYS.DELETE_TEMPLATES
  ),

  templateController.remove
);

export {
  router as templateRoutes,
};