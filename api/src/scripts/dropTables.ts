import { pool } from '../config/database';

const TABLES = [
  'settings',
  'contracts',
  'branches',
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
  for (const t of TABLES) {
    await pool.query(`IF OBJECT_ID(N'dbo.${t}', N'U') IS NOT NULL DROP TABLE dbo.${t};`);
    console.log(`  dropped: ${t}`);
  }
  console.log('Done.');
  await pool.end();
};

run().catch(async (err) => {
  console.error('Drop failed:', err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
