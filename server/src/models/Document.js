import {
  Sequelize,
  DataTypes,
} from 'sequelize';

class Document extends Sequelize.Model {

  static initModel(sequelize) {

    Document.init(
      {
        id: {
          type:
            DataTypes.UUID,

          defaultValue:
            DataTypes.UUIDV4,

          primaryKey:
            true,
        },

        name: {
          type:
            DataTypes.STRING,

          allowNull:
            false,
        },

        original_name: {
          type:
            DataTypes.STRING,

          allowNull:
            false,
        },

        file_path: {
          type:
            DataTypes.STRING,

          allowNull:
            false,
        },

        file_size: {
          type:
            DataTypes.INTEGER,

          allowNull:
            false,
        },

        mime_type: {
          type:
            DataTypes.STRING,

          allowNull:
            false,
        },

        file_type: {
          type:
            DataTypes.ENUM(
              'pdf',
              'word',
              'excel',
              'image',
              'udf',
              'other'
            ),

          defaultValue:
            'other',
        },

        category: {
          type:
            DataTypes.STRING,

          allowNull:
            true,
        },

        tags: {
          type:
            DataTypes.ARRAY(
              DataTypes.STRING
            ),

          defaultValue:
            [],
        },

        description: {
          type:
            DataTypes.TEXT,

          allowNull:
            true,
        },

        version: {
          type:
            DataTypes.INTEGER,

          defaultValue:
            1,
        },

        parent_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'documents',

            key:
              'id',
          },
        },

        case_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'cases',

            key:
              'id',
          },
        },

        client_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'clients',

            key:
              'id',
          },
        },

        // ✅ VEKALETNAME İLİŞKİSİ

        power_of_attorney_id: {
          type:
            DataTypes.UUID,

          allowNull:
            true,

          references: {
            model:
              'power_of_attorneys',

            key:
              'id',
          },
        },

        uploaded_by: {
          type:
            DataTypes.UUID,

          allowNull:
            false,

          references: {
            model:
              'users',

            key:
              'id',
          },
        },

        is_public: {
          type:
            DataTypes.BOOLEAN,

          defaultValue:
            false,
        },

        is_archived: {
          type:
            DataTypes.BOOLEAN,

          defaultValue:
            false,
        },

        metadata: {
          type:
            DataTypes.JSONB,

          defaultValue:
            {},
        },
      },
      {
        sequelize,

        tableName:
          'documents',

        paranoid:
          true,

        timestamps:
          true,
      }
    );

  }

  // ✅ İLİŞKİLER

  static associate(models) {

    Document.belongsTo(
      models.User,
      {
        foreignKey:
          'uploaded_by',

        as:
          'uploader',
      }
    );

    Document.belongsTo(
      models.Case,
      {
        foreignKey:
          'case_id',

        as:
          'case',
      }
    );

    Document.belongsTo(
      models.Client,
      {
        foreignKey:
          'client_id',

        as:
          'client',
      }
    );

    Document.belongsTo(
      models.PowerOfAttorney,
      {
        foreignKey:
          'power_of_attorney_id',

        as:
          'powerOfAttorney',
      }
    );

    Document.belongsTo(
      Document,
      {
        foreignKey:
          'parent_id',

        as:
          'parent',
      }
    );

    Document.hasMany(
      Document,
      {
        foreignKey:
          'parent_id',

        as:
          'versions',
      }
    );

  }

}

export {
  Document,
};