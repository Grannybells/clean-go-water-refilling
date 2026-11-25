import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { findPublicUserById, findUserByEmail, UserRole } from '../models/userModel';
import { getEffectiveModules } from '../services/permissions';
import { findActiveContractForUser } from '../models/contractModel';
import { AuthContract } from '../middleware/auth';

const ROLES_EXEMPT_FROM_CONTRACT = new Set<UserRole>(['owner', 'admin']);

const signToken = (payload: {
  id: number;
  email: string;
  role: UserRole;
  modules: string[];
  contract: AuthContract | null;
}): string => {
  const options: SignOptions = { expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwt.secret, options);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password, branch_id } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ message: 'email and password are required' });
    return;
  }
  if (branch_id !== undefined && typeof branch_id !== 'string') {
    res.status(400).json({ message: 'branch_id must be a string' });
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

  const isExempt = ROLES_EXEMPT_FROM_CONTRACT.has(auth.role);
  const active = await findActiveContractForUser(auth.id);

  if (!isExempt) {
    if (!branch_id) {
      res.status(400).json({ message: 'branch_id is required' });
      return;
    }
    if (!active) {
      res.status(403).json({
        message: 'No active branch assignment. Contact an admin to be assigned a branch.',
      });
      return;
    }
    if (active.branch_id !== branch_id) {
      res.status(403).json({
        message: `You are not assigned to branch '${branch_id}'.`,
      });
      return;
    }
  }

  const contract: AuthContract | null = active;

  const user = await findPublicUserById(auth.id);
  const modules = await getEffectiveModules(auth.id, auth.role);
  const token = signToken({
    id: auth.id,
    email: auth.email,
    role: auth.role,
    modules,
    contract,
  });

  res.json({ user, modules, contract, token });
};
