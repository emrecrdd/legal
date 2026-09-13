'use strict';

module.exports = {
  async up(
    queryInterface,
    Sequelize
  ) {
    await queryInterface.createTable(
      'setup_invites',
      {
        id: {
          type:
            Sequelize.UUID,
          allowNull:
            false,
          primaryKey:
            true,
          defaultValue:
            Sequelize.UUIDV4,
        },

        token_hash: {
          type:
            Sequelize.STRING(64),
          allowNull:
            false,
        },

        expires_at: {
          type:
            Sequelize.DATE,
          allowNull:
            false,
        },

        used_at: {
          type:
            Sequelize.DATE,
          allowNull:
            true,
        },

        claimed_by_user_id: {
          type:
            Sequelize.UUID,
          allowNull:
            true,
          references: {
            model:
              'users',
            key:
              'id',
          },
          onUpdate:
            'CASCADE',
          onDelete:
            'SET NULL',
        },

        created_at: {
          type:
            Sequelize.DATE,
          allowNull:
            false,
          defaultValue:
            Sequelize.fn(
              'NOW'
            ),
        },

        updated_at: {
          type:
            Sequelize.DATE,
          allowNull:
            false,
          defaultValue:
            Sequelize.fn(
              'NOW'
            ),
        },

        deleted_at: {
          type:
            Sequelize.DATE,
          allowNull:
            true,
        },
      }
    );

    await queryInterface.addIndex(
      'setup_invites',
      [
        'token_hash',
      ],
      {
        name:
          'setup_invites_token_hash_unique',
        unique:
          true,
      }
    );

    await queryInterface.addIndex(
      'setup_invites',
      [
        'expires_at',
      ],
      {
        name:
          'setup_invites_expires_at_idx',
      }
    );
  },

  async down(
    queryInterface
  ) {
    await queryInterface.dropTable(
      'setup_invites'
    );
  },
};
