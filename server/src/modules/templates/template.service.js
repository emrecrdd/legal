import {
  Op,
} from 'sequelize';

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

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

    let zip;

    try {
      zip =
        new AdmZip(
          filePath
        );
    } catch {
      throw new Error(
        'UDF container could not be opened'
      );
    }

    const entries =
      zip.getEntries();

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

    const contentEntry =
      entries.find(
        (
          entry
        ) =>
          entry.entryName
            ?.toLowerCase() ===
          'content.xml'
      );

    if (
      !contentEntry
    ) {
      throw new Error(
        'UDF content.xml not found'
      );
    }

    const MAX_XML_SIZE =
      5 *
      1024 *
      1024;

    if (
      Number(
        contentEntry.header
          ?.size
      ) >
      MAX_XML_SIZE
    ) {
      throw new Error(
        'UDF document content is too large'
      );
    }

    let contentBuffer;

    try {
      contentBuffer =
        contentEntry.getData();
    } catch {
      throw new Error(
        'UDF content.xml could not be extracted'
      );
    }

    if (
      !contentBuffer?.length ||
      contentBuffer.length >
        MAX_XML_SIZE
    ) {
      throw new Error(
        'UDF content is invalid'
      );
    }

    const xml =
      contentBuffer.toString(
        'utf8'
      );

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

    const templateData =
      parsed?.template;

    if (
      !templateData
    ) {
      throw new Error(
        'UDF template not found'
      );
    }

    // ==================================================
    // CONTENT
    // ==================================================

    let content =
      '';

    if (
      typeof templateData.content ===
      'string'
    ) {
      content =
        templateData.content;
    } else if (
      typeof templateData.content?.__cdata ===
      'string'
    ) {
      content =
        templateData.content.__cdata;
    } else if (
      templateData.content !==
      undefined &&
      templateData.content !==
      null
    ) {
      content =
        String(
          templateData.content
        );
    }

    // ==================================================
    // PAGE FORMAT
    // ==================================================

    const pageFormat =
      templateData.pageFormat ||
      templateData.pageformat ||
      {};

    // ==================================================
    // SIGNATURE
    // ==================================================

    const signatureEntry =
      entries.find(
        (
          entry
        ) =>
          entry.entryName
            ?.toLowerCase() ===
          'sign.sgn'
      );

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
          Boolean(
            signatureEntry
          ),

        verified:
          false,
      },
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