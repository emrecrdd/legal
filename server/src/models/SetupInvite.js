import {
  DataTypes,
  Model,
} from 'sequelize';

class SetupInvite extends Model {
  static initModel(
    sequelize
  ) {
    SetupInvite.init(
      {
        id: {
          type:
            DataTypes.UUID,
          defaultValue:
            DataTypes.UUIDV4,
          primaryKey:
            true,
        },

        token_hash: {
          type:
            DataTypes.STRING(64),
          allowNull:
            false,
          unique:
            true,
        },

        expires_at: {
          type:
            DataTypes.DATE,
          allowNull:
            false,
        },

        used_at: {
          type:
            DataTypes.DATE,
          allowNull:
            true,
        },

        claimed_by_user_id: {
          type:
            DataTypes.UUID,
          allowNull:
            true,
        },
      },
      {
        sequelize,
        tableName:
          'setup_invites',
        underscored:
          true,
        paranoid:
          true,
      }
    );

    return SetupInvite;
  }
}

export {
  SetupInvite,
};

export default SetupInvite;
