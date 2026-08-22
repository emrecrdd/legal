import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import {
  config,
} from '../config/env.js';

// ======================================================
// JWT SECURITY CONSTANTS
// ======================================================

export const JWT_ALGORITHM =
  'HS256';

export const JWT_ISSUER =
  'derkenar-api';

export const TOKEN_TYPES = {
  ACCESS:
    'access',

  REFRESH:
    'refresh',
};

export const TOKEN_AUDIENCES = {
  ACCESS:
    'derkenar-web',

  REFRESH:
    'derkenar-refresh',
};

// ======================================================
// HELPERS
// ======================================================

const getTokenVersion = (
  user
) => {
  const value =
    Number(
      user?.token_version
    );

  if (
    Number.isInteger(
      value
    ) &&
    value >= 0
  ) {
    return value;
  }

  return 0;
};

const hasExpectedAudience = (
  audience,
  expectedAudience
) => {
  if (
    !expectedAudience
  ) {
    return true;
  }

  if (
    Array.isArray(
      audience
    )
  ) {
    return audience.includes(
      expectedAudience
    );
  }

  return (
    audience ===
    expectedAudience
  );
};

// ======================================================
// GENERATE TOKENS
// ======================================================

export const generateTokens = (
  user
) => {
  if (
    !user?.id
  ) {
    throw new Error(
      'Token oluşturmak için geçerli kullanıcı gereklidir'
    );
  }

  // ====================================================
  // BASE PAYLOAD
  // ====================================================

  /*
   * id/email/role mevcut frontend ve backend
   * uyumluluğunu korumak için şimdilik tutuluyor.
   *
   * İleride token payload küçültme aşamasında
   * email/role kaldırılabilir.
   */
  const basePayload = {
    id:
      user.id,

    email:
      user.email,

    role:
      user.role,

    tokenVersion:
      getTokenVersion(
        user
      ),
  };

  // ====================================================
  // ACCESS TOKEN
  // ====================================================

  const accessToken =
    jwt.sign(
      {
        ...basePayload,

        type:
          TOKEN_TYPES.ACCESS,
      },
      config.JWT_SECRET,
      {
        algorithm:
          JWT_ALGORITHM,

        expiresIn:
          config.JWT_EXPIRES_IN,

        jwtid:
          crypto.randomUUID(),

        /*
         * Tokenın hangi sistem tarafından
         * üretildiğini belirtir.
         */
        issuer:
          JWT_ISSUER,

        /*
         * Access token yalnızca web/API
         * erişimi için kullanılabilir.
         */
        audience:
          TOKEN_AUDIENCES.ACCESS,
      }
    );

  // ====================================================
  // REFRESH TOKEN
  // ====================================================

  const refreshToken =
    jwt.sign(
      {
        ...basePayload,

        type:
          TOKEN_TYPES.REFRESH,
      },
      config.JWT_REFRESH_SECRET,
      {
        algorithm:
          JWT_ALGORITHM,

        expiresIn:
          config.JWT_REFRESH_EXPIRES_IN,

        jwtid:
          crypto.randomUUID(),

        issuer:
          JWT_ISSUER,

        /*
         * Refresh token farklı audience taşıyor.
         *
         * Böylece access/refresh amaçları
         * kriptografik doğrulama katmanında da
         * birbirinden ayrılıyor.
         */
        audience:
          TOKEN_AUDIENCES.REFRESH,
      }
    );

  return {
    accessToken,
    refreshToken,
  };
};

// ======================================================
// VERIFY TOKEN
// ======================================================

export const verifyToken = (
  token,
  secret,
  options = {}
) => {
  if (
    !token ||
    typeof token !==
      'string'
  ) {
    throw new jwt.JsonWebTokenError(
      'Token bulunamadı'
    );
  }

  if (
    !secret ||
    typeof secret !==
      'string'
  ) {
    throw new Error(
      'JWT secret yapılandırılmamış'
    );
  }

  const {
    audience:
      expectedAudience = null,

    /*
     * Şu an geçiş modundayız.
     *
     * Eski tokenlarda iss/aud olmadığı için
     * onları deploy anında topluca düşürmüyoruz.
     *
     * Yeni tokenlarda bu claimler zorunlu şekilde
     * üretiliyor ve mevcutsa strict kontrol ediliyor.
     */
    allowLegacyClaims = true,
  } = options;

  // ====================================================
  // SIGNATURE / EXPIRATION / ALGORITHM
  // ====================================================

  const decoded =
    jwt.verify(
      token,
      secret,
      {
        algorithms: [
          JWT_ALGORITHM,
        ],
      }
    );

  // ====================================================
  // ISSUER
  // ====================================================

  if (
    decoded?.iss ===
      undefined ||
    decoded?.iss ===
      null
  ) {
    if (
      !allowLegacyClaims
    ) {
      throw new jwt.JsonWebTokenError(
        'JWT issuer bulunamadı'
      );
    }
  } else if (
    decoded.iss !==
    JWT_ISSUER
  ) {
    throw new jwt.JsonWebTokenError(
      'Geçersiz JWT issuer'
    );
  }

  // ====================================================
  // AUDIENCE
  // ====================================================

  if (
    expectedAudience
  ) {
    if (
      decoded?.aud ===
        undefined ||
      decoded?.aud ===
        null
    ) {
      if (
        !allowLegacyClaims
      ) {
        throw new jwt.JsonWebTokenError(
          'JWT audience bulunamadı'
        );
      }
    } else if (
      !hasExpectedAudience(
        decoded.aud,
        expectedAudience
      )
    ) {
      throw new jwt.JsonWebTokenError(
        'Geçersiz JWT audience'
      );
    }
  }

  return decoded;
};

// ======================================================
// DECODE TOKEN
// ======================================================

export const decodeToken = (
  token
) => {
  if (
    !token ||
    typeof token !==
      'string'
  ) {
    return null;
  }

  /*
   * DİKKAT:
   *
   * jwt.decode doğrulama YAPMAZ.
   *
   * Bu fonksiyon yalnızca görüntüleme/debug
   * amaçları için kullanılmalıdır.
   *
   * Authorization veya authentication kararlarında
   * verifyToken kullanılmalıdır.
   */
  return jwt.decode(
    token
  );
};

export default {
  generateTokens,
  verifyToken,
  decodeToken,

  JWT_ALGORITHM,
  JWT_ISSUER,

  TOKEN_TYPES,
  TOKEN_AUDIENCES,
};