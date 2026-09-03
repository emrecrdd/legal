import multer from 'multer';
import path from 'path';

const CHAT_MAX_FILE_SIZE =
  10 * 1024 * 1024;

const CHAT_MAX_FILES =
  3;

const CHAT_ALLOWED_FILE_TYPES =
  new Map([
    [
      'application/pdf',
      ['.pdf'],
    ],

    [
      'application/msword',
      ['.doc'],
    ],

    [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ['.docx'],
    ],
  ]);

const storage =
  multer.memoryStorage();

const fileFilter = (
  req,
  file,
  callback
) => {
  const extension =
    path
      .extname(
        file.originalname ||
        ''
      )
      .toLowerCase();

  /*
   * UYAP UDF dosyaları çoğu istemcide
   * application/octet-stream olarak gelir.
   */
  if (
    extension ===
    '.udf'
  ) {
    return callback(
      null,
      true
    );
  }

  const allowedExtensions =
    CHAT_ALLOWED_FILE_TYPES.get(
      file.mimetype
    );

  if (!allowedExtensions) {
    return callback(
      new Error(
        'Sohbette yalnızca PDF, Word ve UDF dosyaları gönderilebilir.'
      )
    );
  }

  if (
    !allowedExtensions.includes(
      extension
    )
  ) {
    return callback(
      new Error(
        `Dosya uzantısı ile MIME türü uyuşmuyor: ${
          extension ||
          'uzantı yok'
        }`
      )
    );
  }

  return callback(
    null,
    true
  );
};

const chatUpload =
  multer({
    storage,

    limits: {
      fileSize:
        CHAT_MAX_FILE_SIZE,

      files:
        CHAT_MAX_FILES,
    },

    fileFilter,
  });

export {
  chatUpload,
  CHAT_MAX_FILE_SIZE,
  CHAT_MAX_FILES,
};

export default chatUpload;
