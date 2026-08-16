import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Client extends Sequelize.Model {
  static initModel(sequelize) {
    Client.init(
      {
        id: {
          type:
            DataTypes.UUID,

          defaultValue:
            DataTypes.UUIDV4,

          primaryKey:
            true,
        },

        // ==================================================
        // TEMEL BİLGİLER
        // ==================================================

        name: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            false,

          validate: {
            notEmpty:
              true,

            len: [
              2,
              255,
            ],
          },

          set(value) {
            const normalized =
              typeof value ===
              'string'
                ? value.trim()
                : value;

            this.setDataValue(
              'name',
              normalized
            );
          },
        },

        client_type: {
          type:
            DataTypes.ENUM(
              'individual',
              'corporate'
            ),

          allowNull:
            false,

          defaultValue:
            'individual',
        },

        identification_number:
          {
            type:
              DataTypes.STRING(
                32
              ),

            allowNull:
              true,

            unique:
              true,

            set(value) {
              if (
                value ===
                  undefined ||
                value ===
                  null
              ) {
                this.setDataValue(
                  'identification_number',
                  null
                );

                return;
              }

              const normalized =
                String(value)
                  .replace(
                    /\s+/g,
                    ''
                  )
                  .trim();

              this.setDataValue(
                'identification_number',
                normalized ||
                  null
              );
            },
          },

        // ==================================================
        // İLETİŞİM
        // ==================================================

        email: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,

          validate: {
            isEmailOrEmpty(
              value
            ) {
              if (!value) {
                return;
              }

              const regex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

              if (
                !regex.test(
                  value
                )
              ) {
                throw new Error(
                  'Geçerli bir e-posta adresi girilmelidir'
                );
              }
            },
          },

          set(value) {
            if (!value) {
              this.setDataValue(
                'email',
                null
              );

              return;
            }

            this.setDataValue(
              'email',
              String(value)
                .trim()
                .toLowerCase()
            );
          },
        },

        phone: {
          type:
            DataTypes.STRING(
              32
            ),

          allowNull:
            true,

          set(value) {
            if (!value) {
              this.setDataValue(
                'phone',
                null
              );

              return;
            }

            const normalized =
              String(value)
                .trim()
                .replace(
                  /\s+/g,
                  ' '
                );

            this.setDataValue(
              'phone',
              normalized ||
                null
            );
          },
        },

        // ==================================================
        // ADRES
        // ==================================================

        address: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        city: {
          type:
            DataTypes.STRING(
              100
            ),

          allowNull:
            true,

          set(value) {
            this.setDataValue(
              'city',
              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        district: {
          type:
            DataTypes.STRING(
              100
            ),

          allowNull:
            true,

          set(value) {
            this.setDataValue(
              'district',
              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        postal_code: {
          type:
            DataTypes.STRING(
              20
            ),

          allowNull:
            true,
        },

        // ==================================================
        // SINIFLANDIRMA
        // ==================================================

        status: {
          type:
            DataTypes.ENUM(
              'active',
              'passive',
              'archived'
            ),

          allowNull:
            false,

          defaultValue:
            'active',
        },

        tags: {
          type:
            DataTypes.ARRAY(
              DataTypes.STRING
            ),

          allowNull:
            false,

          defaultValue:
            [],
        },

        notes: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        // ==================================================
        // AUDIT
        // ==================================================

        created_by: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          references: {
            model:
              'users',

            key:
              'id',
          },
        },
      },
      {
        sequelize,

        tableName:
          'clients',

        paranoid:
          true,

        timestamps:
          true,

        indexes: [
          {
            fields: [
              'status',
            ],
          },

          {
            fields: [
              'client_type',
            ],
          },

          {
            fields: [
              'created_by',
            ],
          },

          {
            fields: [
              'city',
            ],
          },

          {
            fields: [
              'created_at',
            ],
          },
        ],
      }
    );
  }

  // ======================================================
  // VIRTUALS
  // ======================================================

  get fullName() {
    return (
      this.name ||
      'İsimsiz Müvekkil'
    );
  }

  // ======================================================
  // SERIALIZATION
  // ======================================================

  toJSON() {
    const values = {
      ...this.get(),
    };

    values.fullName =
      this.fullName;

    return values;
  }

  // ======================================================
  // ASSOCIATIONS
  // ======================================================

  static associate(
    models
  ) {
    Client.belongsTo(
      models.User,
      {
        foreignKey:
          'created_by',

        as:
          'creator',
      }
    );

    // ====================================================
    // CLIENT ↔ CASE
    // N-N
    // ====================================================

    Client.belongsToMany(
      models.Case,
      {
        through:
          'case_clients',

        foreignKey:
          'client_id',

        otherKey:
          'case_id',

        as:
          'cases',
      }
    );

    // ====================================================
    // DIRECT 1-N RELATIONS
    // ====================================================

    Client.hasMany(
      models.Meeting,
      {
        foreignKey:
          'client_id',

        as:
          'meetings',
      }
    );

    Client.hasMany(
      models.Task,
      {
        foreignKey:
          'client_id',

        as:
          'tasks',
      }
    );

    Client.hasMany(
      models.Document,
      {
        foreignKey:
          'client_id',

        as:
          'documents',
      }
    );

    Client.hasMany(
      models.PowerOfAttorney,
      {
        foreignKey:
          'client_id',

        as:
          'powerOfAttorneys',
      }
    );

    Client.hasMany(
      models.Payment,
      {
        foreignKey:
          'client_id',

        as:
          'payments',
      }
    );

    Client.hasMany(
      models.Note,
      {
        foreignKey:
          'client_id',

        as:
          'clientNotes',
      }
    );
  }
}

export {
  Client,
};