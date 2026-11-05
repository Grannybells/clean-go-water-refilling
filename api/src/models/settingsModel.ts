import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';

export interface SettingsRow {
  id: number;
  station_id: string | null;
  station_name: string | null;
  user_id: number | null;
  user_name: string | null;
  device_id: string | null;
  device_name: string | null;
  device_model: string | null;
  os_name: string | null;
  os_version: string | null;
  app_version: string | null;
  push_token: string | null;
  last_seen_at: Date | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSettingsInput {
  station_id?: string | null;
  station_name?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  device_id?: string | null;
  device_name?: string | null;
  device_model?: string | null;
  os_name?: string | null;
  os_version?: string | null;
  app_version?: string | null;
  push_token?: string | null;
  last_seen_at?: string | null;
  created_by: number | null;
}

export type UpdateSettingsInput = Partial<Omit<CreateSettingsInput, 'created_by'>>;

export const listSettings = async (): Promise<SettingsRow[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM settings ORDER BY created_at DESC'
  );
  return rows as SettingsRow[];
};

export const findSettingsById = async (id: number): Promise<SettingsRow | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM settings WHERE id = ? LIMIT 1',
    [id]
  );
  return (rows[0] as SettingsRow) ?? null;
};

export const findSettingsByDeviceId = async (
  deviceId: string
): Promise<SettingsRow | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM settings WHERE device_id = ? LIMIT 1',
    [deviceId]
  );
  return (rows[0] as SettingsRow) ?? null;
};

const INSERT_FIELDS = [
  'station_id',
  'station_name',
  'user_id',
  'user_name',
  'device_id',
  'device_name',
  'device_model',
  'os_name',
  'os_version',
  'app_version',
  'push_token',
  'last_seen_at',
  'created_by',
] as const;

const toDateOrNull = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const createSettings = async (input: CreateSettingsInput): Promise<number> => {
  const values = INSERT_FIELDS.map((f) => {
    if (f === 'created_by') return input.created_by;
    if (f === 'last_seen_at') return toDateOrNull(input.last_seen_at);
    return input[f] ?? null;
  });
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO settings (${INSERT_FIELDS.join(', ')}) VALUES (${INSERT_FIELDS.map(() => '?').join(', ')})`,
    values
  );
  return result.insertId;
};

const UPDATABLE: Array<keyof UpdateSettingsInput> = [
  'station_id',
  'station_name',
  'user_id',
  'user_name',
  'device_id',
  'device_name',
  'device_model',
  'os_name',
  'os_version',
  'app_version',
  'push_token',
  'last_seen_at',
];

export const updateSettings = async (
  id: number,
  input: UpdateSettingsInput
): Promise<number> => {
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of UPDATABLE) {
    if (input[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(key === 'last_seen_at' ? toDateOrNull(input.last_seen_at) : input[key]);
    }
  }
  if (sets.length === 0) return 0;

  values.push(id);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE settings SET ${sets.join(', ')} WHERE id = ?`,
    values
  );
  return result.affectedRows;
};

export const deleteSettings = async (id: number): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM settings WHERE id = ?',
    [id]
  );
  return result.affectedRows;
};
