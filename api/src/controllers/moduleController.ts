import { Request, Response } from 'express';
import { findModule, listModules, updateModuleDescription } from '../models/moduleModel';

export const listModulesHandler = async (req: Request, res: Response): Promise<void> => {
  const page = typeof req.query.page === 'string' && req.query.page.length > 0
    ? req.query.page
    : undefined;
  const modules = await listModules(page);
  res.json({ modules });
};

export const updateModuleHandler = async (req: Request, res: Response): Promise<void> => {
  const moduleName = req.params.name;
  const { description } = req.body ?? {};

  if (description === undefined) {
    res.status(400).json({ message: 'description is required (use null to clear)' });
    return;
  }
  if (description !== null && typeof description !== 'string') {
    res.status(400).json({ message: 'description must be a string or null' });
    return;
  }

  const existing = await findModule(moduleName);
  if (!existing) {
    res.status(404).json({ message: 'Module not found' });
    return;
  }

  await updateModuleDescription(moduleName, description);
  const updated = await findModule(moduleName);
  res.json({ module: updated });
};
