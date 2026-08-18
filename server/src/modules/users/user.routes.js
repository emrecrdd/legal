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
// ADMIN ONLY - COLLECTION
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
// PERMISSION MANAGEMENT
//
// ÖNEMLİ:
// Bunları genel /:id route'larından önce tutuyoruz.
// ======================================================

// Kullanıcının rol + override + efektif yetkilerini getir
router.get(
  '/:id/permissions',
  authorize(
    ROLES.ADMIN
  ),
  userController.getPermissions
);

// Kullanıcıya özel yetkileri güncelle
router.patch(
  '/:id/permissions',
  authorize(
    ROLES.ADMIN
  ),
  userController.updatePermissions
);

// Kullanıcı özel yetkilerini temizle
// Rol varsayılanlarına geri döner
router.delete(
  '/:id/permissions',
  authorize(
    ROLES.ADMIN
  ),
  userController.resetPermissions
);

// Hazır yetki şablonu uygula
router.post(
  '/:id/permissions/preset',
  authorize(
    ROLES.ADMIN
  ),
  userController.applyPermissionPreset
);

// ======================================================
// ROLE / STATUS
// ======================================================

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

// Profil bilgileri güncelle
router.patch(
  '/:id',
  authorize(
    ROLES.ADMIN
  ),
  userController.update
);

// Eski frontend çağrıları bozulmasın
router.put(
  '/:id',
  authorize(
    ROLES.ADMIN
  ),
  userController.update
);

// ======================================================
// DELETE
// ======================================================

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