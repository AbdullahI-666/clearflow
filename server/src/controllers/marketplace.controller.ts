import { Request, Response } from 'express';
import * as marketplaceService from '../services/marketplace.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { isUserCnicVerified } from './user.controller.js';

export const getNearbyRequests = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = String(user?.id || user?.userId || user?._id || '');
    const isDemoFieldUser = userId === '65f000000000000000000004' || userId === '65f000000000000000000005';

    if (!isDemoFieldUser && !isUserCnicVerified(userId)) {
      return res.status(200).json(new ApiResponse(200, {
        technician: { id: userId, isOnline: false },
        activeWorkOrders: [],
        requests: [],
        pointsBalance: 0,
        totalNearby: 0,
        message: 'CNIC verification required to view nearby tasks'
      }, 'CNIC verification required to view nearby tasks'));
    }

    const radiusOverride = req.query.radius ? Number(req.query.radius) : undefined;
    const result = await marketplaceService.getNearbyRequests((req as any).user, radiusOverride);
    return res.status(200).json(new ApiResponse(200, result, 'Nearby requests retrieved'));
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const unlockRequest = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000004');
    const isDemoFieldUser = userId === '65f000000000000000000004' || userId === '65f000000000000000000005';

    if (!isDemoFieldUser && !isUserCnicVerified(userId)) {
      return res.status(403).json({ status: 'error', message: 'Pakistani 13-digit CNIC verification is required before unlocking service requests.' });
    }

    const workOrderId = String(req.params.workOrderId);
    const result = await marketplaceService.unlockRequestDetails(userId, workOrderId);
    return res.status(200).json(new ApiResponse(200, result, 'Request details unlocked successfully'));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const getOffers = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const offers = await marketplaceService.getOffersForWorkOrder(id);
    return res.status(200).json(new ApiResponse(200, offers, 'Offers retrieved'));
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const submitOffer = async (req: Request, res: Response) => {
  try {
    const technician = (req as any).user;
    const userId = String(technician?.id || technician?.userId || technician?._id || '');
    const isDemoFieldUser = userId === '65f000000000000000000004' || userId === '65f000000000000000000005';

    if (!isDemoFieldUser && !isUserCnicVerified(userId)) {
      return res.status(403).json({ status: 'error', message: 'Pakistani 13-digit CNIC verification is required before submitting offers.' });
    }

    const id = String(req.params.id);
    const offer = await marketplaceService.submitOffer(technician, id, req.body);
    return res.status(201).json(new ApiResponse(201, offer, 'Offer submitted successfully'));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const respondToOffer = async (req: Request, res: Response) => {
  try {
    const offerId = String(req.params.offerId);
    const clientId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000002');
    const { action, counterPrice, counterMessage } = req.body;

    if (!['accept', 'reject', 'counter'].includes(action)) {
      return res.status(400).json({ status: 'error', message: 'Action must be accept, reject, or counter' });
    }

    const result = await marketplaceService.respondToOffer(clientId, offerId, action, counterPrice, counterMessage);
    return res.status(200).json(new ApiResponse(200, result, `Offer ${action}ed successfully`));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const updateTrackingStage = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { stage, details } = req.body;
    if (!stage) {
      return res.status(400).json({ status: 'error', message: 'Tracking stage is required' });
    }

    const result = await marketplaceService.updateTrackingStage((req as any).user, id, stage, details);
    return res.status(200).json(new ApiResponse(200, result, `Tracking stage updated to ${stage}`));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const getWalletAndPoints = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000004');
    const data = await marketplaceService.getWalletAndPoints(userId);
    return res.status(200).json(new ApiResponse(200, data, 'Wallet and points data retrieved'));
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const toggleAvailability = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000004');
    const { isOnline } = req.body;
    const result = await marketplaceService.toggleAvailability(userId, isOnline);
    return res.status(200).json(new ApiResponse(200, result, result.message));
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000004');
    const { amount, method, accountInfo } = req.body;
    const result = await marketplaceService.requestWithdrawal(userId, amount, method, accountInfo);
    return res.status(201).json(new ApiResponse(201, result, 'Withdrawal request submitted'));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const purchasePoints = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000004');
    const { planName, points, price, pricePaid, billingCycle, paymentMethod, accountInfo, technicianName } = req.body;
    const finalPrice = price !== undefined ? price : pricePaid;
    const result = await marketplaceService.purchasePointsPlan(
      userId,
      planName,
      points,
      finalPrice,
      billingCycle,
      paymentMethod,
      accountInfo,
      technicianName || (req as any).user?.name || (req as any).user?.firstName
    );
    return res.status(200).json(new ApiResponse(200, result, `Successfully purchased ${planName}. Admin platform revenue credited.`));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const getAdminOverview = async (req: Request, res: Response) => {
  try {
    const data = await marketplaceService.getAdminMarketplaceOverview();
    return res.status(200).json(new ApiResponse(200, data, 'Admin marketplace overview retrieved'));
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getAdminPlatformRevenue = async (req: Request, res: Response) => {
  try {
    const data = await marketplaceService.getAdminPlatformRevenue();
    return res.status(200).json(new ApiResponse(200, data, 'Admin platform revenue retrieved'));
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const adminWithdrawPlatformRevenue = async (req: Request, res: Response) => {
  try {
    const adminId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000001');
    const { amount, destination } = req.body;
    const result = await marketplaceService.adminWithdrawPlatformRevenue(adminId, amount, destination);
    return res.status(200).json(new ApiResponse(200, result, 'Revenue successfully disbursed from treasury'));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const adminReviewWithdrawal = async (req: Request, res: Response) => {
  try {
    const adminId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000001');
    const id = String(req.params.id);
    const { action, rejectionReason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ status: 'error', message: 'Action must be approve or reject' });
    }

    const result = await marketplaceService.adminReviewWithdrawal(adminId, id, action, rejectionReason);
    return res.status(200).json(new ApiResponse(200, result, `Withdrawal ${action}d successfully`));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const adminInterveneAssign = async (req: Request, res: Response) => {
  try {
    const adminId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000001');
    const { workOrderId, technicianId, agreedPrice } = req.body;

    if (!workOrderId || !technicianId) {
      return res.status(400).json({ status: 'error', message: 'workOrderId and technicianId are required' });
    }

    const result = await marketplaceService.adminInterveneAssign(adminId, workOrderId, technicianId, agreedPrice);
    return res.status(200).json(new ApiResponse(200, result, 'Work order manually assigned by Admin'));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const getWeeklyTargets = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000004');
    const data = await marketplaceService.getWeeklyTargets(userId);
    return res.status(200).json(new ApiResponse(200, data, 'Weekly targets and payout requests retrieved'));
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const claimWeeklyTarget = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000004');
    const targetId = String(req.params.targetId);
    const result = await marketplaceService.claimWeeklyTargetReward(userId, targetId);
    return res.status(200).json(new ApiResponse(200, result, 'Weekly milestone reward points claimed successfully'));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const requestTargetPayout = async (req: Request, res: Response) => {
  try {
    const userId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000004');
    const targetId = String(req.params.targetId);
    const { customNotes } = req.body;
    const result = await marketplaceService.requestTargetPointsPayout(userId, targetId, customNotes);
    return res.status(201).json(new ApiResponse(201, result, 'Target points payout request submitted for 5-hour admin audit'));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const adminReviewTargetPayout = async (req: Request, res: Response) => {
  try {
    const adminId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000001');
    const requestId = String(req.params.requestId);
    const { action, rejectionReason, adminNotes } = req.body;
    const result = await marketplaceService.adminApproveTargetPayout(adminId, requestId, action, rejectionReason, adminNotes);
    return res.status(200).json(new ApiResponse(200, result, `Target payout ${action}d successfully`));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};

export const adminGiveBonus = async (req: Request, res: Response) => {
  try {
    const adminId = String((req as any).user?.id || (req as any).user?.userId || (req as any).user?._id || '65f000000000000000000001');
    const { workOrderId, technicianId, technicianName, points, reason, cashBonus } = req.body;

    const result = await marketplaceService.adminGiveBonusToTechnician(
      adminId,
      workOrderId,
      technicianId,
      technicianName,
      Number(points) || 50,
      reason || 'Admin Special Bonus for Bidding',
      Number(cashBonus) || 0
    );

    return res.status(200).json(new ApiResponse(200, result, 'Bonus successfully awarded to technician'));
  } catch (err: any) {
    return res.status(400).json({ status: 'error', message: err.message });
  }
};
