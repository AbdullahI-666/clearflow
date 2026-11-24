import { Router } from 'express';
import * as chatController from '../controllers/chat.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

// Complaints & Dispute Management
router.get('/complaints', chatController.getComplaints);
router.post('/complaints', chatController.createComplaint);
router.get('/complaints/:id/messages', chatController.getComplaintMessages);
router.post('/complaints/:id/messages', chatController.sendComplaintMessage);
router.patch('/complaints/:id/status', chatController.updateComplaintStatus);

// Real-time Chat Contacts (All Portals)
router.get('/contacts', chatController.getChatContacts);

// Work Order Chat
router.get('/unread-count', chatController.getUnreadCount);
router.patch('/:workOrderId/read', chatController.markAsRead);
router.get('/:workOrderId', chatController.getMessages);
router.post('/:workOrderId', chatController.sendMessage);
router.delete('/:workOrderId', chatController.deleteMessages);
router.post('/:workOrderId/restore', chatController.restoreMessages);
export default router;
