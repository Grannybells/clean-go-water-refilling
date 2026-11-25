import { RowDataPacket, ResultSetHeader, pool } from '../config/database';

export interface CustomerType {
  id: number;
  customer_refno: string;
  type: string;
  description: string | null;
  created_by: number | null;
  created_at: Date;
}

export interface Customer {
  cus_refno: number;
  cus_name: string;
  cus_address: string | null;
  cus_contactno: string | null;
  cus_email: string | null;
  cus_birthdate: string | null;
  cus_joindate: string | null;
  cus_type: string;
  cus_branch: string | null;
  cus_datecreated: Date;
  cus_userid: number | null;
  cus_code: string;
  balance_due: number;
  cus_type_name: string | null;
}

const CUSTOMER_SELECT = `
  SELECT c.*,
         t.type AS cus_type_name,
         COALESCE(b.balance_due, 0) AS balance_due
    FROM CustomerInfo c
    LEFT JOIN customer_type t ON t.customer_refno = c.cus_type
    LEFT JOIN (
      SELECT wth_cuscode, SUM(wth_balanceamt) AS balance_due
        FROM water_tranheader
       WHERE wth_balancestatus = 'UP' AND wth_cuscode IS NOT NULL
       GROUP BY wth_cuscode
    ) b ON b.wth_cuscode = c.cus_code
`;

export interface CreateCustomerInput {
  cus_name: string;
  cus_address?: string | null;
  cus_contactno?: string | null;
  cus_email?: string | null;
  cus_birthdate?: string | null;
  cus_type: string;
  cus_branch?: string | null;
  cus_userid: number | null;
  cus_code: string;
}

export type UpdateCustomerInput = Partial<
  Omit<CreateCustomerInput, 'cus_userid' | 'cus_code'>
> & { cus_joindate?: string | null };

export const listCustomerTypes = async (): Promise<CustomerType[]> => {
  const [rows] = await pool.query<RowDataPacket>(
    `SELECT id, customer_refno, type, description, created_by, created_at
       FROM customer_type
       ORDER BY created_at DESC`
  );
  return rows as CustomerType[];
};

export const customerTypeRefnoExists = async (refno: string): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket>(
    'SELECT TOP 1 1 AS ok FROM customer_type WHERE customer_refno = ?',
    [refno]
  );
  return rows.length > 0;
};

export const findCustomerByRefno = async (cusRefno: number): Promise<Customer | null> => {
  const [rows] = await pool.query<RowDataPacket>(
    `${CUSTOMER_SELECT} WHERE c.cus_refno = ?`,
    [cusRefno]
  );
  return (rows[0] as Customer) ?? null;
};

export const listCustomers = async (
  branchId?: string | null
): Promise<Customer[]> => {
  if (branchId) {
    const [rows] = await pool.query<RowDataPacket>(
      `${CUSTOMER_SELECT} WHERE c.cus_branch = ? ORDER BY c.cus_datecreated DESC`,
      [branchId]
    );
    return rows as Customer[];
  }
  const [rows] = await pool.query<RowDataPacket>(
    `${CUSTOMER_SELECT} ORDER BY c.cus_datecreated DESC`
  );
  return rows as Customer[];
};

export const nextCustomerCode = async (
  typeRefno: string,
  yymm: string
): Promise<string> => {
  const prefix = `${typeRefno}${yymm}`;
  const [rows] = await pool.query<RowDataPacket>(
    `SELECT TOP 1 cus_code FROM CustomerInfo
       WHERE cus_code LIKE ?
       ORDER BY cus_code DESC`,
    [`${prefix}%`]
  );
  const last = rows[0]?.cus_code as string | undefined;
  const seq = last ? Number(last.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

export const createCustomer = async (input: CreateCustomerInput): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO CustomerInfo
       (cus_name, cus_address, cus_contactno, cus_email,
        cus_birthdate, cus_joindate, cus_type, cus_branch,
        cus_datecreated, cus_userid, cus_code)
     VALUES (?, ?, ?, ?, ?, CAST(SYSUTCDATETIME() AS DATE), ?, ?, SYSUTCDATETIME(), ?, ?)`,
    [
      input.cus_name,
      input.cus_address ?? null,
      input.cus_contactno ?? null,
      input.cus_email ?? null,
      input.cus_birthdate ?? null,
      input.cus_type,
      input.cus_branch ?? null,
      input.cus_userid,
      input.cus_code,
    ]
  );
  return result.insertId ?? 0;
};

const UPDATABLE_FIELDS: Array<keyof UpdateCustomerInput> = [
  'cus_name',
  'cus_address',
  'cus_contactno',
  'cus_email',
  'cus_birthdate',
  'cus_joindate',
  'cus_type',
];

export const updateCustomer = async (
  cusRefno: number,
  input: UpdateCustomerInput
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

  values.push(cusRefno);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE CustomerInfo SET ${sets.join(', ')} WHERE cus_refno = ?`,
    values
  );
  return result.affectedRows ?? 0;
};
