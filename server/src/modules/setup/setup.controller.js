import {
  setupService,
} from './setup.service.js';

const sendError = (
  res,
  error
) => {
  const status =
    Number.isInteger(
      Number(
        error?.statusCode
      )
    )
      ? Number(
          error.statusCode
        )
      : 400;

  return res
    .status(
      status
    )
    .json({
      success:
        false,

      message:
        error?.message ||
        'İşlem tamamlanamadı',

      ...(error?.code
        ? {
            code:
              error.code,
          }
        : {}),

      ...(error?.userCreated
        ? {
            data: {
              user_created:
                true,

              email:
                error.email ||
                null,
            },
          }
        : {}),
    });
};

export const setupController = {
  async inspect(
    req,
    res
  ) {
    try {
      const data =
        await setupService.inspectInvite(
          req.params.token
        );

      res.set(
        'Cache-Control',
        'no-store'
      );

      return res
        .status(
          200
        )
        .json({
          success:
            true,
          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  },

  async claim(
    req,
    res
  ) {
    try {
      const data =
        await setupService.claimInvite(
          req.params.token,
          req.body
        );

      res.set(
        'Cache-Control',
        'no-store'
      );

      return res
        .status(
          201
        )
        .json({
          success:
            true,

          message:
            'Hesabınız oluşturuldu. E-posta adresinize gönderilen bağlantı ile hesabınızı doğrulayın.',

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  },

  async verifyEmail(
    req,
    res
  ) {
    try {
      const data =
        await setupService.verifyEmail(
          req.query.token
        );

      res.set(
        'Cache-Control',
        'no-store'
      );

      return res
        .status(
          200
        )
        .json({
          success:
            true,

          message:
            'E-posta adresiniz doğrulandı.',

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  },

  async resendVerification(
    req,
    res
  ) {
    try {
      const data =
        await setupService.resendVerification(
          req.body.email
        );

      return res
        .status(
          200
        )
        .json({
          success:
            true,

          message:
            'Eğer doğrulanmamış bir hesap varsa yeni doğrulama bağlantısı gönderildi.',

          data,
        });
    } catch (
      error
    ) {
      return sendError(
        res,
        error
      );
    }
  },
};

export default setupController;
