import { Router } from 'express';
import {
  closeDeliveryHandler,
  closePickupHandler,
  collectPaymentHandler,
  createTransactionHandler,
  getTransactionHandler,
  listPendingDeliveriesHandler,
  listPendingPickupsHandler,
  listTransactionsHandler,
  updateSaleHandler,
} from '../controllers/salesController';
import { authenticate, requireModule } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/pickups', requireModule('pickup.view'), asyncHandler(listPendingPickupsHandler));
router.patch(
  '/:docno/close-pickup',
  requireModule('pickup.view'),
  asyncHandler(closePickupHandler)
);
router.get(
  '/deliveries',
  requireModule('delivery.view'),
  asyncHandler(listPendingDeliveriesHandler)
);
router.patch(
  '/:docno/close-delivery',
  requireModule('delivery.view'),
  asyncHandler(closeDeliveryHandler)
);
router.get('/', requireModule('water.sales.view'), asyncHandler(listTransactionsHandler));
router.get(
  '/:docno',
  requireModule('water.sales.view'),
  asyncHandler(getTransactionHandler)
);
router.post('/', requireModule('water.pos.create'), asyncHandler(createTransactionHandler));
router.patch('/:docno', requireModule('water.sales.edit'), asyncHandler(updateSaleHandler));
router.patch(
  '/:docno/collect',
  requireModule('water.sales.edit'),
  asyncHandler(collectPaymentHandler)
);

export default router;
