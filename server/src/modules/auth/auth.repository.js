import {
  User,
} from '../../models/User.js';

// ======================================================
// SAFE ATTRIBUTES
// ======================================================

const SAFE_USER_EXCLUDES = [
  'password',
  'refresh_token',
  'email_verification_token',
  'password_reset_token',
  'password_reset_expires',
];

// ======================================================
// HELPERS
// ======================================================

const normalizeEmail = (
  email
) => {
  return String(
    email || ''
  )
    .trim()
    .toLowerCase();
};

// ======================================================
// REPOSITORY
// ======================================================

export const authRepository = {
  // ====================================================
  // FIND BY EMAIL
  //
  // Login için password alanı gerekli olduğu için
  // burada exclude kullanmıyoruz.
  // ====================================================

  findByEmail: (
    email
  ) => {
    const normalizedEmail =
      normalizeEmail(
        email
      );

    return User.findOne({
      where: {
        email:
          normalizedEmail,
      },
    });
  },

  // ====================================================
  // PROFILE / SAFE USER
  // ====================================================

  findById: (
    id
  ) => {
    return User.findByPk(
      id,
      {
        attributes: {
          exclude:
            SAFE_USER_EXCLUDES,
        },
      }
    );
  },

  // ====================================================
  // USER WITH PASSWORD
  //
  // Şifre değişikliği için kullanılır.
  // ====================================================

  findByIdWithPassword: (
    id
  ) => {
    return User.findByPk(
      id
    );
  },

  // ====================================================
  // CREATE
  //
  // Password hash işlemini User model hook'u yapıyor.
  // ====================================================

  create: (
    userData
  ) => {
    return User.create(
      userData
    );
  },

  // ====================================================
  // REFRESH TOKEN
  // ====================================================

  updateRefreshToken: (
    userId,
    refreshToken
  ) => {
    return User.update(
      {
        refresh_token:
          refreshToken,
      },
      {
        where: {
          id:
            userId,
        },
      }
    );
  },

  findByRefreshToken: (
    refreshToken
  ) => {
    if (
      !refreshToken
    ) {
      return null;
    }

    return User.findOne({
      where: {
        refresh_token:
          refreshToken,
      },
    });
  },

  invalidateRefreshToken: (
    refreshToken
  ) => {
    if (
      !refreshToken
    ) {
      return null;
    }

    return User.update(
      {
        refresh_token:
          null,
      },
      {
        where: {
          refresh_token:
            refreshToken,
        },
      }
    );
  },

  invalidateAllRefreshTokens: (
    userId
  ) => {
    return User.update(
      {
        refresh_token:
          null,
      },
      {
        where: {
          id:
            userId,
        },
      }
    );
  },

  // ====================================================
  // PASSWORD RESET
  // ====================================================

  savePasswordResetToken: (
    userId,
    token,
    expires
  ) => {
    return User.update(
      {
        password_reset_token:
          token,

        password_reset_expires:
          expires,
      },
      {
        where: {
          id:
            userId,
        },
      }
    );
  },

  findByPasswordResetToken: (
    token
  ) => {
    if (!token) {
      return null;
    }

    return User.findOne({
      where: {
        password_reset_token:
          token,
      },
    });
  },

  // ====================================================
  // CLEAR PASSWORD RESET TOKEN
  //
  // Reset başarısızlığı veya güvenlik işlemlerinde
  // ayrıca kullanılabilir.
  // ====================================================

  clearPasswordResetToken: (
    userId
  ) => {
    return User.update(
      {
        password_reset_token:
          null,

        password_reset_expires:
          null,
      },
      {
        where: {
          id:
            userId,
        },
      }
    );
  },
};

export default authRepository;