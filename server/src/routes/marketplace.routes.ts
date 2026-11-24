import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as marketplaceController from '../controllers/marketplace.controller.js';

const router = Router();

// Field Team: Nearby open requests within radius
router.get('/requests/nearby', authenticate, marketplaceController.getNearbyRequests);

// Field Team: Unlock request details using points (20 / 30 / 40 pts)
router.post('/requests/:workOrderId/unlock', authenticate, marketplaceController.unlockRequest);

// Offers & Quotations: Get offers, submit quotation, respond to quotation
router.get('/work-orders/:id/offers', authenticate, marketplaceController.getOffers);
router.post('/work-orders/:id/offers', authenticate, marketplaceController.submitOffer);
router.post('/work-orders/:id/quotation', authenticate, marketplaceController.submitOffer);
router.post('/work-orders/:id/quotation/respond', authenticate, marketplaceController.respondToOffer);

// Client: Respond to offer (accept, reject, counter)
router.post('/offers/:offerId/respond', authenticate, marketplaceController.respondToOffer);

// Tracking: 13-stage job tracking progression
router.patch('/work-orders/:id/tracking', authenticate, marketplaceController.updateTrackingStage);

// Wallet & Points: Balance, ledger, availability
router.get('/wallet', authenticate, marketplaceController.getWalletAndPoints);
router.patch('/wallet/availability', authenticate, marketplaceController.toggleAvailability);
router.post('/wallet/withdraw', authenticate, marketplaceController.requestWithdrawal);
router.post('/wallet/purchase-points', authenticate, marketplaceController.purchasePoints);

// Weekly Targets & 5-Hour Admin Audit Payout System
router.get('/targets', authenticate, marketplaceController.getWeeklyTargets);
router.post('/targets/:targetId/claim', authenticate, marketplaceController.claimWeeklyTarget);
router.post('/targets/:targetId/request-payout', authenticate, marketplaceController.requestTargetPayout);
router.post('/admin/targets/:requestId/review', authenticate, marketplaceController.adminReviewTargetPayout);

// Admin: Oversight, review withdrawals, manual assign, purple platform revenue, give bonus
router.get('/admin/overview', authenticate, marketplaceController.getAdminOverview);
router.get('/admin/revenue', authenticate, marketplaceController.getAdminPlatformRevenue);
router.post('/admin/revenue/withdraw', authenticate, marketplaceController.adminWithdrawPlatformRevenue);
router.post('/admin/withdrawals/:id/review', authenticate, marketplaceController.adminReviewWithdrawal);
router.post('/admin/intervene-assign', authenticate, marketplaceController.adminInterveneAssign);
router.post('/admin/give-bonus', authenticate, marketplaceController.adminGiveBonus);

export default router;
