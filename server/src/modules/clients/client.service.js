import {
  Op,
  QueryTypes,
} from 'sequelize';

import {
  Client,
} from '../../models/Client.js';

import {
  Case,
} from '../../models/Case.js';

import {
  Payment,
} from '../../models/Payment.js';

import {
  Note,
} from '../../models/Note.js';

import {
  User,
} from '../../models/User.js';

import {
  sequelize,
} from '../../config/database.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

// ======================================================
// CONSTANTS
// ======================================================

const CLIENT_LIST_ATTRIBUTES = [
  'id',
  'name',
  'identification_number',
  'email',
  'phone',
  'city',
  'district',
  'client_type',
  'status',
  'tags',
  'created_by',
  'created_at',
  'updated_at',
];

const USER_SUMMARY_ATTRIBUTES = [
  'id',
  'first_name',
  'last_name',
];

const CLIENT_STATUSES =
  new Set([
    'active',
    'passive',
    'archived',
  ]);

const CLIENT_TYPES =
  new Set([
    'individual',
    'corporate',
  ]);

// ======================================================
// HELPERS
// ======================================================

const normalizeSearch = (
  value
) => {
  if (
    typeof value !==
    'string'
  ) {
    return '';
  }

  return value
    .trim()
    .slice(
      0,
      150
    );
};

const normalizeTags = (
  value
) => {
  if (!value) {
    return [];
  }

  const values =
    Array.isArray(
      value
    )
      ? value
      : String(
          value
        ).split(',');

  return [
    ...new Set(
      values
        .map(
          (item) =>
            String(
              item
            ).trim()
        )
        .filter(Boolean)
    ),
  ];
};

const normalizeNullableString = (
  value
) => {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    value ===
    null
  ) {
    return null;
  }

  const normalized =
    String(
      value
    ).trim();

  return (
    normalized ||
    null
  );
};

const normalizeIdentificationNumber = (
  value
) => {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    value ===
    null
  ) {
    return null;
  }

  const normalized =
    String(
      value
    )
      .replace(
        /\s+/g,
        ''
      )
      .trim();

  return (
    normalized ||
    null
  );
};

const normalizePhone = (
  value
) => {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    value ===
    null
  ) {
    return null;
  }

  const normalized =
    String(
      value
    )
      .trim()
      .replace(
        /\s+/g,
        ' '
      );

  return (
    normalized ||
    null
  );
};

const normalizePagination = (
  page,
  limit
) => {
  const safePage =
    Math.max(
      Number.parseInt(
        page,
        10
      ) || 1,
      1
    );

  const safeLimit =
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

  return {
    safePage,
    safeLimit,
  };
};

const prepareClientData = (
  data = {}
) => {
  const prepared = {
    ...data,
  };

  // ====================================================
  // SERVER CONTROLLED / IMMUTABLE
  // ====================================================

  delete prepared.id;
  delete prepared.created_at;
  delete prepared.updated_at;
  delete prepared.deleted_at;

  /*
   * UPDATE sırasında created_by değiştirilmemeli.
   * CREATE tarafında controller tarafından ekleniyor.
   *
   * Bu nedenle create/update ayrımı service metodunda
   * ayrıca kontrol edilecek.
   */

  // ====================================================
  // NAME
  // ====================================================

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'name'
    )
  ) {
    prepared.name =
      String(
        prepared.name ||
          ''
      ).trim();
  }

  // ====================================================
  // IDENTIFICATION
  // ====================================================

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'identification_number'
    )
  ) {
    prepared.identification_number =
      normalizeIdentificationNumber(
        prepared.identification_number
      );
  }

  // ====================================================
  // EMAIL
  // ====================================================

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'email'
    )
  ) {
    const email =
      normalizeNullableString(
        prepared.email
      );

    prepared.email =
      email
        ? email.toLowerCase()
        : null;
  }

  // ====================================================
  // PHONE
  // ====================================================

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'phone'
    )
  ) {
    prepared.phone =
      normalizePhone(
        prepared.phone
      );
  }

  // ====================================================
  // ADDRESS
  // ====================================================

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'address'
    )
  ) {
    prepared.address =
      normalizeNullableString(
        prepared.address
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'city'
    )
  ) {
    prepared.city =
      normalizeNullableString(
        prepared.city
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'district'
    )
  ) {
    prepared.district =
      normalizeNullableString(
        prepared.district
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'postal_code'
    )
  ) {
    prepared.postal_code =
      normalizeNullableString(
        prepared.postal_code
      );
  }

  // ====================================================
  // NOTES
  // ====================================================

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'notes'
    )
  ) {
    prepared.notes =
      normalizeNullableString(
        prepared.notes
      );
  }

  // ====================================================
  // TAGS
  // ====================================================

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'tags'
    )
  ) {
    prepared.tags =
      normalizeTags(
        prepared.tags
      );
  }

  return prepared;
};

