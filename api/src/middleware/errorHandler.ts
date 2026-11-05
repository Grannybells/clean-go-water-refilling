import { Request, Response, NextFunction } from 'express';

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({ message: 'Route not found' });
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
};
