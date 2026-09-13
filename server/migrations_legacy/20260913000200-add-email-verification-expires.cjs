'use strict';

module.exports = {
  async up(
    queryInterface,
    Sequelize
  ) {
    const table =
      await queryInterface.describeTable(
        'users'
      );

    if (
      !table.email_verification_expires
    ) {
      await queryInterface.addColumn(
        'users',
        'email_verification_expires',
        {
          type:
            Sequelize.DATE,
          allowNull:
            true,
        }
      );
    }
  },

  async down(
    queryInterface
  ) {
    const table =
      await queryInterface.describeTable(
        'users'
      );

    if (
      table.email_verification_expires
    ) {
      await queryInterface.removeColumn(
        'users',
        'email_verification_expires'
      );
    }
  },
};
