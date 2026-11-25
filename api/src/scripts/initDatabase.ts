import { env } from '../config/env';
import { pool, createBootstrapPool } from '../config/database';
import { ensureSchema } from '../config/schema';

const run = async (): Promise<void> => {
  const bootstrap = await createBootstrapPool();

  console.log(`Creating database '${env.db.database}' if not exists...`);
  await bootstrap
    .request()
    .query(
      `IF DB_ID(N'${env.db.database}') IS NULL
         CREATE DATABASE [${env.db.database}];`
    );
  await bootstrap.close();

  await ensureSchema(pool);
  await pool.end();
  console.log('Database initialized successfully.');
};

run().catch((err) => {
  console.error('Database init failed:', err);
  process.exit(1);
});
