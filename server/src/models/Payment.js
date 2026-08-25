import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Payment extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    Payment.init(
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
        // FINANCIAL
        // ==================================================

        amount: {
          type:
            DataTypes.DECIMAL(
              15,
              2
            ),

          allowNull:
            false,

          validate: {
            min:
              0.01,
          },
        },

        description: {
          type:
            DataTypes.STRING(
              500
            ),

          allowNull:
            true,

          set(
            value
          ) {
            this.setDataValue(
              'description',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        payment_type: {
          type:
            DataTypes.ENUM(
              'received',
              'refund',
              'expense',
              'adjustment'
            ),

          allowNull:
            false,

          defaultValue:
            'received',
        },

        payment_method: {
          type:
            DataTypes.ENUM(
              'cash',
              'bank_transfer',
              'credit_card',
              'check',
              'other'
            ),

          allowNull:
            false,

          defaultValue:
            'cash',
        },

        status: {
          type:
            DataTypes.ENUM(
              'pending',
              'completed',
              'cancelled'
            ),

          allowNull:
            false,

          defaultValue:
            'completed',
        },

        // ==================================================
        // DATES
        // ==================================================

        payment_date: {
          type:
            DataTypes.DATE,

          allowNull:
            false,

          defaultValue:
            DataTypes.NOW,
        },

        // ==================================================
        // EXTERNAL / ACCOUNTING REFERENCES
        // ==================================================

        transaction_id: {
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
              'transaction_id',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        receipt_number: {
          type:
            DataTypes.STRING(
              100
            ),

          allowNull:
            true,

          set(
            value
          ) {
            this.setDataValue(
              'receipt_number',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        // ==================================================
        // RELATIONS
        // ==================================================

        client_id: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          references: {
            model:
              'clients',

            key:
              'id',
          },
        },

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

        payment_plan_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'payment_plans',

            key:
              'id',
          },
        },

        installment_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'payment_installments',

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

        // ==================================================
        // REVERSAL / CORRECTION
        // ==================================================

        reversed_payment_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'payments',

            key:
              'id',
          },
        },

        reversal_reason: {
          type:
            DataTypes.STRING(
              500
            ),

          allowNull:
            true,

          set(
            value
          ) {
            this.setDataValue(
              'reversal_reason',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },

        reversed_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        reversed_by: {
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

        // ==================================================
        // NOTES
        // ==================================================

        notes: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,

          set(
            value
          ) {
            this.setDataValue(
              'notes',

              value
                ? String(
                    value
                  ).trim()
                : null
            );
          },
        },
      },
      {
        sequelize,

        tableName:
          'payments',

        timestamps:
          true,

        paranoid:
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
              'payment_plan_id',
            ],
          },

          {
            fields: [
              'installment_id',
            ],
          },

          {
            fields: [
              'created_by',
            ],
          },

          {
            fields: [
              'status',
            ],
          },

          {
            fields: [
              'payment_type',
            ],
          },

          {
            fields: [
              'payment_date',
            ],
          },

          {
            fields: [
              'client_id',
              'status',
            ],
          },

          {
            fields: [
              'client_id',
              'payment_date',
            ],
          },

          {
            fields: [
              'payment_plan_id',
              'status',
            ],
          },

          {
            fields: [
              'installment_id',
              'status',
            ],
          },

          {
            fields: [
              'case_id',
              'payment_date',
            ],
          },

          {
            fields: [
              'payment_type',
              'status',
              'payment_date',
            ],
          },

          {
            fields: [
              'reversed_payment_id',
            ],
          },

          /*
           * Ters kayıtları kullanıcıya göre
           * incelemek istersen faydalı olur.
           */
          {
            fields: [
              'reversed_by',
            ],
          },
        ],
      }
    );

    return Payment;
  }
}

export {
  Payment,
};