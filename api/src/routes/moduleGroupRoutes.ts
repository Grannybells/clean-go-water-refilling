import { Router } from 'express';
import {
  addModuleHandler,
  createGroupHandler,
  deleteGroupHandler,
  getGroupHandler,
  listGroupsHandler,
  removeModuleHandler,
  renameGroupHandler,
} from '../controllers/moduleGroupController';
import { authenticate, requireModule } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', requireModule('settings.groups.view'), asyncHandler(listGroupsHandler));
router.get('/:name', requireModule('settings.groups.view'), asyncHandler(getGroupHandler));
router.post('/', requireModule('settings.groups.create'), asyncHandler(createGroupHandler));
router.patch('/:name', requireModule('settings.groups.edit'), asyncHandler(renameGroupHandler));
router.delete('/:name', requireModule('settings.groups.delete'), asyncHandler(deleteGroupHandler));

router.post('/:name/modules', requireModule('settings.groups.edit'), asyncHandler(addModuleHandler));
router.delete(
  '/:name/modules/:moduleName',
  requireModule('settings.groups.edit'),
  asyncHandler(removeModuleHandler)
);

export default router;
