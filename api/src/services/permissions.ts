import { RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

export const getEffectiveModules = async (
  userId: number,
  role: string
): Promise<string[]> => {
  if (role === 'owner') return ['*'];

  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT module_name FROM user_modules WHERE user_id = ?
    UNION
    SELECT mg.module_name
    FROM users_modules_grp umg
    JOIN module_groups mg ON mg.group_name = umg.group_name
    WHERE umg.user_id = ?
    `,
    [userId, userId]
  );

  return rows.map((r) => r.module_name as string);
};

export const hasModule = (modules: string[], required: string): boolean => {
  if (modules.includes('*')) return true;
  if (modules.includes(required)) return true;
  const parts = required.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const wildcard = `${parts.slice(0, i).join('.')}.*`;
    if (modules.includes(wildcard)) return true;
  }
  return false;
};
