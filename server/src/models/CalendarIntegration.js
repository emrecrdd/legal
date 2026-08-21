import {
  Sequelize,
  DataTypes,
} from 'sequelize';

// ======================================================
// CALENDAR INTEGRATION MODEL
// ======================================================

class CalendarIntegration extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    CalendarIntegration.init(
      {
        // ==================================================
        // ID
        // ==================================================

        id: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          primaryKey:
            true,

          defaultValue:
            DataTypes.UUIDV4,
        },

        // ==================================================
        // USER
        // ==================================================

        user_id: {
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

        // ==================================================
        // PROVIDER
        // ==================================================

        provider: {
          type:
            DataTypes.STRING(
              32
            ),

          allowNull:
            false,

          defaultValue:
            'google',

          validate: {
            notEmpty:
              true,
          },
        },

        // ==================================================
        // ACCOUNT
        // ==================================================

        account_email: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,

          validate: {
            isEmail:
              true,
          },
        },

        calendar_id: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            false,

          defaultValue:
            'primary',
        },

        // ==================================================
        // TOKENS
        // ==================================================

        /*
         * Bu alanlar sadece ŞİFRELİ değer taşır.
         *
         * Düz access_token / refresh_token hiçbir zaman
         * modele kaydedilmemeli.
         */

        access_token_encrypted: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        refresh_token_encrypted: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        token_type: {
          type:
            DataTypes.STRING(
              50
            ),

          allowNull:
            true,
        },

        scope: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        expires_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        // ==================================================
        // CONNECTION STATE
        // ==================================================

        is_active: {
          type:
            DataTypes.BOOLEAN,

          allowNull:
            false,

          defaultValue:
            true,
        },

        last_synced_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        last_error: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },
      },
      {
        sequelize,

        modelName:
          'CalendarIntegration',

        tableName:
          'calendar_integrations',

        timestamps:
          true,

        createdAt:
          'created_at',

        updatedAt:
          'updated_at',

        /*
         * Projedeki global Sequelize ayarlarında
         * paranoid=true olsa bile bu modelde
         * deleted_at kolonu bulunmuyor.
         *
         * Bu nedenle soft delete kapatılıyor.
         */
        paranoid:
          false,

        indexes: [
          {
            unique:
              true,

            name:
              'calendar_integrations_user_provider_unique',

            fields: [
              'user_id',
              'provider',
            ],
          },

          {
            name:
              'calendar_integrations_provider_active_idx',

            fields: [
              'provider',
              'is_active',
            ],
          },
        ],
      }
    );

    return CalendarIntegration;
  }
}

// ======================================================
// EXPORT
// ======================================================

export {
  CalendarIntegration,
};

export default CalendarIntegration;