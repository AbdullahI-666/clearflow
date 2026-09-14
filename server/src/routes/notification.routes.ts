import { Router } from 'express';
import * as notifController from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);
router.get('/', notifController.getAll);
router.patch('/:id/read', notifController.markRead);
router.patch('/read-all', notifController.markAllRead);
export default router;
