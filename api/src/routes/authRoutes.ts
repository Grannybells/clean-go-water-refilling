import { Router } from 'express';
import { login } from '../controllers/authController';
import { authLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

router.post('/login', authLimiter, asyncHandler(login));

export default router;
