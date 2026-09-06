import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class ConsultationAssignee extends Sequelize.Model {
  static initModel(sequelize) {
    ConsultationAssignee.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        consultation_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'consultations',
            key: 'id',
          },
        },

        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },

        is_primary: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },

        assigned_by: {
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
        tableName:
          'consultation_assignees',
        timestamps:
          true,
        indexes: [
          {
            name:
              'consultation_assignees_consultation_id_idx',
            fields: [
              'consultation_id',
            ],
          },
          {
            name:
              'consultation_assignees_user_id_idx',
            fields: [
              'user_id',
            ],
          },
          {
            name:
              'consultation_assignees_consultation_user_uq',
            unique:
              true,
            fields: [
              'consultation_id',
              'user_id',
            ],
          },
        ],
      }
    );

    return ConsultationAssignee;
  }
}

export {
  ConsultationAssignee,
};
