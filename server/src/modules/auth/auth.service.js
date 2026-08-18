import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import {
  authRepository,
} from './auth.repository.js';

import {
  generateTokens,
  verifyToken,
} from '../../utils/jwt.js';

import {
  config,
} from '../../config/env.js';

import {
  logger,
} from '../../config/logger.js';

import {
  emailService,
} from '../../integrations/email.service.js';

// ======================================================
// CONSTANTS
// ======================================================

const MIN_PASSWORD_LENGTH = 8;

const RESET_TOKEN_EXPIRY_MS =
  60 * 60 * 1000;

// ======================================================
// HELPERS
// ======================================================

const normalizeEmail = (email) => {
  return String(
    email || ''
  )
    .trim()
    .toLowerCase();
};

const validatePassword = (
  password
) => {
  if (
    typeof password !==
      'string' ||
    password.length <
      MIN_PASSWORD_LENGTH
  ) {
    throw new Error(
      `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır`
    );
  }
};

// ======================================================
// SERVICE
// ======================================================

export const authService = {
  // ====================================================
  // LOGIN
  // ====================================================

  async login(
    email,
    password
  ) {
    const cleanEmail =
      normalizeEmail(
        email
      );

    if (
      !cleanEmail ||
      !password
    ) {
      throw new Error(
        'E-posta ve şifre gereklidir'
      );
    }

    /*
     * Güvenlik:
     * Kullanıcının bulunup bulunmadığını
     * farklı mesajlarla dışarı vermiyoruz.
     */
    const user =
      await authRepository.findByEmail(
        cleanEmail
      );

    if (
      !user ||
      !user.password
    ) {
      throw new Error(
        'E-posta veya şifre hatalı'
      );
    }

    const isPasswordValid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (
      !isPasswordValid
    ) {
      throw new Error(
        'E-posta veya şifre hatalı'
      );
    }

    // Hesap erişim kontrolü
    if (
      user.is_active !== true
    ) {
      throw new Error(
        'Hesabınız pasif durumda. Büro yöneticinizle iletişime geçin.'
      );
    }

    /*
     * email_verified konusunda şimdilik zorunluluk
     * koymuyoruz.
     *
     * Çünkü kullanıcıları admin oluşturacak.
     * İleride gerçek e-posta doğrulama akışı
     * kurulursa burada kontrol eklenebilir.
     */

    const {
      accessToken,
      refreshToken,
    } = generateTokens(
      user
    );

    /*
     * Refresh token rotation/store.
     */
    await authRepository.updateRefreshToken(
      user.id,
      refreshToken
    );

    await user.update({
      last_login:
        new Date(),
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  },

  // ====================================================
  // LOGOUT
  // ====================================================

  async logout(
    refreshToken
  ) {
    if (
      !refreshToken
    ) {
      /*
       * Logout idempotent olsun.
       * Token yok diye kullanıcının logout'u
       * hata vermesin.
       */
      return;
    }

    await authRepository.invalidateRefreshToken(
      refreshToken
    );
  },

  // ====================================================
  // REFRESH TOKEN
  // ====================================================

  async refreshToken(
    refreshToken
  ) {
    if (
      !refreshToken
    ) {
      throw new Error(
        'Refresh token gerekli'
      );
    }

    // ================================================
    // JWT VERIFY
    // ================================================

    let decoded;

    try {
      decoded =
        verifyToken(
          refreshToken,
          config.JWT_REFRESH_SECRET
        );
    } catch {
      throw new Error(
        'Geçersiz veya süresi dolmuş oturum'
      );
    }

    if (!decoded) {
      throw new Error(
        'Geçersiz veya süresi dolmuş oturum'
      );
    }

    // ================================================
    // TOKEN MUST EXIST SERVER-SIDE
    // ================================================

    const user =
      await authRepository.findByRefreshToken(
        refreshToken
      );

    if (!user) {
      throw new Error(
        'Geçersiz veya süresi dolmuş oturum'
      );
    }

    // ================================================
    // ACCOUNT STATUS
    // ================================================

    if (
      user.is_active !== true
    ) {
      /*
       * Pasife alınmış kullanıcının mevcut
       * refresh tokenını da geçersiz hale getir.
       */
      try {
        await authRepository.invalidateRefreshToken(
          refreshToken
        );
      } catch (error) {
        logger.warn(
          'Inactive user refresh-token cleanup failed:',
          error
        );
      }

      throw new Error(
        'Kullanıcı hesabı aktif değil'
      );
    }

    /*
     * JWT içerisindeki user id mevcutsa
     * DB'den bulunan kullanıcıyla uyuşmalı.
     *
     * Token payload alanının id/userId/sub
     * hangisi olduğunu jwt.js dosyasında
     * kesinleştireceğiz.
     */
    const tokenUserId =
      decoded.id ||
      decoded.userId ||
      decoded.sub;

    if (
      tokenUserId &&
      String(tokenUserId) !==
        String(user.id)
    ) {
      throw new Error(
        'Geçersiz oturum'
      );
    }

    // ================================================
    // ROTATE
    // ================================================

    const {
      accessToken,
      refreshToken:
        newRefreshToken,
    } = generateTokens(
      user
    );

    await authRepository.updateRefreshToken(
      user.id,
      newRefreshToken
    );

    return {
      accessToken,
      refreshToken:
        newRefreshToken,
    };
  },

  // ====================================================
  // PROFILE
  // ====================================================

  async getProfile(
    userId
  ) {
    if (!userId) {
      throw new Error(
        'Kullanıcı bilgisi bulunamadı'
      );
    }

    const user =
      await authRepository.findById(
        userId
      );

    if (!user) {
      throw new Error(
        'Kullanıcı bulunamadı'
      );
    }

    if (
      user.is_active !== true
    ) {
      throw new Error(
        'Kullanıcı hesabı aktif değil'
      );
    }

    return user;
  },

  // ====================================================
  // CHANGE PASSWORD
  // ====================================================

  async changePassword(
    userId,
    currentPassword,
    newPassword
  ) {
    if (
      !currentPassword
    ) {
      throw new Error(
        'Mevcut şifre gereklidir'
      );
    }

    validatePassword(
      newPassword
    );

    if (
      currentPassword ===
      newPassword
    ) {
      throw new Error(
        'Yeni şifre mevcut şifre ile aynı olamaz'
      );
    }

    const user =
      await authRepository.findByIdWithPassword(
        userId
      );

    if (!user) {
      throw new Error(
        'Kullanıcı bulunamadı'
      );
    }

    if (
      !user.password
    ) {
      throw new Error(
        'Kullanıcı şifresi bulunamadı'
      );
    }

    const isPasswordValid =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (
      !isPasswordValid
    ) {
      throw new Error(
        'Mevcut şifre yanlış'
      );
    }

    /*
     * Hash burada yapılmıyor.
     * User.beforeUpdate hook'u hashleyecek.
     */
    user.password =
      newPassword;

    await user.save();

    /*
     * Şifre değişince bütün mevcut
     * oturumları kapatıyoruz.
     */
    await authRepository.invalidateAllRefreshTokens(
      userId
    );
  },

  // ====================================================
  // FORGOT PASSWORD
  // ====================================================

  async forgotPassword(
    email
  ) {
    const cleanEmail =
      normalizeEmail(
        email
      );

    if (!cleanEmail) {
      return;
    }

    const user =
      await authRepository.findByEmail(
        cleanEmail
      );

    /*
     * ACCOUNT ENUMERATION KORUMASI
     *
     * Kullanıcı bulunmasa bile hata atmıyoruz.
     * Controller dışarıya her zaman aynı cevabı verir.
     */
    if (!user) {
      return;
    }

    if (
      user.is_active !== true
    ) {
      /*
       * Pasif hesap için de dışarı farklı
       * sonuç vermiyoruz.
       */
      return;
    }

    // ================================================
    // RESET TOKEN
    // ================================================

    const resetToken =
      crypto
        .randomBytes(32)
        .toString('hex');

    const resetExpires =
      new Date(
        Date.now() +
          RESET_TOKEN_EXPIRY_MS
      );

    await authRepository.savePasswordResetToken(
      user.id,
      resetToken,
      resetExpires
    );

    // ================================================
    // EMAIL
    // ================================================

    try {
      await emailService.sendPasswordResetEmail(
        user,
        resetToken
      );
    } catch (error) {
      logger.error(
        'Password reset email error:',
        error
      );

      /*
       * Token DB'de oluşmuş olabilir ama mail
       * gönderilemedi.
       *
       * Dışarı kullanıcı var/yok veya mail servisi
       * hakkında bilgi sızdırmıyoruz.
       */
    }

    /*
     * KRİTİK:
     * resetToken response'a DÖNMÜYOR.
     */
  },

  // ====================================================
  // RESET PASSWORD
  // ====================================================

  async resetPassword(
    token,
    newPassword
  ) {
    if (!token) {
      throw new Error(
        'Şifre sıfırlama bağlantısı geçersiz'
      );
    }

    validatePassword(
      newPassword
    );

    const user =
      await authRepository.findByPasswordResetToken(
        token
      );

    if (!user) {
      throw new Error(
        'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş'
      );
    }

    if (
      !user.password_reset_expires ||
      new Date(
        user.password_reset_expires
      ) <= new Date()
    ) {
      throw new Error(
        'Şifre sıfırlama bağlantısının süresi dolmuş'
      );
    }

    if (
      user.is_active !== true
    ) {
      throw new Error(
        'Kullanıcı hesabı aktif değil'
      );
    }

    /*
     * Model beforeUpdate hook'u şifreyi hashleyecek.
     */
    user.password =
      newPassword;

    user.password_reset_token =
      null;

    user.password_reset_expires =
      null;

    await user.save();

    /*
     * Şifre resetlenince bütün oturumları kapat.
     */
    await authRepository.invalidateAllRefreshTokens(
      user.id
    );
  },
};