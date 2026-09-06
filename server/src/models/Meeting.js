import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Meeting extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Meeting.init(
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
        // MEETING
        // ==================================================

        title: {
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

          set(
            value
          ) {
            this.setDataValue(
              'title',

              typeof value ===
                'string'
                ? value.trim()
                : value
            );
          },
        },

        description: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        start_date: {
          type:
            DataTypes.DATE,

          allowNull:
            false,
        },

        end_date: {
          type:
            DataTypes.DATE,

          allowNull:
            true,

          validate: {
            isAfterStart(
              value
            ) {
              if (
                !value ||
                !this.start_date
              ) {
                return;
              }

              if (
                new Date(
                  value
                ) <
                new Date(
                  this.start_date
                )
              ) {
                throw new Error(
                  'Toplantı bitiş tarihi başlangıç tarihinden önce olamaz'
                );
              }
            },
          },
        },

        location: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,

          set(
            value
          ) {
            this.setDataValue(
              'location',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        meeting_type: {
          type:
            DataTypes.ENUM(
              'client',
              'internal',
              'phone',
              'other'
            ),

          allowNull:
            false,

          defaultValue:
            'other',
        },

        status: {
          type:
            DataTypes.ENUM(
              'scheduled',
              'ongoing',
              'completed',
              'cancelled'
            ),

          allowNull:
            false,

          defaultValue:
            'scheduled',
        },

        attendees: {
          type:
            DataTypes.JSONB,

          allowNull:
            false,

          defaultValue:
            [],

          validate: {
            isArray(
              value
            ) {
              if (
                !Array.isArray(
                  value
                )
              ) {
                throw new Error(
                  'Katılımcılar liste formatında olmalıdır'
                );
              }
            },
          },
        },

        meeting_link: {
          type:
            DataTypes.STRING(
              1000
            ),

          allowNull:
            true,

          validate: {
            isUrlOrEmpty(
              value
            ) {
              if (
                !value
              ) {
                return;
              }

              try {
                new URL(
                  value
                );
              } catch {
                throw new Error(
                  'Geçerli bir toplantı bağlantısı girilmelidir'
                );
              }
            },
          },

          set(
            value
          ) {
            this.setDataValue(
              'meeting_link',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        notes: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        // ==================================================
        // RELATIONS
        // ==================================================

        case_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'cases',

            key:
              'id',
          },
        },

        client_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'clients',

            key:
              'id',
          },
        },

        consultation_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'consultations',

            key:
              'id',
          },
        },

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

        assigned_to: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

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
          'meetings',

        paranoid:
          true,

        timestamps:
          true,

        indexes: [
          {
            fields: [
              'client_id',
            ],
          },

          {
            fields: [
              'case_id',
            ],
          },

          {
            fields: [
              'consultation_id',
            ],
          },

          {
            fields: [
              'created_by',
            ],
          },

          {
            fields: [
              'assigned_to',
            ],
          },

          {
            fields: [
              'status',
            ],
          },

          {
            fields: [
              'meeting_type',
            ],
          },

          {
            fields: [
              'start_date',
            ],
          },

          {
            fields: [
              'client_id',
              'start_date',
            ],
          },

          {
            fields: [
              'assigned_to',
              'status',
              'start_date',
            ],
          },

          {
            fields: [
              'case_id',
              'start_date',
            ],
          },

          {
            fields: [
              'consultation_id',
              'start_date',
            ],
          },
        ],
      }
    );

    return Meeting;
  }
}

export {
  Meeting,
};
