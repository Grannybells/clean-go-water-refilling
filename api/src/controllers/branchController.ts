import { Request, Response } from 'express';
import {
  createBranch,
  deleteBranch,
  findBranchById,
  listBranches,
  branchExists,
  updateBranch,
} from '../models/branchModel';

const BRANCH_ID_RE = /^[A-Za-z0-9_-]{1,20}$/;

export const createBranchHandler = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const {
    branch_id,
    branch_name,
    branch_address,
    branch_lat,
    branch_lng,
    contact_number,
    description,
    is_active,
  } = req.body ?? {};

  if (!branch_id || !branch_name || !branch_address) {
    res
      .status(400)
      .json({ message: 'branch_id, branch_name, and branch_address are required' });
    return;
  }
  if (!BRANCH_ID_RE.test(branch_id)) {
    res.status(400).json({
      message: 'branch_id must be 1-20 chars, letters/digits/underscore/hyphen only',
    });
    return;
  }

  if (await branchExists(branch_id)) {
    res.status(409).json({ message: `branch_id '${branch_id}' already exists` });
    return;
  }

  await createBranch({
    branch_id,
    branch_name,
    branch_address,
    branch_lat,
    branch_lng,
    contact_number,
    description,
    is_active,
    created_by: req.user.id,
  });

  const branch = await findBranchById(branch_id);
  res.status(201).json({ branch });
};

export const listBranchesHandler = async (_req: Request, res: Response): Promise<void> => {
  const branches = await listBranches();
  res.json({ branches });
};

export const getBranchHandler = async (req: Request, res: Response): Promise<void> => {
  const branch = await findBranchById(req.params.id);
  if (!branch) {
    res.status(404).json({ message: 'Branch not found' });
    return;
  }
  res.json({ branch });
};

export const updateBranchHandler = async (req: Request, res: Response): Promise<void> => {
  const branchId = req.params.id;
  if (!(await branchExists(branchId))) {
    res.status(404).json({ message: 'Branch not found' });
    return;
  }

  const affected = await updateBranch(branchId, req.body ?? {});
  if (affected === 0) {
    res.status(400).json({ message: 'No valid fields provided for update' });
    return;
  }

  const branch = await findBranchById(branchId);
  res.json({ branch });
};

export const deleteBranchHandler = async (req: Request, res: Response): Promise<void> => {
  const affected = await deleteBranch(req.params.id);
  if (affected === 0) {
    res.status(404).json({ message: 'Branch not found' });
    return;
  }
  res.status(204).send();
};
