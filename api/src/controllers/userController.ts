import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import {
  createUser,
  findPublicUserById,
  findUserByEmail,
  listUsers,
  roleExists,
  updateUserDetails,
  UpdateUserDetailsInput,
} from '../models/userModel';
import {
  assignUserGroup,
  countOwners,
  grantUserModule,
  groupExists,
  listUserDirectModules,
  listUserGroups,
  moduleExists,
  removeUserGroup,
  revokeUserModule,
  updateUserRole,
  userHasDirectModule,
  userIsInGroup,
} from '../models/moduleModel';
import { ROLE_TO_DEFAULT_GROUP } from '../config/modules';
import { getEffectiveModules } from '../services/permissions';

const parseUserId = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const user = await findPublicUserById(req.user.id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  const modules = await getEffectiveModules(user.id, user.role);
  res.json({ user, modules });
};

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  const users = await listUsers();
  res.json({ users });
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const id = parseUserId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'id must be a positive integer' });
    return;
  }

  const user = await findPublicUserById(id);
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  const [effective, direct, groups] = await Promise.all([
    getEffectiveModules(user.id, user.role),
    listUserDirectModules(user.id),
    listUserGroups(user.id),
  ]);

  res.json({
    user,
    modules: {
      effective,
      direct,
      groups,
    },
  });
};

export const createUserByAdmin = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const {
    email,
    password,
    first_name,
    last_name,
    role = 'staff',
    phone,
    address,
    birth_date,
    gender,
    avatar_url,
    modules,
    groups,
  } = req.body ?? {};

  if (!email || !password || !first_name || !last_name) {
    res
      .status(400)
      .json({ message: 'email, password, first_name, and last_name are required' });
    return;
  }
  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters' });
    return;
  }
  if (modules !== undefined && !Array.isArray(modules)) {
    res.status(400).json({ message: 'modules must be an array of strings' });
    return;
  }
  if (groups !== undefined && !Array.isArray(groups)) {
    res.status(400).json({ message: 'groups must be an array of strings' });
    return;
  }

  if (!(await roleExists(role))) {
    res.status(400).json({ message: `Unknown role: ${role}` });
    return;
  }

  if (role === 'owner' && req.user.role !== 'owner') {
    res.status(403).json({ message: 'Only an owner can create another owner' });
    return;
  }

  if (await findUserByEmail(email)) {
    res.status(409).json({ message: 'Email already registered' });
    return;
  }

  const defaultGroup = ROLE_TO_DEFAULT_GROUP[role as string];
  const effectiveGroups = Array.from(
    new Set([...(groups ?? []), ...(defaultGroup ? [defaultGroup] : [])])
  );

  const passwordHash = await bcrypt.hash(password, 10);
  const id = await createUser({
    email,
    passwordHash,
    role,
    firstName: first_name,
    lastName: last_name,
    phone,
    address,
    birthDate: birth_date,
    gender,
    avatarUrl: avatar_url,
    createdBy: req.user.id,
    modules,
    groups: effectiveGroups,
  });

  const user = await findPublicUserById(id);
  res.status(201).json({ user });
};

export const changeUserRole = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const id = parseUserId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'id must be a positive integer' });
    return;
  }

  const { role } = req.body ?? {};
  if (typeof role !== 'string' || !role) {
    res.status(400).json({ message: 'role is required' });
    return;
  }

  const target = await findPublicUserById(id);
  if (!target) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  if (!(await roleExists(role))) {
    res.status(400).json({ message: `Unknown role: ${role}` });
    return;
  }

  if (role === 'owner' && req.user.role !== 'owner') {
    res.status(403).json({ message: 'Only an owner can promote to owner' });
    return;
  }

  if (target.role === 'owner' && role !== 'owner') {
    const owners = await countOwners();
    if (owners <= 1) {
      res.status(409).json({ message: 'Cannot demote the only owner' });
      return;
    }
  }

  if (target.role === role) {
    res.json({ user: target, message: 'Role unchanged' });
    return;
  }

  await updateUserRole(id, role);
  const updated = await findPublicUserById(id);
  res.json({ user: updated, requires_relogin: true });
};

export const grantModuleHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const id = parseUserId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'id must be a positive integer' });
    return;
  }

  const { module_name } = req.body ?? {};
  if (typeof module_name !== 'string' || !module_name) {
    res.status(400).json({ message: 'module_name is required' });
    return;
  }

  const target = await findPublicUserById(id);
  if (!target) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  if (!(await moduleExists(module_name))) {
    res.status(400).json({ message: `Unknown module: ${module_name}` });
    return;
  }
  if (await userHasDirectModule(id, module_name)) {
    res.status(409).json({ message: 'User already has this module granted directly' });
    return;
  }

  await grantUserModule(id, module_name, req.user.id);
  res.status(201).json({ message: 'Module granted', requires_relogin: true });
};

