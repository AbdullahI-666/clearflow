import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate, authorize(['Admin']));

router.get('/', settingsController.getSettings);
router.patch('/', settingsController.updateSettings);

export default router;
