import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class PaymentInstallment extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    PaymentInstallment.init(
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
        // PLAN RELATION
        // ==================================================

        payment_plan_id: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          references: {
            model:
              'payment_plans',

            key:
              'id',
          },
        },

        // ==================================================
        // INSTALLMENT
        // ==================================================

        installment_number: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,

          validate: {
            min:
              1,
          },
        },

        title: {
          type:
            DataTypes.STRING(
              255
            ),

          allowNull:
            true,

          set(
            value
          ) {
            if (
              !value
            ) {
              this.setDataValue(
                'title',
                null
              );

              return;
            }

            this.setDataValue(
              'title',
              String(
                value
              ).trim()
            );
          },
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
              0,
          },
        },

        paid_amount: {
          type:
            DataTypes.DECIMAL(
              15,
              2
            ),

          allowNull:
            false,

          defaultValue:
            0,

          validate: {
            min:
              0,
          },
        },

        // ==================================================
        // DATES
        // ==================================================

        due_date: {
          type:
            DataTypes.DATEONLY,

          allowNull:
            false,
        },

        paid_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        // ==================================================
        // STATUS
        // ==================================================

        status: {
          type:
            DataTypes.ENUM(
              'pending',
              'partial',
              'paid',
              'overdue',
              'cancelled'
            ),

          allowNull:
            false,

          defaultValue:
            'pending',
        },

        // ==================================================
        // REMINDER STATE
        // ==================================================

        reminder_before_sent_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        due_date_reminder_sent_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        overdue_reminder_sent_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
        },

        last_reminder_sent_at: {
          type:
            DataTypes.DATE,

          allowNull:
            true,
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
            if (
              !value
            ) {
              this.setDataValue(
                'notes',
                null
              );

              return;
            }

            const normalized =
              String(
                value
              ).trim();

            this.setDataValue(
              'notes',
              normalized ||
                null
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

          {
            fields: [
              'status',
              'due_date',
            ],
          },

          /*
           * Burada unique:true YOK.
           *
           * Aktif taksitler için:
           *
           * payment_plan_id + installment_number
           *
           * benzersizliği PostgreSQL partial unique
           * index ile migration tarafında sağlanacak:
           *
           * WHERE deleted_at IS NULL
           */
        ],

        validate: {
          paidAmountCannotExceedAmount() {
            const amount =
              Number(
                this.amount
              );

            const paid =
              Number(
                this.paid_amount
              );

            if (
              Number.isFinite(
                amount
              ) &&
              Number.isFinite(
                paid
              ) &&
              paid >
                amount
            ) {
              throw new Error(
                'Ödenen tutar taksit tutarını aşamaz'
              );
            }
          },
        },
      }
    );

    return PaymentInstallment;
  }

  // ======================================================
  // VIRTUALS
  // ======================================================

  get remainingAmount() {
    const amount =
      Number(
        this.amount
      ) ||
      0;

    const paid =
      Number(
        this.paid_amount
      ) ||
      0;

    return Math.max(
      amount -
        paid,
      0
    );
  }

  get paymentProgress() {
    const amount =
      Number(
        this.amount
      ) ||
      0;

    const paid =
      Number(
        this.paid_amount
      ) ||
      0;

    if (
      amount <=
      0
    ) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        Number(
          (
            (
              paid /
              amount
            ) *
            100
          ).toFixed(
            2
          )
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

    /*
     * DATEONLY için saat dilimi kaynaklı kaymaları
     * azaltmak amacıyla tarih bazlı karşılaştırma.
     */
    const today =
      new Date()
        .toISOString()
        .slice(
          0,
          10
        );

    return (
      this.due_date <
      today
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
}

export {
  PaymentInstallment,
};