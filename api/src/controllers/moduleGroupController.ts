import { Request, Response } from 'express';
import { RESERVED_GROUPS } from '../config/modules';
import { moduleExists } from '../models/moduleModel';
import {
  addModuleToGroup,
  createGroup,
  deleteGroupCascade,
  findGroup,
  groupContainsModule,
  groupExistsByName,
  listGroups,
  removeModuleFromGroup,
  renameGroupCascade,
} from '../models/moduleGroupModel';

const GROUP_NAME_RE = /^[A-Za-z0-9_-]{1,100}$/;

const isReserved = (name: string): boolean => RESERVED_GROUPS.has(name);

export const listGroupsHandler = async (_req: Request, res: Response): Promise<void> => {
  const groups = await listGroups();
  res.json({
    groups: groups.map((g) => ({ ...g, is_reserved: isReserved(g.group_name) })),
  });
};

export const getGroupHandler = async (req: Request, res: Response): Promise<void> => {
  const name = req.params.name;
  const group = await findGroup(name);
  if (!group) {
    res.status(404).json({ message: 'Group not found' });
    return;
  }
  res.json({ group: { ...group, is_reserved: isReserved(name) } });
};

export const createGroupHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const { group_name, modules, description } = req.body ?? {};

  if (typeof group_name !== 'string' || !GROUP_NAME_RE.test(group_name)) {
    res
      .status(400)
      .json({ message: 'group_name must be 1-100 chars, letters/digits/underscore/hyphen only' });
    return;
  }
  if (isReserved(group_name)) {
    res.status(409).json({ message: `'${group_name}' is a reserved default group` });
    return;
  }
  if (!Array.isArray(modules) || modules.length === 0) {
    res.status(400).json({ message: 'modules must be a non-empty array of strings' });
    return;
  }
  if (description !== undefined && description !== null && typeof description !== 'string') {
    res.status(400).json({ message: 'description must be a string or null' });
    return;
  }

  if (await groupExistsByName(group_name)) {
    res.status(409).json({ message: `group_name '${group_name}' already exists` });
    return;
  }

  const unique = Array.from(new Set(modules as string[]));
  for (const m of unique) {
    if (typeof m !== 'string') {
      res.status(400).json({ message: 'modules must be strings' });
      return;
    }
    if (!(await moduleExists(m))) {
      res.status(400).json({ message: `Unknown module: ${m}` });
      return;
    }
  }

  await createGroup(group_name, unique, description ?? null, req.user.id);
  const group = await findGroup(group_name);
  res.status(201).json({ group: { ...group, is_reserved: false } });
};

export const renameGroupHandler = async (req: Request, res: Response): Promise<void> => {
  const name = req.params.name;
  const { new_name } = req.body ?? {};

  if (typeof new_name !== 'string' || !GROUP_NAME_RE.test(new_name)) {
    res
      .status(400)
      .json({ message: 'new_name must be 1-100 chars, letters/digits/underscore/hyphen only' });
    return;
  }
  if (isReserved(name)) {
    res.status(409).json({ message: `'${name}' is a reserved default group — cannot rename` });
    return;
  }
  if (isReserved(new_name)) {
    res.status(409).json({ message: `'${new_name}' is a reserved default group — cannot use` });
    return;
  }
  if (new_name === name) {
    const group = await findGroup(name);
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    res.json({ group: { ...group, is_reserved: false }, message: 'Name unchanged' });
    return;
  }
  if (!(await groupExistsByName(name))) {
    res.status(404).json({ message: 'Group not found' });
    return;
  }
  if (await groupExistsByName(new_name)) {
    res.status(409).json({ message: `group_name '${new_name}' already exists` });
    return;
  }

  const result = await renameGroupCascade(name, new_name);
  const group = await findGroup(new_name);
  res.json({
    group: { ...group, is_reserved: false },
    renamed: result,
    requires_relogin: result.membershipsRenamed > 0,
  });
};

export const addModuleHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  const name = req.params.name;
  const { module_name, description } = req.body ?? {};

  if (typeof module_name !== 'string' || !module_name) {
    res.status(400).json({ message: 'module_name is required' });
    return;
  }
  if (isReserved(name)) {
    res
      .status(409)
      .json({ message: `'${name}' is a reserved default group — edit DEFAULT_GROUPS instead` });
    return;
  }
  if (!(await groupExistsByName(name))) {
    res.status(404).json({ message: 'Group not found' });
    return;
  }
  if (!(await moduleExists(module_name))) {
    res.status(400).json({ message: `Unknown module: ${module_name}` });
    return;
  }
  if (await groupContainsModule(name, module_name)) {
    res.status(409).json({ message: 'Group already contains this module' });
    return;
  }

  await addModuleToGroup(name, module_name, description ?? null, req.user.id);
  const group = await findGroup(name);
  res
    .status(201)
    .json({ group: { ...group, is_reserved: false }, requires_relogin: (group?.user_count ?? 0) > 0 });
};

export const removeModuleHandler = async (req: Request, res: Response): Promise<void> => {
  const name = req.params.name;
  const moduleName = req.params.moduleName;

  if (isReserved(name)) {
    res
      .status(409)
      .json({ message: `'${name}' is a reserved default group — edit DEFAULT_GROUPS instead` });
    return;
  }

  const affected = await removeModuleFromGroup(name, moduleName);
  if (affected === 0) {
    res.status(404).json({ message: 'Group or module within the group not found' });
    return;
  }

  const group = await findGroup(name);
  res.json({
    group: group ? { ...group, is_reserved: false } : null,
    requires_relogin: (group?.user_count ?? 0) > 0,
  });
};

export const deleteGroupHandler = async (req: Request, res: Response): Promise<void> => {
  const name = req.params.name;

  if (isReserved(name)) {
    res
      .status(409)
      .json({ message: `'${name}' is a reserved default group — cannot delete` });
    return;
  }

  if (!(await groupExistsByName(name))) {
    res.status(404).json({ message: 'Group not found' });
    return;
  }

  const result = await deleteGroupCascade(name);
  res.json({
    message: 'Group deleted',
    cascade: result,
    requires_relogin: result.membershipsRemoved > 0,
  });
};
