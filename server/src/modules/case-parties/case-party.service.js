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

import {
  PERMISSION_KEYS,
  getEffectivePermissions,
} from '../../constants/roles.js';

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
// ACCESS CONTROL HELPERS
// ======================================================

const getActorId = (
  actor
) => {
  return (
    actor?.id ||
    null
  );
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

const canViewAllCases = (
  actor
) => {
  return getActorPermissions(
    actor
  ).includes(
    PERMISSION_KEYS.VIEW_ALL_CASES
  );
};

const buildCaseAccessWhere = (
  actor
) => {
  const actorId =
    getActorId(
      actor
    );

  /*
   * FAIL CLOSED:
   * authenticated actor yoksa unrestricted sorgu yok.
   */
  if (
    !actorId
  ) {
    throw new Error(
      'Dava bulunamadı'
    );
  }

  if (
    canViewAllCases(
      actor
    )
  ) {
    return {};
  }

  /*
   * Referans case.service.js ile aynı record-level scope:
   *
   * - kullanıcının oluşturduğu dava
   * - kullanıcıya atanmış dava
   */
  return {
    [Op.or]: [
      {
        created_by:
          actorId,
      },

      {
        assigned_to:
          actorId,
      },
    ],
  };
};

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

const assertCaseAccess =
  async (
    caseId,
    actor,
    options = {}
  ) => {
    const accessWhere =
      buildCaseAccessWhere(
        actor
      );

    const caseItem =
      await Case.findOne({
        where:
          combineWhere(
            {
              id:
                caseId,
            },

            accessWhere
          ),

        attributes: [
          'id',
          'created_by',
          'assigned_to',
        ],

        transaction:
          options.transaction,

        lock:
          options.lock,
      });

    if (
      !caseItem
    ) {
      throw new Error(
        'Dava bulunamadı'
      );
    }

    return caseItem;
  };

const assertPartyAccess =
  async (
    partyId,
    actor,
    options = {}
  ) => {
    const party =
      await CaseParty.findByPk(
        partyId,
        {
          transaction:
            options.transaction,

          lock:
            options.lock,
        }
      );

    if (
      !party
    ) {
      throw new Error(
        'Taraf bulunamadı'
      );
    }

    try {
      await assertCaseAccess(
        party.case_id,
        actor,
        options
      );
    } catch {
      /*
       * Party gerçekten var olsa bile yetkisiz kullanıcıya
       * kaynak varlığı bilgisi sızdırma.
       */
      throw new Error(
        'Taraf bulunamadı'
      );
    }

    return party;
  };

// ======================================================
// NORMALIZATION / VALIDATION
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
  // ====================================================
  // CREATE
  // ====================================================

  async create(
    data,
    actor
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

    /*
     * BOLA:
     * Verilen case_id'nin actor tarafından erişilebilir
     * olduğu doğrulanmadan taraf oluşturulamaz.
     */
    await assertCaseAccess(
      normalized.case_id,
      actor
    );

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

  // ====================================================
  // FIND BY CASE
  // ====================================================

  async findByCase(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

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

  // ====================================================
  // FIND ONE
  // ====================================================

  async findOne(
    id,
    actor
  ) {
    return assertPartyAccess(
      id,
      actor
    );
  },

  // ====================================================
  // UPDATE
  // ====================================================

  async update(
    id,
    data,
    actor
  ) {
    /*
     * Party alınmadan önce parent case ownership doğrulanır.
     */
    const party =
      await assertPartyAccess(
        id,
        actor
      );

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

  // ====================================================
  // REMOVE
  // ====================================================

  async remove(
    id,
    actor
  ) {
    const party =
      await assertPartyAccess(
        id,
        actor
      );

    await party.destroy();

    return party;
  },

  // ====================================================
  // FIND ALL
  // ====================================================

  async findAll({
    case_id,
    page = 1,
    limit = 10,
    party_type,
    search,
    actor,
  }) {
    /*
     * actor yoksa burada da fail-closed.
     */
    buildCaseAccessWhere(
      actor
    );

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
      /*
       * Belirli dava filtresinde doğrudan parent access check.
       */
      await assertCaseAccess(
        case_id,
        actor
      );

      where.case_id =
        case_id;
    } else if (
      !canViewAllCases(
        actor
      )
    ) {
      /*
       * Global party listesinde normal kullanıcı sadece
       * erişebildiği davaların party kayıtlarını görür.
       *
       * Association alias'ına bağımlı JOIN yerine önce
       * erişilebilir case id'leri çıkarılıyor.
       */
      const accessibleCases =
        await Case.findAll({
          where:
            buildCaseAccessWhere(
              actor
            ),

          attributes: [
            'id',
          ],
        });

      const accessibleCaseIds =
        accessibleCases.map(
          (
            caseItem
          ) =>
            caseItem.id
        );

      where.case_id = {
        [Op.in]:
          accessibleCaseIds,
      };
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

  // ====================================================
  // COUNT BY CASE
  // ====================================================

  async countByCase(
    caseId,
    actor
  ) {
    await assertCaseAccess(
      caseId,
      actor
    );

    return CaseParty.count({
      where: {
        case_id:
          caseId,
      },
    });
  },
};

export default casePartyService;
