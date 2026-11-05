import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';

export interface ContractRow {
  id: number;
  user_id: number;
  station_id: string;
  start_date: string;
  end_date: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string | null;
  station_name: string | null;
}

export interface CreateContractInput {
  user_id: number;
  station_id: string;
  start_date: string;
  end_date?: string | null;
  created_by: number | null;
}

export type UpdateContractInput = Partial<
  Pick<CreateContractInput, 'user_id' | 'station_id' | 'start_date' | 'end_date'>
>;

const SELECT_CONTRACT = `
  SELECT
    c.id, c.user_id, c.station_id, c.start_date, c.end_date,
    c.created_by, c.created_at, c.updated_at,
    d.first_name AS user_first_name,
    d.last_name  AS user_last_name,
    u.email      AS user_email,
    s.station_name
  FROM contracts c
  LEFT JOIN users u ON u.id = c.user_id
  LEFT JOIN user_details d ON d.user_id = c.user_id
  LEFT JOIN stations s ON s.station_id = c.station_id
`;

export const findContractById = async (id: number): Promise<ContractRow | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_CONTRACT} WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return (rows[0] as ContractRow) ?? null;
};

export const listContracts = async (filters: {
  user_id?: number;
  station_id?: string;
}): Promise<ContractRow[]> => {
  const where: string[] = [];
  const values: unknown[] = [];

  if (filters.user_id !== undefined) {
    where.push('c.user_id = ?');
    values.push(filters.user_id);
  }
  if (filters.station_id !== undefined) {
    where.push('c.station_id = ?');
    values.push(filters.station_id);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query<RowDataPacket[]>(
    `${SELECT_CONTRACT} ${whereSql} ORDER BY c.created_at DESC`,
    values
  );
  return rows as ContractRow[];
};

export const createContract = async (input: CreateContractInput): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO contracts (user_id, station_id, start_date, end_date, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.user_id,
      input.station_id,
      input.start_date,
      input.end_date ?? null,
      input.created_by,
    ]
  );
  return result.insertId;
};

const UPDATABLE_FIELDS: Array<keyof UpdateContractInput> = [
  'user_id',
  'station_id',
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
  return result.affectedRows;
};

export const deleteContract = async (id: number): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM contracts WHERE id = ?',
    [id]
  );
  return result.affectedRows;
};

export const userExists = async (userId: number): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows.length > 0;
};
