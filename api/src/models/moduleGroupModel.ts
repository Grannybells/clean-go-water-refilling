import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';

export interface ModuleGroupSummary {
  group_name: string;
  modules: string[];
  user_count: number;
}

export interface ModuleGroupDetail {
  group_name: string;
  modules: string[];
  user_count: number;
  description: string | null;
  created_at: Date | null;
}

export const listGroups = async (): Promise<ModuleGroupSummary[]> => {
  const [groups] = await pool.query<RowDataPacket[]>(
    `SELECT group_name, GROUP_CONCAT(module_name ORDER BY module_name) AS modules
     FROM module_groups
     GROUP BY group_name
     ORDER BY group_name`
  );
  const [users] = await pool.query<RowDataPacket[]>(
    'SELECT group_name, COUNT(*) AS n FROM users_modules_grp GROUP BY group_name'
  );
  const userCounts = new Map<string, number>(
    users.map((r) => [r.group_name as string, Number(r.n)])
  );
  return groups.map((g) => ({
    group_name: g.group_name as string,
    modules: (g.modules as string | null)?.split(',') ?? [],
    user_count: userCounts.get(g.group_name as string) ?? 0,
  }));
};

export const findGroup = async (name: string): Promise<ModuleGroupDetail | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT module_name, description, created_at
     FROM module_groups
     WHERE group_name = ?
     ORDER BY module_name`,
    [name]
  );
  if (rows.length === 0) return null;

  const [userRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS n FROM users_modules_grp WHERE group_name = ?',
    [name]
  );

  return {
    group_name: name,
    modules: rows.map((r) => r.module_name as string),
    user_count: Number(userRows[0]?.n ?? 0),
    description: (rows[0]?.description as string | null) ?? null,
    created_at: (rows[0]?.created_at as Date | null) ?? null,
  };
};

export const groupExistsByName = async (name: string): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM module_groups WHERE group_name = ? LIMIT 1',
    [name]
  );
  return rows.length > 0;
};

export const groupContainsModule = async (
  name: string,
  moduleName: string
): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM module_groups WHERE group_name = ? AND module_name = ? LIMIT 1',
    [name, moduleName]
  );
  return rows.length > 0;
};

export const createGroup = async (
  name: string,
  moduleNames: string[],
  description: string | null,
  createdBy: number | null
): Promise<void> => {
  const values = moduleNames.map((m) => [name, m, description, createdBy]);
  await pool.query(
    'INSERT INTO module_groups (group_name, module_name, description, created_by) VALUES ?',
    [values]
  );
};

export const addModuleToGroup = async (
  name: string,
  moduleName: string,
  description: string | null,
  createdBy: number | null
): Promise<void> => {
  await pool.query(
    'INSERT INTO module_groups (group_name, module_name, description, created_by) VALUES (?, ?, ?, ?)',
    [name, moduleName, description, createdBy]
  );
};

export const removeModuleFromGroup = async (
  name: string,
  moduleName: string
): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM module_groups WHERE group_name = ? AND module_name = ?',
    [name, moduleName]
  );
  return result.affectedRows;
};

export const deleteGroupCascade = async (
  name: string
): Promise<{ modulesRemoved: number; membershipsRemoved: number }> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [modulesResult] = await conn.query<ResultSetHeader>(
      'DELETE FROM module_groups WHERE group_name = ?',
      [name]
    );
    const [membershipsResult] = await conn.query<ResultSetHeader>(
      'DELETE FROM users_modules_grp WHERE group_name = ?',
      [name]
    );
    await conn.commit();
    return {
      modulesRemoved: modulesResult.affectedRows,
      membershipsRemoved: membershipsResult.affectedRows,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const renameGroupCascade = async (
  oldName: string,
  newName: string
): Promise<{ modulesRenamed: number; membershipsRenamed: number }> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [modulesResult] = await conn.query<ResultSetHeader>(
      'UPDATE module_groups SET group_name = ? WHERE group_name = ?',
      [newName, oldName]
    );
    const [membershipsResult] = await conn.query<ResultSetHeader>(
      'UPDATE users_modules_grp SET group_name = ? WHERE group_name = ?',
      [newName, oldName]
    );
    await conn.commit();
    return {
      modulesRenamed: modulesResult.affectedRows,
      membershipsRenamed: membershipsResult.affectedRows,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
