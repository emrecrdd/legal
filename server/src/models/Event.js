import { Sequelize, DataTypes } from 'sequelize';

class Event extends Sequelize.Model {
  static initModel(sequelize) {
    Event.init(
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
        event_type: {
          type: DataTypes.ENUM('hearing', 'meeting', 'deadline', 'reminder', 'other'),
          defaultValue: 'other',
        },
        hearing_type: {
          type: DataTypes.ENUM(
            'preliminary',
            'investigation',
            'expert_examination',
            'witness_hearing',
            'final_decision',
            'other'
          ),
          defaultValue: 'other',
        },
        last_hearing_result: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        todo_items: {
          type: DataTypes.ARRAY(DataTypes.JSONB),
          defaultValue: [],
        },
        opposing_counsel: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        expense_status: {
          type: DataTypes.ENUM('paid', 'pending', 'not_applicable'),
          defaultValue: 'pending',
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
        court_room: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        judge_name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM('scheduled', 'ongoing', 'completed', 'cancelled'),
          defaultValue: 'scheduled',
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
        assigned_to: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
        },
        is_all_day: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        reminder_minutes: {
          type: DataTypes.INTEGER,
          defaultValue: 30,
        },
        reminder_sent: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        attendees: {
          type: DataTypes.JSONB,
          defaultValue: [],
        },
        metadata: {
          type: DataTypes.JSONB,
          defaultValue: {},
        },
        
      },
      {
        sequelize,
        tableName: 'events',
        paranoid: true,
        timestamps: true,
      }
    );
  }

  static associate(models) {
    Event.belongsTo(models.Case, {
      foreignKey: 'case_id',
      as: 'case',
    });
    Event.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
    });
    Event.belongsTo(models.User, {
      foreignKey: 'assigned_to',
      as: 'assignedTo',
    });
  }
}

export { Event };