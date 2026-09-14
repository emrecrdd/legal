import {
  Sequelize,
  DataTypes,
} from 'sequelize';

import {
  ROLES,
} from '../constants/roles.js';

import bcrypt
  from 'bcryptjs';

class User extends Sequelize.Model {
  static initModel(
    sequelize
  ) {
    User.init(
      {
        id: {
          type:
            DataTypes.UUID,
          defaultValue:
            DataTypes.UUIDV4,
          primaryKey:
            true,
        },

        email: {
          type:
            DataTypes.STRING,
          allowNull:
            false,
          validate: {
            isEmail:
              true,
            notEmpty:
              true,
          },
        },

        password: {
          type:
            DataTypes.STRING,
          allowNull:
            false,
          validate: {
            notEmpty:
              true,
          },
        },

        first_name: {
          type:
            DataTypes.STRING,
          allowNull:
            false,
        },

        last_name: {
          type:
            DataTypes.STRING,
          allowNull:
            false,
        },

        phone: {
          type:
            DataTypes.STRING,
          allowNull:
            true,
        },

        role: {
          type:
            DataTypes.ENUM(
              ...Object.values(
                ROLES
              )
            ),
          allowNull:
            false,
          defaultValue:
            ROLES.INTERN,
        },

        permissions: {
          type:
            DataTypes.JSONB,
          allowNull:
            false,
          defaultValue:
            {},
        },

        is_active: {
          type:
            DataTypes.BOOLEAN,
          allowNull:
            false,
          defaultValue:
            true,
        },

        token_version: {
          type:
            DataTypes.INTEGER,
          allowNull:
            false,
          defaultValue:
            0,
          validate: {
            min:
              0,
          },
        },

        last_login: {
          type:
            DataTypes.DATE,
          allowNull:
            true,
        },

        last_seen_at: {
          type:
            DataTypes.DATE,
          allowNull:
            true,
        },

        refresh_token: {
          type:
            DataTypes.TEXT,
          allowNull:
            true,
        },

        avatar: {
          type:
            DataTypes.STRING,
          allowNull:
            true,
        },

        title: {
          type:
            DataTypes.STRING,
          allowNull:
            true,
        },

        bio: {
          type:
            DataTypes.TEXT,
          allowNull:
            true,
        },

        email_verified: {
          type:
            DataTypes.BOOLEAN,
          allowNull:
            false,
          defaultValue:
            false,
        },

        email_verification_token: {
          type:
            DataTypes.STRING,
          allowNull:
            true,
        },

        email_verification_expires: {
          type:
            DataTypes.DATE,
          allowNull:
            true,
        },

        password_reset_token: {
          type:
            DataTypes.STRING,
          allowNull:
            true,
        },

        password_reset_expires: {
          type:
            DataTypes.DATE,
          allowNull:
            true,
        },
      },
      {
        sequelize,

        tableName:
          'users',

        hooks: {
          beforeValidate: (
            user
          ) => {
            if (
              user.email
            ) {
              user.email =
                String(
                  user.email
                )
                  .trim()
                  .toLowerCase();
            }
          },

          beforeCreate:
            async (
              user
            ) => {
              if (
                user.password
              ) {
                const salt =
                  await bcrypt.genSalt(
                    10
                  );

                user.password =
                  await bcrypt.hash(
                    user.password,
                    salt
                  );
              }
            },

          beforeUpdate:
            async (
              user
            ) => {
              if (
                user.changed(
                  'password'
                ) &&
                user.password
              ) {
                const salt =
                  await bcrypt.genSalt(
                    10
                  );

                user.password =
                  await bcrypt.hash(
                    user.password,
                    salt
                  );
              }
            },
        },
      }
    );

    return User;
  }

  async comparePassword(
    password
  ) {
    if (
      !this.password
    ) {
      throw new Error(
        'User password not set. Please reset your password.'
      );
    }

    if (
      !password
    ) {
      return false;
    }

    return bcrypt.compare(
      password,
      this.password
    );
  }

  toJSON() {
    const values = {
      ...this.get(),
    };

    delete values.password;
    delete values.refresh_token;
    delete values.email_verification_token;
    delete values.email_verification_expires;
    delete values.password_reset_token;
    delete values.password_reset_expires;
    delete values.token_version;

    return values;
  }
}

export {
  User,
};
