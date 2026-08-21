import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Task extends Sequelize.Model {
  static initModel(sequelize) {
    Task.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue:
            DataTypes.UUIDV4,
          primaryKey: true,
        },

        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },

        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },

        status: {
          type: DataTypes.ENUM(
            'pending',
            'in_progress',
            'completed',
            'cancelled'
          ),
          defaultValue:
            'pending',
        },

        priority: {
          type: DataTypes.ENUM(
            'low',
            'normal',
            'high',
            'critical'
          ),
          defaultValue:
            'normal',
        },

        due_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        /*
         * Görevi oluşturan kullanıcı.
         *
         * Görevin bir veya birden fazla kişiye atanması
         * artık task_assignees ara tablosu üzerinden
         * yapılacak.
         */
        created_by: {
          type: DataTypes.UUID,
          allowNull: false,

          references: {
            model: 'users',
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

        client_id: {
          type: DataTypes.UUID,
          allowNull: true,

          references: {
            model: 'clients',
            key: 'id',
          },
        },

        parent_task_id: {
          type: DataTypes.UUID,
          allowNull: true,

          references: {
            model: 'tasks',
            key: 'id',
          },
        },

        reminder_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        reminder_sent: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },

        progress: {
          type: DataTypes.INTEGER,
          defaultValue: 0,

          validate: {
            min: 0,
            max: 100,
          },
        },

        tags: {
          type: DataTypes.ARRAY(
            DataTypes.STRING
          ),
          defaultValue: [],
        },

        // ==================================================
        // SÜRE TAKİBİ
        // ==================================================

        started_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        estimated_hours: {
          type: DataTypes.FLOAT,
          allowNull: true,

          validate: {
            min: 0,
          },
        },

        actual_hours: {
          type: DataTypes.FLOAT,
          allowNull: true,

          validate: {
            min: 0,
          },
        },

        // ==================================================
        // ONAY
        // ==================================================

        approved_by: {
          type: DataTypes.UUID,
          allowNull: true,

          references: {
            model: 'users',
            key: 'id',
          },
        },

        approved_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },

        // ==================================================
        // ATTACHMENT
        // ==================================================

        attachment_url: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        sequelize,

        tableName:
          'tasks',

        paranoid:
          true,

        timestamps:
          true,
      }
    );
  }

  static associate(models) {
    // ====================================================
    // MULTIPLE ASSIGNEES
    // ====================================================

    /*
     * Bir görev birden fazla kullanıcıya atanabilir.
     *
     * Task
     *   ├── User 1
     *   ├── User 2
     *   └── User 3
     *
     * İlişki task_assignees ara tablosunda tutulur.
     */
    Task.belongsToMany(
      models.User,
      {
        through:
          'task_assignees',

        foreignKey:
          'task_id',

        otherKey:
          'user_id',

        as:
          'assignees',

        timestamps:
          false,
      }
    );

    // ====================================================
    // CREATOR
    // ====================================================

    Task.belongsTo(
      models.User,
      {
        foreignKey:
          'created_by',

        as:
          'creator',
      }
    );

    // ====================================================
    // CASE
    // ====================================================

    Task.belongsTo(
      models.Case,
      {
        foreignKey:
          'case_id',

        as:
          'case',
      }
    );

    // ====================================================
    // CLIENT
    // ====================================================

    Task.belongsTo(
      models.Client,
      {
        foreignKey:
          'client_id',

        as:
          'client',
      }
    );

    // ====================================================
    // PARENT TASK
    // ====================================================

    Task.belongsTo(
      Task,
      {
        foreignKey:
          'parent_task_id',

        as:
          'parentTask',
      }
    );

    // ====================================================
    // SUBTASKS
    // ====================================================

    Task.hasMany(
      Task,
      {
        foreignKey:
          'parent_task_id',

        as:
          'subtasks',
      }
    );

    // ====================================================
    // APPROVER
    // ====================================================

    Task.belongsTo(
      models.User,
      {
        foreignKey:
          'approved_by',

        as:
          'approver',
      }
    );

    // ====================================================
    // NOTES
    // ====================================================

    Task.hasMany(
      models.Note,
      {
        foreignKey:
          'task_id',

        as:
          'taskNotes',
      }
    );
  }
}

export {
  Task,
};