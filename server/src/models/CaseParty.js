import { Sequelize, DataTypes } from 'sequelize';

class CaseParty extends Sequelize.Model {
  static initModel(sequelize) {
    CaseParty.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        case_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'cases',
            key: 'id',
          },
        },
        // ✅ GÜNCELLENMİŞ TARAF TÜRLERİ
        party_type: {
  type: DataTypes.ENUM(
    'davali',
    'davaci',
    'supheli',
    'sanik',
    'musteki',
    'katilan',
    'magdur',
    'maktul',
    'alacakli',
    'borclu',
    'ucuncu_kisi'
  ),
  allowNull: false,
},
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        tc_number: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        phone: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        address: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        lawyer_name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        lawyer_phone: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        lawyer_registry_number: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'case_parties',
        timestamps: true,
        paranoid: true,
      }
    );
  }

  static associate(models) {
    CaseParty.belongsTo(models.Case, {
      foreignKey: 'case_id',
      as: 'case',
    });
  }
}

export { CaseParty };