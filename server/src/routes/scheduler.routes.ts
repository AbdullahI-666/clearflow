import { Router } from 'express';
import * as schedulerController from '../controllers/scheduler.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(authenticate, authorize(['Admin']));

router.get('/status', schedulerController.getStatus);
router.post('/trigger/:id', schedulerController.triggerJob);
router.patch('/:id/toggle', schedulerController.toggleJob);

export default router;
