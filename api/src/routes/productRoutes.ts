import { Router } from 'express';
import { listWaterProductsHandler } from '../controllers/productWaterController';
import { authenticate, requireModule } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/water', requireModule('pos.view'), asyncHandler(listWaterProductsHandler));

export default router;
