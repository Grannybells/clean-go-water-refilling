import { Router } from 'express';
import {
  createSettingsHandler,
  deleteSettingsHandler,
  getSettingsHandler,
  listSettingsHandler,
  updateSettingsHandler,
} from '../controllers/settingsController';
import { authenticate, requireModule } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', requireModule('settings.device.view'), asyncHandler(listSettingsHandler));
router.get('/:id', requireModule('settings.device.view'), asyncHandler(getSettingsHandler));
router.post('/', requireModule('settings.device.create'), asyncHandler(createSettingsHandler));
router.patch('/:id', requireModule('settings.device.edit'), asyncHandler(updateSettingsHandler));
router.delete('/:id', requireModule('settings.device.delete'), asyncHandler(deleteSettingsHandler));

export default router;
