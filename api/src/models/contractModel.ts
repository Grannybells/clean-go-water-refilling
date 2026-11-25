import { RowDataPacket, ResultSetHeader, pool } from '../config/database';

export interface ContractRow {
  id: number;
  user_id: number;
  branch_id: string;
  start_date: string;
  end_date: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string | null;
  branch_name: string | null;
}

export interface CreateContractInput {
  user_id: number;
  branch_id: string;
  start_date: string;
  end_date?: string | null;
  created_by: number | null;
}

export type UpdateContractInput = Partial<
  Pick<CreateContractInput, 'user_id' | 'branch_id' | 'start_date' | 'end_date'>
>;

const selectContract = (top: string, where: string, orderBy: string): string => `
  SELECT ${top}
    c.id, c.user_id, c.branch_id, c.start_date, c.end_date,
    c.created_by, c.created_at, c.updated_at,
    d.first_name AS user_first_name,
    d.last_name  AS user_last_name,
    u.email      AS user_email,
    b.branch_name
  FROM contracts c
  LEFT JOIN users u ON u.id = c.user_id
  LEFT JOIN user_details d ON d.user_id = c.user_id
  LEFT JOIN branches b ON b.branch_id = c.branch_id
  ${where}
  ${orderBy}
`;

export const findContractById = async (id: number): Promise<ContractRow | null> => {
  const [rows] = await pool.query<RowDataPacket>(
    selectContract('TOP 1', 'WHERE c.id = ?', ''),
    [id]
  );
  return (rows[0] as ContractRow) ?? null;
};

export const listContracts = async (filters: {
  user_id?: number;
  branch_id?: string;
}): Promise<ContractRow[]> => {
  const where: string[] = [];
  const values: unknown[] = [];

  if (filters.user_id !== undefined) {
    where.push('c.user_id = ?');
    values.push(filters.user_id);
  }
  if (filters.branch_id !== undefined) {
    where.push('c.branch_id = ?');
    values.push(filters.branch_id);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query<RowDataPacket>(
    selectContract('', whereSql, 'ORDER BY c.created_at DESC'),
    values
  );
  return rows as ContractRow[];
};

export const createContract = async (input: CreateContractInput): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO contracts (user_id, branch_id, start_date, end_date, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.user_id,
      input.branch_id,
      input.start_date,
      input.end_date ?? null,
      input.created_by,
    ]
  );
  return result.insertId ?? 0;
};

const UPDATABLE_FIELDS: Array<keyof UpdateContractInput> = [
  'user_id',
  'branch_id',
  'start_date',
  'end_date',
];

export const updateContract = async (
  id: number,
  input: UpdateContractInput
): Promise<number> => {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const key of UPDATABLE_FIELDS) {
    if (input[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(input[key]);
    }
  }

  if (sets.length === 0) return 0;

  values.push(id);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE contracts SET ${sets.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows ?? 0;
};

export const deleteContract = async (id: number): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM contracts WHERE id = ?',
    [id]
  );
  return result.affectedRows ?? 0;
};

export interface ActiveContract {
  id: number;
  branch_id: string;
  branch_name: string | null;
  start_date: string;
  end_date: string | null;
}

const toDateString = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
};

export const findActiveContractForUser = async (
  userId: number
): Promise<ActiveContract | null> => {
  const [rows] = await pool.query<RowDataPacket>(
    `SELECT TOP 1
       c.id, c.branch_id, c.start_date, c.end_date,
       b.branch_name
     FROM contracts c
     LEFT JOIN branches b ON b.branch_id = c.branch_id
     WHERE c.user_id = ?
       AND c.start_date <= CAST(GETDATE() AS DATE)
       AND (c.end_date IS NULL OR c.end_date >= CAST(GETDATE() AS DATE))
     ORDER BY c.start_date DESC`,
    [userId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id as number,
    branch_id: row.branch_id as string,
    branch_name: (row.branch_name as string | null) ?? null,
    start_date: toDateString(row.start_date) as string,
    end_date: toDateString(row.end_date),
  };
};

export const userExists = async (userId: number): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket>(
    'SELECT TOP 1 1 AS ok FROM users WHERE id = ?',
    [userId]
  );
  return rows.length > 0;
};
