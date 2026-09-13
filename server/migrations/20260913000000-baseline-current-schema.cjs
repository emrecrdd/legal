'use strict';

/**
 * Derkenar current-schema baseline marker.
 *
 * IMPORTANT:
 * Run `node src/scripts/bootstrap-empty-database.js` once on a BRAND-NEW EMPTY DB
 * before running sequelize-cli migrations. The bootstrap creates the current schema.
 * This migration intentionally performs no DDL; it establishes the new migration baseline.
 */
module.exports = {
  async up() {},
  async down() {
    throw new Error('The Derkenar baseline cannot be rolled back automatically.');
  },
};
