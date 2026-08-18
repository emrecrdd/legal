import express from 'express';

import {
  userController,
} from './user.controller.js';

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
// ADMIN ONLY
// ======================================================

// Kullanıcı listesi
router.get(
  '/',
  authorize(
    ROLES.ADMIN
  ),
  userController.findAll
);

// Yeni kullanıcı oluştur
router.post(
  '/',
  authorize(
    ROLES.ADMIN
  ),
  userController.create
);

// ======================================================
// SINGLE USER
// ======================================================

// Detay
router.get(
  '/:id',
  authorize(
    ROLES.ADMIN
  ),
  userController.findOne
);

// Genel kullanıcı bilgilerini güncelle
router.patch(
  '/:id',
  authorize(
    ROLES.ADMIN
  ),
  userController.update
);

// Backward compatibility gerekiyorsa PUT'u da tut
router.put(
  '/:id',
  authorize(
    ROLES.ADMIN
  ),
  userController.update
);

// Rol değiştir
router.patch(
  '/:id/role',
  authorize(
    ROLES.ADMIN
  ),
  userController.changeRole
);

// Aktif / pasif
router.patch(
  '/:id/toggle-active',
  authorize(
    ROLES.ADMIN
  ),
  userController.toggleActive
);

// Sil
router.delete(
  '/:id',
  authorize(
    ROLES.ADMIN
  ),
  userController.delete
);

export {
  router as userRoutes,
};