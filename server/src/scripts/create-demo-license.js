import crypto from 'node:crypto';

import {
  connectDB,
  sequelize,
} from '../config/database.js';

import {
  License,
} from '../models/License.js';

const INSTALLATION_KEY = 'primary';

const OFFICE_NAME =
  process.env.DEMO_OFFICE_NAME ||
  'Derkenar Demo';

const LICENSE_TYPE =
  process.env.DEMO_LICENSE_TYPE ||
  'Demo Lisansı';

const MAX_USERS =
  Number(
    process.env.DEMO_MAX_USERS ||
    10
  );

const DEMO_DAYS =
  Number(
    process.env.DEMO_LICENSE_DAYS ||
    365
  );

const createLicenseKey = () => {
  return [
    'DERKENAR',
    'DEMO',
    crypto
      .randomBytes(8)
      .toString('hex')
      .toUpperCase(),
  ].join('-');
};

const main = async () => {
  try {
    if (
      !Number.isInteger(MAX_USERS) ||
      MAX_USERS < 1
    ) {
      throw new Error(
        'DEMO_MAX_USERS en az 1 olan tam sayı olmalıdır.'
      );
    }

    if (
      !Number.isInteger(DEMO_DAYS) ||
      DEMO_DAYS < 1
    ) {
      throw new Error(
        'DEMO_LICENSE_DAYS en az 1 olan tam sayı olmalıdır.'
      );
    }

    await connectDB();

    const now =
      new Date();

    const expiresAt =
      new Date(
        now.getTime() +
          DEMO_DAYS *
            24 *
            60 *
            60 *
            1000
      );

    const existing =
      await License.findOne({
        where: {
          installation_key:
            INSTALLATION_KEY,
        },
      });

    if (existing) {
      existing.office_name =
        OFFICE_NAME;

      existing.license_type =
        LICENSE_TYPE;

      existing.status =
        'active';

      existing.starts_at =
        now;

      existing.expires_at =
        expiresAt;

      existing.max_users =
        MAX_USERS;

      existing.support_included =
        true;

      existing.updates_included =
        true;

      existing.notes =
        'Demo kurulumu için oluşturulan lisans kaydı.';

      existing.metadata = {
        ...(existing.metadata || {}),
        source:
          'create-demo-license-script',
        demo:
          true,
        updated_at:
          now.toISOString(),
      };

      await existing.save();

      console.log('Demo lisansı güncellendi.');
      console.log('Installation:', existing.installation_key);
      console.log('Office:', existing.office_name);
      console.log('Status:', existing.status);
      console.log('Starts:', existing.starts_at);
      console.log('Expires:', existing.expires_at);
      console.log('Max users:', existing.max_users);

      return;
    }

    const created =
      await License.create({
        installation_key:
          INSTALLATION_KEY,

        license_key:
          createLicenseKey(),

        office_name:
          OFFICE_NAME,

        license_type:
          LICENSE_TYPE,

        status:
          'active',

        starts_at:
          now,

        expires_at:
          expiresAt,

        max_users:
          MAX_USERS,

        support_included:
          true,

        updates_included:
          true,

        notes:
          'Demo kurulumu için oluşturulan lisans kaydı.',

        metadata: {
          source:
            'create-demo-license-script',
          demo:
            true,
          created_at:
            now.toISOString(),
        },
      });

    console.log('Demo lisansı oluşturuldu.');
    console.log('Installation:', created.installation_key);
    console.log('Office:', created.office_name);
    console.log('Status:', created.status);
    console.log('Starts:', created.starts_at);
    console.log('Expires:', created.expires_at);
    console.log('Max users:', created.max_users);
  } catch (error) {
    console.error(
      'Demo lisansı oluşturulamadı:',
      error?.message ||
      error
    );

    process.exitCode =
      1;
  } finally {
    await sequelize.close();
  }
};

main();
