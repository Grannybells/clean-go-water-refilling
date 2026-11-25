import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

const rawServer = required('DB_SERVER', process.env.DB_SERVER);
const [serverHost, instanceName] = rawServer.split('\\');

const rawPort = process.env.PORT ?? '3000';
const parsedPort = Number(rawPort);
const port: number | string = Number.isFinite(parsedPort) ? parsedPort : rawPort;

export const env = {
  port,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  db: {
    server: serverHost,
    instanceName: instanceName || undefined,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: required('DB_USER', process.env.DB_USER),
    password: process.env.DB_PASSWORD ?? '',
    database: required('DB_DATABASE', process.env.DB_DATABASE),
  },
  jwt: {
    secret: required('JWT_SECRET', process.env.JWT_SECRET),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? '*',
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
  },
};
