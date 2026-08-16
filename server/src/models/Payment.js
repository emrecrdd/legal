import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Payment extends Sequelize.Model {
  static initModel(sequelize) {
    Payment.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        // ==================================================
        // FINANCIAL
        // ==================================================

        amount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,

          validate: {
            min: 0,
          },
        },

        description: {
          type: DataTypes.STRING(500),
          allowNull: true,

          set(value) {
            this.setDataValue(
              'description',
              value
                ? String(value).trim()
                : null
            );
          },
        },

        payment_type: {
          type: DataTypes.ENUM(
            'agreed',
            'received',
            'refund',
            'expense'
          ),

          allowNull: false,
          defaultValue: 'received',
        },

        payment_method: {
          type: DataTypes.ENUM(
            'cash',
            'bank_transfer',
            'credit_card',
            'check',
            'other'
          ),

          allowNull: false,
          defaultValue: 'cash',
        },

        status: {
          type: DataTypes.ENUM(
            'pending',
            'completed',
            'cancelled',
            'refund'
          ),

          allowNull: false,
          defaultValue: 'pending',
        },

        payment_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },

        due_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        transaction_id: {
          type: DataTypes.STRING(255),
          allowNull: true,

          set(value) {
            this.setDataValue(
              'transaction_id',
              value
                ? String(value).trim()
                : null
            );
          },
        },

        receipt_number: {
          type: DataTypes.STRING(100),
          allowNull: true,

          set(value) {
            this.setDataValue(
              'receipt_number',
              value
                ? String(value).trim()
                : null
            );
          },
        },

        // ==================================================
        // RELATIONS
        // ==================================================

        client_id: {
          type: DataTypes.UUID,
          allowNull: false,

          references: {
            model: 'clients',
            key: 'id',
          },
        },

        case_id: {
          type: DataTypes.UUID,
          allowNull: true,

          references: {
            model: 'cases',
            key: 'id',
          },
        },

        created_by: {
          type: DataTypes.UUID,
          allowNull: false,

          references: {
            model: 'users',
            key: 'id',
          },
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

        tableName: 'payments',

        timestamps: true,

        paranoid: true,

        indexes: [
          {
            fields: ['client_id'],
          },

          {
            fields: ['case_id'],
          },

          {
            fields: ['created_by'],
          },

          {
            fields: ['status'],
          },

          {
            fields: ['payment_type'],
          },

          {
            fields: ['payment_date'],
          },

          {
            fields: ['due_date'],
          },

          {
            fields: [
              'client_id',
              'status',
              'payment_type',
            ],
          },

          {
            fields: [
              'client_id',
              'payment_date',
            ],
          },
        ],
      }
    );
  }

  // ======================================================
  // ASSOCIATIONS
  // ======================================================

  static associate(models) {
    Payment.belongsTo(
      models.Client,
      {
        foreignKey: 'client_id',
        as: 'client',
      }
    );

    Payment.belongsTo(
      models.Case,
      {
        foreignKey: 'case_id',
        as: 'case',
      }
    );

    Payment.belongsTo(
      models.User,
      {
        foreignKey: 'created_by',
        as: 'creator',
      }
    );
  }
}

export {
  Payment,
};