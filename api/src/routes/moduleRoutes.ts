import { Router } from 'express';
import { listModulesHandler, updateModuleHandler } from '../controllers/moduleController';
import { authenticate, requireModule } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', requireModule('settings.modules.view'), asyncHandler(listModulesHandler));
router.patch('/:name', requireModule('settings.modules.edit'), asyncHandler(updateModuleHandler));

export default router;
