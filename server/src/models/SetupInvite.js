import {
  DataTypes,
  Model,
} from 'sequelize';

class SetupInvite extends Model {
  static initModel(
    sequelize
  ) {
    /*
     * Bazı Sequelize / Node kombinasyonlarında Model.init(),
     * model sınıfının `name` özelliğini yeniden atamaya çalışabiliyor.
     * Function/Class `name` varsayılan olarak writable:false olduğu için
     * burada yalnızca bu model sınıfında writable hale getiriyoruz.
     */
    const nameDescriptor =
      Object.getOwnPropertyDescriptor(
        SetupInvite,
        'name'
      );

    if (
      nameDescriptor &&
      nameDescriptor.writable !== true
    ) {
      Object.defineProperty(
        SetupInvite,
        'name',
        {
          ...nameDescriptor,
          writable: true,
        }
      );
    }

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
        modelName:
          'SetupInvite',
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
