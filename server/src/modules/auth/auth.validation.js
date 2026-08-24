import {
  body,
} from 'express-validator';

// ======================================================
// PASSWORD VALIDATION
// ======================================================

const passwordValidation = (
  field,
  label = 'Şifre'
) =>
  body(field)
    .isString()
    .withMessage(
      `${label} geçerli olmalıdır`
    )
    .isLength({
      min: 12,
      max: 128,
    })
    .withMessage(
      `${label} en az 12 karakter olmalıdır`
    )
    .custom(
      (
        value
      ) => {
        if (
          String(
            value
          ).trim().length ===
          0
        ) {
          throw new Error(
            `${label} yalnızca boşluk karakterlerinden oluşamaz`
          );
        }

        return true;
      }
    );

// ======================================================
// VALIDATIONS
// ======================================================

export const authValidation = {
  // ====================================================
  // REGISTER
  // ====================================================

  register: [
    body('email')
      .trim()
      .isEmail()
      .withMessage(
        'Geçerli bir e-posta adresi giriniz'
      )
      .normalizeEmail(),

    passwordValidation(
      'password',
      'Şifre'
    ),

    body('first_name')
      .trim()
      .notEmpty()
      .withMessage(
        'Ad gereklidir'
      )
      .isLength({
        min: 2,
        max: 100,
      })
      .withMessage(
        'Ad 2 ile 100 karakter arasında olmalıdır'
      ),

    body('last_name')
      .trim()
      .notEmpty()
      .withMessage(
        'Soyad gereklidir'
      )
      .isLength({
        min: 2,
        max: 100,
      })
      .withMessage(
        'Soyad 2 ile 100 karakter arasında olmalıdır'
      ),

    body('role')
      .optional()
      .isIn([
        'admin',
        'lawyer',
        'intern',
        'secretary',
      ])
      .withMessage(
        'Geçersiz kullanıcı rolü'
      ),
  ],

  // ====================================================
  // LOGIN
  // ====================================================

  login: [
    body('email')
      .trim()
      .isEmail()
      .withMessage(
        'Geçerli bir e-posta adresi giriniz'
      )
      .normalizeEmail(),

    body('password')
      .isString()
      .notEmpty()
      .withMessage(
        'Şifre gereklidir'
      ),
  ],

  // ====================================================
  // CHANGE PASSWORD
  // ====================================================

  changePassword: [
    body('currentPassword')
      .isString()
      .notEmpty()
      .withMessage(
        'Mevcut şifre gereklidir'
      ),

    passwordValidation(
      'newPassword',
      'Yeni şifre'
    ),

    body('newPassword')
      .custom(
        (
          value,
          {
            req,
          }
        ) => {
          if (
            value ===
            req.body.currentPassword
          ) {
            throw new Error(
              'Yeni şifre mevcut şifrenizle aynı olamaz'
            );
          }

          return true;
        }
      ),
  ],

  // ====================================================
  // FORGOT PASSWORD
  // ====================================================

  forgotPassword: [
    body('email')
      .trim()
      .isEmail()
      .withMessage(
        'Geçerli bir e-posta adresi giriniz'
      )
      .normalizeEmail(),
  ],

  // ====================================================
  // RESET PASSWORD
  // ====================================================

  resetPassword: [
    body('token')
      .isString()
      .notEmpty()
      .withMessage(
        'Şifre sıfırlama anahtarı gereklidir'
      ),

    passwordValidation(
      'password',
      'Yeni şifre'
    ),
  ],
};