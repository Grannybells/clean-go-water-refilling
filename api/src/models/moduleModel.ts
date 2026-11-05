import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';

export interface ModuleRow {
  module_name: string;
  page: string;
  action: string;
  description: string | null;
}

export interface UserModuleGrant {
  id: number;
  module_name: string;
  granted_by: number | null;
  created_at: Date;
}

export interface UserGroupMembership {
  id: number;
  group_name: string;
  assigned_by: number | null;
  created_at: Date;
  modules: string[];
}

export const listModules = async (page?: string): Promise<ModuleRow[]> => {
  if (page) {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT module_name, page, action, description FROM modules WHERE page = ? ORDER BY module_name',
      [page]
    );
    return rows as ModuleRow[];
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT module_name, page, action, description FROM modules ORDER BY page, action'
  );
  return rows as ModuleRow[];
};

export const findModule = async (moduleName: string): Promise<ModuleRow | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT module_name, page, action, description FROM modules WHERE module_name = ? LIMIT 1',
    [moduleName]
  );
  return (rows[0] as ModuleRow) ?? null;
};

export const updateModuleDescription = async (
  moduleName: string,
  description: string | null
): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE modules SET description = ? WHERE module_name = ?',
    [description, moduleName]
  );
  return result.affectedRows;
};

export const moduleExists = async (moduleName: string): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM modules WHERE module_name = ? LIMIT 1',
    [moduleName]
  );
  return rows.length > 0;
};

export const groupExists = async (groupName: string): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM module_groups WHERE group_name = ? LIMIT 1',
    [groupName]
  );
  return rows.length > 0;
};

export const listUserDirectModules = async (
  userId: number
): Promise<UserModuleGrant[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, module_name, granted_by, created_at FROM user_modules WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows as UserModuleGrant[];
};

export const listUserGroups = async (userId: number): Promise<UserGroupMembership[]> => {
  const [memberships] = await pool.query<RowDataPacket[]>(
    'SELECT id, group_name, assigned_by, created_at FROM users_modules_grp WHERE user_id = ? ORDER BY group_name',
    [userId]
  );

  const result: UserGroupMembership[] = [];
  for (const m of memberships) {
    const [modules] = await pool.query<RowDataPacket[]>(
      'SELECT module_name FROM module_groups WHERE group_name = ? ORDER BY module_name',
      [m.group_name]
    );
    result.push({
      id: m.id,
      group_name: m.group_name,
      assigned_by: m.assigned_by,
      created_at: m.created_at,
      modules: modules.map((r) => r.module_name as string),
    });
  }
  return result;
};

export const userHasDirectModule = async (
  userId: number,
  moduleName: string
): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM user_modules WHERE user_id = ? AND module_name = ? LIMIT 1',
    [userId, moduleName]
  );
  return rows.length > 0;
};

export const userIsInGroup = async (
  userId: number,
  groupName: string
): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM users_modules_grp WHERE user_id = ? AND group_name = ? LIMIT 1',
    [userId, groupName]
  );
  return rows.length > 0;
};

export const grantUserModule = async (
  userId: number,
  moduleName: string,
  grantedBy: number | null
): Promise<void> => {
  await pool.query(
    'INSERT INTO user_modules (user_id, module_name, granted_by) VALUES (?, ?, ?)',
    [userId, moduleName, grantedBy]
  );
};

export const revokeUserModule = async (
  userId: number,
  moduleName: string
): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM user_modules WHERE user_id = ? AND module_name = ?',
    [userId, moduleName]
  );
  return result.affectedRows;
};

export const assignUserGroup = async (
  userId: number,
  groupName: string,
  assignedBy: number | null
): Promise<void> => {
  await pool.query(
    'INSERT INTO users_modules_grp (user_id, group_name, assigned_by) VALUES (?, ?, ?)',
    [userId, groupName, assignedBy]
  );
};

export const removeUserGroup = async (
  userId: number,
  groupName: string
): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM users_modules_grp WHERE user_id = ? AND group_name = ?',
    [userId, groupName]
  );
  return result.affectedRows;
};

export const updateUserRole = async (
  userId: number,
  role: string
): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE users SET role = ? WHERE id = ?',
    [role, userId]
  );
  return result.affectedRows;
};

export const countOwners = async (): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'owner'"
  );
  return (rows[0]?.n as number) ?? 0;
};
