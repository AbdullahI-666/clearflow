import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate, authorize(['Client', 'Admin']));
router.get('/:id/pdf', reportController.getReport);
router.get('/:id/invoice', reportController.getInvoice);
export default router;
