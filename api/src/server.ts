import { createApp } from "./app";
import { env } from "./config/env";
import { pool, testConnection } from "./config/database";
import { ensureSchema } from "./config/schema";

const bootstrap = async (): Promise<void> => {
  try {
    await testConnection();
    const serverLabel = env.db.instanceName
      ? `${env.db.server}\\${env.db.instanceName}`
      : env.db.server;
    console.log(`Connected to MSSQL at ${serverLabel}/${env.db.database}`);
    await ensureSchema(pool);
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }

  const app = createApp();
  app.listen(env.port, () => {
    console.log(
      `API server running on http://localhost:${env.port}/cleanAndGo`,
    );
  });
};

bootstrap();
