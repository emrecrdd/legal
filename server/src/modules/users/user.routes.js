import express from 'express';

import {
  userController,
} from './user.controller.js';

import {
  authenticate,
  authorizePermission,
} from '../../middlewares/auth.middleware.js';

import {
  PERMISSION_KEYS,
} from '../../constants/roles.js';

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorizePermission(PERMISSION_KEYS.VIEW_USERS),
  userController.findAll
);

// Yönetici kullanıcıyı doğrudan aktive etmez; davet gönderir.
router.post(
  '/',
  authorizePermission(PERMISSION_KEYS.CREATE_USERS),
  userController.create
);

router.get(
  '/:id/permissions',
  authorizePermission(PERMISSION_KEYS.MANAGE_PERMISSIONS),
  userController.getPermissions
);

router.patch(
  '/:id/permissions',
  authorizePermission(PERMISSION_KEYS.MANAGE_PERMISSIONS),
  userController.updatePermissions
);

router.delete(
  '/:id/permissions',
  authorizePermission(PERMISSION_KEYS.MANAGE_PERMISSIONS),
  userController.resetPermissions
);

router.post(
  '/:id/permissions/preset',
  authorizePermission(PERMISSION_KEYS.MANAGE_PERMISSIONS),
  userController.applyPermissionPreset
);

router.patch(
  '/:id/role',
  authorizePermission(PERMISSION_KEYS.CHANGE_USER_ROLES),
  userController.changeRole
);

router.patch(
  '/:id/toggle-active',
  authorizePermission(PERMISSION_KEYS.MANAGE_USER_STATUS),
  userController.toggleActive
);

router.get(
  '/:id',
  authorizePermission(PERMISSION_KEYS.VIEW_USERS),
  userController.findOne
);

router.patch(
  '/:id',
  authorizePermission(PERMISSION_KEYS.EDIT_USERS),
  userController.update
);

router.put(
  '/:id',
  authorizePermission(PERMISSION_KEYS.EDIT_USERS),
  userController.update
);

router.delete(
  '/:id',
  authorizePermission(PERMISSION_KEYS.DELETE_USERS),
  userController.delete
);

export {
  router as userRoutes,
};

export default router;
