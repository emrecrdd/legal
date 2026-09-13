import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { initModels } from '../models/index.js';
import '../models/License.js';

const qi = sequelize.getQueryInterface();

const tableExists = async (name) => {
  const tables = await qi.showAllTables();
  return tables.map((t) => typeof t === 'string' ? t : (t.tableName || t.table_name)).includes(name);
};

const createAuxiliaryTables = async () => {
  if (!(await tableExists('screen_locks'))) {
    await qi.createTable('screen_locks', {
      user_id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      pin_hash: { type: DataTypes.TEXT, allowNull: false },
      is_locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      failed_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      security_failures: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      blocked_until: { type: DataTypes.DATE, allowNull: true },
      pin_blocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      last_activity_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      locked_at: { type: DataTypes.DATE, allowNull: true },
      pin_changed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await sequelize.query('ALTER TABLE screen_locks ADD CONSTRAINT screen_locks_failed_attempts_nonnegative CHECK (failed_attempts >= 0)');
    await sequelize.query('ALTER TABLE screen_locks ADD CONSTRAINT screen_locks_security_failures_nonnegative CHECK (security_failures >= 0)');
  }

  if (!(await tableExists('screen_lock_recovery_codes'))) {
    await qi.createTable('screen_lock_recovery_codes', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
      user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      code_hash: { type: DataTypes.CHAR(64), allowNull: false },
      used_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await qi.addIndex('screen_lock_recovery_codes', ['user_id'], { name: 'idx_screen_lock_recovery_codes_user_id' });
    await sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_screen_lock_recovery_codes_active_hash ON screen_lock_recovery_codes (user_id, code_hash) WHERE used_at IS NULL');
  }

  if (!(await tableExists('finance_sequences'))) {
    await qi.createTable('finance_sequences', {
      id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      sequence_key: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      current_value: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.fn('NOW') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.fn('NOW') },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    });
  }
};

const main = async () => {
  try {
    await sequelize.authenticate();
    initModels(sequelize);

    // This script is ONLY for a brand-new/empty customer database.
    // It creates the current schema directly from the current Sequelize models.
    await sequelize.sync({ force: false, alter: false });
    await createAuxiliaryTables();

    console.log('Derkenar empty database bootstrap completed successfully.');
  } catch (error) {
    console.error('Database bootstrap failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

await main();
