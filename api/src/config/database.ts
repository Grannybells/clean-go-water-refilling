import mysql, { Pool } from 'mysql2/promise';
import { env } from './env';

export const pool: Pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const testConnection = async (): Promise<void> => {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
};
