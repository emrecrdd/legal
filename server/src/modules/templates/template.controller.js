import {
  templateService,
} from './template.service.js';

import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import {
  fileURLToPath,
} from 'url';

const __filename =
  fileURLToPath(
    import.meta.url
  );

const __dirname =
  path.dirname(
    __filename
  );

const UPLOAD_DIR =
  path.resolve(
    __dirname,
    '../../../uploads'
  );

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

const createUniqueFilename = (
  originalName
) => {
  const extension =
    path.extname(
      originalName ||
      ''
    );

  return (
    `${Date.now()}-${Math.round(
      Math.random() *
      1e9
    )}${extension}`
  );
};

const saveUploadedFile =
  async (
    file
  ) => {
    await fsPromises.mkdir(
      UPLOAD_DIR,
      {
        recursive:
          true,
      }
    );

    const filename =
      createUniqueFilename(
        file.originalname
      );

    const filePath =
      path.join(
        UPLOAD_DIR,
        filename
      );

    await fsPromises.writeFile(
      filePath,
      file.buffer
    );

    return {
      filename,
      filePath,
    };
  };

export const templateController = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    req,
    res
  ) {
    try {
      const data = {
        ...req.body,

        created_by:
          req.user.id,
      };

      if (
        req.file
      ) {
        const {
          filename,
        } =
          await saveUploadedFile(
            req.file
          );

        data.file_url =
          `/uploads/${filename}`;

        data.file_name =
          req.file.originalname;

        data.file_size =
          req.file.size;

        data.file_type =
          req.file.mimetype;
      }

      const template =
        await templateService.create(
          data
        );

      return successResponse(
        res,
        template,
        'Template created successfully',
        201
      );
    } catch (
      error
    ) {
      logger.error(
        'Create template error:',
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
        category,
        law_area,
        search,
      } = req.query;

      const result =
        await templateService.findAll({
          page,
          limit,
          category,
          law_area,
          search,
        });

      return paginatedResponse(
        res,
        result.data,
        result.pagination,
        'Templates fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get templates error:',
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
      const template =
        await templateService.findOne(
          req.params.id
        );

      return successResponse(
        res,
        template,
        'Template fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get template error:',
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
  // UPDATE
  // ====================================================

  async update(
    req,
    res
  ) {
    try {
      const data = {
        ...req.body,

        updated_by:
          req.user.id,
      };

      if (
        req.file
      ) {
        const existing =
          await templateService.findOne(
            req.params.id
          );

        const {
          filename,
        } =
          await saveUploadedFile(
            req.file
          );

        data.file_url =
          `/uploads/${filename}`;

        data.file_name =
          req.file.originalname;

        data.file_size =
          req.file.size;

        data.file_type =
          req.file.mimetype;

        /*
         * Yeni dosya başarıyla yazıldıktan sonra
         * eski dosyayı temizle.
         */
        if (
          existing.file_url
        ) {
          const oldPath =
            path.join(
              UPLOAD_DIR,
              path.basename(
                existing.file_url
              )
            );

          await fsPromises
            .unlink(
              oldPath
            )
            .catch(
              () => {}
            );
        }
      }

      const template =
        await templateService.update(
          req.params.id,
          data
        );

      return successResponse(
        res,
        template,
        'Template updated successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Update template error:',
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
  // REMOVE
  // ====================================================

  async remove(
    req,
    res
  ) {
    try {
      const template =
        await templateService.findOne(
          req.params.id
        );

      await templateService.remove(
        req.params.id
      );

      if (
        template.file_url
      ) {
        const filePath =
          path.join(
            UPLOAD_DIR,
            path.basename(
              template.file_url
            )
          );

        await fsPromises
          .unlink(
            filePath
          )
          .catch(
            () => {}
          );
      }

      return successResponse(
        res,
        null,
        'Template deleted successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Delete template error:',
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
      const {
        template,
        filePath,
      } =
        await templateService.getFilePath(
          req.params.id
        );

      await templateService.incrementDownload(
        req.params.id
      );

      return res.download(
        filePath,
        template.file_name
      );
    } catch (
      error
    ) {
      logger.error(
        'Download template error:',
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
  // NORMAL PREVIEW
  // ====================================================

  async preview(
    req,
    res
  ) {
    try {
      const {
        template,
        filePath,
      } =
        await templateService.getFilePath(
          req.params.id
        );

      if (
        isUdfFilename(
          template.file_name
        )
      ) {
        return errorResponse(
          res,
          'UDF preview must use the UDF preview endpoint',
          400
        );
      }

      res.setHeader(
        'Cache-Control',
        'private, no-store'
      );

      res.setHeader(
        'Content-Type',
        template.file_type ||
        'application/octet-stream'
      );

      res.setHeader(
        'Content-Disposition',
        'inline'
      );

      res.setHeader(
        'X-Content-Type-Options',
        'nosniff'
      );

      const stream =
        fs.createReadStream(
          filePath
        );

      stream.on(
        'error',
        (
          error
        ) => {
          logger.error(
            'Template preview stream error:',
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

      stream.pipe(
        res
      );
    } catch (
      error
    ) {
      logger.error(
        'Preview template error:',
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
  // UDF PREVIEW
  // ====================================================

  async previewUdf(
    req,
    res
  ) {
    try {
      const preview =
        await templateService.getUdfPreview(
          req.params.id
        );

      return successResponse(
        res,
        preview,
        'UDF template preview fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Preview UDF template error:',
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
  // CATEGORIES
  // ====================================================

  async getCategories(
    req,
    res
  ) {
    try {
      const categories =
        await templateService.getCategories();

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
  // LAW AREAS
  // ====================================================

  async getLawAreas(
    req,
    res
  ) {
    try {
      const lawAreas =
        await templateService.getLawAreas();

      return successResponse(
        res,
        lawAreas,
        'Law areas fetched successfully'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get law areas error:',
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