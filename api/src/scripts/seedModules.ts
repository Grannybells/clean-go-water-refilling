import { RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { DEFAULT_GROUPS, MODULE_CATALOG, ROLE_TO_DEFAULT_GROUP } from '../config/modules';

const run = async (): Promise<void> => {
  console.log('Seeding modules catalog...');
  for (const m of MODULE_CATALOG) {
    await pool.query(
      `INSERT INTO modules (module_name, page, action, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE page = VALUES(page), action = VALUES(action), description = VALUES(description)`,
      [m.module_name, m.page, m.action, m.description]
    );
  }
  console.log(`  ${MODULE_CATALOG.length} modules seeded / updated.`);

  console.log('Seeding default role groups...');
  for (const [groupName, moduleNames] of Object.entries(DEFAULT_GROUPS)) {
    await pool.query('DELETE FROM module_groups WHERE group_name = ?', [groupName]);
    const values = moduleNames.map((m) => [groupName, m, `Default modules for ${groupName}`, null]);
    await pool.query(
      'INSERT INTO module_groups (group_name, module_name, description, created_by) VALUES ?',
      [values]
    );
    console.log(`  ${groupName}: ${moduleNames.length} modules`);
  }

  console.log('Backfilling existing users into their default groups...');
  const [users] = await pool.query<RowDataPacket[]>('SELECT id, role FROM users');
  let assigned = 0;
  for (const u of users) {
    const groupName = ROLE_TO_DEFAULT_GROUP[u.role as string];
    if (!groupName) continue;

    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM users_modules_grp WHERE user_id = ? AND group_name = ? LIMIT 1',
      [u.id, groupName]
    );
    if (existing.length > 0) continue;

    await pool.query(
      'INSERT INTO users_modules_grp (user_id, group_name, assigned_by) VALUES (?, ?, ?)',
      [u.id, groupName, null]
    );
    console.log(`  user_id=${u.id} (${u.role}) -> ${groupName}`);
    assigned += 1;
  }
  console.log(`  ${assigned} assignments added.`);

  console.log('Done.');
  await pool.end();
};

run().catch(async (err) => {
  console.error('Module seed failed:', err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
