import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class CaseParty extends Sequelize.Model {
  static initModel(sequelize) {
    CaseParty.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        // ==================================================
        // RELATION
        // ==================================================

        case_id: {
          type: DataTypes.UUID,
          allowNull: false,

          references: {
            model: 'cases',
            key: 'id',
          },
        },

        // ==================================================
        // PARTY TYPE
        // ==================================================

        party_type: {
          type: DataTypes.ENUM(
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
            'ucuncu_kisi'
          ),

          allowNull: false,
        },

        entity_type: {
          type: DataTypes.ENUM(
            'person',
            'company'
          ),

          allowNull: false,
          defaultValue: 'person',
        },

        // ==================================================
        // IDENTITY
        // ==================================================

        name: {
          type: DataTypes.STRING(255),
          allowNull: false,

          validate: {
            notEmpty: {
              msg: 'Taraf adı gereklidir',
            },

            len: {
              args: [2, 255],
              msg: 'Taraf adı 2-255 karakter arasında olmalıdır',
            },
          },

          set(value) {
            this.setDataValue(
              'name',
              String(
                value || ''
              ).trim()
            );
          },
        },

        identification_number: {
          type: DataTypes.STRING(20),
          allowNull: true,

          set(value) {
            const normalized =
              value
                ? String(value)
                    .replace(/\s+/g, '')
                    .trim()
                : null;

            this.setDataValue(
              'identification_number',
              normalized ||
              null
            );
          },
        },

        tax_office: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },

        // ==================================================
        // CONTACT
        // ==================================================

        phone: {
          type: DataTypes.STRING(30),
          allowNull: true,
        },

        email: {
          type: DataTypes.STRING(255),
          allowNull: true,

          validate: {
            isEmailOrEmpty(value) {
              if (!value) {
                return;
              }

              const normalized =
                String(value).trim();

              const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

              if (
                !emailPattern.test(
                  normalized
                )
              ) {
                throw new Error(
                  'Geçerli bir e-posta adresi girilmelidir'
                );
              }
            },
          },

          set(value) {
            const normalized =
              value
                ? String(value)
                    .trim()
                    .toLowerCase()
                : null;

            this.setDataValue(
              'email',
              normalized ||
              null
            );
          },
        },

        address: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        // ==================================================
        // LAWYER
        // ==================================================

        lawyer_name: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },

        lawyer_phone: {
          type: DataTypes.STRING(30),
          allowNull: true,
        },

        lawyer_email: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },

        lawyer_registry_number: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },

        // ==================================================
        // NOTES
        // ==================================================

        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,

        tableName:
          'case_parties',

        timestamps:
          true,

        paranoid:
          true,

        indexes: [
          {
            fields: [
              'case_id',
            ],
          },

          {
            fields: [
              'party_type',
            ],
          },

          {
            fields: [
              'case_id',
              'party_type',
            ],
          },

          {
            fields: [
              'identification_number',
            ],
          },
        ],
      }
    );

    return CaseParty;
  }
}

export {
  CaseParty,
};