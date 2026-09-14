import { Router } from 'express';
import * as woController from '../controllers/workOrder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { createWorkOrderValidator, updateStatusValidator, ratingValidator } from '../validators/workOrder.validator.js';

const router = Router();
router.use(authenticate);
router.post('/', authorize(['Client', 'Admin']), createWorkOrderValidator, validate, woController.create);
router.get('/', woController.getAll);
router.get('/categories', woController.getCategories);
router.get('/:id', woController.getById);

router.patch('/:id/status', authorize(['FieldTeam', 'Admin']), updateStatusValidator, validate, woController.updateStatus);
router.patch('/:id/assign', authorize(['Admin']), woController.assignOverride);
router.post('/:id/images/before', authorize(['FieldTeam', 'Admin']), upload.single('image'), woController.uploadBeforeImage);
router.post('/:id/images/after', authorize(['FieldTeam', 'Admin']), upload.single('image'), woController.uploadAfterImage);
router.post('/:id/rating', authorize(['Client', 'Admin']), ratingValidator, validate, woController.submitRating);
export default router;
