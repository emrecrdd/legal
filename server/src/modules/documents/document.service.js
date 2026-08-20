import { Op, Sequelize } from 'sequelize';

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { Document } from '../../models/Document.js';
import { User } from '../../models/User.js';
import { Case } from '../../models/Case.js';
import { Client } from '../../models/Client.js';
import { PowerOfAttorney } from '../../models/PowerOfAttorney.js';

import { sequelize } from '../../config/database.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.resolve(
  __dirname,
  '../../../uploads'
);

await fsPromises.mkdir(UPLOAD_DIR, {
  recursive: true,
});

// ======================================================
// HELPERS
// ======================================================

const normalizeOriginalName = (originalName = '') => {
  try {
    const decoded = Buffer
      .from(originalName, 'latin1')
      .toString('utf8');

    return decoded || originalName;
  } catch {
    return originalName;
  }
};

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return [
      ...new Set(
        tags
          .map((tag) => String(tag).trim())
          .filter(Boolean)
      ),
    ];
  }

  if (typeof tags === 'string') {
    return [
      ...new Set(
        tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      ),
    ];
  }

  return [];
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  if (value === 1 || value === '1') {
    return true;
  }

  if (value === 0 || value === '0') {
    return false;
  }

  return fallback;
};

const normalizeMetadata = (metadata) => {
  if (!metadata) {
    return {};
  }

  if (
    typeof metadata === 'object' &&
    !Array.isArray(metadata)
  ) {
    return metadata;
  }

  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);

      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      ) {
        return parsed;
      }
    } catch {
      return {};
    }
  }

  return {};
};

/*
 * UDF dosyaları XML tabanlı içerik taşıyabilse de
 * tarayıcı / işletim sistemi tarafından text/xml,
 * application/xml veya application/octet-stream
 * şeklinde bildirilebilir.
 *
 * Sistemimizde UDF'nin XML olarak yorumlanmasını
 * istemediğimiz için uzantı .udf ise MIME türünü
 * application/octet-stream olarak normalize ediyoruz.
 */
const normalizeMimeType = (
  originalName = '',
  mimeType = ''
) => {
  const extension = path
    .extname(originalName)
    .toLowerCase();

  if (extension === '.udf') {
    return 'application/octet-stream';
  }

  return (
    mimeType ||
    'application/octet-stream'
  );
};

const detectFileType = (
  mimeType = '',
  originalName = ''
) => {
  const extension = path
    .extname(originalName)
    .toLowerCase();

  /*
   * Document modelinde henüz "udf" ENUM değeri yok.
   * Bu nedenle UDF şimdilik "other" olarak tutuluyor.
   */
  if (extension === '.udf') {
    return 'udf';
  }

  if (mimeType === 'application/pdf') {
    return 'pdf';
  }

  if (
    mimeType.includes('word') ||
    mimeType.includes('document')
  ) {
    return 'word';
  }

  if (
    mimeType.includes('excel') ||
    mimeType.includes('sheet')
  ) {
    return 'excel';
  }

  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  // Document modelinde henüz video ENUM'u yok.
  if (mimeType.startsWith('video/')) {
    return 'other';
  }

  return 'other';
};

const createStoredFilename = (originalName) => {
  const extension = path
    .extname(originalName || '')
    .toLowerCase();

  return `${crypto.randomUUID()}${extension}`;
};

const resolveStoredFilePath = (storedFilename) => {
  if (!storedFilename) {
    throw new Error('Document file path is missing');
  }

  /*
   * DB tarafında yalnız dosya adı tutulmalı.
   * "../" gibi path traversal değerlerini reddediyoruz.
   */
  if (path.basename(storedFilename) !== storedFilename) {
    throw new Error('Invalid document file path');
  }

  const resolved = path.resolve(
    UPLOAD_DIR,
    storedFilename
  );

  const relative = path.relative(
    UPLOAD_DIR,
    resolved
  );

  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative)
  ) {
    throw new Error('Invalid document file path');
  }

  return resolved;
};

const documentIncludes = [
  {
    model: User,
    as: 'uploader',
    attributes: [
      'id',
      'first_name',
      'last_name',
    ],
  },
  {
    model: Case,
    as: 'case',
    attributes: [
      'id',
      'title',
    ],
  },
  {
    model: Client,
    as: 'client',
    attributes: [
      'id',
      'name',
    ],
  },
  {
    model: PowerOfAttorney,
    as: 'powerOfAttorney',
    attributes: [
      'id',
      'title',
    ],
  },
];

