import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/:id', userController.getProfile);
router.patch('/:id', userController.updateProfile);
router.patch('/:id/deactivate', authorize(['Admin']), userController.deactivate);

export default router;
