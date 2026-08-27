import {
  Op,
  Sequelize,
} from 'sequelize';

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

import {
  fileURLToPath,
} from 'url';

import AdmZip from 'adm-zip';
import unzipper from 'unzipper';
import {
  XMLParser,
} from 'fast-xml-parser';

import {
  Document,
} from '../../models/Document.js';

import {
  User,
} from '../../models/User.js';

import {
  Case,
} from '../../models/Case.js';

import {
  Client,
} from '../../models/Client.js';

import {
  PowerOfAttorney,
} from '../../models/PowerOfAttorney.js';

import {
  sequelize,
} from '../../config/database.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

import {
  ROLES,
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

// ======================================================
// PATHS
// ======================================================

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

await fsPromises.mkdir(
  UPLOAD_DIR,
  {
    recursive: true,
  }
);

// ======================================================
// NORMALIZATION HELPERS
// ======================================================

const normalizeOriginalName = (
  originalName = ''
) => {
  try {
    const decoded =
      Buffer
        .from(
          originalName,
          'latin1'
        )
        .toString(
          'utf8'
        );

    return (
      decoded ||
      originalName
    );
  } catch {
    return originalName;
  }
};

const normalizeTags = (
  tags
) => {
  if (
    Array.isArray(
      tags
    )
  ) {
    return [
      ...new Set(
        tags
          .map(
            (
              tag
            ) =>
              String(
                tag
              ).trim()
          )
          .filter(
            Boolean
          )
      ),
    ];
  }

  if (
    typeof tags ===
    'string'
  ) {
    return [
      ...new Set(
        tags
          .split(',')
          .map(
            (
              tag
            ) =>
              tag.trim()
          )
          .filter(
            Boolean
          )
      ),
    ];
  }

  return [];
};

const normalizeBoolean = (
  value,
  fallback = false
) => {
  if (
    typeof value ===
    'boolean'
  ) {
    return value;
  }

  if (
    typeof value ===
    'string'
  ) {
    const normalized =
      value.toLowerCase();

    if (
      normalized ===
      'true'
    ) {
      return true;
    }

    if (
      normalized ===
      'false'
    ) {
      return false;
    }
  }

  if (
    value === 1 ||
    value === '1'
  ) {
    return true;
  }

  if (
    value === 0 ||
    value === '0'
  ) {
    return false;
  }

  return fallback;
};

const normalizeMetadata = (
  metadata
) => {
  if (
    !metadata
  ) {
    return {};
  }

  if (
    typeof metadata ===
      'object' &&
    !Array.isArray(
      metadata
    )
  ) {
    return metadata;
  }

  if (
    typeof metadata ===
    'string'
  ) {
    try {
      const parsed =
        JSON.parse(
          metadata
        );

      if (
        parsed &&
        typeof parsed ===
          'object' &&
        !Array.isArray(
          parsed
        )
      ) {
        return parsed;
      }
    } catch {
      return {};
    }
  }

  return {};
};

// ======================================================
// FILE TYPES
// ======================================================

const normalizeMimeType = (
  originalName = '',
  mimeType = ''
) => {
  const extension =
    path
      .extname(
        originalName
      )
      .toLowerCase();

  if (
    extension ===
    '.udf'
  ) {
    return (
      'application/octet-stream'
    );
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
  const extension =
    path
      .extname(
        originalName
      )
      .toLowerCase();

  if (
    extension ===
    '.udf'
  ) {
    return 'udf';
  }

  if (
    mimeType ===
    'application/pdf'
  ) {
    return 'pdf';
  }

  if (
    mimeType.includes(
      'word'
    ) ||
    mimeType.includes(
      'document'
    )
  ) {
    return 'word';
  }

  if (
    mimeType.includes(
      'excel'
    ) ||
    mimeType.includes(
      'sheet'
    )
  ) {
    return 'excel';
  }

  if (
    mimeType.startsWith(
      'image/'
    )
  ) {
    return 'image';
  }

  if (
    mimeType.startsWith(
      'video/'
    )
  ) {
    return 'other';
  }

  return 'other';
};

const isUdfDocument = (
  document
) => {
  if (
    document?.file_type ===
    'udf'
  ) {
    return true;
  }

  const extension =
    path
      .extname(
        document?.original_name ||
        document?.name ||
        ''
      )
      .toLowerCase();

  return (
    extension === '.udf'
  );
};

// ======================================================
// FILE PATH SECURITY
// ======================================================

const createStoredFilename = (
  originalName
) => {
  const extension =
    path
      .extname(
        originalName ||
        ''
      )
      .toLowerCase();

  return (
    `${crypto.randomUUID()}${extension}`
  );
};

const resolveStoredFilePath = (
  storedFilename
) => {
  if (
    !storedFilename
  ) {
    throw new Error(
      'Document file path is missing'
    );
  }

  if (
    path.basename(
      storedFilename
    ) !==
    storedFilename
  ) {
    throw new Error(
      'Invalid document file path'
    );
  }

  const resolved =
    path.resolve(
      UPLOAD_DIR,
      storedFilename
    );

  const relative =
    path.relative(
      UPLOAD_DIR,
      resolved
    );

  if (
    relative.startsWith(
      '..'
    ) ||
    path.isAbsolute(
      relative
    )
  ) {
    throw new Error(
      'Invalid document file path'
    );
  }

  return resolved;
};

// ======================================================
// AUTHORIZATION
// ======================================================

const getActorId = (
  actor
) => {
  return (
    actor?.id ||
    null
  );
};

const requireActor = (
  actor
) => {
  const actorId =
    getActorId(
      actor
    );

  if (
    !actorId
  ) {
    throw new Error(
      'Document not found'
    );
  }

  return actorId;
};

const getActorPermissions = (
  actor
) => {
  if (
    !actor
  ) {
    return [];
  }

  return getEffectivePermissions(
    actor.role,
    actor.permissions ||
      {}
  );
};

const isAdmin = (
  actor
) => {
  return (
    actor?.role ===
    ROLES.ADMIN
  );
};

const canViewAllCases = (
  actor
) => {
  return (
    isAdmin(
      actor
    ) ||
    getActorPermissions(
      actor
    ).includes(
      PERMISSION_KEYS.VIEW_ALL_CASES
    )
  );
};

// ======================================================
// WHERE HELPERS
// ======================================================

const hasWhereContent = (
  value
) => {
  return Boolean(
    value &&
    typeof value ===
      'object' &&
    Reflect.ownKeys(
      value
    ).length >
      0
  );
};

const combineWhere = (
  ...conditions
) => {
  const validConditions =
    conditions.filter(
      hasWhereContent
    );

  if (
    validConditions.length ===
    0
  ) {
    return {};
  }

  if (
    validConditions.length ===
    1
  ) {
    return validConditions[0];
  }

  return {
    [Op.and]:
      validConditions,
  };
};

// ======================================================
// CASE ACCESS
// ======================================================

const assertCaseAccess =
  async (
    caseId,
    actor,
    options = {}
  ) => {
    if (
      !caseId
    ) {
      return null;
    }

    const actorId =
      requireActor(
        actor
      );

    const where = {
      id:
        caseId,
    };

    if (
      !canViewAllCases(
        actor
      )
    ) {
      where[Op.or] = [
        {
          created_by:
            actorId,
        },

        {
          assigned_to:
            actorId,
        },
      ];
    }

    const caseItem =
      await Case.findOne({
        where,

        attributes: [
          'id',
        ],

        transaction:
          options.transaction,
      });

    if (
      !caseItem
    ) {
      throw new Error(
        'Case not found'
      );
    }

    return caseItem;
  };

// ======================================================
// CLIENT ACCESS
// ======================================================

const buildClientAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(
      actor
    );

  if (
    isAdmin(
      actor
    )
  ) {
    return {};
  }

  const escapedActorId =
    sequelize.escape(
      actorId
    );

  const relatedCasePredicate =
    canViewAllCases(
      actor
    )
      ? `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Client"."id"
        )
      `
      : `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Client"."id"
            AND (
              c.created_by = ${escapedActorId}
              OR c.assigned_to = ${escapedActorId}
            )
        )
      `;

  return {
    [Op.or]: [
      {
        created_by:
          actorId,
      },

      Sequelize.where(
        Sequelize.literal(
          relatedCasePredicate
        ),
        true
      ),
    ],
  };
};

const assertClientAccess =
  async (
    clientId,
    actor,
    options = {}
  ) => {
    if (
      !clientId
    ) {
      return null;
    }

    const client =
      await Client.findOne({
        where:
          combineWhere(
            {
              id:
                clientId,
            },

            buildClientAccessWhere(
              actor
            )
          ),

        attributes: [
          'id',
          'created_by',
        ],

        transaction:
          options.transaction,
      });

    if (
      !client
    ) {
      throw new Error(
        'Client not found'
      );
    }

    return client;
  };

// ======================================================
// DOCUMENT QUERY ACCESS
// ======================================================

const buildDocumentAccessWhere = (
  actor
) => {
  const actorId =
    requireActor(
      actor
    );

  if (
    isAdmin(
      actor
    )
  ) {
    return {};
  }

  const caseLinkedScope =
    canViewAllCases(
      actor
    )
      ? {
          case_id: {
            [Op.ne]:
              null,
          },
        }
      : {
          [Op.and]: [
            {
              case_id: {
                [Op.ne]:
                  null,
              },
            },

            {
              [Op.or]: [
                {
                  '$case.created_by$':
                    actorId,
                },

                {
                  '$case.assigned_to$':
                    actorId,
                },
              ],
            },
          ],
        };

  const clientCasePredicate =
    canViewAllCases(
      actor
    )
      ? `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Document"."client_id"
        )
      `
      : `
        EXISTS (
          SELECT 1
          FROM case_clients cc
          INNER JOIN cases c
            ON c.id = cc.case_id
           AND c.deleted_at IS NULL
          WHERE cc.client_id = "Document"."client_id"
            AND (
              c.created_by = ${sequelize.escape(
                actorId
              )}
              OR c.assigned_to = ${sequelize.escape(
                actorId
              )}
            )
        )
      `;

  const clientLinkedScope = {
    [Op.and]: [
      {
        case_id:
          null,
      },

      {
        client_id: {
          [Op.ne]:
            null,
        },
      },

      {
        [Op.or]: [
          {
            '$client.created_by$':
              actorId,
          },

          Sequelize.where(
            Sequelize.literal(
              clientCasePredicate
            ),
            true
          ),
        ],
      },
    ],
  };

  const standaloneScope = {
    [Op.and]: [
      {
        case_id:
          null,
      },

      {
        client_id:
          null,
      },

      {
        uploaded_by:
          actorId,
      },
    ],
  };

  return {
    [Op.or]: [
      caseLinkedScope,
      clientLinkedScope,
      standaloneScope,
    ],
  };
};

// ======================================================
// DOCUMENT READ ACCESS
// ======================================================

const buildDocumentReadAccessWhere = (
  actor
) => {
  requireActor(
    actor
  );

  if (
    isAdmin(
      actor
    )
  ) {
    return {};
  }

  return {
    [Op.or]: [
      {
        is_public:
          true,
      },

      buildDocumentAccessWhere(
        actor
      ),
    ],
  };
};

// ======================================================
// DOCUMENT ACCESS INCLUDES
// ======================================================

const documentAccessIncludes = [
  {
    model:
      Case,

    as:
      'case',

    attributes:
      [],

    required:
      false,
  },

  {
    model:
      Client,

    as:
      'client',

    attributes:
      [],

    required:
      false,
  },
];

// ======================================================
// ASSERT DOCUMENT ACCESS
// ======================================================

const assertDocumentAccess =
  async (
    documentId,
    actor,
    options = {}
  ) => {
    const actorId =
      requireActor(
        actor
      );

    const document =
      await Document.findByPk(
        documentId,
        {
          transaction:
            options.transaction,
        }
      );

    if (
      !document
    ) {
      throw new Error(
        'Document not found'
      );
    }

    if (
      isAdmin(
        actor
      )
    ) {
      return document;
    }

    if (
      document.case_id
    ) {
      try {
        await assertCaseAccess(
          document.case_id,
          actor,
          options
        );

        return document;
      } catch {
        throw new Error(
          'Document not found'
        );
      }
    }

    if (
      document.client_id
    ) {
      try {
        await assertClientAccess(
          document.client_id,
          actor,
          options
        );

        return document;
      } catch {
        throw new Error(
          'Document not found'
        );
      }
    }

    if (
      document.uploaded_by ===
      actorId
    ) {
      return document;
    }

    throw new Error(
      'Document not found'
    );
  };

// ======================================================
// ASSERT DOCUMENT READ ACCESS
// ======================================================

const assertDocumentReadAccess =
  async (
    documentId,
    actor,
    options = {}
  ) => {
    requireActor(
      actor
    );

    const document =
      await Document.findByPk(
        documentId,
        {
          transaction:
            options.transaction,
        }
      );

    if (
      !document
    ) {
      throw new Error(
        'Document not found'
      );
    }

    if (
      isAdmin(
        actor
      ) ||
      document.is_public ===
        true
    ) {
      return document;
    }

    return assertDocumentAccess(
      documentId,
      actor,
      options
    );
  };

// ======================================================
// NORMAL INCLUDES
// ======================================================

const documentIncludes = [
  {
    model:
      User,

    as:
      'uploader',

    attributes: [
      'id',
      'first_name',
      'last_name',
    ],
  },

  {
    model:
      Case,

    as:
      'case',

    attributes: [
      'id',
      'title',
    ],

    required:
      false,
  },

  {
    model:
      Client,

    as:
      'client',

    attributes: [
      'id',
      'name',
    ],

    required:
      false,
  },

  {
    model:
      PowerOfAttorney,

    as:
      'powerOfAttorney',

    attributes: [
      'id',
      'title',
    ],

    required:
      false,
  },
];

// ======================================================
// SERVICE
// ======================================================

export const documentService = {

  // ====================================================
  // UPLOAD
  // ====================================================

  async upload(
    data,
    actor
  ) {
    const actorId =
      requireActor(
        actor
      );

    const {
      file,
      ...documentData
    } = data;

    if (
      !file?.buffer
    ) {
      throw new Error(
        'File is required'
      );
    }

    if (
      documentData.case_id
    ) {
      await assertCaseAccess(
        documentData.case_id,
        actor
      );
    }

    if (
      documentData.client_id
    ) {
      await assertClientAccess(
        documentData.client_id,
        actor
      );
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

    let fileWritten =
      false;

    try {
      await fsPromises.writeFile(
        storedPath,
        file.buffer,
        {
          flag:
            'wx',
        }
      );

      fileWritten =
        true;

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
              actorId,

            is_public:
              normalizeBoolean(
                documentData.is_public,
                false
              ),

            is_archived:
              false,

            metadata:
              normalizeMetadata(
                documentData.metadata
              ),

            version:
              1,

            parent_id:
              null,
          },
          {
            transaction,
          }
        );

      await transaction.commit();

      return document;
    } catch (
      error
    ) {
      await transaction.rollback();

      if (
        fileWritten
      ) {
        await fsPromises
          .unlink(
            storedPath
          )
          .catch(
            () => {}
          );
      }

      throw error;
    }
  },

  // ====================================================
  // VERSION UPLOAD
  // ====================================================

  async uploadVersion(
    documentId,
    data,
    actor
  ) {
    const actorId =
      requireActor(
        actor
      );

    const {
      file,
      ...versionData
    } = data;

    if (
      !file?.buffer
    ) {
      throw new Error(
        'New version file is required'
      );
    }

    const existing =
      await assertDocumentAccess(
        documentId,
        actor
      );

    const rootId =
      existing.parent_id ||
      existing.id;

    const rootDocument =
      existing.parent_id
        ? await assertDocumentAccess(
            rootId,
            actor
          )
        : existing;

    if (
      !rootDocument
    ) {
      throw new Error(
        'Document not found'
      );
    }

    const targetCaseId =
      versionData.case_id !==
      undefined
        ? versionData.case_id ||
          null
        : rootDocument.case_id;

    const targetClientId =
      versionData.client_id !==
      undefined
        ? versionData.client_id ||
          null
        : rootDocument.client_id;

    if (
      targetCaseId
    ) {
      await assertCaseAccess(
        targetCaseId,
        actor
      );
    }

    if (
      targetClientId
    ) {
      await assertClientAccess(
        targetClientId,
        actor
      );
    }

    const maxChildVersion =
      await Document.max(
        'version',
        {
          where: {
            [Op.or]: [
              {
                id:
                  rootId,
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
        Number(
          maxChildVersion
        ) || 1,
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

    let fileWritten =
      false;

    try {
      await fsPromises.writeFile(
        storedPath,
        file.buffer,
        {
          flag:
            'wx',
        }
      );

      fileWritten =
        true;

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
              targetCaseId,

            client_id:
              targetClientId,

            power_of_attorney_id:
              versionData.power_of_attorney_id !==
              undefined
                ? versionData.power_of_attorney_id ||
                  null
                : rootDocument.power_of_attorney_id,

            uploaded_by:
              actorId,

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
    } catch (
      error
    ) {
      await transaction.rollback();

      if (
        fileWritten
      ) {
        await fsPromises
          .unlink(
            storedPath
          )
          .catch(
            () => {}
          );
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
    actor,
  }) {
    const filters = {};

    if (
      !normalizeBoolean(
        include_archived,
        false
      )
    ) {
      filters.is_archived =
        false;
    }

    if (
      search?.trim()
    ) {
      const normalizedSearch =
        search.trim();

      filters[Op.or] = [
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

    if (
      category
    ) {
      filters.category =
        category;
    }

    if (
      case_id
    ) {
      filters.case_id =
        case_id;
    }

    if (
      client_id
    ) {
      filters.client_id =
        client_id;
    }

    if (
      power_of_attorney_id
    ) {
      filters.power_of_attorney_id =
        power_of_attorney_id;
    }

    const where =
      combineWhere(
        filters,
        buildDocumentReadAccessWhere(
          actor
        )
      );

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
      await Document.findAndCountAll({
        ...query,

        include:
          documentIncludes,

        distinct:
          true,
      });

    return {
      data:
        rows,

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

  async findOne(
    id,
    actor
  ) {
    await assertDocumentReadAccess(
      id,
      actor
    );

    const document =
      await Document.findByPk(
        id,
        {
          include:
            documentIncludes,
        }
      );

    if (
      !document
    ) {
      throw new Error(
        'Document not found'
      );
    }

    return document;
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data,
    actor
  ) {
    const document =
      await assertDocumentAccess(
        id,
        actor
      );

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

    const updateData =
      {};

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
      updateData.case_id !==
        undefined &&
      updateData.case_id
    ) {
      await assertCaseAccess(
        updateData.case_id,
        actor
      );
    }

    if (
      updateData.client_id !==
        undefined &&
      updateData.client_id
    ) {
      await assertClientAccess(
        updateData.client_id,
        actor
      );
    }

    if (
      updateData.name !==
      undefined
    ) {
      const name =
        String(
          updateData.name
        ).trim();

      if (
        !name
      ) {
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
      updateData.case_id !==
      undefined
    ) {
      updateData.case_id =
        updateData.case_id ||
        null;
    }

    if (
      updateData.client_id !==
      undefined
    ) {
      updateData.client_id =
        updateData.client_id ||
        null;
    }

    if (
      updateData.power_of_attorney_id !==
      undefined
    ) {
      updateData.power_of_attorney_id =
        updateData.power_of_attorney_id ||
        null;
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

    return this.findOne(
      id,
      actor
    );
  },

  // ====================================================
  // SOFT DELETE
  // ====================================================

  async remove(
    id,
    actor
  ) {
    const document =
      await assertDocumentAccess(
        id,
        actor
      );

    await document.destroy();

    return document;
  },

  // ====================================================
  // FILE PATH
  // ====================================================

  async getFilePath(
    documentOrId,
    actor
  ) {
    const documentId =
      typeof documentOrId ===
      'object'
        ? documentOrId?.id
        : documentOrId;

    if (
      !documentId
    ) {
      throw new Error(
        'Document not found'
      );
    }

    const document =
      await assertDocumentReadAccess(
        documentId,
        actor
      );

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

  // ====================================================
  // DOWNLOAD
  // ====================================================

  async download(
    documentOrId,
    actor
  ) {
    const filePath =
      await this.getFilePath(
        documentOrId,
        actor
      );

    return fs.createReadStream(
      filePath
    );
  },

  // ====================================================
  // UDF PREVIEW
  // ====================================================

  async getUdfPreview(
  documentOrId,
  actor
) {
  const documentId =
    typeof documentOrId ===
    'object'
      ? documentOrId?.id
      : documentOrId;

  if (
    !documentId
  ) {
    throw new Error(
      'Document not found'
    );
  }

  const document =
    await assertDocumentReadAccess(
      documentId,
      actor
    );

  if (
    !isUdfDocument(
      document
    )
  ) {
    throw new Error(
      'Document is not a UDF file'
    );
  }

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

  // ====================================================
  // READ UDF BUFFER
  // ====================================================

  let udfBuffer;

  try {
    udfBuffer =
      await fsPromises.readFile(
        filePath
      );
  } catch {
    throw new Error(
      'UDF file could not be read'
    );
  }

  if (
    !udfBuffer?.length
  ) {
    throw new Error(
      'UDF file is empty'
    );
  }

  /*
   * ZIP local-file signature.
   *
   * UDF normalde ZIP container'dır.
   */
  const hasZipSignature =
    udfBuffer.length >= 4 &&
    udfBuffer[0] === 0x50 &&
    udfBuffer[1] === 0x4b;

  if (
    !hasZipSignature
  ) {
    throw new Error(
      'UDF file is not a valid ZIP container'
    );
  }

  // ====================================================
  // ZIP READER
  //
  // 1. AdmZip
  // 2. unzipper fallback
  // ====================================================

  let entries =
    [];

  let getEntryBuffer =
    null;

  try {
    const zip =
      new AdmZip(
        udfBuffer
      );

    const admEntries =
      zip.getEntries();

    entries =
      admEntries.map(
        (
          entry
        ) => ({
          name:
            entry.entryName,

          size:
            Number(
              entry.header?.size
            ) || 0,

          source:
            entry,
        })
      );

    getEntryBuffer =
      async (
        entry
      ) => {
        return entry
          .source
          .getData();
      };
  } catch (
    admZipError
  ) {
    /*
     * Bazı geçerli ZIP varyantlarında AdmZip
     * merkezi dizin / END header yorumunda
     * başarısız olabiliyor.
     *
     * Bu durumda daha toleranslı unzipper
     * ile ikinci kez deniyoruz.
     */
    try {
      const directory =
        await unzipper.Open.buffer(
          udfBuffer
        );

      entries =
        directory.files.map(
          (
            entry
          ) => ({
            name:
              entry.path,

            size:
              Number(
                entry.uncompressedSize
              ) || 0,

            source:
              entry,
          })
        );

      getEntryBuffer =
        async (
          entry
        ) => {
          return entry
            .source
            .buffer();
        };
    } catch (
      unzipperError
    ) {
      console.error(
        'UDF ZIP open failed:',
        {
          documentId:
            document.id,

          fileName:
            document.original_name,

          fileSize:
            udfBuffer.length,

          signature:
            udfBuffer
              .subarray(
                0,
                16
              )
              .toString(
                'hex'
              ),

          admZipError:
            admZipError?.message,

          unzipperError:
            unzipperError?.message,
        }
      );

      throw new Error(
        'UDF container could not be opened'
      );
    }
  }

  // ====================================================
  // BASIC ZIP VALIDATION
  // ====================================================

  if (
    !Array.isArray(
      entries
    ) ||
    entries.length ===
      0
  ) {
    throw new Error(
      'UDF container is empty'
    );
  }

  if (
    entries.length >
    100
  ) {
    throw new Error(
      'UDF container contains too many files'
    );
  }

  // ====================================================
  // FIND CONTENT.XML
  // ====================================================

  /*
   * Bazı arşivlerde dosya root'ta olmayabilir.
   * basename üzerinden de kabul ediyoruz.
   */
  const contentEntry =
    entries.find(
      (
        entry
      ) =>
        path
          .basename(
            entry.name ||
            ''
          )
          .toLowerCase() ===
        'content.xml'
    );

  if (
    !contentEntry
  ) {
    throw new Error(
      'UDF content.xml not found'
    );
  }

  const MAX_UDF_XML_SIZE =
    5 *
    1024 *
    1024;

  if (
    contentEntry.size >
    MAX_UDF_XML_SIZE
  ) {
    throw new Error(
      'UDF document content is too large'
    );
  }

  // ====================================================
  // EXTRACT CONTENT.XML
  // ====================================================

  let contentBuffer;

  try {
    contentBuffer =
      await getEntryBuffer(
        contentEntry
      );
  } catch {
    throw new Error(
      'UDF content.xml could not be extracted'
    );
  }

  if (
    !contentBuffer?.length
  ) {
    throw new Error(
      'UDF content is empty'
    );
  }

  if (
    contentBuffer.length >
    MAX_UDF_XML_SIZE
  ) {
    throw new Error(
      'UDF document content is too large'
    );
  }

  const xml =
    contentBuffer.toString(
      'utf8'
    );

  if (
    !xml.trim()
  ) {
    throw new Error(
      'UDF content is empty'
    );
  }

  // ====================================================
  // XML PARSER
  // ====================================================

  const parser =
    new XMLParser({
      ignoreAttributes:
        false,

      attributeNamePrefix:
        '',

      trimValues:
        false,

      parseTagValue:
        false,

      parseAttributeValue:
        false,

      cdataPropName:
        '__cdata',
    });

  let parsed;

  try {
    parsed =
      parser.parse(
        xml
      );
  } catch {
    throw new Error(
      'UDF XML could not be parsed'
    );
  }

  /*
   * Normal UDF:
   *
   * <template>...</template>
   *
   * Namespace'li varyantlarda root key farklı
   * gelebileceği için ikinci kontrolü de yapıyoruz.
   */
  let template =
    parsed?.template ||
    null;

  if (
    !template &&
    parsed &&
    typeof parsed ===
      'object'
  ) {
    const templateKey =
      Object.keys(
        parsed
      ).find(
        (
          key
        ) =>
          key
            .toLowerCase()
            .endsWith(
              ':template'
            )
      );

    if (
      templateKey
    ) {
      template =
        parsed[
          templateKey
        ];
    }
  }

  if (
    !template
  ) {
    throw new Error(
      'UDF template not found'
    );
  }

  // ====================================================
  // CONTENT
  // ====================================================

  let rawContent =
    null;

  if (
    typeof template.content ===
    'string'
  ) {
    rawContent =
      template.content;
  } else if (
    template.content &&
    typeof template.content ===
      'object'
  ) {
    rawContent =
      template.content
        .__cdata ??
      template.content[
        '#text'
      ] ??
      '';
  }

  const content =
    String(
      rawContent ||
      ''
    );

  if (
    !content.trim()
  ) {
    throw new Error(
      'UDF document content is empty'
    );
  }

  // ====================================================
  // PAGE FORMAT
  // ====================================================

  const pageFormat =
    template.properties
      ?.pageFormat ||
    template.pageFormat ||
    template.pageformat ||
    {};

  const toNumber = (
    value,
    fallback = null
  ) => {
    const number =
      Number(
        value
      );

    return Number.isFinite(
      number
    )
      ? number
      : fallback;
  };

  const pointToMm = (
    value,
    fallback
  ) => {
    const number =
      toNumber(
        value
      );

    if (
      number === null ||
      number < 0
    ) {
      return fallback;
    }

    return Number(
      (
        number *
        0.352778
      ).toFixed(
        2
      )
    );
  };

  // ====================================================
  // DOCUMENT PROPERTIES
  // ====================================================

  let documentProperties =
    null;

  const propertiesEntry =
    entries.find(
      (
        entry
      ) => {
        const fileName =
          path
            .basename(
              entry.name ||
              ''
            )
            .toLowerCase();

        return (
          fileName ===
            'documentproperties.xml' ||
          fileName ===
            'properties.xml'
        );
      }
    );

  if (
    propertiesEntry &&
    propertiesEntry.size <=
      1024 * 1024
  ) {
    try {
      const propertiesBuffer =
        await getEntryBuffer(
          propertiesEntry
        );

      if (
        propertiesBuffer
          ?.length &&
        propertiesBuffer.length <=
          1024 * 1024
      ) {
        documentProperties =
          parser.parse(
            propertiesBuffer.toString(
              'utf8'
            )
          );
      }
    } catch {
      documentProperties =
        null;
    }
  }

  // ====================================================
  // SIGNATURE
  // ====================================================

  const signatureEntry =
    entries.find(
      (
        entry
      ) => {
        const fileName =
          path
            .basename(
              entry.name ||
              ''
            )
            .toLowerCase();

        return (
          fileName ===
            'sign.sgn' ||
          fileName ===
            'signature.p7s'
        );
      }
    );

  // ====================================================
  // RESPONSE
  // ====================================================

  return {
    id:
      document.id,

    name:
      document.name,

    original_name:
      document.original_name,

    file_type:
      'udf',

    mime_type:
      document.mime_type,

    version:
      document.version,

    format_version:
      template.format_id ||
      null,

    content,

    page: {
      width_mm:
        210,

      height_mm:
        297,

      orientation:
        String(
          pageFormat.paperOrientation ||
          '1'
        ),

      margins: {
        left:
          pointToMm(
            pageFormat.leftMargin,
            15
          ),

        right:
          pointToMm(
            pageFormat.rightMargin,
            15
          ),

        top:
          pointToMm(
            pageFormat.topMargin,
            15
          ),

        bottom:
          pointToMm(
            pageFormat.bottomMargin,
            15
          ),
      },
    },

    elements:
      template.elements ||
      null,

    document_properties:
      documentProperties,

    signature: {
      present:
        Boolean(
          signatureEntry
        ),

      verified:
        false,
    },
  };
},

  // ====================================================
  // VERSIONS
  // ====================================================

  async getVersions(
    documentId,
    actor
  ) {
    const document =
      await assertDocumentReadAccess(
        documentId,
        actor
      );

    const rootId =
      document.parent_id ||
      document.id;

    await assertDocumentReadAccess(
      rootId,
      actor
    );

    const where =
      combineWhere(
        {
          [Op.or]: [
            {
              id:
                rootId,
            },

            {
              parent_id:
                rootId,
            },
          ],
        },

        buildDocumentReadAccessWhere(
          actor
        )
      );

    return Document.findAll({
      where,

      include: [
        ...documentAccessIncludes,

        {
          model:
            User,

          as:
            'uploader',

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

  async getCategories(
    actor
  ) {
    const where =
      combineWhere(
        {
          is_archived:
            false,
        },

        buildDocumentReadAccessWhere(
          actor
        )
      );

    const documents =
      await Document.findAll({
        where,

        include:
          documentAccessIncludes,

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

        raw:
          true,
      });

    return documents
      .map(
        (
          document
        ) =>
          document.category
      )
      .filter(
        Boolean
      );
  },

  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics(
    actor
  ) {
    const accessWhere =
      buildDocumentReadAccessWhere(
        actor
      );

    const activeWhere =
      combineWhere(
        accessWhere,
        {
          is_archived:
            false,
        }
      );

    const archivedWhere =
      combineWhere(
        accessWhere,
        {
          is_archived:
            true,
        }
      );

    const [
      totalDocuments,
      totalSize,
      archivedDocuments,
      categories,
    ] =
      await Promise.all([
        Document.count({
          where:
            activeWhere,

          include:
            documentAccessIncludes,

          distinct:
            true,

          col:
            'id',
        }),

        Document.sum(
          'file_size',
          {
            where:
              activeWhere,

            include:
              documentAccessIncludes,
          }
        ),

        Document.count({
          where:
            archivedWhere,

          include:
            documentAccessIncludes,

          distinct:
            true,

          col:
            'id',
        }),

        Document.findAll({
          where:
            activeWhere,

          include:
            documentAccessIncludes,

          attributes: [
            'category',

            [
              Sequelize.fn(
                'COUNT',
                Sequelize.col(
                  'Document.id'
                )
              ),
              'count',
            ],
          ],

          group: [
            'category',
          ],

          raw:
            true,
        }),
      ]);

    const totalSizeMB =
      Number(
        (
          Number(
            totalSize
          ) /
          (1024 * 1024)
        ).toFixed(
          2
        )
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