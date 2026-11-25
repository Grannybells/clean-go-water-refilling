import { RowDataPacket, ResultSetHeader, pool } from '../config/database';

export interface Branch {
  branch_id: string;
  branch_name: string;
  branch_address: string;
  branch_lat: string | null;
  branch_lng: string | null;
  contact_number: string | null;
  description: string | null;
  is_active: number;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBranchInput {
  branch_id: string;
  branch_name: string;
  branch_address: string;
  branch_lat?: number | null;
  branch_lng?: number | null;
  contact_number?: string | null;
  description?: string | null;
  is_active?: boolean;
  created_by: number | null;
}

export type UpdateBranchInput = Partial<Omit<CreateBranchInput, 'branch_id' | 'created_by'>>;

export const branchExists = async (branchId: string): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket>(
    'SELECT TOP 1 1 AS ok FROM branches WHERE branch_id = ?',
    [branchId]
  );
  return rows.length > 0;
};

export const findBranchById = async (branchId: string): Promise<Branch | null> => {
  const [rows] = await pool.query<RowDataPacket>(
    'SELECT TOP 1 * FROM branches WHERE branch_id = ?',
    [branchId]
  );
  return (rows[0] as Branch) ?? null;
};

export const listBranches = async (): Promise<Branch[]> => {
  const [rows] = await pool.query<RowDataPacket>(
    'SELECT * FROM branches ORDER BY created_at DESC'
  );
  return rows as Branch[];
};

export const createBranch = async (input: CreateBranchInput): Promise<void> => {
  await pool.query<ResultSetHeader>(
    `INSERT INTO branches
       (branch_id, branch_name, branch_address, branch_lat, branch_lng,
        contact_number, description, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.branch_id,
      input.branch_name,
      input.branch_address,
      input.branch_lat ?? null,
      input.branch_lng ?? null,
      input.contact_number ?? null,
      input.description ?? null,
      input.is_active ?? true,
      input.created_by,
    ]
  );
};

const UPDATABLE_FIELDS: Array<keyof UpdateBranchInput> = [
  'branch_name',
  'branch_address',
  'branch_lat',
  'branch_lng',
  'contact_number',
  'description',
  'is_active',
];

export const updateBranch = async (
  branchId: string,
  input: UpdateBranchInput
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

  values.push(branchId);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE branches SET ${sets.join(', ')} WHERE branch_id = ?`,
    values
  );
  return result.affectedRows ?? 0;
};

export const deleteBranch = async (branchId: string): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM branches WHERE branch_id = ?',
    [branchId]
  );
  return result.affectedRows ?? 0;
};
