import {
  Op,
} from 'sequelize';

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import unzipper from 'unzipper';
import {
  fileURLToPath,
} from 'url';

import AdmZip from 'adm-zip';

import {
  XMLParser,
} from 'fast-xml-parser';

import {
  Template,
} from '../../models/Template.js';

import {
  User,
} from '../../models/User.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

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
    recursive:
      true,
  }
);

// ======================================================
// HELPERS
// ======================================================

const resolveTemplateFilePath = (
  fileUrl
) => {
  if (
    !fileUrl
  ) {
    throw new Error(
      'Template file not found'
    );
  }

  const filename =
    path.basename(
      fileUrl
    );

  const resolved =
    path.resolve(
      UPLOAD_DIR,
      filename
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
      'Invalid template file path'
    );
  }

  return resolved;
};

const isUdfTemplate = (
  template
) => {
  const extension =
    path
      .extname(
        template?.file_name ||
        ''
      )
      .toLowerCase();

  return (
    extension === '.udf'
  );
};

const pointToMm = (
  value,
  fallback
) => {
  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return fallback;
  }

  return Number(
    (
      numeric *
      0.352777778
    ).toFixed(
      2
    )
  );
};

// ======================================================
// SERVICE
// ======================================================

export const templateService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data
  ) {
    return Template.create(
      data
    );
  },

  // ====================================================
  // FIND ALL
  // ====================================================

  async findAll({
    page,
    limit,
    category,
    law_area,
    search,
  }) {
    const where =
      {};

    if (
      category
    ) {
      where.category =
        category;
    }

    if (
      law_area
    ) {
      where.law_area =
        law_area;
    }

    if (
      search
    ) {
      where[
        Op.or
      ] = [
        {
          title: {
            [Op.iLike]:
              `%${search}%`,
          },
        },

        {
          description: {
            [Op.iLike]:
              `%${search}%`,
          },
        },
      ];
    }

    const query =
      paginate(
        {
          where,
        },
        page,
        limit
      );

    const {
      count,
      rows,
    } =
      await Template.findAndCountAll({
        ...query,

        include: [
          {
            model:
              User,

            as:
              'creator',

            attributes: [
              'id',
              'first_name',
              'last_name',
            ],
          },
        ],

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],
      });

    return {
      data:
        rows,

      pagination:
        getPaginationData(
          count,
          page,
          limit
        ),
    };
  },

  // ====================================================
  // FIND ONE
  // ====================================================

  async findOne(
    id
  ) {
    const template =
      await Template.findByPk(
        id,
        {
          include: [
            {
              model:
                User,

              as:
                'creator',

              attributes: [
                'id',
                'first_name',
                'last_name',
              ],
            },

            {
              model:
                User,

              as:
                'updater',

              attributes: [
                'id',
                'first_name',
                'last_name',
              ],
            },
          ],
        }
      );

    if (
      !template
    ) {
      throw new Error(
        'Template not found'
      );
    }

    return template;
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data
  ) {
    const template =
      await Template.findByPk(
        id
      );

    if (
      !template
    ) {
      throw new Error(
        'Template not found'
      );
    }

    await template.update(
      data
    );

    return template;
  },

  // ====================================================
  // REMOVE
  // ====================================================

  async remove(
    id
  ) {
    const template =
      await Template.findByPk(
        id
      );

    if (
      !template
    ) {
      throw new Error(
        'Template not found'
      );
    }

    await template.destroy();

    return template;
  },

  // ====================================================
  // DOWNLOAD COUNT
  // ====================================================

  async incrementDownload(
    id
  ) {
    const template =
      await Template.findByPk(
        id
      );

    if (
      !template
    ) {
      throw new Error(
        'Template not found'
      );
    }

    await template.increment(
      'download_count'
    );

    return template;
  },

  // ====================================================
  // FILE PATH
  // ====================================================

  async getFilePath(
    id
  ) {
    const template =
      await this.findOne(
        id
      );

    if (
      !template.file_url
    ) {
      throw new Error(
        'Dosya bulunamadı'
      );
    }

    const filePath =
      resolveTemplateFilePath(
        template.file_url
      );

    try {
      await fsPromises.access(
        filePath
      );
    } catch {
      throw new Error(
        'Dosya bulunamadı'
      );
    }

    return {
      template,
      filePath,
    };
  },

  // ====================================================
  // UDF PREVIEW
  // ====================================================

  async getUdfPreview(
  id
) {
  const {
    template,
    filePath,
  } =
    await this.getFilePath(
      id
    );

  if (
    !isUdfTemplate(
      template
    )
  ) {
    throw new Error(
      'Template is not a UDF file'
    );
  }

  // ====================================================
  // READ UDF
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

  const MAX_XML_SIZE =
    5 *
    1024 *
    1024;

  // ====================================================
  // FORMAT DETECTION
  // ====================================================

  const hasZipSignature =
    udfBuffer.length >= 4 &&
    udfBuffer[0] === 0x50 &&
    udfBuffer[1] === 0x4b;

  const beginning =
    udfBuffer
      .subarray(
        0,
        Math.min(
          udfBuffer.length,
          512
        )
      )
      .toString(
        'utf8'
      )
      .replace(
        /^\uFEFF/,
        ''
      )
      .trimStart();

  const isRawXml =
    beginning.startsWith(
      '<?xml'
    ) ||
    beginning.startsWith(
      '<template'
    );

  if (
    !hasZipSignature &&
    !isRawXml
  ) {
    throw new Error(
      'Unsupported UDF file format'
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

  let xml =
    null;

  let entries =
    [];

  let getEntryBuffer =
    null;

  let hasSignature =
    false;

  // ====================================================
  // ZIP UDF
  // ====================================================

  if (
    hasZipSignature
  ) {
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
          'Template UDF ZIP open failed:',
          {
            templateId:
              template.id,

            fileName:
              template.file_name,

            fileSize:
              udfBuffer.length,

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

    // ==================================================
    // ZIP VALIDATION
    // ==================================================

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

    // ==================================================
    // CONTENT.XML
    // ==================================================

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

    if (
      contentEntry.size >
      MAX_XML_SIZE
    ) {
      throw new Error(
        'UDF document content is too large'
      );
    }

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
      MAX_XML_SIZE
    ) {
      throw new Error(
        'UDF document content is too large'
      );
    }

    xml =
      contentBuffer.toString(
        'utf8'
      );

    // ==================================================
    // SIGNATURE
    // ==================================================

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

    hasSignature =
      Boolean(
        signatureEntry
      );
  }

  // ====================================================
  // RAW XML UDF
  // ====================================================

  if (
    isRawXml
  ) {
    if (
      udfBuffer.length >
      MAX_XML_SIZE
    ) {
      throw new Error(
        'UDF document content is too large'
      );
    }

    xml =
      udfBuffer
        .toString(
          'utf8'
        )
        .replace(
          /^\uFEFF/,
          ''
        );

    hasSignature =
      false;
  }

  // ====================================================
  // XML VALIDATION
  // ====================================================

  if (
    !xml ||
    !xml.trim()
  ) {
    throw new Error(
      'UDF content is empty'
    );
  }

  // ====================================================
  // PARSE XML
  // ====================================================

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

  // ====================================================
  // TEMPLATE ROOT
  // ====================================================

  let templateData =
    parsed?.template ||
    null;

  if (
    !templateData &&
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
      templateData =
        parsed[
          templateKey
        ];
    }
  }

  if (
    !templateData
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
    typeof templateData.content ===
    'string'
  ) {
    rawContent =
      templateData.content;
  } else if (
    templateData.content &&
    typeof templateData.content ===
      'object'
  ) {
    rawContent =
      templateData.content
        .__cdata ??
      templateData.content[
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
    templateData.properties
      ?.pageFormat ||
    templateData.pageFormat ||
    templateData.pageformat ||
    {};

  // ====================================================
  // RESPONSE
  // ====================================================

  return {
    id:
      template.id,

    title:
      template.title,

    file_name:
      template.file_name,

    content,

    elements:
      templateData.elements ||
      null,

    format_version:
      templateData.format_id ||
      null,

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

    signature: {
      present:
        hasSignature,

      verified:
        false,
    },

    container_type:
      hasZipSignature
        ? 'zip'
        : 'xml',
  };
},

  // ====================================================
  // META
  // ====================================================

  async getCategories() {
    const categories =
      await Template.findAll({
        attributes: [
          'category',
        ],

        group: [
          'category',
        ],
      });

    return categories
      .map(
        (
          item
        ) =>
          item.category
      )
      .filter(
        Boolean
      );
  },

  async getLawAreas() {
    const lawAreas =
      await Template.findAll({
        attributes: [
          'law_area',
        ],

        group: [
          'law_area',
        ],
      });

    return lawAreas
      .map(
        (
          item
        ) =>
          item.law_area
      )
      .filter(
        Boolean
      );
  },
};