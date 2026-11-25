import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { env } from "../config/env";

const keyGenerator = (req: Request): string =>
  req.ip ??
  (req.headers["x-forwarded-for"] as string | undefined)
    ?.split(",")[0]
    ?.trim() ??
  req.socket.remoteAddress ??
  "unknown";

export const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  validate: { ip: false, trustProxy: false },
  message: { message: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  validate: { ip: false, trustProxy: false },
  message: {
    message: "Too many authentication attempts, please try again later.",
  },
});
