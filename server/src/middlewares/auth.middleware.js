import jwt from 'jsonwebtoken';

import {
  config,
} from '../config/env.js';

import {
  User,
} from '../models/User.js';

import {
  logger,
} from '../config/logger.js';

import {
  ROLES,
  PERMISSIONS,
  isValidPermission,
} from '../constants/roles.js';

// ======================================================
// AUTHENTICATE
// ======================================================

export const authenticate = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith(
        'Bearer '
      )
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Oturum bilgisi bulunamadı',
        });
    }

    const token =
      authHeader.substring(7);

    const decoded =
      jwt.verify(
        token,
        config.JWT_SECRET
      );

    if (
      !decoded?.id
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Geçersiz oturum bilgisi',
        });
    }

    const user =
      await User.findByPk(
        decoded.id,
        {
          attributes: {
            exclude: [
              'password',
              'refresh_token',
              'email_verification_token',
              'password_reset_token',
              'password_reset_expires',
            ],
          },
        }
      );

    if (!user) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Kullanıcı bulunamadı',
        });
    }

    if (
      user.is_active !== true
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Kullanıcı hesabı aktif değil',
        });
    }

    req.user =
      user;

    return next();
  } catch (error) {
    if (
      error?.name ===
      'TokenExpiredError'
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Oturum süresi doldu',
        });
    }

    if (
      error?.name ===
      'JsonWebTokenError'
    ) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Geçersiz oturum bilgisi',
        });
    }

    logger.error(
      'Auth middleware error:',
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          'Kimlik doğrulama sırasında sunucu hatası oluştu',
      });
  }
};

// ======================================================
// ROLE AUTHORIZATION
//
// Mevcut route'lar için backward compatible.
// Örn:
// authorize(ROLES.ADMIN, ROLES.LAWYER)
// ======================================================

export const authorize = (
  ...roles
) => {
  return (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Yetkilendirme için oturum gereklidir',
        });
    }

    if (
      roles.length ===
      0
    ) {
      return next();
    }

    if (
      !roles.includes(
        req.user.role
      )
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            'Bu işlem için yetkiniz bulunmuyor',
        });
    }

    return next();
  };
};

// ======================================================
// PERMISSION OVERRIDES
//
// User.permissions örneği:
//
// {
//   "delete_documents": true,
//   "edit_payments": false
// }
//
// true  = rol izninden bağımsız olarak aç
// false = rol izni olsa bile kapat
// ======================================================

const getPermissionOverrides = (
  user
) => {
  const value =
    user?.permissions;

  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value
    )
  ) {
    return {};
  }

  return value;
};

// ======================================================
// HAS PERMISSION
// ======================================================

export const hasPermission = (
  user,
  permission
) => {
  if (
    !user ||
    !permission
  ) {
    return false;
  }

  // ====================================================
  // ADMIN
  //
  // Admin custom override ile kilitlenmesin.
  // Sistem yöneticisi her zaman tam erişime sahip.
  // ====================================================

  if (
    user.role ===
    ROLES.ADMIN
  ) {
    return true;
  }

  // Bilinmeyen permission key kullanılıyorsa
  // fail-closed davran.
  if (
    !isValidPermission(
      permission
    )
  ) {
    logger.warn(
      `Unknown permission requested: ${permission}`
    );

    return false;
  }

  const rolePermissions =
    PERMISSIONS[
      user.role
    ] || [];

  const overrides =
    getPermissionOverrides(
      user
    );

  // ====================================================
  // USER OVERRIDE
  //
  // Kullanıcıya açıkça true veya false atanmışsa
  // rol varsayılanından önce uygulanır.
  // ====================================================

  if (
    Object.prototype.hasOwnProperty.call(
      overrides,
      permission
    )
  ) {
    return (
      overrides[
        permission
      ] === true
    );
  }

  // ====================================================
  // ROLE DEFAULT
  // ====================================================

  return (
    rolePermissions.includes(
      'all'
    ) ||
    rolePermissions.includes(
      permission
    )
  );
};

// ======================================================
// HAS ANY PERMISSION
// ======================================================

export const hasAnyPermission = (
  user,
  permissions = []
) => {
  if (
    !Array.isArray(
      permissions
    ) ||
    permissions.length ===
      0
  ) {
    return false;
  }

  return permissions.some(
    (permission) =>
      hasPermission(
        user,
        permission
      )
  );
};

// ======================================================
// HAS ALL PERMISSIONS
// ======================================================

export const hasAllPermissions = (
  user,
  permissions = []
) => {
  if (
    !Array.isArray(
      permissions
    ) ||
    permissions.length ===
      0
  ) {
    return false;
  }

  return permissions.every(
    (permission) =>
      hasPermission(
        user,
        permission
      )
  );
};

// ======================================================
// AUTHORIZE PERMISSION
//
// Varsayılan:
// tüm verilen izinler gerekli.
//
// authorizePermission(
//   'edit_cases',
//   'manage_case_parties'
// )
//
// ======================================================

export const authorizePermission = (
  ...permissions
) => {
  return (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Yetkilendirme için oturum gereklidir',
        });
    }

    if (
      permissions.length ===
      0
    ) {
      return next();
    }

    const allowed =
      hasAllPermissions(
        req.user,
        permissions
      );

    if (!allowed) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            'Bu işlem için gerekli yetkiye sahip değilsiniz',
        });
    }

    return next();
  };
};

// ======================================================
// AUTHORIZE ANY PERMISSION
//
// En az bir izin yeterli.
//
// authorizeAnyPermission(
//   'edit_documents',
//   'delete_documents'
// )
//
// ======================================================

export const authorizeAnyPermission = (
  ...permissions
) => {
  return (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            'Yetkilendirme için oturum gereklidir',
        });
    }

    if (
      permissions.length ===
      0
    ) {
      return next();
    }

    const allowed =
      hasAnyPermission(
        req.user,
        permissions
      );

    if (!allowed) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            'Bu işlem için gerekli yetkiye sahip değilsiniz',
        });
    }

    return next();
  };
};