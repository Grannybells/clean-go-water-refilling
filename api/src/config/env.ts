import dotenv from 'dotenv';

dotenv.config();

const required = (name: string, value: string | undefined): string => {
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  db: {
    host: required('DB_HOST', process.env.DB_HOST),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required('DB_USER', process.env.DB_USER),
    password: process.env.DB_PASSWORD ?? '',
    name: required('DB_NAME', process.env.DB_NAME),
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
