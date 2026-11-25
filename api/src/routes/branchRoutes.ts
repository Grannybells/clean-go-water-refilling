import { Router } from 'express';
import {
  createBranchHandler,
  deleteBranchHandler,
  getBranchHandler,
  listBranchesHandler,
  updateBranchHandler,
} from '../controllers/branchController';
import { authenticate, requireModule } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', requireModule('settings.branches.view'), asyncHandler(listBranchesHandler));
router.get('/:id', requireModule('settings.branches.view'), asyncHandler(getBranchHandler));
router.post('/', requireModule('settings.branches.create'), asyncHandler(createBranchHandler));
router.patch('/:id', requireModule('settings.branches.edit'), asyncHandler(updateBranchHandler));
router.delete('/:id', requireModule('settings.branches.delete'), asyncHandler(deleteBranchHandler));

export default router;
