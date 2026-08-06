// models/Meeting.js
import { Sequelize, DataTypes } from 'sequelize';

class Meeting extends Sequelize.Model {
  static initModel(sequelize) {
    Meeting.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
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
        start_date: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        end_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        location: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        meeting_type: {
          type: DataTypes.ENUM('client', 'internal', 'phone', 'other'),
          defaultValue: 'other',
        },
        status: {
          type: DataTypes.ENUM('scheduled', 'ongoing', 'completed', 'cancelled'),
          defaultValue: 'scheduled',
        },
        attendees: {
          type: DataTypes.JSONB,
          defaultValue: [],
        },
        meeting_link: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
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
        created_by: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        assigned_to: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        
      },
      {
        sequelize,
        tableName: 'meetings',
        paranoid: true,
        timestamps: true,
      }
    );
  }

  static associate(models) {
    Meeting.belongsTo(models.Case, {
      foreignKey: 'case_id',
      as: 'case',
    });
    Meeting.belongsTo(models.Client, {
      foreignKey: 'client_id',
      as: 'client',
    });
    Meeting.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
    });
    Meeting.belongsTo(models.User, {
      foreignKey: 'assigned_to',
      as: 'assignee',
    });
  }
}

export { Meeting };