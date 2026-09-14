import { Router } from 'express';
import * as chatController from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);
router.get('/:workOrderId', chatController.getMessages);
router.post('/:workOrderId', chatController.sendMessage);
export default router;
