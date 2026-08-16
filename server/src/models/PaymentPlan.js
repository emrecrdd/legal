import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class PaymentPlan extends Sequelize.Model {
  static initModel(sequelize) {
    PaymentPlan.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        // ==================================================
        // PLAN INFO
        // ==================================================

        title: {
          type: DataTypes.STRING(255),
          allowNull: false,

          validate: {
            notEmpty: true,
            len: [2, 255],
          },

          set(value) {
            this.setDataValue(
              'title',
              typeof value === 'string'
                ? value.trim()
                : value
            );
          },
        },

        description: {
          type: DataTypes.TEXT,
          allowNull: true,

          set(value) {
            if (
              value === undefined ||
              value === null
            ) {
              this.setDataValue(
                'description',
                null
              );

              return;
            }

            const normalized =
              String(value).trim();

            this.setDataValue(
              'description',
              normalized || null
            );
          },
        },

        // ==================================================
        // FINANCIAL
        // ==================================================

        total_amount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,

          validate: {
            min: 0,
          },
        },

        down_payment_amount: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0,

          validate: {
            min: 0,
          },
        },

        currency: {
          type: DataTypes.STRING(3),
          allowNull: false,
          defaultValue: 'TRY',

          set(value) {
            const normalized =
              String(
                value || 'TRY'
              )
                .trim()
                .toUpperCase()
                .slice(0, 3);

            this.setDataValue(
              'currency',
              normalized || 'TRY'
            );
          },
        },

        // ==================================================
        // PLAN TYPE
        // ==================================================

        plan_type: {
          type: DataTypes.ENUM(
            'one_time',
            'installment',
            'custom'
          ),

          allowNull: false,
          defaultValue: 'installment',
        },

        // ==================================================
        // STATUS
        // ==================================================

        status: {
          type: DataTypes.ENUM(
            'draft',
            'active',
            'completed',
            'cancelled',
            'defaulted'
          ),

          allowNull: false,
          defaultValue: 'draft',
        },

        // ==================================================
        // DATES
        // ==================================================

        start_date: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },

        end_date: {
          type: DataTypes.DATEONLY,
          allowNull: true,
        },

        activated_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        cancelled_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        // ==================================================
        // REMINDER / COMMUNICATION SETTINGS
        // ==================================================

        auto_reminders_enabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },

        remind_days_before: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 3,

          validate: {
            min: 0,
            max: 365,
          },
        },

        notify_on_due_date: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },

        notify_on_overdue: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },

        notify_by_email: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },

        notify_by_sms: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },

        notify_in_app: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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

        updated_by: {
          type: DataTypes.UUID,
          allowNull: true,

          references: {
            model: 'users',
            key: 'id',
          },
        },

        // ==================================================
        // METADATA
        // ==================================================

        reference_number: {
          type: DataTypes.STRING(100),
          allowNull: true,

          set(value) {
            if (!value) {
              this.setDataValue(
                'reference_number',
                null
              );

              return;
            }

            this.setDataValue(
              'reference_number',
              String(value).trim()
            );
          },
        },

        notes: {
          type: DataTypes.TEXT,
          allowNull: true,

          set(value) {
            if (!value) {
              this.setDataValue(
                'notes',
                null
              );

              return;
            }

            this.setDataValue(
              'notes',
              String(value).trim()
            );
          },
        },
      },
      {
        sequelize,

        tableName: 'payment_plans',

        timestamps: true,

        paranoid: true,

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
              'plan_type',
            ],
          },

          {
            fields: [
              'start_date',
            ],
          },

          {
            fields: [
              'end_date',
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
              'case_id',
              'status',
            ],
          },

          {
            fields: [
              'client_id',
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

  get remainingPrincipal() {
    const total =
      Number(
        this.total_amount
      ) || 0;

    const downPayment =
      Number(
        this.down_payment_amount
      ) || 0;

    return Math.max(
      total - downPayment,
      0
    );
  }

  // ======================================================
  // SERIALIZATION
  // ======================================================

  toJSON() {
    const values = {
      ...this.get(),
    };

    values.remaining_principal =
      this.remainingPrincipal;

    return values;
  }

  // ======================================================
  // ASSOCIATIONS
  // ======================================================

  static associate(models) {
    PaymentPlan.belongsTo(
      models.Client,
      {
        foreignKey:
          'client_id',

        as:
          'client',
      }
    );

    PaymentPlan.belongsTo(
      models.Case,
      {
        foreignKey:
          'case_id',

        as:
          'case',
      }
    );

    PaymentPlan.belongsTo(
      models.User,
      {
        foreignKey:
          'created_by',

        as:
          'creator',
      }
    );

    PaymentPlan.belongsTo(
      models.User,
      {
        foreignKey:
          'updated_by',

        as:
          'updater',
      }
    );

    PaymentPlan.hasMany(
      models.PaymentInstallment,
      {
        foreignKey:
          'payment_plan_id',

        as:
          'installments',
      }
    );
  }
}

export {
  PaymentPlan,
};