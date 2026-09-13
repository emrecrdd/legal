import crypto from 'crypto';

import {
  sequelize,
} from '../config/database.js';

import {
  initModels,
} from '../models/index.js';

import {
  SetupInvite,
} from '../models/SetupInvite.js';

const hours =
  Number(
    process.argv[2] ||
      24
  );

if (
  !Number.isFinite(
    hours
  ) ||
  hours <=
    0 ||
  hours >
    168
) {
  throw new Error(
    'Süre 1-168 saat arasında olmalıdır.'
  );
}

initModels(
  sequelize
);

const rawToken =
  crypto
    .randomBytes(
      32
    )
    .toString(
      'hex'
    );

const tokenHash =
  crypto
    .createHash(
      'sha256'
    )
    .update(
      rawToken,
      'utf8'
    )
    .digest(
      'hex'
    );

const expiresAt =
  new Date(
    Date.now() +
      hours *
        60 *
        60 *
        1000
  );

try {
  await SetupInvite.create({
    token_hash:
      tokenHash,

    expires_at:
      expiresAt,
  });

  console.log(
    '\nKurulum bağlantısı oluşturuldu:\n'
  );

  console.log(
    `https://derkenar.online/ilk-kurulum/${rawToken}`
  );

  console.log(
    `\nGeçerlilik: ${expiresAt.toISOString()}\n`
  );
} finally {
  await sequelize.close();
}
