import {
  Op,
} from 'sequelize';

import {
  CaseParty,
} from '../../models/CaseParty.js';

import {
  Case,
} from '../../models/Case.js';

import {
  paginate,
  getPaginationData,
} from '../../utils/paginate.js';

// ======================================================
// CONSTANTS
// ======================================================

const PARTY_TYPES =
  new Set([
    'davaci',
    'davali',
    'supheli',
    'sanik',
    'musteki',
    'katilan',
    'magdur',
    'maktul',
    'alacakli',
    'borclu',
    'ucuncu_kisi',
  ]);

const ENTITY_TYPES =
  new Set([
    'person',
    'company',
  ]);

// ======================================================
// HELPERS
// ======================================================

const normalizeNullable = (
  value
) => {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return (
    normalized ||
    null
  );
};

const normalizePartyData = (
  data
) => {
  const normalized = {
    ...data,
  };

  [
    'name',
    'identification_number',
    'tax_office',
    'phone',
    'email',
    'address',
    'lawyer_name',
    'lawyer_phone',
    'lawyer_email',
    'lawyer_registry_number',
    'notes',
  ].forEach(
    (
      field
    ) => {
      if (
        Object.prototype
          .hasOwnProperty
          .call(
            normalized,
            field
          )
      ) {
        normalized[field] =
          normalizeNullable(
            normalized[field]
          );
      }
    }
  );

  if (
    normalized.email
  ) {
    normalized.email =
      normalized.email.toLowerCase();
  }

  if (
    normalized.lawyer_email
  ) {
    normalized.lawyer_email =
      normalized.lawyer_email.toLowerCase();
  }

  return normalized;
};

const validatePartyData = (
  data,
  {
    partial = false,
  } = {}
) => {
  if (
    !partial ||
    data.party_type !==
      undefined
  ) {
    if (
      !PARTY_TYPES.has(
        data.party_type
      )
    ) {
      throw new Error(
        'Geçersiz taraf türü'
      );
    }
  }

  if (
    !partial ||
    data.entity_type !==
      undefined
  ) {
    if (
      !ENTITY_TYPES.has(
        data.entity_type ||
        'person'
      )
    ) {
      throw new Error(
        'Geçersiz kişi / kurum türü'
      );
    }
  }

  if (
    !partial ||
    data.name !==
      undefined
  ) {
    const name =
      String(
        data.name || ''
      ).trim();

    if (
      name.length <
      2
    ) {
      throw new Error(
        'Taraf adı gereklidir'
      );
    }
  }
};

// ======================================================
// SERVICE
// ======================================================

export const casePartyService = {
  async create(
    data
  ) {
    const normalized =
      normalizePartyData(
        data
      );

    validatePartyData(
      normalized
    );

    if (
      !normalized.case_id
    ) {
      throw new Error(
        'Dava seçilmelidir'
      );
    }

    const caseItem =
      await Case.findByPk(
        normalized.case_id,
        {
          attributes: [
            'id',
          ],
        }
      );

    if (
      !caseItem
    ) {
      throw new Error(
        'Dava bulunamadı'
      );
    }

    /*
     * Aynı davaya aynı kimlik numarasıyla aynı tarafı
     * yanlışlıkla ikinci kez eklemeyi engelle.
     */
    if (
      normalized.identification_number
    ) {
      const duplicate =
        await CaseParty.findOne({
          where: {
            case_id:
              normalized.case_id,

            identification_number:
              normalized.identification_number,
          },
        });

      if (
        duplicate
      ) {
        throw new Error(
          'Bu kimlik numarasına sahip taraf davada zaten mevcut'
        );
      }
    }

    return CaseParty.create(
      normalized
    );
  },

  async findByCase(
    caseId
  ) {
    const caseItem =
      await Case.findByPk(
        caseId,
        {
          attributes: [
            'id',
          ],
        }
      );

    if (
      !caseItem
    ) {
      throw new Error(
        'Dava bulunamadı'
      );
    }

    return CaseParty.findAll({
      where: {
        case_id:
          caseId,
      },

      order: [
        [
          'party_type',
          'ASC',
        ],

        [
          'name',
          'ASC',
        ],
      ],
    });
  },

  async findOne(
    id
  ) {
    const party =
      await CaseParty.findByPk(
        id
      );

    if (
      !party
    ) {
      throw new Error(
        'Taraf bulunamadı'
      );
    }

    return party;
  },

  async update(
    id,
    data
  ) {
    const party =
      await CaseParty.findByPk(
        id
      );

    if (
      !party
    ) {
      throw new Error(
        'Taraf bulunamadı'
      );
    }

    const normalized =
      normalizePartyData(
        data
      );

    delete normalized.id;
    delete normalized.case_id;
    delete normalized.created_at;
    delete normalized.updated_at;
    delete normalized.deleted_at;

    validatePartyData(
      normalized,
      {
        partial:
          true,
      }
    );

    if (
      normalized.identification_number &&
      normalized.identification_number !==
        party.identification_number
    ) {
      const duplicate =
        await CaseParty.findOne({
          where: {
            case_id:
              party.case_id,

            identification_number:
              normalized.identification_number,

            id: {
              [Op.ne]:
                party.id,
            },
          },
        });

      if (
        duplicate
      ) {
        throw new Error(
          'Bu kimlik numarasına sahip taraf davada zaten mevcut'
        );
      }
    }

    await party.update(
      normalized
    );

    return party;
  },

  async remove(
    id
  ) {
    const party =
      await CaseParty.findByPk(
        id
      );

    if (
      !party
    ) {
      throw new Error(
        'Taraf bulunamadı'
      );
    }

    await party.destroy();

    return party;
  },

  async findAll({
    case_id,
    page = 1,
    limit = 10,
    party_type,
    search,
  }) {
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

    const where = {};

    if (
      case_id
    ) {
      where.case_id =
        case_id;
    }

    if (
      party_type
    ) {
      if (
        !PARTY_TYPES.has(
          party_type
        )
      ) {
        throw new Error(
          'Geçersiz taraf türü'
        );
      }

      where.party_type =
        party_type;
    }

    const normalizedSearch =
      String(
        search || ''
      )
        .trim()
        .slice(
          0,
          150
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
          identification_number: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },

        {
          lawyer_name: {
            [Op.iLike]:
              `%${normalizedSearch}%`,
          },
        },
      ];
    }

    const query =
      paginate(
        {
          where,
        },
        safePage,
        safeLimit
      );

    const {
      count,
      rows,
    } =
      await CaseParty.findAndCountAll({
        ...query,

        order: [
          [
            'party_type',
            'ASC',
          ],

          [
            'name',
            'ASC',
          ],
        ],
      });

    return {
      data:
        rows,

      pagination:
        getPaginationData(
          count,
          safePage,
          safeLimit
        ),
    };
  },

  async countByCase(
    caseId
  ) {
    return CaseParty.count({
      where: {
        case_id:
          caseId,
      },
    });
  },
};

export default casePartyService;