const validateClientData = (
  data,
  {
    partial = false,
  } = {}
) => {
  // ====================================================
  // NAME
  // ====================================================

  if (
    !partial ||
    Object.prototype.hasOwnProperty.call(
      data,
      'name'
    )
  ) {
    const name =
      String(
        data.name ||
          ''
      ).trim();

    if (!name) {
      throw new Error(
        'Müvekkil adı gereklidir'
      );
    }

    if (
      name.length <
      2
    ) {
      throw new Error(
        'Müvekkil adı en az 2 karakter olmalıdır'
      );
    }

    if (
      name.length >
      255
    ) {
      throw new Error(
        'Müvekkil adı en fazla 255 karakter olabilir'
      );
    }
  }

  // ====================================================
  // CLIENT TYPE
  // ====================================================

  if (
    data.client_type !==
      undefined &&
    !CLIENT_TYPES.has(
      data.client_type
    )
  ) {
    throw new Error(
      'Geçersiz müvekkil türü'
    );
  }

  // ====================================================
  // STATUS
  // ====================================================

  if (
    data.status !==
      undefined &&
    !CLIENT_STATUSES.has(
      data.status
    )
  ) {
    throw new Error(
      'Geçersiz müvekkil durumu'
    );
  }

  // ====================================================
  // IDENTIFICATION
  // ====================================================

  if (
    data.identification_number
  ) {
    const identificationNumber =
      String(
        data.identification_number
      );

    if (
      !/^\d+$/.test(
        identificationNumber
      )
    ) {
      throw new Error(
        'TCKNO/VKN yalnızca rakamlardan oluşmalıdır'
      );
    }

    const clientType =
      data.client_type;

    if (
      clientType ===
        'corporate' &&
      identificationNumber.length !==
        10
    ) {
      throw new Error(
        'VKN 10 haneli olmalıdır'
      );
    }

    if (
      clientType ===
        'individual' &&
      identificationNumber.length !==
        11
    ) {
      throw new Error(
        'TCKNO 11 haneli olmalıdır'
      );
    }

    /*
     * UPDATE request'i client_type göndermeyebilir.
     * Bu durumda model tarafındaki genel uzunluk
     * kontrolünü bozmayalım.
     */

    if (
      !clientType &&
      ![
        10,
        11,
      ].includes(
        identificationNumber.length
      )
    ) {
      throw new Error(
        'TCKNO 11, VKN 10 haneli olmalıdır'
      );
    }
  }

  // ====================================================
  // EMAIL
  // ====================================================

  if (
    data.email
  ) {
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(
        data.email
      )
    ) {
      throw new Error(
        'Geçerli bir e-posta adresi girilmelidir'
      );
    }
  }
};

const handleUniqueConstraint = (
  error
) => {
  if (
    error?.name !==
    'SequelizeUniqueConstraintError'
  ) {
    throw error;
  }

  const field =
    error?.errors?.[0]
      ?.path;

  const messages = {
    identification_number:
      'Bu TCKNO/VKN başka bir müvekkil kaydında kullanılıyor',

    email:
      'Bu e-posta adresi başka bir müvekkil kaydında kullanılıyor',

    phone:
      'Bu telefon numarası başka bir müvekkil kaydında kullanılıyor',
  };

  throw new Error(
    messages[field] ||
      'Bu değer başka bir müvekkil kaydında kullanılıyor'
  );
};

const assertClientExists = async (
  id
) => {
  const client =
    await Client.findByPk(
      id,
      {
        attributes: [
          'id',
        ],
      }
    );

  if (!client) {
    throw new Error(
      'Client not found'
    );
  }

  return client;
};

// ======================================================
// SERVICE
// ======================================================

