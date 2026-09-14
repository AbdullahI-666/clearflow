import { Router } from 'express';
import * as trackingController from '../controllers/tracking.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);
router.post('/update', authorize(['FieldTeam']), trackingController.updateLocation);
router.get('/all', authorize(['Admin']), trackingController.getAllPositions);
router.get('/:teamId', authorize(['Client', 'Admin']), trackingController.getTeamPosition);
export default router;