export const revokeModuleHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const id = parseUserId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'id must be a positive integer' });
    return;
  }
  const moduleName = req.params.moduleName;

  const affected = await revokeUserModule(id, moduleName);
  if (affected === 0) {
    res.status(404).json({ message: 'That module was not directly granted to this user' });
    return;
  }
  res.status(200).json({ message: 'Module revoked', requires_relogin: true });
};

export const addGroupHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const id = parseUserId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'id must be a positive integer' });
    return;
  }

  const { group_name } = req.body ?? {};
  if (typeof group_name !== 'string' || !group_name) {
    res.status(400).json({ message: 'group_name is required' });
    return;
  }

  const target = await findPublicUserById(id);
  if (!target) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  if (!(await groupExists(group_name))) {
    res.status(400).json({ message: `Unknown group: ${group_name}` });
    return;
  }
  if (await userIsInGroup(id, group_name)) {
    res.status(409).json({ message: 'User is already in this group' });
    return;
  }

  await assignUserGroup(id, group_name, req.user.id);
  res.status(201).json({ message: 'Group assigned', requires_relogin: true });
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_GENDERS = ['male', 'female', 'other'];

const parseProfileBody = (
  body: Record<string, unknown>
): { ok: true; cleaned: UpdateUserDetailsInput } | { ok: false; message: string } => {
  const cleaned: UpdateUserDetailsInput = {};

  const requireString = (key: 'first_name' | 'last_name', value: unknown): string | null => {
    if (typeof value !== 'string' || !value.trim()) return null;
    return value;
  };

  if ('first_name' in body) {
    const v = requireString('first_name', body.first_name);
    if (v === null) return { ok: false, message: 'first_name must be a non-empty string' };
    cleaned.first_name = v;
  }
  if ('last_name' in body) {
    const v = requireString('last_name', body.last_name);
    if (v === null) return { ok: false, message: 'last_name must be a non-empty string' };
    cleaned.last_name = v;
  }
  for (const key of ['phone', 'address', 'avatar_url'] as const) {
    if (key in body) {
      const v = body[key];
      if (v !== null && typeof v !== 'string') {
        return { ok: false, message: `${key} must be a string or null` };
      }
      cleaned[key] = v;
    }
  }
  if ('birth_date' in body) {
    const v = body.birth_date;
    if (v !== null && (typeof v !== 'string' || !DATE_RE.test(v) || Number.isNaN(Date.parse(v)))) {
      return { ok: false, message: 'birth_date must be YYYY-MM-DD or null' };
    }
    cleaned.birth_date = v as string | null;
  }
  if ('gender' in body) {
    const v = body.gender;
    if (v !== null && (typeof v !== 'string' || !ALLOWED_GENDERS.includes(v))) {
      return { ok: false, message: "gender must be 'male', 'female', 'other', or null" };
    }
    cleaned.gender = v as 'male' | 'female' | 'other' | null;
  }

  return { ok: true, cleaned };
};

const applyProfileUpdate = async (
  res: Response,
  userId: number,
  body: unknown
): Promise<void> => {
  const parsed = parseProfileBody((body as Record<string, unknown>) ?? {});
  if (!parsed.ok) {
    res.status(400).json({ message: parsed.message });
    return;
  }
  if (Object.keys(parsed.cleaned).length === 0) {
    res.status(400).json({ message: 'No updatable fields provided' });
    return;
  }
  const affected = await updateUserDetails(userId, parsed.cleaned);
  if (affected === 0) {
    res.status(404).json({ message: 'User details not found' });
    return;
  }
  const user = await findPublicUserById(userId);
  res.json({ user });
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  await applyProfileUpdate(res, req.user.id, req.body);
};

export const updateUserByIdHandler = async (req: Request, res: Response): Promise<void> => {
  const id = parseUserId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'id must be a positive integer' });
    return;
  }
  const target = await findPublicUserById(id);
  if (!target) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  await applyProfileUpdate(res, id, req.body);
};

export const removeGroupHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const id = parseUserId(req.params.id);
  if (id === null) {
    res.status(400).json({ message: 'id must be a positive integer' });
    return;
  }
  const groupName = req.params.groupName;

  const affected = await removeUserGroup(id, groupName);
  if (affected === 0) {
    res.status(404).json({ message: 'User is not in that group' });
    return;
  }
  res.status(200).json({ message: 'Group removed', requires_relogin: true });
};
