import { Router } from 'express';
import {
  addGroupHandler,
  changeUserRole,
  createUserByAdmin,
  getMe,
  getUserById,
  getUsers,
  grantModuleHandler,
  removeGroupHandler,
  revokeModuleHandler,
  updateMe,
  updateUserByIdHandler,
} from '../controllers/userController';
import { authenticate, authorize, requireModule } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Self-service — any authenticated user
router.get('/me', authenticate, asyncHandler(getMe));
router.patch('/me', authenticate, asyncHandler(updateMe));

// Read — any user with users.view (owner gets it via `*`)
router.get('/', authenticate, requireModule('users.view'), asyncHandler(getUsers));
router.get('/:id', authenticate, requireModule('users.view'), asyncHandler(getUserById));

// Update profile fields — any user with users.edit
router.patch('/:id', authenticate, requireModule('users.edit'), asyncHandler(updateUserByIdHandler));

// Owner-only: creating, deleting, changing roles, managing permission grants
const ownerOnly = [authenticate, authorize('owner')] as const;

router.post('/', ...ownerOnly, asyncHandler(createUserByAdmin));
router.patch('/:id/role', ...ownerOnly, asyncHandler(changeUserRole));
router.post('/:id/modules', ...ownerOnly, asyncHandler(grantModuleHandler));
router.delete('/:id/modules/:moduleName', ...ownerOnly, asyncHandler(revokeModuleHandler));
router.post('/:id/groups', ...ownerOnly, asyncHandler(addGroupHandler));
router.delete('/:id/groups/:groupName', ...ownerOnly, asyncHandler(removeGroupHandler));

export default router;
