require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await c.connect();

  const r = await c.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('licenses', 'sequelize_meta')
    ORDER BY tablename
  `);

  const tables = r.rows.map(x => `"${x.tablename.replace(/"/g, '""')}"`);

  console.log('Korunacak tablolar: licenses, sequelize_meta');
  console.log('Temizlenecek tablo sayisi:', tables.length);

  if (tables.length > 0) {
    await c.query(
      `TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`
    );
  }

  console.log('TEMIZLIK TAMAMLANDI');
  console.log('Lisans ve migration gecmisi korundu.');

  await c.end();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
