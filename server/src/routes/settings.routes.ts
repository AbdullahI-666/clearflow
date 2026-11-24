import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);

// All authenticated roles (Admin, Client, Worker) can view company settings and announcements
router.get('/', settingsController.getSettings);

// Only Admin can update settings and company operational information
router.patch('/', authorize(['Admin']), settingsController.updateSettings);

export default router;