export const clientService = {
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data
  ) {
    try {
      const preparedData =
        prepareClientData(
          data
        );

      validateClientData(
        preparedData
      );

      return await Client.create(
        preparedData
      );
    } catch (error) {
      handleUniqueConstraint(
        error
      );
    }
  },

  // ====================================================
  // LIST
  //
  // Liste endpoint'i sadece ihtiyaç duyulan client
  // alanlarını getirir.
  //
  // Case kayıtlarının tamamı JOIN edilmez.
  // Sayfadaki client'ların dava sayıları junction
  // table üzerinde GROUP BY ile hesaplanır.
  // ====================================================

  async findAll({
    page = 1,
    limit = 10,
    search,
    status,
    client_type,
    tags,
    city,
  }) {
    const {
      safePage,
      safeLimit,
    } =
      normalizePagination(
        page,
        limit
      );

    const where = {};

    // ==================================================
    // SEARCH
    // ==================================================

    const normalizedSearch =
      normalizeSearch(
        search
      );

    if (
      normalizedSearch
    ) {
      where[Op.or] = [
        {
          name: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          email: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          phone: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          identification_number: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
      ];
    }

    // ==================================================
    // STATUS
    // ==================================================

    if (
      status &&
      CLIENT_STATUSES.has(
        status
      )
    ) {
      where.status =
        status;
    }

    // ==================================================
    // CLIENT TYPE
    // ==================================================

    if (
      client_type &&
      CLIENT_TYPES.has(
        client_type
      )
    ) {
      where.client_type =
        client_type;
    }

    // ==================================================
    // CITY
    // ==================================================

    const normalizedCity =
      normalizeSearch(
        city
      );

    if (
      normalizedCity
    ) {
      where.city = {
        [Op.iLike]:
          `%${normalizedCity}%`,
      };
    }

    // ==================================================
    // TAGS
    // ==================================================

    const normalizedTags =
      normalizeTags(
        tags
      );

    if (
      normalizedTags.length >
      0
    ) {
      where.tags = {
        [Op.overlap]:
          normalizedTags,
      };
    }

    // ==================================================
    // PAGINATED CLIENT QUERY
    // ==================================================

    const query =
      paginate(
        {
          where,

          attributes:
            CLIENT_LIST_ATTRIBUTES,
        },
        safePage,
        safeLimit
      );

    const {
      count,
      rows,
    } =
      await Client.findAndCountAll({
        ...query,

        include: [
          {
            model:
              User,

            as:
              'creator',

            attributes:
              USER_SUMMARY_ATTRIBUTES,

            required:
              false,
          },
        ],

        /*
         * Burada belongsTo dışında çoğaltıcı JOIN yok.
         * Bu yüzden DISTINCT kullanmıyoruz.
         */

        order: [
          [
            'created_at',
            'DESC',
          ],

          /*
           * Aynı timestamp'e sahip kayıtların pagination
           * sırası değişmesin diye deterministic tie-break.
           */
          [
            'id',
            'DESC',
          ],
        ],
      });

    // ==================================================
    // CASE COUNTS
    // ==================================================

    const clientIds =
      rows.map(
        (client) =>
          client.id
      );

    const caseCountMap =
      new Map();

    if (
      clientIds.length >
      0
    ) {
      /*
       * Case modellerini hydrate etmiyoruz.
       *
       * Sadece case_clients junction table:
       *
       * client_id | case_count
       */

      const caseCounts =
        await sequelize.query(
          `
            SELECT
              client_id,
              COUNT(*)::int AS case_count
            FROM case_clients
            WHERE client_id IN (:clientIds)
            GROUP BY client_id
          `,
          {
            replacements: {
              clientIds,
            },

            type:
              QueryTypes.SELECT,
          }
        );

      caseCounts.forEach(
        (row) => {
          caseCountMap.set(
            row.client_id,
            Number(
              row.case_count
            ) || 0
          );
        }
      );
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    const resultRows =
      rows.map(
        (client) => {
          const plain =
            client.toJSON();

          return {
            ...plain,

            case_count:
              caseCountMap.get(
                client.id
              ) || 0,
          };
        }
      );

    return {
      data:
        resultRows,

      pagination:
        getPaginationData(
          count,
          safePage,
          safeLimit
        ),
    };
  },

  // ====================================================
  // DETAIL
  //
  // Tek dev JOIN yerine client ana kaydı önce alınır.
  // Case, payment ve note sorguları paralel çalıştırılır.
  //
  // Böylece cases × payments × notes şeklinde
  // Cartesian satır çoğalması oluşmaz.
  // ====================================================

  async findOne(
    id
  ) {
    const client =
      await Client.findByPk(
        id,
        {
          include: [
            {
              model:
                User,

              as:
                'creator',

              attributes:
                USER_SUMMARY_ATTRIBUTES,

              required:
                false,
            },
          ],
        }
      );

    if (!client) {
      throw new Error(
        'Client not found'
      );
    }

    const [
      cases,
      payments,
      notes,
    ] =
      await Promise.all([
        // ================================================
        // CASES
        // ================================================

        Case.findAll({
          include: [
            {
              model:
                Client,

              as:
                'clients',

              where: {
                id,
              },

              attributes:
                [],

              through: {
                attributes:
                  [],
              },

              required:
                true,
            },

            {
              model:
                User,

              as:
                'creator',

              attributes:
                USER_SUMMARY_ATTRIBUTES,

              required:
                false,
            },

            {
              model:
                User,

              as:
                'assignee',

              attributes:
                USER_SUMMARY_ATTRIBUTES,

              required:
                false,
            },
          ],

          order: [
            [
              'created_at',
              'DESC',
            ],
          ],
        }),

        // ================================================
        // PAYMENTS
        // ================================================

        Payment.findAll({
          where: {
            client_id:
              id,
          },

          order: [
            [
              'payment_date',
              'DESC',
            ],

            [
              'created_at',
              'DESC',
            ],
          ],
        }),

        // ================================================
        // NOTES
        // ================================================

        Note.findAll({
          where: {
            client_id:
              id,
          },

          include: [
            {
              model:
                User,

              as:
                'creator',

              attributes:
                USER_SUMMARY_ATTRIBUTES,

              required:
                false,
            },
          ],

          order: [
            [
              'created_at',
              'DESC',
            ],
          ],
        }),
      ]);

    const plain =
      client.toJSON();

    return {
      ...plain,

      cases,

      payments,

      clientNotes:
        notes,

      summary: {
        case_count:
          cases.length,

        payment_count:
          payments.length,

        note_count:
          notes.length,
      },
    };
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data
  ) {
    try {
      const client =
        await Client.findByPk(
          id
        );

      if (!client) {
        throw new Error(
          'Client not found'
        );
      }

      const preparedData =
        prepareClientData(
          data
        );

      /*
       * Server controlled.
       */
      delete preparedData.created_by;

      /*
       * Partial update olduğu için gönderilmeyen alanlar
       * validation'a zorlanmaz.
       *
       * identification_number gönderilip client_type
       * gönderilmediyse mevcut client_type validation
       * için kullanılır.
       */

      const validationData = {
        ...preparedData,

        client_type:
          preparedData.client_type ??
          client.client_type,
      };

      validateClientData(
        validationData,
        {
          partial:
            true,
        }
      );

      await client.update(
        preparedData
      );

      return Client.findByPk(
        id,
        {
          include: [
            {
              model:
                User,

              as:
                'creator',

              attributes:
                USER_SUMMARY_ATTRIBUTES,

              required:
                false,
            },
          ],
        }
      );
    } catch (error) {
      handleUniqueConstraint(
        error
      );
    }
  },

  // ====================================================
  // REMOVE
  // ====================================================

  async remove(
    id
  ) {
    const client =
      await Client.findByPk(
        id
      );

    if (!client) {
      throw new Error(
        'Client not found'
      );
    }

    /*
     * Client model paranoid:true olduğu için
     * fiziksel DELETE gerçekleşmez.
     *
     * deleted_at doldurulur.
     */
    await client.destroy();

    return client;
  },

  // ====================================================
  // STATISTICS
  // ====================================================

  async getStatistics() {
    const [
      totalClients,
      activeClients,
      passiveClients,
      archivedClients,
      individualClients,
      corporateClients,
      totalCases,
      totalPayments,
    ] =
      await Promise.all([
        Client.count(),

        Client.count({
          where: {
            status:
              'active',
          },
        }),

        Client.count({
          where: {
            status:
              'passive',
          },
        }),

        Client.count({
          where: {
            status:
              'archived',
          },
        }),

        Client.count({
          where: {
            client_type:
              'individual',
          },
        }),

        Client.count({
          where: {
            client_type:
              'corporate',
          },
        }),

        Case.count(),

        Payment.sum(
          'amount',
          {
            where: {
              status:
                'completed',
            },
          }
        ),
      ]);

    return {
      totalClients,

      activeClients,

      passiveClients,

      archivedClients,

      individualClients,

      corporateClients,

      totalCases,

      totalPayments:
        Number(
          totalPayments
        ) || 0,
    };
  },

  // ====================================================
  // CASE HISTORY
  // ====================================================

  async getCaseHistory(
    clientId
  ) {
    await assertClientExists(
      clientId
    );

    return Case.findAll({
      include: [
        {
          model:
            Client,

          as:
            'clients',

          where: {
            id:
              clientId,
          },

          attributes:
            [],

          through: {
            attributes:
              [],
          },

          required:
            true,
        },

        {
          model:
            User,

          as:
            'creator',

          attributes:
            USER_SUMMARY_ATTRIBUTES,

          required:
            false,
        },

        {
          model:
            User,

          as:
            'assignee',

          attributes:
            USER_SUMMARY_ATTRIBUTES,

          required:
            false,
        },
      ],

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },

  // ====================================================
  // PAYMENTS
  // ====================================================

  async getPayments(
    clientId
  ) {
    await assertClientExists(
      clientId
    );

    return Payment.findAll({
      where: {
        client_id:
          clientId,
      },

      order: [
        [
          'payment_date',
          'DESC',
        ],

        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },

  // ====================================================
  // NOTES
  // ====================================================

  async getNotes(
    clientId
  ) {
    await assertClientExists(
      clientId
    );

    return Note.findAll({
      where: {
        client_id:
          clientId,
      },

      include: [
        {
          model:
            User,

          as:
            'creator',

          attributes:
            USER_SUMMARY_ATTRIBUTES,

          required:
            false,
        },
      ],

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
  },
};

export default clientService;