// ======================================================
// SERVICE
// ======================================================

export const documentService = {

  // ====================================================
  // UPLOAD
  // ====================================================

  async upload(data) {
    const {
      file,
      ...documentData
    } = data;

    if (!file?.buffer) {
      throw new Error('File is required');
    }

    const originalName =
      normalizeOriginalName(
        file.originalname
      );

    const mimeType =
      normalizeMimeType(
        originalName,
        file.mimetype
      );

    const storedFilename =
      createStoredFilename(
        originalName
      );

    const storedPath =
      resolveStoredFilePath(
        storedFilename
      );

    const transaction =
      await sequelize.transaction();

    let fileWritten = false;

    try {
      /*
       * Dosya içeriğine kesinlikle dokunmuyoruz.
       *
       * Özellikle UDF belgeleri olduğu gibi
       * byte-for-byte saklanıyor.
       */
      await fsPromises.writeFile(
        storedPath,
        file.buffer,
        {
          flag: 'wx',
        }
      );

      fileWritten = true;

      const document =
        await Document.create(
          {
            name:
              documentData.name?.trim() ||
              originalName,

            original_name:
              originalName,

            file_path:
              storedFilename,

            file_size:
              file.size,

            mime_type:
              mimeType,

            file_type:
              detectFileType(
                mimeType,
                originalName
              ),

            category:
              documentData.category?.trim() ||
              'general',

            tags:
              normalizeTags(
                documentData.tags
              ),

            description:
              documentData.description?.trim() ||
              null,

            case_id:
              documentData.case_id ||
              null,

            client_id:
              documentData.client_id ||
              null,

            power_of_attorney_id:
              documentData.power_of_attorney_id ||
              null,

            uploaded_by:
              documentData.uploaded_by,

            is_public:
              normalizeBoolean(
                documentData.is_public,
                false
              ),

            is_archived: false,

            metadata:
              normalizeMetadata(
                documentData.metadata
              ),

            version: 1,

            parent_id: null,
          },
          {
            transaction,
          }
        );

      await transaction.commit();

      return document;
    } catch (error) {
      await transaction.rollback();

      if (fileWritten) {
        await fsPromises
          .unlink(storedPath)
          .catch(() => {});
      }

      throw error;
    }
  },

  // ====================================================
  // VERSION UPLOAD
  // ====================================================

  async uploadVersion(documentId, data) {
    const {
      file,
      ...versionData
    } = data;

    if (!file?.buffer) {
      throw new Error(
        'New version file is required'
      );
    }

    const existing =
      await Document.findByPk(
        documentId
      );

    if (!existing) {
      throw new Error(
        'Document not found'
      );
    }

    /*
     * Her versiyon doğrudan ana/root belgeye bağlanır.
     */
    const rootId =
      existing.parent_id ||
      existing.id;

    const rootDocument =
      existing.parent_id
        ? await Document.findByPk(
            rootId
          )
        : existing;

    if (!rootDocument) {
      throw new Error(
        'Root document not found'
      );
    }

    const maxChildVersion =
      await Document.max(
        'version',
        {
          where: {
            [Op.or]: [
              {
                id: rootId,
              },
              {
                parent_id:
                  rootId,
              },
            ],
          },
        }
      );

    const nextVersion =
      Math.max(
        Number(maxChildVersion) ||
          1,
        1
      ) + 1;

    const originalName =
      normalizeOriginalName(
        file.originalname
      );

    const mimeType =
      normalizeMimeType(
        originalName,
        file.mimetype
      );

    const storedFilename =
      createStoredFilename(
        originalName
      );

    const storedPath =
      resolveStoredFilePath(
        storedFilename
      );

    const transaction =
      await sequelize.transaction();

    let fileWritten = false;

    try {
      /*
       * Yeni versiyon da hiçbir içerik dönüşümü
       * yapılmadan olduğu gibi saklanır.
       */
      await fsPromises.writeFile(
        storedPath,
        file.buffer,
        {
          flag: 'wx',
        }
      );

      fileWritten = true;

      const document =
        await Document.create(
          {
            name:
              versionData.name?.trim() ||
              rootDocument.name,

            original_name:
              originalName,

            file_path:
              storedFilename,

            file_size:
              file.size,

            mime_type:
              mimeType,

            file_type:
              detectFileType(
                mimeType,
                originalName
              ),

            category:
              versionData.category?.trim() ||
              rootDocument.category ||
              'general',

            tags:
              versionData.tags !==
              undefined
                ? normalizeTags(
                    versionData.tags
                  )
                : rootDocument.tags ||
                  [],

            description:
              versionData.description !==
              undefined
                ? versionData.description?.trim() ||
                  null
                : rootDocument.description,

            case_id:
              versionData.case_id !==
              undefined
                ? versionData.case_id ||
                  null
                : rootDocument.case_id,

            client_id:
              versionData.client_id !==
              undefined
                ? versionData.client_id ||
                  null
                : rootDocument.client_id,

            power_of_attorney_id:
              versionData.power_of_attorney_id !==
              undefined
                ? versionData.power_of_attorney_id ||
                  null
                : rootDocument.power_of_attorney_id,

            uploaded_by:
              versionData.uploaded_by,

            is_public:
              versionData.is_public !==
              undefined
                ? normalizeBoolean(
                    versionData.is_public
                  )
                : rootDocument.is_public,

            is_archived:
              false,

            metadata:
              versionData.metadata !==
              undefined
                ? normalizeMetadata(
                    versionData.metadata
                  )
                : rootDocument.metadata ||
                  {},

            version:
              nextVersion,

            parent_id:
              rootId,
          },
          {
            transaction,
          }
        );

      await transaction.commit();

      return document;
    } catch (error) {
      await transaction.rollback();

      if (fileWritten) {
        await fsPromises
          .unlink(storedPath)
          .catch(() => {});
      }

      throw error;
    }
  },

  // ====================================================
  // FIND ALL
  // ====================================================

  async findAll({
    page,
    limit,
    search,
    category,
    case_id,
    client_id,
    power_of_attorney_id,
    include_archived = false,
  }) {
    const where = {};

    if (
      !normalizeBoolean(
        include_archived,
        false
      )
    ) {
      where.is_archived =
        false;
    }

    if (search?.trim()) {
      const normalizedSearch =
        search.trim();

      where[Op.or] = [
        {
          name: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
        {
          original_name: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
        {
          description: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
      ];
    }

    if (category) {
      where.category =
        category;
    }

    if (case_id) {
      where.case_id =
        case_id;
    }

    if (client_id) {
      where.client_id =
        client_id;
    }

    if (
      power_of_attorney_id
    ) {
      where.power_of_attorney_id =
        power_of_attorney_id;
    }

    const pageNum =
      Math.max(
        Number.parseInt(
          page,
          10
        ) || 1,
        1
      );

    const limitNum =
      Math.min(
        Math.max(
          Number.parseInt(
            limit,
            10
          ) || 10,
          1
        ),
        100
      );

    const query =
      paginate(
        {
          where,
          order: [
            [
              'created_at',
              'DESC',
            ],
          ],
        },
        pageNum,
        limitNum
      );

    const {
      count,
      rows,
    } =
      await Document.findAndCountAll(
        {
          ...query,

          include:
            documentIncludes,

          distinct: true,
        }
      );

    return {
      data: rows,

      pagination:
        getPaginationData(
          count,
          pageNum,
          limitNum
        ),
    };
  },

  // ====================================================
  // FIND ONE
  // ====================================================

  async findOne(id) {
    const document =
      await Document.findByPk(
        id,
        {
          include:
            documentIncludes,
        }
      );

    if (!document) {
      throw new Error(
        'Document not found'
      );
    }

    return document;
  },

  // ====================================================
  // UPDATE METADATA ONLY
  // ====================================================

  async update(id, data) {
    const document =
      await Document.findByPk(
        id
      );

    if (!document) {
      throw new Error(
        'Document not found'
      );
    }

    /*
     * file_path, uploaded_by, version, parent_id,
     * mime_type vb. metadata update endpoint'inden
     * değiştirilemez.
     */
    const allowedFields = [
      'name',
      'description',
      'category',
      'case_id',
      'client_id',
      'power_of_attorney_id',
      'tags',
      'is_public',
      'is_archived',
      'metadata',
    ];

    const updateData = {};

    for (
      const field of
      allowedFields
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          data,
          field
        )
      ) {
        updateData[field] =
          data[field];
      }
    }

    if (
      updateData.name !==
      undefined
    ) {
      const name =
        String(
          updateData.name
        ).trim();

      if (!name) {
        throw new Error(
          'Document name cannot be empty'
        );
      }

      updateData.name =
        name;
    }

    if (
      updateData.description !==
      undefined
    ) {
      updateData.description =
        updateData.description
          ? String(
              updateData.description
            ).trim()
          : null;
    }

    if (
      updateData.category !==
      undefined
    ) {
      updateData.category =
        updateData.category
          ? String(
              updateData.category
            ).trim()
          : 'general';
    }

    if (
      updateData.tags !==
      undefined
    ) {
      updateData.tags =
        normalizeTags(
          updateData.tags
        );
    }

    if (
      updateData.is_public !==
      undefined
    ) {
      updateData.is_public =
        normalizeBoolean(
          updateData.is_public,
          document.is_public
        );
    }

    if (
      updateData.is_archived !==
      undefined
    ) {
      updateData.is_archived =
        normalizeBoolean(
          updateData.is_archived,
          document.is_archived
        );
    }

    if (
      updateData.metadata !==
      undefined
    ) {
      updateData.metadata =
        normalizeMetadata(
          updateData.metadata
        );
    }

    await document.update(
      updateData
    );

    return this.findOne(id);
  },

  // ====================================================
  // SOFT DELETE
  // ====================================================

  async remove(id) {
    const document =
      await Document.findByPk(
        id
      );

    if (!document) {
      throw new Error(
        'Document not found'
      );
    }

    /*
     * Fiziksel dosya burada SİLİNMİYOR.
     *
     * Model paranoid olduğu için yalnız deleted_at yazılır.
     * Hukuk bürosu sisteminde yanlışlıkla silinen belge
     * fiziksel olarak geri alınabilir durumda kalır.
     */
    await document.destroy();

    return document;
  },

  // ====================================================
  // DOWNLOAD / PREVIEW
  // ====================================================

  async getFilePath(document) {
    const filePath =
      resolveStoredFilePath(
        document.file_path
      );

    try {
      await fsPromises.access(
        filePath
      );
    } catch {
      throw new Error(
        'File not found'
      );
    }

    return filePath;
  },

  async download(document) {
    const filePath =
      await this.getFilePath(
        document
      );

    return fs.createReadStream(
      filePath
    );
  },

  // ====================================================
  // VERSIONS
  // ====================================================

  async getVersions(documentId) {
    const document =
      await Document.findByPk(
        documentId
      );

    if (!document) {
      throw new Error(
        'Document not found'
      );
    }

    const rootId =
      document.parent_id ||
      document.id;

    return Document.findAll({
      where: {
        [Op.or]: [
          {
            id: rootId,
          },
          {
            parent_id:
              rootId,
          },
        ],
      },

      include: [
        {
          model: User,
          as: 'uploader',
          attributes: [
            'id',
            'first_name',
            'last_name',
          ],
        },
      ],

      order: [
        [
          'version',
          'DESC',
        ],
      ],
    });
  },

  // ====================================================
  // CATEGORIES
  // ====================================================

  async getCategories() {
    const documents =
      await Document.findAll({
        where: {
          is_archived:
            false,
        },

        attributes: [
          'category',
        ],

        group: [
          'category',
        ],

        order: [
          [
            'category',
            'ASC',
          ],
        ],
      });

    return documents
      .map(
        (document) =>
          document.category
      )
      .filter(Boolean);
  },

  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics() {
    const baseWhere = {
      is_archived: false,
    };

    const [
      totalDocuments,
      totalSize,
      archivedDocuments,
      categories,
    ] =
      await Promise.all([
        Document.count({
          where:
            baseWhere,
        }),

        Document.sum(
          'file_size',
          {
            where:
              baseWhere,
          }
        ),

        Document.count({
          where: {
            is_archived:
              true,
          },
        }),

        Document.findAll({
          where:
            baseWhere,

          attributes: [
            'category',
            [
              Sequelize.fn(
                'COUNT',
                Sequelize.col(
                  'category'
                )
              ),
              'count',
            ],
          ],

          group: [
            'category',
          ],

          raw: true,
        }),
      ]);

    const totalSizeMB =
      Number(
        (
          Number(
            totalSize
          ) /
          (1024 * 1024)
        ).toFixed(2)
      ) || 0;

    return {
      totalDocuments,
      archivedDocuments,
      totalSizeMB,
      categories,
    };
  },
};

export default documentService;