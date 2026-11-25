import { Router } from 'express';
import {
  createCustomerHandler,
  listCustomerTypesHandler,
  listCustomersHandler,
  updateCustomerHandler,
} from '../controllers/customerController';
import { authenticate, requireModule } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.use(authenticate);

router.get('/type', requireModule('customer.view'), asyncHandler(listCustomerTypesHandler));
router.get('/', requireModule('customer.view'), asyncHandler(listCustomersHandler));
router.post('/', requireModule('customer.create'), asyncHandler(createCustomerHandler));
router.patch(
  '/:cus_refno',
  requireModule('customer.edit'),
  asyncHandler(updateCustomerHandler)
);

export default router;
