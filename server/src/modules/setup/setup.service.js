import crypto from 'crypto';

import {
  SetupInvite,
} from '../../models/SetupInvite.js';

import {
  ROLES,
} from '../../constants/roles.js';

import {
  emailService,
} from '../../integrations/email.service.js';

import {
  logger,
} from '../../config/logger.js';

import {
  setupRepository,
} from './setup.repository.js';

const EMAIL_VERIFICATION_EXPIRY_MS =
  60 * 60 * 1000;

const publicUser = (
  user
) => ({
  id:
    user.id,
  first_name:
    user.first_name,
  last_name:
    user.last_name,
  email:
    user.email,
  role:
    user.role,
  email_verified:
    user.email_verified,
});

const assertInviteUsable = (
  invite
) => {
  if (
    !invite
  ) {
    const error =
      new Error(
        'Kurulum bağlantısı geçersiz'
      );
    error.statusCode =
      404;
    throw error;
  }

  if (
    invite.used_at
  ) {
    const error =
      new Error(
        'Bu kurulum bağlantısı daha önce kullanılmış'
      );
    error.statusCode =
      410;
    throw error;
  }

  if (
    !invite.expires_at ||
    new Date(
      invite.expires_at
    ) <=
      new Date()
  ) {
    const error =
      new Error(
        'Kurulum bağlantısının süresi dolmuş'
      );
    error.statusCode =
      410;
    throw error;
  }
};

const createVerificationToken = () => {
  const rawToken =
    crypto
      .randomBytes(
        32
      )
      .toString(
        'hex'
      );

  return {
    rawToken,

    tokenHash:
      setupRepository.hashToken(
        rawToken
      ),

    expiresAt:
      new Date(
        Date.now() +
          EMAIL_VERIFICATION_EXPIRY_MS
      ),
  };
};

export const setupService = {
  async inspectInvite(
    rawToken
  ) {
    const invite =
      await setupRepository.findInviteByRawToken(
        rawToken
      );

    assertInviteUsable(
      invite
    );

    return {
      valid:
        true,
      expires_at:
        invite.expires_at,
    };
  },

  async claimInvite(
    rawToken,
    payload
  ) {
    const sequelize =
      SetupInvite.sequelize;

    const {
      rawToken:
        verificationToken,
      tokenHash,
      expiresAt,
    } =
      createVerificationToken();

    const result =
      await sequelize.transaction(
        async (
          transaction
        ) => {
          const invite =
            await setupRepository.findInviteByRawToken(
              rawToken,
              {
                transaction,
                lock:
                  transaction.LOCK.UPDATE,
              }
            );

          assertInviteUsable(
            invite
          );

          const existingUser =
            await setupRepository.findUserByEmail(
              payload.email,
              {
                transaction,
              }
            );

          if (
            existingUser
          ) {
            const error =
              new Error(
                'Bu e-posta adresi zaten kullanımda'
              );
            error.statusCode =
              409;
            throw error;
          }

          const user =
            await setupRepository.createUser(
              {
                first_name:
                  String(
                    payload.first_name ||
                      ''
                  ).trim(),

                last_name:
                  String(
                    payload.last_name ||
                      ''
                  ).trim(),

                email:
                  payload.email,

                password:
                  payload.password,

                role:
                  ROLES.ADMIN,

                permissions:
                  {},

                is_active:
                  true,

                email_verified:
                  false,

                email_verification_token:
                  tokenHash,

                email_verification_expires:
                  expiresAt,
              },
              {
                transaction,
              }
            );

          invite.used_at =
            new Date();

          invite.claimed_by_user_id =
            user.id;

          await invite.save({
            transaction,
          });

          return {
            user:
              publicUser(
                user
              ),
          };
        }
      );

    try {
      await emailService.sendWelcomeEmail(
        result.user,
        verificationToken
      );
    } catch (
      error
    ) {
      logger.error(
        'Initial setup verification email send failed',
        {
          userId:
            result.user.id,
          message:
            error?.message,
        }
      );

      const mailError =
        new Error(
          'Hesabınız oluşturuldu ancak doğrulama e-postası gönderilemedi. Doğrulama e-postasını yeniden isteyin.'
        );

      mailError.statusCode =
        502;

      mailError.code =
        'VERIFICATION_EMAIL_SEND_FAILED';

      mailError.userCreated =
        true;

      mailError.email =
        result.user.email;

      throw mailError;
    }

    return {
      ...result,

      verification_required:
        true,
    };
  },

  async verifyEmail(
    rawToken
  ) {
    const user =
      await setupRepository.findByVerificationToken(
        rawToken
      );

    if (
      !user
    ) {
      const error =
        new Error(
          'E-posta doğrulama bağlantısı geçersiz veya süresi dolmuş'
        );

      error.statusCode =
        400;

      throw error;
    }

    user.email_verified =
      true;

    user.email_verification_token =
      null;

    user.email_verification_expires =
      null;

    await user.save();

    return {
      verified:
        true,

      user:
        publicUser(
          user
        ),
    };
  },

  async resendVerification(
    email
  ) {
    const genericResult = {
      accepted:
        true,
    };

    const user =
      await setupRepository.findUserByEmail(
        email
      );

    /*
     * Enumeration-safe:
     * kullanıcı yoksa veya zaten doğrulanmışsa
     * aynı response döner.
     */
    if (
      !user ||
      user.email_verified ===
        true
    ) {
      return genericResult;
    }

    const {
      rawToken,
      tokenHash,
      expiresAt,
    } =
      createVerificationToken();

    user.email_verification_token =
      tokenHash;

    user.email_verification_expires =
      expiresAt;

    await user.save();

    try {
      await emailService.sendWelcomeEmail(
        user,
        rawToken
      );
    } catch (
      error
    ) {
      /*
       * Kullanıcıya teknik mail servis detayını açmıyoruz.
       * Yeni token DB'de kalabilir; kullanıcı tekrar resend
       * yaptığında üstüne yeni token yazılır.
       */
      logger.error(
        'Verification resend failed',
        {
          userId:
            user.id,
          message:
            error?.message,
        }
      );
    }

    return genericResult;
  },
};

export default setupService;
