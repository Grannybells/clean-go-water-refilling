import { pool } from '../config/database';

const TABLES = [
  'settings',
  'contracts',
  'stations',
  'users_modules_grp',
  'module_groups',
  'user_modules',
  'modules',
  'user_roles',
  'user_details',
  'users',
];

const run = async (): Promise<void> => {
  console.log('Dropping all tables...');
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of TABLES) {
    await pool.query(`DROP TABLE IF EXISTS \`${t}\``);
    console.log(`  dropped: ${t}`);
  }
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Done.');
  await pool.end();
};

run().catch(async (err) => {
  console.error('Drop failed:', err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
