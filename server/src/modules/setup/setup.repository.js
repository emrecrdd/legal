import crypto from 'crypto';

import {
  Op,
} from 'sequelize';

import {
  SetupInvite,
} from '../../models/SetupInvite.js';

import {
  User,
} from '../../models/User.js';

const normalizeEmail = (
  value
) =>
  String(
    value || ''
  )
    .trim()
    .toLowerCase();

const hashToken = (
  rawToken
) =>
  crypto
    .createHash(
      'sha256'
    )
    .update(
      String(
        rawToken || ''
      ),
      'utf8'
    )
    .digest(
      'hex'
    );

export const setupRepository = {
  hashToken,

  findInviteByRawToken(
    rawToken,
    options = {}
  ) {
    return SetupInvite.findOne({
      where: {
        token_hash:
          hashToken(
            rawToken
          ),
      },
      ...options,
    });
  },

  findUserByEmail(
    email,
    options = {}
  ) {
    return User.findOne({
      where: {
        email:
          normalizeEmail(
            email
          ),
      },
      ...options,
    });
  },

  createUser(
    data,
    options = {}
  ) {
    return User.create(
      {
        ...data,
        email:
          normalizeEmail(
            data.email
          ),
      },
      options
    );
  },

  findByVerificationToken(
    rawToken
  ) {
    return User.findOne({
      where: {
        email_verification_token:
          hashToken(
            rawToken
          ),

        email_verified:
          false,

        email_verification_expires: {
          [Op.gt]:
            new Date(),
        },
      },
    });
  },
};

export default setupRepository;
