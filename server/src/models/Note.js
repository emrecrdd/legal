import { Sequelize, DataTypes } from 'sequelize';

class Note extends Sequelize.Model {
  static initModel(sequelize) {
    Note.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        note_type: {
          type: DataTypes.ENUM('general', 'meeting', 'phone', 'email', 'reminder', 'task'),
          defaultValue: 'general',
        },
        is_private: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        is_pinned: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        client_id: {
          type: DataTypes.UUID,
          allowNull: true,
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
        // ✅ YENİ: Task ile ilişki
        task_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'tasks',
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
        tags: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          defaultValue: [],
        },
        metadata: {
          type: DataTypes.JSONB,
          defaultValue: {},
        },
      },
      {
  sequelize,
  tableName: 'notes',

  timestamps: true,

  paranoid: true,

  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
}
    );
  }

  static associate(models) {
    Note.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
    });
    Note.belongsTo(models.Client, {
      foreignKey: 'client_id',
      as: 'client',
    });
    Note.belongsTo(models.Case, {
      foreignKey: 'case_id',
      as: 'case',
    });
    // ✅ YENİ: Task ile ilişki
    Note.belongsTo(models.Task, {
      foreignKey: 'task_id',
      as: 'task',
    });
  }
}

export { Note };