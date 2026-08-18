import {
  authService,
} from './auth.service.js';

import {
  authRepository,
} from './auth.repository.js';

import {
  successResponse,
  errorResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

// ======================================================
// COOKIE CONFIG
// ======================================================

const getRefreshCookieOptions = () => ({
  httpOnly: true,

  secure:
    process.env.NODE_ENV ===
    'production',

  sameSite:
    process.env.NODE_ENV ===
    'production'
      ? 'none'
      : 'lax',

  maxAge:
    30 *
    24 *
    60 *
    60 *
    1000,

  path: '/',
});

// ======================================================
// CONTROLLER
// ======================================================

export const authController = {
  // ====================================================
  // LOGIN
  // ====================================================

  async login(req, res) {
    try {
      const {
        email,
        password,
      } = req.body;

      if (
        !email ||
        !password
      ) {
        return errorResponse(
          res,
          'E-posta ve şifre gereklidir',
          400
        );
      }

      const result =
        await authService.login(
          email,
          password
        );

      res.cookie(
        'refreshToken',
        result.refreshToken,
        getRefreshCookieOptions()
      );

      /*
       * İleride refresh tokenı tamamen HttpOnly cookie'ye
       * taşıdığımızda response body'den kaldırabiliriz.
       */
      return successResponse(
        res,
        result,
        'Giriş başarılı'
      );
    } catch (error) {
      logger.error(
        'Login error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Giriş yapılamadı',
        401
      );
    }
  },

  // ====================================================
  // LOGOUT
  // ====================================================

  async logout(req, res) {
    try {
      const refreshToken =
        req.cookies
          ?.refreshToken ||
        req.body
          ?.refreshToken;

      if (refreshToken) {
        await authService.logout(
          refreshToken
        );
      }

      res.clearCookie(
        'refreshToken',
        {
          ...getRefreshCookieOptions(),
          maxAge: undefined,
        }
      );

      return successResponse(
        res,
        null,
        'Çıkış başarılı'
      );
    } catch (error) {
      logger.error(
        'Logout error:',
        error
      );

      /*
       * Backend token temizliği başarısız olsa bile
       * browser cookie'sini temizlemeye çalış.
       */
      res.clearCookie(
        'refreshToken',
        {
          ...getRefreshCookieOptions(),
          maxAge: undefined,
        }
      );

      return errorResponse(
        res,
        'Çıkış işlemi tamamlanamadı',
        400
      );
    }
  },

  // ====================================================
  // REFRESH TOKEN
  // ====================================================

  async refreshToken(
    req,
    res
  ) {
    try {
      const refreshToken =
        req.cookies
          ?.refreshToken ||
        req.body
          ?.refreshToken;

      if (!refreshToken) {
        return errorResponse(
          res,
          'Refresh token bulunamadı',
          401
        );
      }

      const result =
        await authService.refreshToken(
          refreshToken
        );

      res.cookie(
        'refreshToken',
        result.refreshToken,
        getRefreshCookieOptions()
      );

      return successResponse(
        res,
        result,
        'Oturum yenilendi'
      );
    } catch (error) {
      logger.error(
        'Refresh token error:',
        error
      );

      res.clearCookie(
        'refreshToken',
        {
          ...getRefreshCookieOptions(),
          maxAge: undefined,
        }
      );

      return errorResponse(
        res,
        error.message ||
          'Oturum yenilenemedi',
        401
      );
    }
  },

  // ====================================================
  // PROFILE
  // ====================================================

  async getProfile(
    req,
    res
  ) {
    try {
      const user =
        await authService.getProfile(
          req.user.id
        );

      return successResponse(
        res,
        user,
        'Profil getirildi'
      );
    } catch (error) {
      logger.error(
        'Get profile error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Profil getirilemedi',
        400
      );
    }
  },

  // ====================================================
  // UPDATE PROFILE
  // ====================================================

  async updateProfile(
    req,
    res
  ) {
    try {
      const userId =
        req.user.id;

      const {
        first_name,
        last_name,
        phone,
        title,
        bio,
      } = req.body;

      const user =
        await authRepository.findById(
          userId
        );

      if (!user) {
        return errorResponse(
          res,
          'Kullanıcı bulunamadı',
          404
        );
      }

      const updateData = {};

      if (
        first_name !==
        undefined
      ) {
        const value =
          String(
            first_name
          ).trim();

        if (!value) {
          return errorResponse(
            res,
            'Ad boş olamaz',
            400
          );
        }

        updateData.first_name =
          value;
      }

      if (
        last_name !==
        undefined
      ) {
        const value =
          String(
            last_name
          ).trim();

        if (!value) {
          return errorResponse(
            res,
            'Soyad boş olamaz',
            400
          );
        }

        updateData.last_name =
          value;
      }

      if (
        phone !==
        undefined
      ) {
        updateData.phone =
          phone?.trim() ||
          null;
      }

      if (
        title !==
        undefined
      ) {
        updateData.title =
          title?.trim() ||
          null;
      }

      if (
        bio !==
        undefined
      ) {
        updateData.bio =
          bio?.trim() ||
          null;
      }

      await user.update(
        updateData
      );

      const updatedUser =
        await authRepository.findById(
          userId
        );

      return successResponse(
        res,
        updatedUser,
        'Profil başarıyla güncellendi'
      );
    } catch (error) {
      logger.error(
        'Update profile error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Profil güncellenemedi',
        400
      );
    }
  },

  // ====================================================
  // CHANGE PASSWORD
  // ====================================================

  async changePassword(
    req,
    res
  ) {
    try {
      const {
        currentPassword,
        newPassword,
      } = req.body;

      if (
        !currentPassword ||
        !newPassword
      ) {
        return errorResponse(
          res,
          'Mevcut ve yeni şifre gereklidir',
          400
        );
      }

      if (
        newPassword.length <
        8
      ) {
        return errorResponse(
          res,
          'Yeni şifre en az 8 karakter olmalıdır',
          400
        );
      }

      await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      return successResponse(
        res,
        null,
        'Şifre başarıyla değiştirildi'
      );
    } catch (error) {
      logger.error(
        'Change password error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Şifre değiştirilemedi',
        400
      );
    }
  },

  // ====================================================
  // FORGOT PASSWORD
  // ====================================================

  async forgotPassword(
    req,
    res
  ) {
    try {
      const {
        email,
      } = req.body;

      if (!email) {
        return errorResponse(
          res,
          'E-posta adresi gereklidir',
          400
        );
      }

      await authService.forgotPassword(
        email
      );

      /*
       * Hesap enumeration önlemek için
       * kullanıcı var/yok bilgisini dışarı vermiyoruz.
       */
      return successResponse(
        res,
        null,
        'Eğer bu e-posta adresine bağlı bir hesap varsa şifre sıfırlama talimatları gönderilecektir.'
      );
    } catch (error) {
      logger.error(
        'Forgot password error:',
        error
      );

      /*
       * Güvenlik açısından yine genel mesaj.
       */
      return successResponse(
        res,
        null,
        'Eğer bu e-posta adresine bağlı bir hesap varsa şifre sıfırlama talimatları gönderilecektir.'
      );
    }
  },

  // ====================================================
  // RESET PASSWORD
  // ====================================================

  async resetPassword(
    req,
    res
  ) {
    try {
      const {
        token,
        password,
      } = req.body;

      if (
        !token ||
        !password
      ) {
        return errorResponse(
          res,
          'Token ve yeni şifre gereklidir',
          400
        );
      }

      if (
        password.length <
        8
      ) {
        return errorResponse(
          res,
          'Şifre en az 8 karakter olmalıdır',
          400
        );
      }

      await authService.resetPassword(
        token,
        password
      );

      return successResponse(
        res,
        null,
        'Şifre başarıyla sıfırlandı'
      );
    } catch (error) {
      logger.error(
        'Reset password error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Şifre sıfırlanamadı',
        400
      );
    }
  },
};