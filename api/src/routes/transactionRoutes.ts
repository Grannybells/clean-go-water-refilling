import { Router } from 'express';
import {
  closeDeliveryHandler,
  closePickupHandler,
  createTransactionHandler,
  getTransactionHandler,
  listPendingDeliveriesHandler,
  listPendingPickupsHandler,
  listTransactionsHandler,
} from '../controllers/transactionController';
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
router.get('/', requireModule('transactions.view'), asyncHandler(listTransactionsHandler));
router.get('/:docno', requireModule('transactions.view'), asyncHandler(getTransactionHandler));
router.post('/', requireModule('pos.view'), asyncHandler(createTransactionHandler));

export default router;
