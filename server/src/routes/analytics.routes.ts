import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate, authorize(['Admin']));

router.get('/', analyticsController.getDashboard);
router.get('/predict', analyticsController.getPrediction);
router.get('/teams', analyticsController.getTeamPerformance);
router.get('/zones', analyticsController.getZoneDemand);
router.get('/export', analyticsController.exportData);

export default router;
