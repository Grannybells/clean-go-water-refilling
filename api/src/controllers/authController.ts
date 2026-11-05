import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { findPublicUserById, findUserByEmail, UserRole } from '../models/userModel';
import { getEffectiveModules } from '../services/permissions';

const signToken = (payload: {
  id: number;
  email: string;
  role: UserRole;
  modules: string[];
}): string => {
  const options: SignOptions = { expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwt.secret, options);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ message: 'email and password are required' });
    return;
  }

  const auth = await findUserByEmail(email);
  if (!auth) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, auth.password_hash);
  if (!valid) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const user = await findPublicUserById(auth.id);
  const modules = await getEffectiveModules(auth.id, auth.role);
  const token = signToken({ id: auth.id, email: auth.email, role: auth.role, modules });

  res.json({ user, modules, token });
};
