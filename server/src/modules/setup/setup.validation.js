import {
  body,
  param,
  query,
} from 'express-validator';

const tokenParam = () =>
  param('token')
    .isString()
    .isLength({
      min: 64,
      max: 128,
    })
    .withMessage(
      'Kurulum bağlantısı geçersiz'
    );

export const setupValidation = {
  inspect: [
    tokenParam(),
  ],

  claim: [
    tokenParam(),

    body('first_name')
      .trim()
      .notEmpty()
      .withMessage(
        'Ad gereklidir'
      )
      .isLength({
        max: 100,
      })
      .withMessage(
        'Ad en fazla 100 karakter olabilir'
      ),

    body('last_name')
      .trim()
      .notEmpty()
      .withMessage(
        'Soyad gereklidir'
      )
      .isLength({
        max: 100,
      })
      .withMessage(
        'Soyad en fazla 100 karakter olabilir'
      ),

    body('email')
      .trim()
      .isEmail()
      .withMessage(
        'Geçerli bir e-posta adresi giriniz'
      )
      .normalizeEmail({
        gmail_remove_dots:
          false,
      }),

    body('password')
      .isString()
      .isLength({
        min: 12,
        max: 128,
      })
      .withMessage(
        'Şifre en az 12 karakter olmalıdır'
      ),
  ],

  verifyEmail: [
    query('token')
      .isString()
      .isLength({
        min: 64,
        max: 128,
      })
      .withMessage(
        'E-posta doğrulama bağlantısı geçersiz'
      ),
  ],

  resendVerification: [
    body('email')
      .trim()
      .isEmail()
      .withMessage(
        'Geçerli bir e-posta adresi giriniz'
      )
      .normalizeEmail({
        gmail_remove_dots:
          false,
      }),
  ],
};

export default setupValidation;
