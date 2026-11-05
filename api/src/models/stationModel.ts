import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';

export interface Station {
  station_id: string;
  station_name: string;
  station_address: string;
  station_lat: string | null;
  station_lng: string | null;
  contact_number: string | null;
  description: string | null;
  is_active: number;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateStationInput {
  station_id: string;
  station_name: string;
  station_address: string;
  station_lat?: number | null;
  station_lng?: number | null;
  contact_number?: string | null;
  description?: string | null;
  is_active?: boolean;
  created_by: number | null;
}

export type UpdateStationInput = Partial<Omit<CreateStationInput, 'station_id' | 'created_by'>>;

export const stationExists = async (stationId: string): Promise<boolean> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM stations WHERE station_id = ? LIMIT 1',
    [stationId]
  );
  return rows.length > 0;
};

export const findStationById = async (stationId: string): Promise<Station | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM stations WHERE station_id = ? LIMIT 1',
    [stationId]
  );
  return (rows[0] as Station) ?? null;
};

export const listStations = async (): Promise<Station[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM stations ORDER BY created_at DESC'
  );
  return rows as Station[];
};

export const createStation = async (input: CreateStationInput): Promise<void> => {
  await pool.query<ResultSetHeader>(
    `INSERT INTO stations
       (station_id, station_name, station_address, station_lat, station_lng,
        contact_number, description, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.station_id,
      input.station_name,
      input.station_address,
      input.station_lat ?? null,
      input.station_lng ?? null,
      input.contact_number ?? null,
      input.description ?? null,
      input.is_active ?? true,
      input.created_by,
    ]
  );
};

const UPDATABLE_FIELDS: Array<keyof UpdateStationInput> = [
  'station_name',
  'station_address',
  'station_lat',
  'station_lng',
  'contact_number',
  'description',
  'is_active',
];

export const updateStation = async (
  stationId: string,
  input: UpdateStationInput
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

  values.push(stationId);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE stations SET ${sets.join(', ')} WHERE station_id = ?`,
    values
  );
  return result.affectedRows;
};

export const deleteStation = async (stationId: string): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM stations WHERE station_id = ?',
    [stationId]
  );
  return result.affectedRows;
};
