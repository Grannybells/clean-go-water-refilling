import mysql from 'mysql2/promise';
import { env } from '../config/env';
import { pool } from '../config/database';
import { ensureSchema } from '../config/schema';

const run = async (): Promise<void> => {
  const bootstrap = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
  });

  console.log(`Creating database \`${env.db.name}\` if not exists...`);
  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await bootstrap.end();

  await ensureSchema(pool);
  await pool.end();
  console.log('Database initialized successfully.');
};

run().catch((err) => {
  console.error('Database init failed:', err);
  process.exit(1);
});
