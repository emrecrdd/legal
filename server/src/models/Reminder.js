import { Sequelize, DataTypes } from 'sequelize';

class Reminder extends Sequelize.Model {
  static initModel(sequelize) {
    Reminder.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
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

        task_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'tasks',
            key: 'id',
          },
        },

        event_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'events',
            key: 'id',
          },
        },

        meeting_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'meetings',
            key: 'id',
          },
        },

        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },

        message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        remind_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },

        channel: {
          type: DataTypes.ENUM(
            'in_app',
            'email',
            'both'
          ),
          allowNull: false,
          defaultValue: 'both',
        },

        status: {
          type: DataTypes.ENUM(
            'pending',
            'processing',
            'sent',
            'failed',
            'cancelled'
          ),
          allowNull: false,
          defaultValue: 'pending',
        },

        sent_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        locked_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        locked_by: {
          type: DataTypes.STRING,
          allowNull: true,
        },

        attempt_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },

        max_attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 3,
          validate: {
            min: 1,
            max: 10,
          },
        },

        next_attempt_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        last_error: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        deduplication_key: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },

        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
        },
      },
      {
        sequelize,
        tableName: 'reminders',
        timestamps: true,
        paranoid: true,

        indexes: [
          {
            name: 'reminders_due_status_idx',
            fields: [
              'status',
              'remind_at',
              'next_attempt_at',
            ],
          },
          {
            name: 'reminders_user_idx',
            fields: ['user_id'],
          },
          {
            name: 'reminders_task_idx',
            fields: ['task_id'],
          },
          {
            name: 'reminders_event_idx',
            fields: ['event_id'],
          },
          {
            name: 'reminders_meeting_idx',
            fields: ['meeting_id'],
          },
        ],

        validate: {
  exactlyOneSource() {
    const sourceValues = [
      this.task_id,
      this.event_id,
      this.meeting_id,
    ];

    /*
     * Sequelize bulk update işlemlerinde yalnızca güncellenen
     * alanları geçici instance'a aktarabilir. Kaynak alanların
     * üçü de undefined ise bu bir kısmi güncellemedir.
     *
     * Veritabanındaki CHECK constraint mevcut kaydın
     * bütünlüğünü ayrıca korur.
     */
    const isPartialUpdate = sourceValues.every(
      (value) => value === undefined
    );

    if (isPartialUpdate) {
      return;
    }

    const sourceCount = sourceValues.filter(
      (value) =>
        value !== null &&
        value !== undefined
    ).length;

    if (sourceCount !== 1) {
      throw new Error(
        'Hatırlatma tam olarak bir görev, etkinlik veya toplantıya bağlanmalıdır.'
      );
    }
  },
},
      }
    );
  }
}

export { Reminder };