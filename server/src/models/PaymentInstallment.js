import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class PaymentInstallment extends Sequelize.Model {
  static initModel(sequelize) {
    PaymentInstallment.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        // ==================================================
        // PLAN RELATION
        // ==================================================

        payment_plan_id: {
          type: DataTypes.UUID,
          allowNull: false,

          references: {
            model: 'payment_plans',
            key: 'id',
          },
        },

        // ==================================================
        // INSTALLMENT
        // ==================================================

        installment_number: {
          type: DataTypes.INTEGER,
          allowNull: false,

          validate: {
            min: 1,
          },
        },

        title: {
          type: DataTypes.STRING(255),
          allowNull: true,

          set(value) {
            if (!value) {
              this.setDataValue(
                'title',
                null
              );

              return;
            }

            this.setDataValue(
              'title',
              String(value).trim()
            );
          },
        },

        // ==================================================
        // FINANCIAL
        // ==================================================

        amount: {
          type: DataTypes.DECIMAL(
            15,
            2
          ),

          allowNull: false,

          validate: {
            min: 0,
          },
        },

        /*
         * Bu alan gerçekleşmiş tahsilatların
         * hızlı okunabilmesi için tutulabilir.
         *
         * Ancak bunun tek gerçek kaynağı Payment
         * kayıtları olmalıdır.
         *
         * Service katmanı Payment oluştururken /
         * iptal ederken transaction içinde bu alanı
         * senkronize edecek.
         */
        paid_amount: {
          type: DataTypes.DECIMAL(
            15,
            2
          ),

          allowNull: false,

          defaultValue: 0,

          validate: {
            min: 0,
          },
        },

        // ==================================================
        // DATES
        // ==================================================

        due_date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },

        paid_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        // ==================================================
        // STATUS
        // ==================================================

        status: {
          type: DataTypes.ENUM(
            'pending',
            'partial',
            'paid',
            'overdue',
            'cancelled'
          ),

          allowNull: false,

          defaultValue:
            'pending',
        },

        // ==================================================
        // REMINDER STATE
        // ==================================================

        /*
         * Reminder gönderildi bilgilerini ayrı
         * kolonlarda tutuyoruz.
         *
         * Böylece worker aynı reminder'ı tekrar
         * tekrar göndermesin.
         */

        reminder_before_sent_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        due_date_reminder_sent_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        overdue_reminder_sent_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        /*
         * Son bildirimin ne zaman gönderildiğini
         * genel olarak görmek için.
         */
        last_reminder_sent_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        // ==================================================
        // NOTES
        // ==================================================

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

            const normalized =
              String(value).trim();

            this.setDataValue(
              'notes',
              normalized || null
            );
          },
        },
      },
      {
        sequelize,

        tableName:
          'payment_installments',

        timestamps:
          true,

        paranoid:
          true,

        indexes: [
          // ================================================
          // BASIC
          // ================================================

          {
            fields: [
              'payment_plan_id',
            ],
          },

          {
            fields: [
              'due_date',
            ],
          },

          {
            fields: [
              'status',
            ],
          },

          // ================================================
          // PLAN LOOKUPS
          // ================================================

          {
            fields: [
              'payment_plan_id',
              'status',
            ],
          },

          {
            fields: [
              'payment_plan_id',
              'due_date',
            ],
          },

          // ================================================
          // REMINDER / OVERDUE WORKER
          // ================================================

          {
            fields: [
              'status',
              'due_date',
            ],
          },

          // ================================================
          // UNIQUE INSTALLMENT NUMBER PER PLAN
          // ================================================

          {
            unique:
              true,

            fields: [
              'payment_plan_id',
              'installment_number',
            ],
          },
        ],
      }
    );
  }

  // ======================================================
  // VIRTUALS
  // ======================================================

  get remainingAmount() {
    const amount =
      Number(
        this.amount
      ) || 0;

    const paid =
      Number(
        this.paid_amount
      ) || 0;

    return Math.max(
      amount - paid,
      0
    );
  }

  get paymentProgress() {
    const amount =
      Number(
        this.amount
      ) || 0;

    const paid =
      Number(
        this.paid_amount
      ) || 0;

    if (
      amount <= 0
    ) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        Number(
          (
            (paid /
              amount) *
            100
          ).toFixed(2)
        )
      )
    );
  }

  get isOverdue() {
    if (
      this.status ===
        'paid' ||
      this.status ===
        'cancelled'
    ) {
      return false;
    }

    if (
      !this.due_date
    ) {
      return false;
    }

    const dueDate =
      new Date(
        `${this.due_date}T23:59:59.999Z`
      );

    return (
      dueDate.getTime() <
      Date.now()
    );
  }

  // ======================================================
  // SERIALIZATION
  // ======================================================

  toJSON() {
    const values = {
      ...this.get(),
    };

    values.remaining_amount =
      this.remainingAmount;

    values.payment_progress =
      this.paymentProgress;

    values.is_overdue =
      this.isOverdue;

    return values;
  }

  // ======================================================
  // ASSOCIATIONS
  // ======================================================

  static associate(models) {
    PaymentInstallment.belongsTo(
      models.PaymentPlan,
      {
        foreignKey:
          'payment_plan_id',

        as:
          'paymentPlan',
      }
    );

    PaymentInstallment.hasMany(
      models.Payment,
      {
        foreignKey:
          'installment_id',

        as:
          'payments',
      }
    );
  }
}

export {
  PaymentInstallment,
};