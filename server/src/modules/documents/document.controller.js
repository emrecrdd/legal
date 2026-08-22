import {
  documentService,
} from './document.service.js';

import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

import {
  AuditLog,
} from '../../models/AuditLog.js';

// ======================================================
// HELPERS
// ======================================================

const createAuditLogSafely =
  async (
    data
  ) => {
    try {
      await AuditLog.create(
        data
      );
    } catch (
      error
    ) {
      /*
       * Audit log hatası gerçekleşmiş ana işlemi
       * kullanıcıya başarısız göstermemeli.
       */
      logger.error(
        'Document audit log error:',
        {
          message:
            error.message,

          entityId:
            data.entity_id,

          action:
            data.action,
        }
      );
    }
  };

const auditMetadata = (
  req
) => ({
  user_id:
    req.user.id,

  /*
   * Reverse proxy arkasında doğruladığımız
   * gerçek client IP tercih edilir.
   */
  ip_address:
    req.realClientIp ||
    req.ip ||
    null,

  user_agent:
    req.headers[
      'user-agent'
    ],
});

const encodeFilename = (
  filename
) => {
  return encodeURIComponent(
    filename ||
    'document'
  )
    .replace(
      /['()]/g,
      (
        character
      ) =>
        `%${character
          .charCodeAt(0)
          .toString(16)
          .toUpperCase()}`
    )
    .replace(
      /\*/g,
      '%2A'
    );
};

const createSafeAsciiFilename = (
  filename
) => {
  return (
    filename ||
    'document'
  )
    .replace(
      /[^\x20-\x7E]/g,
      '_'
    )
    .replace(
      /["\\]/g,
      '_'
    );
};

const isUdfFilename = (
  filename
) => {
  return (
    typeof filename ===
      'string' &&
    filename
      .toLowerCase()
      .endsWith(
        '.udf'
      )
  );
};

// ======================================================
// CONTROLLER
// ======================================================

export const documentController = {
  // ====================================================
  // UPLOAD SINGLE
  // ====================================================

  async upload(
    req,
    res
  ) {
    try {
      if (
        !req.file
      ) {
        return errorResponse(
          res,
          'No file uploaded',
          400
        );
      }

      /*
       * uploaded_by artık body üzerinden gönderilmiyor.
       *
       * Service authenticated actor ID'sini doğrudan
       * kullanıyor.
       */
      const document =
        await documentService.upload(
          {
            ...req.body,

            file:
              req.file,
          },

          req.user
        );

      await createAuditLogSafely({
        action:
          'upload',

        entity_type:
          'document',

        entity_id:
          document.id,

        description:
          `"${document.name}" belgesi yüklendi`,

        ...auditMetadata(
          req
        ),
      });

      return successResponse(
        res,
        document,
        'Document uploaded successfully',
        201
      );
    } catch (
      error
    ) {
      logger.error(
        'Upload document error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // MULTIPLE UPLOAD
  // ====================================================

  async uploadMultiple(
    req,
    res
  ) {
    try {
      if (
        !Array.isArray(
          req.files
        ) ||
        req.files.length ===
          0
      ) {
        return errorResponse(
          res,
          'No files uploaded',
          400
        );
      }

      const documents =
        [];

      const errors =
        [];

      for (
        const file of
        req.files
      ) {
        try {
          const document =
            await documentService.upload(
              {
                ...req.body,

                file,

                /*
                 * Çoklu yüklemede bütün belgelere aynı
                 * özel isim verilmesini engelle.
                 */
                name:
                  req.files.length >
                  1
                    ? undefined
                    : req.body
                        .name,
              },

              req.user
            );

          documents.push(
            document
          );

          await createAuditLogSafely({
            action:
              'upload',

            entity_type:
              'document',

            entity_id:
              document.id,

            description:
              `"${document.name}" belgesi toplu yükleme ile yüklendi`,

            ...auditMetadata(
              req
            ),
          });
        } catch (
          error
        ) {
          errors.push({
            file:
              file.originalname,

            error:
              error.message,
          });
        }
      }

      const statusCode =
        documents.length >
        0
          ? 201
          : 400;

      return successResponse(
        res,
        {
          success:
            documents.length,

          failed:
            errors.length,

          documents,

          errors,
        },

        documents.length >
        0
          ? `${documents.length} documents uploaded successfully`
          : 'No documents could be uploaded',

        statusCode
      );
    } catch (
      error
    ) {
      logger.error(
        'Upload multiple documents error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // UPLOAD VERSION
  // ====================================================

  async uploadVersion(
    req,
    res
  ) {
    try {
      if (
        !req.file
      ) {
        return errorResponse(
          res,
          'No file uploaded',
          400
        );
      }

      const document =
        await documentService.uploadVersion(
          req.params.id,

          {
            ...req.body,

            file:
              req.file,
          },

          req.user
        );

      await createAuditLogSafely({
        action:
          'upload',

        entity_type:
          'document',

        entity_id:
          document.id,

        description:
          `"${document.name}" belgesinin v${document.version} sürümü yüklendi`,

        ...auditMetadata(
          req
        ),
      });

      return successResponse(
        res,
        document,
        'Document version uploaded successfully',
        201
      );
    } catch (
      error
    ) {
      logger.error(
        'Upload document version error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // FIND ALL
  // ====================================================

  async findAll(
    req,
    res
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category,
        case_id,
        client_id,
        power_of_attorney_id,
        include_archived,
      } = req.query;

      const result =
        await documentService.findAll({
          page,
          limit,
          search,
          category,
          case_id,
          client_id,
          power_of_attorney_id,
          include_archived,

          /*
           * Query-level BOLA scope.
           */
          actor:
            req.user,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Documents fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get documents error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // FIND ONE
  // ====================================================

  async findOne(
    req,
    res
  ) {
    try {
      const document =
        await documentService.findOne(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        document,
        'Document fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get document error:',
        error
      );

      /*
       * Yetkisiz ID ile gerçekten olmayan ID arasında
       * ayrım yapılmaz.
       */
      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ====================================================
  // UPDATE METADATA
  // ====================================================

  async update(
    req,
    res
  ) {
    try {
      const document =
        await documentService.update(
          req.params.id,
          req.body,
          req.user
        );

      await createAuditLogSafely({
        action:
          'update',

        entity_type:
          'document',

        entity_id:
          document.id,

        description:
          `"${document.name}" belgesi güncellendi`,

        ...auditMetadata(
          req
        ),
      });

      return successResponse(
        res,
        document,
        'Document updated successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Update document error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // SOFT DELETE
  // ====================================================

  async remove(
    req,
    res
  ) {
    try {
      /*
       * findOne hem audit açıklaması için belgeyi getirir
       * hem de ilk authorization kontrolünü yapar.
       */
      const document =
        await documentService.findOne(
          req.params.id,
          req.user
        );

      /*
       * remove kendi içinde authorization kontrolünü
       * tekrar yapar.
       *
       * Defense-in-depth korunur.
       */
      await documentService.remove(
        req.params.id,
        req.user
      );

      await createAuditLogSafely({
        action:
          'delete',

        entity_type:
          'document',

        entity_id:
          document.id,

        description:
          `"${document.name}" belgesi silindi`,

        ...auditMetadata(
          req
        ),
      });

      return successResponse(
        res,
        null,
        'Document deleted successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Delete document error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // DOWNLOAD
  // ====================================================

  async download(
    req,
    res
  ) {
    try {
      /*
       * Belge metadata'sı ancak authorization sonrası
       * alınabilir.
       */
      const document =
        await documentService.findOne(
          req.params.id,
          req.user
        );

      /*
       * download/getFilePath kendi içinde belgeyi
       * DB'den tekrar authorization ile doğrular.
       */
      const fileStream =
        await documentService.download(
          document,
          req.user
        );

      const originalFilename =
        document.original_name ||
        document.name ||
        'document';

      const encodedFilename =
        encodeFilename(
          originalFilename
        );

      const safeFilename =
        createSafeAsciiFilename(
          originalFilename
        );

      const isUdf =
        isUdfFilename(
          originalFilename
        );

      /*
       * Hassas hukuk belgelerinin browser/proxy cache
       * katmanlarında tutulmasını istemiyoruz.
       */
      res.setHeader(
        'Cache-Control',
        'private, no-store'
      );

      /*
       * UDF XML tabanlı görünse bile browser tarafından
       * XML olarak yorumlanmaz.
       */
      res.setHeader(
        'Content-Type',
        isUdf
          ? 'application/octet-stream'
          : document.mime_type ||
              'application/octet-stream'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
      );

      res.setHeader(
        'X-Content-Type-Options',
        'nosniff'
      );

      await createAuditLogSafely({
        action:
          'download',

        entity_type:
          'document',

        entity_id:
          document.id,

        description:
          `"${document.name}" belgesi indirildi`,

        ...auditMetadata(
          req
        ),
      });

      fileStream.on(
        'error',
        (
          error
        ) => {
          logger.error(
            'Document stream error:',
            error
          );

          if (
            !res.headersSent
          ) {
            res
              .status(
                500
              )
              .end();
          } else {
            res.destroy();
          }
        }
      );

      fileStream.pipe(
        res
      );
    } catch (
      error
    ) {
      logger.error(
        'Download document error:',
        error
      );

      if (
        res.headersSent
      ) {
        return;
      }

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ====================================================
  // PREVIEW
  // ====================================================

  async preview(
    req,
    res
  ) {
    try {
      const document =
        await documentService.findOne(
          req.params.id,
          req.user
        );

      const fileStream =
        await documentService.download(
          document,
          req.user
        );

      const originalFilename =
        document.original_name ||
        document.name ||
        'document';

      const encodedFilename =
        encodeFilename(
          originalFilename
        );

      /*
       * Preview edilen hassas belge proxy/browser
       * cache'inde tutulmaz.
       */
      res.setHeader(
        'Cache-Control',
        'private, no-store'
      );

      /*
       * Mevcut preview davranışını koruyoruz.
       *
       * UDF zaten service tarafında octet-stream
       * olarak normalize edilmiş durumda.
       */
      res.setHeader(
        'Content-Type',
        document.mime_type ||
          'application/octet-stream'
      );

      res.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodedFilename}`
      );

      res.setHeader(
        'X-Content-Type-Options',
        'nosniff'
      );

      fileStream.on(
        'error',
        (
          error
        ) => {
          logger.error(
            'Document preview stream error:',
            error
          );

          if (
            !res.headersSent
          ) {
            res
              .status(
                500
              )
              .end();
          } else {
            res.destroy();
          }
        }
      );

      fileStream.pipe(
        res
      );
    } catch (
      error
    ) {
      logger.error(
        'Preview document error:',
        error
      );

      if (
        res.headersSent
      ) {
        return;
      }

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ====================================================
  // VERSIONS
  // ====================================================

  async getVersions(
    req,
    res
  ) {
    try {
      const versions =
        await documentService.getVersions(
          req.params.id,
          req.user
        );

      return successResponse(
        res,
        versions,
        'Versions fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get versions error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        404
      );
    }
  },

  // ====================================================
  // CATEGORIES
  // ====================================================

  async getCategories(
    req,
    res
  ) {
    try {
      /*
       * Kategoriler artık sistemdeki tüm belgelerden
       * değil yalnız kullanıcının erişebildiği
       * belgelerden türetilir.
       */
      const categories =
        await documentService.getCategories(
          req.user
        );

      return successResponse(
        res,
        categories,
        'Categories fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get categories error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },

  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics(
    req,
    res
  ) {
    try {
      /*
       * Belge sayısı, boyutu ve kategori istatistikleri
       * actor scope'una göre hesaplanır.
       */
      const stats =
        await documentService.getStatistics(
          req.user
        );

      return successResponse(
        res,
        stats,
        'Document statistics fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get document statistics error:',
        error
      );

      return errorResponse(
        res,
        error.message,
        400
      );
    }
  },
};