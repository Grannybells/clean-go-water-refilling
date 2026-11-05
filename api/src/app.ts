import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler, notFound } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import stationRoutes from './routes/stationRoutes';
import contractRoutes from './routes/contractRoutes';
import moduleRoutes from './routes/moduleRoutes';
import moduleGroupRoutes from './routes/moduleGroupRoutes';
import settingsRoutes from './routes/settingsRoutes';

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.cors.origin === '*' ? true : env.cors.origin.split(','),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(apiLimiter);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/stations', stationRoutes);
  app.use('/api/contracts', contractRoutes);
  app.use('/api/modules', moduleRoutes);
  app.use('/api/module-groups', moduleGroupRoutes);
  app.use('/api/settings/device', settingsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
