import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(['Admin']), userController.getAllUsers);
router.post('/', authorize(['Admin']), userController.createUser);
router.get('/operations', authorize(['Admin']), userController.getOperationsDirectory);
router.get('/operations/directory', authorize(['Admin']), userController.getOperationsDirectory);
router.get('/registrations', authorize(['Admin']), userController.getRegistrations);
router.post('/verify-identity', userController.verifyIdentity);
router.patch('/:id/verification-status', authorize(['Admin']), userController.updateVerificationStatus);
router.post('/:id/set-primary-admin', authorize(['Admin']), userController.setPrimaryAdmin);
router.post('/:id/reset-password', authorize(['Admin']), userController.adminResetPassword);
router.patch('/:id/status', authorize(['Admin']), userController.toggleUserStatus);
router.put('/:id', authorize(['Admin']), userController.adminUpdateUser);
router.delete('/:id', authorize(['Admin']), userController.deleteUser);
router.get('/:id', userController.getProfile);
router.patch('/:id/role', userController.switchRole);
router.patch('/:id', userController.updateProfile);
router.patch('/:id/deactivate', authorize(['Admin']), userController.deactivate);

export default router;
