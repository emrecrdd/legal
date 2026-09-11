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
  // REGISTER - TUMAG SELF REGISTRATION
  // ====================================================

  register: [
    body('first_name')
      .trim()
      .isString()
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
      .isString()
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
        gmail_remove_dots: false,
      }),

    passwordValidation(
      'password',
      'Şifre'
    ),

    body('bar_association')
      .trim()
      .isString()
      .notEmpty()
      .withMessage(
        'Baro bilgisi gereklidir'
      )
      .isLength({
        max: 150,
      })
      .withMessage(
        'Baro bilgisi en fazla 150 karakter olabilir'
      ),

    body('bar_registration_number')
      .trim()
      .isString()
      .notEmpty()
      .withMessage(
        'Baro sicil numarası gereklidir'
      )
      .isLength({
        max: 50,
      })
      .withMessage(
        'Baro sicil numarası en fazla 50 karakter olabilir'
      ),
  ],

  // ====================================================
  // VERIFY EMAIL
  // ====================================================

  verifyEmail: [
    body('token')
      .isString()
      .notEmpty()
      .withMessage(
        'E-posta doğrulama anahtarı gereklidir'
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
      .normalizeEmail({
        gmail_remove_dots: false,
      }),

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
      .normalizeEmail({
        gmail_remove_dots: false,
      }),
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
