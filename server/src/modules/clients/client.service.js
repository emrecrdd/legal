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
  Op,
} from 'sequelize';

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
        .map((item) =>
          String(item)
            .trim()
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
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value)
      .trim();

  return (
    normalized ||
    null
  );
};

const prepareClientData = (
  data
) => {
  const prepared = {
    ...data,
  };

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

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'phone'
    )
  ) {
    prepared.phone =
      normalizeNullableString(
        prepared.phone
      );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      prepared,
      'identification_number'
    )
  ) {
    prepared.identification_number =
      normalizeNullableString(
        prepared.identification_number
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
      'notes'
    )
  ) {
    prepared.notes =
      normalizeNullableString(
        prepared.notes
      );
  }

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
      'Bu e-posta için veritabanında mevcut bir benzersizlik kısıtı bulunuyor',

    phone:
      'Bu telefon için veritabanında mevcut bir benzersizlik kısıtı bulunuyor',
  };

  throw new Error(
    messages[field] ||
      'Bu değer başka bir kayıtta kullanılıyor'
  );
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
  // Liste endpoint'inde davaların tamamını taşımıyoruz.
  // Clientları page ile getirip sadece o sayfadaki
  // müvekkillerin dava ilişkisini ikinci hafif sorguda
  // alıyoruz.
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
    const safePage =
      Math.max(
        Number(page) ||
          1,
        1
      );

    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) ||
            10,
          1
        ),
        100
      );

    const where = {};

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
          identification_number:
            {
              [Op.iLike]:
                `%${normalizedSearch}%`,
            },
        },

        {
          city: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          district: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
      ];
    }

    if (status) {
      where.status =
        status;
    }

    if (client_type) {
      where.client_type =
        client_type;
    }

    if (city) {
      where.city = {
        [Op.iLike]:
          `%${String(
            city
          ).trim()}%`,
      };
    }

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

        distinct:
          true,

        order: [
          [
            'created_at',
            'DESC',
          ],
        ],
      });

    // ==================================================
    // CASE COUNT
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
       * Burada Client tablosunu tekrar çekiyoruz ama
       * sadece id + relation geliyor.
       *
       * Sayfa başına 10-25 client için çok hafif.
       * Büyük case payload taşınmıyor.
       */
      const clientsWithCases =
        await Client.findAll({
          where: {
            id: {
              [Op.in]:
                clientIds,
            },
          },

          attributes: [
            'id',
          ],

          include: [
            {
              model:
                Case,

              as:
                'cases',

              attributes: [
                'id',
              ],

              through: {
                attributes:
                  [],
              },

              required:
                false,
            },
          ],
        });

      clientsWithCases.forEach(
        (client) => {
          caseCountMap.set(
            client.id,
            Array.isArray(
              client.cases
            )
              ? client.cases
                  .length
              : 0
          );
        }
      );
    }

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

    const pagination =
      getPaginationData(
        count,
        safePage,
        safeLimit
      );

    return {
      data:
        resultRows,

      pagination,
    };
  },

  // ====================================================
  // DETAIL
  //
  // Client ana kaydı + ilişkiler paralel sorgular.
  //
  // cases/payment/notes tek dev JOIN'e sokulmuyor.
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
        // CASES - N:N
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

      // ==================================================
      // IMMUTABLE / SERVER CONTROLLED FIELDS
      // ==================================================

      delete preparedData.id;

      delete preparedData.created_by;

      delete preparedData.created_at;

      delete preparedData.updated_at;

      delete preparedData.deleted_at;

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
     * paranoid:true
     *
     * Fiziksel DELETE değil.
     * deleted_at set edilir.
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

        /*
         * Artık Case.client_id olmadığı için
         * total case sayısı direkt Case tablosundan.
         */
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
  // N:N
  // ====================================================

  async getCaseHistory(
    clientId
  ) {
    const client =
      await Client.findByPk(
        clientId,
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
      ],
    });
  },

  // ====================================================
  // NOTES
  // ====================================================

  async getNotes(
    clientId
  ) {
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