import { Router } from 'express';
import {
  createContractHandler,
  deleteContractHandler,
  getContractHandler,
  listContractsHandler,
  updateContractHandler,
} from '../controllers/contractController';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(authenticate, authorize('owner', 'admin'));

router.post('/', asyncHandler(createContractHandler));
router.get('/', asyncHandler(listContractsHandler));
router.get('/:id', asyncHandler(getContractHandler));
router.patch('/:id', asyncHandler(updateContractHandler));
router.delete('/:id', asyncHandler(deleteContractHandler));

export default router;
