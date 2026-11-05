import { Router } from 'express';
import {
  createStationHandler,
  deleteStationHandler,
  getStationHandler,
  listStationsHandler,
  updateStationHandler,
} from '../controllers/stationController';
import { authenticate, requireModule } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/', requireModule('settings.stations.view'), asyncHandler(listStationsHandler));
router.get('/:id', requireModule('settings.stations.view'), asyncHandler(getStationHandler));
router.post('/', requireModule('settings.stations.create'), asyncHandler(createStationHandler));
router.patch('/:id', requireModule('settings.stations.edit'), asyncHandler(updateStationHandler));
router.delete('/:id', requireModule('settings.stations.delete'), asyncHandler(deleteStationHandler));

export default router;
