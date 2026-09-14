import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';

const router = Router();
router.use(authenticate);

// Client & Admin read access
router.get('/', invoiceController.getAll);
router.get('/:id', invoiceController.getById);
router.get('/:id/pdf', invoiceController.getInvoicePdf);

// Admin-only management
router.post('/', authorize(['Admin']), invoiceController.create);
router.patch('/:id/status', authorize(['Admin']), invoiceController.updateStatus);

export default router;
