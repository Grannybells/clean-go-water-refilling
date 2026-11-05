import { createApp } from './app';
import { env } from './config/env';
import { pool, testConnection } from './config/database';
import { ensureSchema } from './config/schema';

const bootstrap = async (): Promise<void> => {
  try {
    await testConnection();
    console.log(`Connected to MySQL at ${env.db.host}:${env.db.port}/${env.db.name}`);
    await ensureSchema(pool);
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API server running on http://localhost:${env.port}`);
  });
};

bootstrap();
