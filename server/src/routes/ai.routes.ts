import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);

// F-29: Visual Quality Verification (Field Team & Admin)
router.post('/verify', authorize(['FieldTeam', 'Admin']), aiController.verifyImageQuality);

// F-30: Workload & Demand Forecasting (Admin)
router.get('/forecast', authorize(['Admin']), aiController.getWorkloadForecast);

// F-31: Smart Dispatch Candidate Rankings (Admin)
router.get('/dispatch-recommendations/:id', authorize(['Admin']), aiController.getDispatchRankings);

// F-32: Operational Anomaly & Outlier Detection (Admin)
router.get('/anomalies', authorize(['Admin']), aiController.getAnomalies);

// F-33: Automated Waste Classification & Volume Estimator (Client, Field Team, Admin)
router.post('/waste/estimate', aiController.estimateWaste);

export default router;
