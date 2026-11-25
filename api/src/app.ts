import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { apiLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFound } from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import branchRoutes from "./routes/branchRoutes";
import contractRoutes from "./routes/contractRoutes";
import customerRoutes from "./routes/customerRoutes";
import productRoutes from "./routes/productRoutes";
import transactionRoutes from "./routes/transactionRoutes";
import moduleRoutes from "./routes/moduleRoutes";
import moduleGroupRoutes from "./routes/moduleGroupRoutes";
import settingsRoutes from "./routes/settingsRoutes";

export const createApp = (): Application => {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.cors.origin === "*" ? true : env.cors.origin.split(","),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(apiLimiter);

  const base = "/cleanAndGo";

  app.get(`${base}/health`, (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use(`${base}/api/auth`, authRoutes);
  app.use(`${base}/api/users`, userRoutes);
  app.use(`${base}/api/branches`, branchRoutes);
  app.use(`${base}/api/contracts`, contractRoutes);
  app.use(`${base}/api/customers`, customerRoutes);
  app.use(`${base}/api/products`, productRoutes);
  app.use(`${base}/api/transactions`, transactionRoutes);
  app.use(`${base}/api/modules`, moduleRoutes);
  app.use(`${base}/api/module-groups`, moduleGroupRoutes);
  app.use(`${base}/api/settings/device`, settingsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
