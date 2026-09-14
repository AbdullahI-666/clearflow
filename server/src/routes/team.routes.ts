import { Router } from 'express';
import * as teamController from '../controllers/team.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createTeamValidator, updateTeamValidator } from '../validators/team.validator.js';

const router = Router();
router.use(authenticate);

// Leads endpoint MUST be before :id to prevent 'leads' being parsed as an ObjectId
router.get('/leads', authorize(['Admin']), teamController.getLeads);
router.get('/', teamController.getAll);
router.get('/:id', teamController.getById);

// Admin-only management operations
router.post('/', authorize(['Admin']), createTeamValidator, validate, teamController.create);
router.patch('/:id', authorize(['Admin']), updateTeamValidator, validate, teamController.update);
router.patch('/:id/deactivate', authorize(['Admin']), teamController.deactivate);

export default router;
