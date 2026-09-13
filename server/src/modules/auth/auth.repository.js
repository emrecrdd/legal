import crypto from 'crypto';

import {
  Op,
} from 'sequelize';

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
  'email_verification_expires',
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
// TOKEN HASH
// ======================================================

const hashToken = (
  token
) => {
  if (
    !token
  ) {
    return null;
  }

  return crypto
    .createHash(
      'sha256'
    )
    .update(
      String(
        token
      ),
      'utf8'
    )
    .digest(
      'hex'
    );
};

/*
 * GEÇİŞ UYUMLULUĞU
 *
 * Eski sistem tokenları DB'ye plaintext olarak
 * yazıyordu.
 *
 * Yeni sistem yalnızca SHA-256 hash saklıyor.
 *
 * Lookup sırasında hem:
 *
 * - eski plaintext değer
 * - yeni hashed değer
 *
 * aranır.
 */
const getTokenCandidates = (
  token
) => {
  if (
    !token
  ) {
    return [];
  }

  const rawToken =
    String(
      token
    );

  const hashedToken =
    hashToken(
      rawToken
    );

  return [
    rawToken,
    hashedToken,
  ];
};

// ======================================================
// REPOSITORY
// ======================================================

export const authRepository = {
  // ====================================================
  // FIND BY EMAIL
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
  // ====================================================

  create: (
    userData
  ) => {
    return User.create(
      userData
    );
  },

  // ====================================================
  // EMAIL VERIFICATION TOKEN
  // ====================================================

  saveEmailVerificationToken: (
    userId,
    token,
    expires = null
  ) => {
    const tokenHash =
      token
        ? hashToken(
            token
          )
        : null;

    return User.update(
      {
        email_verification_token:
          tokenHash,

        email_verification_expires:
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

  // ====================================================
  // FIND BY EMAIL VERIFICATION TOKEN
  // ====================================================

  findByEmailVerificationToken: (
    token
  ) => {
    if (
      !token
    ) {
      return null;
    }

    const candidates =
      getTokenCandidates(
        token
      );

    return User.findOne({
      where: {
        email_verification_token: {
          [Op.in]:
            candidates,
        },

        [Op.or]: [
          {
            email_verification_expires:
              null,
          },
          {
            email_verification_expires: {
              [Op.gt]:
                new Date(),
            },
          },
        ],
      },
    });
  },

  // ====================================================
  // MARK EMAIL VERIFIED
  // ====================================================

  markEmailVerified: (
    userId
  ) => {
    return User.update(
      {
        email_verified:
          true,

        email_verification_token:
          null,

        email_verification_expires:
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
  // CLEAR EMAIL VERIFICATION TOKEN
  // ====================================================

  clearEmailVerificationToken: (
    userId
  ) => {
    return User.update(
      {
        email_verification_token:
          null,

        email_verification_expires:
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
  // REFRESH TOKEN
  // ====================================================

  updateRefreshToken: (
    userId,
    refreshToken
  ) => {
    const refreshTokenHash =
      refreshToken
        ? hashToken(
            refreshToken
          )
        : null;

    return User.update(
      {
        refresh_token:
          refreshTokenHash,
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
  // FIND BY REFRESH TOKEN
  // ====================================================

  findByRefreshToken: (
    refreshToken
  ) => {
    if (
      !refreshToken
    ) {
      return null;
    }

    const candidates =
      getTokenCandidates(
        refreshToken
      );

    return User.findOne({
      where: {
        refresh_token: {
          [Op.in]:
            candidates,
        },
      },
    });
  },

  // ====================================================
  // INVALIDATE REFRESH TOKEN
  // ====================================================

  invalidateRefreshToken: (
    refreshToken
  ) => {
    if (
      !refreshToken
    ) {
      return null;
    }

    const candidates =
      getTokenCandidates(
        refreshToken
      );

    return User.update(
      {
        refresh_token:
          null,
      },
      {
        where: {
          refresh_token: {
            [Op.in]:
              candidates,
          },
        },
      }
    );
  },

  // ====================================================
  // INVALIDATE ALL REFRESH TOKENS
  // ====================================================

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
  // ATOMIC REFRESH TOKEN ROTATION
  // ====================================================

  rotateRefreshToken: async (
    userId,
    currentRefreshToken,
    newRefreshToken
  ) => {
    if (
      !userId ||
      !currentRefreshToken ||
      !newRefreshToken
    ) {
      return false;
    }

    const currentCandidates =
      getTokenCandidates(
        currentRefreshToken
      );

    const newRefreshTokenHash =
      hashToken(
        newRefreshToken
      );

    const [
      affectedRows,
    ] =
      await User.update(
        {
          refresh_token:
            newRefreshTokenHash,
        },
        {
          where: {
            id:
              userId,

            refresh_token: {
              [Op.in]:
                currentCandidates,
            },
          },
        }
      );

    return (
      affectedRows ===
      1
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
    const tokenHash =
      token
        ? hashToken(
            token
          )
        : null;

    return User.update(
      {
        password_reset_token:
          tokenHash,

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

  // ====================================================
  // FIND BY PASSWORD RESET TOKEN
  // ====================================================

  findByPasswordResetToken: (
    token
  ) => {
    if (
      !token
    ) {
      return null;
    }

    const candidates =
      getTokenCandidates(
        token
      );

    return User.findOne({
      where: {
        password_reset_token: {
          [Op.in]:
            candidates,
        },
      },
    });
  },

  // ====================================================
  // CLEAR PASSWORD RESET TOKEN
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
