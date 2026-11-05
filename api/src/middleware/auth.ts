import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../models/userModel';
import { hasModule } from '../services/permissions';

export interface AuthPayload {
  id: number;
  email: string;
  role: UserRole;
  modules: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, env.jwt.secret) as AuthPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      modules: Array.isArray(decoded.modules) ? decoded.modules : [],
    };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorize = (...allowed: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
};

export const requireModule = (moduleName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (!hasModule(req.user.modules, moduleName)) {
      res.status(403).json({ message: `Forbidden: missing module '${moduleName}'` });
      return;
    }
    next();
  };
};
