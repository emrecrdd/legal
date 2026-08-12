import { Sequelize, DataTypes } from 'sequelize';

class AIAnalysis extends Sequelize.Model {
  static initModel(sequelize) {
    AIAnalysis.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },

        document_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'documents',
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

        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
        },

        analysis_type: {
          type: DataTypes.ENUM(
            'document_analysis',
            'document_classification',
            'entity_extraction',
            'case_summary',
            'case_completion',
            'legal_research',
            'draft_generation',
            'sentiment_analysis'
          ),
          allowNull: false,
        },

        provider: {
          type: DataTypes.STRING,
          defaultValue: 'openai',
        },

        model: {
          type: DataTypes.STRING,
          allowNull: false,
        },

        openai_response_id: {
          type: DataTypes.STRING,
        },

        status: {
          type: DataTypes.ENUM(
            'pending',
            'completed',
            'failed'
          ),
          defaultValue: 'pending',
        },

        input_hash: {
          type: DataTypes.STRING,
        },

        prompt_version: {
          type: DataTypes.STRING,
          defaultValue: 'v1',
        },

        confidence: {
          type: DataTypes.FLOAT,
        },

        duration_ms: {
          type: DataTypes.INTEGER,
        },

        input_tokens: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },

        output_tokens: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },

        total_tokens: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },

        result: {
          type: DataTypes.JSONB,
          allowNull: true,
        },

        error_message: {
          type: DataTypes.TEXT,
        },

        metadata: {
          type: DataTypes.JSONB,
          defaultValue: {},
        },
      },
      {
        sequelize,
        tableName: 'ai_analyses',
        paranoid: true,
        timestamps: true,

        indexes: [
          {
            fields: ['document_id'],
          },
          {
            fields: ['case_id'],
          },
          {
            fields: ['user_id'],
          },
          {
            fields: ['analysis_type'],
          },
          {
            fields: ['status'],
          },
          {
            fields: ['input_hash'],
          },
        ],
      }
    );
  }

  static associate(models) {
    AIAnalysis.belongsTo(models.Document, {
      foreignKey: 'document_id',
      as: 'document',
    });

    AIAnalysis.belongsTo(models.Case, {
      foreignKey: 'case_id',
      as: 'case',
    });

    AIAnalysis.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  }
}

export { AIAnalysis };