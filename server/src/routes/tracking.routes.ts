import { Router } from 'express';
import * as trackingController from '../controllers/tracking.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);
router.post('/update', authorize(['FieldTeam']), trackingController.updateLocation);
router.post('/telemetry/status', authorize(['FieldTeam', 'Admin']), trackingController.setTelemetryStatus);
router.get('/telemetry/status', authorize(['Client', 'FieldTeam', 'Admin']), trackingController.getTelemetryStatus);
router.get('/telemetry/status/:teamId', authorize(['Client', 'FieldTeam', 'Admin']), trackingController.getTelemetryStatus);
router.get('/all', authorize(['Admin']), trackingController.getAllPositions);
router.get('/:teamId', authorize(['Client', 'Admin']), trackingController.getTeamPosition);
export default router;
