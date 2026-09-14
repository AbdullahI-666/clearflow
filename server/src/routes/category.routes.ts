import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();

// Public / authenticated read
router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);

// Admin-only management
router.post('/', authenticate, authorize(['Admin']), categoryController.create);
router.patch('/:id', authenticate, authorize(['Admin']), categoryController.update);
router.delete('/:id', authenticate, authorize(['Admin']), categoryController.remove);

export default router;
