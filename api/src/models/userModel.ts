import { RowDataPacket, ResultSetHeader, pool } from '../config/database';

export type UserRole = string;

export interface UserAuth {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: number;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  gender: 'male' | 'female' | 'other' | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
  birthDate?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  avatarUrl?: string | null;
  createdBy?: number | null;
  modules?: string[];
  groups?: string[];
}

const selectPublicUser = (extraWhere = ''): string => `
  SELECT
    u.id, u.email, u.role, u.created_at, u.updated_at,
    d.first_name, d.last_name, d.phone, d.address, d.birth_date, d.gender, d.avatar_url
  FROM users u
  LEFT JOIN user_details d ON d.user_id = u.id
  ${extraWhere}
`;

export const findUserByEmail = async (email: string): Promise<UserAuth | null> => {
  const [rows] = await pool.query<RowDataPacket>(
    'SELECT TOP 1 id, email, password_hash, role, created_at, updated_at FROM users WHERE email = ?',
    [email]
  );
  return (rows[0] as UserAuth) ?? null;
};

export const findPublicUserById = async (id: number): Promise<PublicUser | null> => {
  const [rows] = await pool.query<RowDataPacket>(
    `SELECT TOP 1
       u.id, u.email, u.role, u.created_at, u.updated_at,
       d.first_name, d.last_name, d.phone, d.address, d.birth_date, d.gender, d.avatar_url
     FROM users u
     LEFT JOIN user_details d ON d.user_id = u.id
     WHERE u.id = ?`,
    [id]
  );
  return (rows[0] as PublicUser) ?? null;
};

export const listUsers = async (): Promise<PublicUser[]> => {
  const [rows] = await pool.query<RowDataPacket>(
    `${selectPublicUser(`WHERE u.role <> 'owner'`)} ORDER BY u.id DESC`
  );
  return rows as PublicUser[];
};

export const roleExists = async (roleName: string): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket>(
    'SELECT TOP 1 1 AS ok FROM user_roles WHERE role_name = ?',
    [roleName]
  );
  return rows.length > 0;
};

export const ownerExists = async (): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket>(
    "SELECT TOP 1 1 AS ok FROM users WHERE role = 'owner'"
  );
  return rows.length > 0;
};

export interface UpdateUserDetailsInput {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  address?: string | null;
  birth_date?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  avatar_url?: string | null;
}

const USER_DETAILS_UPDATABLE: Array<keyof UpdateUserDetailsInput> = [
  'first_name',
  'last_name',
  'phone',
  'address',
  'birth_date',
  'gender',
  'avatar_url',
];

export const updateUserDetails = async (
  userId: number,
  input: UpdateUserDetailsInput
): Promise<number> => {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of USER_DETAILS_UPDATABLE) {
    if (input[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(input[key]);
    }
  }
  if (sets.length === 0) return 0;

  values.push(userId);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE user_details SET ${sets.join(', ')} WHERE user_id = ?`,
    values
  );
  return result.affectedRows ?? 0;
};

export const createUser = async (input: CreateUserInput): Promise<number> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query<ResultSetHeader>(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [input.email, input.passwordHash, input.role]
    );
    const userId = result.insertId ?? 0;

    await conn.query(
      `INSERT INTO user_details
         (user_id, first_name, last_name, phone, address, birth_date, gender, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        input.firstName,
        input.lastName,
        input.phone ?? null,
        input.address ?? null,
        input.birthDate ?? null,
        input.gender ?? null,
        input.avatarUrl ?? null,
      ]
    );

    if (input.modules && input.modules.length > 0) {
      for (const moduleName of input.modules) {
        await conn.query(
          'INSERT INTO user_modules (user_id, module_name, granted_by) VALUES (?, ?, ?)',
          [userId, moduleName, input.createdBy ?? null]
        );
      }
    }

    if (input.groups && input.groups.length > 0) {
      for (const groupName of input.groups) {
        await conn.query(
          'INSERT INTO users_modules_grp (user_id, group_name, assigned_by) VALUES (?, ?, ?)',
          [userId, groupName, input.createdBy ?? null]
        );
      }
    }

    await conn.commit();
    return userId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
