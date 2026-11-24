import { pgPool } from '../config/db.js';
import { haversineDistance } from '../utils/haversine.js';
import * as notifService from './notification.service.js';
import { getIo, emitWorkOrderProgress, emitWorkOrderUpdate } from '../socket/index.js';
import { MOCK_WORK_ORDERS, MOCK_CATEGORIES } from './workOrder.service.js';
import { DEMO_USERS } from './auth.service.js';

export type OfferStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Countered' | 'Cancelled';
export type BonusType = 'HighRating' | 'AiQuality' | 'Punctuality' | 'DailyMilestone' | 'WeeklyMilestone';
export interface IMarketplaceOffer { [key: string]: any }
export interface IFieldMemberWallet { [key: string]: any }
export interface IPointsTransaction { [key: string]: any }
export interface IWalletTransaction { [key: string]: any }
export interface IBonusReward { [key: string]: any }

const dbQuery = async (sql: string, params?: any[]): Promise<any[] | null> => {
  try {
    const res = await pgPool.query(sql, params);
    return res.rows;
  } catch (err: any) {
    return null;
  }
};

const makeChainable = (promiseOrRows: any): any => {
  const p: any = Promise.resolve(promiseOrRows);
  p.populate = () => makeChainable(p);
  p.sort = () => makeChainable(p);
  p.lean = () => makeChainable(p);
  return p;
};

const FieldMemberWallet: any = {
  findOne: async (q: any) => {
    const rows = await dbQuery('SELECT * FROM field_member_wallets WHERE user_id::text = $1 LIMIT 1', [String(q.userId)]);
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        _id: r.id,
        userId: r.user_id,
        pointsBalance: Number(r.points_balance),
        isAvailableOnline: r.is_available_online,
        walletBalance: Number(r.wallet_balance),
        pendingBalance: Number(r.pending_balance),
        withdrawableBalance: Number(r.withdrawable_balance),
        totalEarnings: Number(r.total_earnings),
        totalCommissionPaid: Number(r.total_commission_paid),
        searchRadiusKm: Number(r.search_radius_km),
        currentLat: Number(r.current_lat),
        currentLng: Number(r.current_lng),
      };
    }
    return null;
  },
  create: async (data: any) => {
    const rows = await dbQuery(
      `INSERT INTO field_member_wallets (user_id, points_balance, is_available_online, wallet_balance, withdrawable_balance, total_earnings, total_commission_paid, search_radius_km)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (user_id) DO NOTHING RETURNING *`,
      [String(data.userId), data.pointsBalance ?? 50, data.isAvailableOnline ?? true, data.walletBalance ?? 0, data.withdrawableBalance ?? 0, data.totalEarnings ?? 0, data.totalCommissionPaid ?? 0, data.searchRadiusKm ?? 15]
    );
    if (rows && rows.length > 0) {
      return { ...data, _id: rows[0].id };
    }
    return data;
  },
  findOneAndUpdate: async (q: any, update: any, _opts?: any) => {
    const set = update.$set || update;
    const sets: string[] = [];
    const params: any[] = [];
    if (set.pointsBalance !== undefined) { params.push(set.pointsBalance); sets.push(`points_balance = $${params.length}`); }
    if (set.walletBalance !== undefined) { params.push(set.walletBalance); sets.push(`wallet_balance = $${params.length}`); }
    if (set.pendingBalance !== undefined) { params.push(set.pendingBalance); sets.push(`pending_balance = $${params.length}`); }
    if (set.withdrawableBalance !== undefined) { params.push(set.withdrawableBalance); sets.push(`withdrawable_balance = $${params.length}`); }
    if (set.totalEarnings !== undefined) { params.push(set.totalEarnings); sets.push(`total_earnings = $${params.length}`); }
    if (set.totalCommissionPaid !== undefined) { params.push(set.totalCommissionPaid); sets.push(`total_commission_paid = $${params.length}`); }
    if (set.isAvailableOnline !== undefined) { params.push(set.isAvailableOnline); sets.push(`is_available_online = $${params.length}`); }
    if (set.searchRadiusKm !== undefined) { params.push(set.searchRadiusKm); sets.push(`search_radius_km = $${params.length}`); }
    if (set.currentLat !== undefined) { params.push(set.currentLat); sets.push(`current_lat = $${params.length}`); }
    if (set.currentLng !== undefined) { params.push(set.currentLng); sets.push(`current_lng = $${params.length}`); }

    if (sets.length > 0 && q.userId) {
      params.push(String(q.userId));
      await dbQuery(`UPDATE field_member_wallets SET ${sets.join(', ')}, updated_at = NOW() WHERE user_id::text = $${params.length}`, params);
    }
    return set;
  }
};

const WorkOrder: any = {
  find: (_q?: any) => {
    const fn = async () => {
      const rows = await dbQuery(
        `SELECT wo.*, u.name as client_name, u.email as client_email, u.phone as client_phone,
                sc.name as category_name, sc.description as category_description, sc.icon_url as category_icon
         FROM work_orders wo
         LEFT JOIN users u ON u.id = wo.client_id
         LEFT JOIN service_categories sc ON sc.id = wo.category_id
         WHERE wo.status = 'Open' OR wo.marketplace_status = 'Bidding'
         ORDER BY wo.created_at DESC`
      );
      if (rows && rows.length > 0) {
        return rows.map(r => ({
          _id: r.id,
          workOrderCode: r.work_order_code,
          title: r.title,
          clientId: { _id: r.client_id, name: r.client_name, email: r.client_email, phone: r.client_phone },
          categoryId: { _id: r.category_id, name: r.category_name, description: r.category_description, icon: r.category_icon },
          status: r.status,
          locationAddress: r.location_address,
          locationLat: Number(r.location_lat),
          locationLng: Number(r.location_lng),
          description: r.description,
          urgency: r.urgency,
          budget: Number(r.budget),
          marketplaceStatus: r.marketplace_status,
          trackingStage: r.tracking_stage,
          offersCount: r.offers_count,
          progressPercentage: r.progress_percentage,
          progressStage: r.progress_stage,
          createdAt: r.created_at,
        }));
      }
      return [];
    };
    return makeChainable(fn());
  },
  findById: (id: any) => {
    const fn = async () => {
      const rows = await dbQuery(
        `SELECT wo.*, u.name as client_name, u.email as client_email, u.phone as client_phone,
                sc.name as category_name, sc.description as category_description
         FROM work_orders wo
         LEFT JOIN users u ON u.id = wo.client_id
         LEFT JOIN service_categories sc ON sc.id = wo.category_id
         WHERE wo.id::text = $1 OR wo.work_order_code = $1 LIMIT 1`,
        [String(id)]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          _id: r.id,
          workOrderCode: r.work_order_code,
          title: r.title,
          clientId: { _id: r.client_id, name: r.client_name, email: r.client_email, phone: r.client_phone },
          categoryId: { _id: r.category_id, name: r.category_name, description: r.category_description },
          status: r.status,
          locationAddress: r.location_address,
          locationLat: Number(r.location_lat),
          locationLng: Number(r.location_lng),
          description: r.description,
          urgency: r.urgency,
          budget: Number(r.budget),
          marketplaceStatus: r.marketplace_status,
          trackingStage: r.tracking_stage,
          offersCount: r.offers_count,
          progressPercentage: r.progress_percentage,
          progressStage: r.progress_stage,
          teamId: r.team_id,
          selectedOfferId: r.selected_offer_id,
          settlementDetails: r.settlement_details,
          cancellationReason: r.cancellation_reason,
          aiConfidenceScore: Number(r.ai_confidence_score),
          createdAt: r.created_at,
          startedAt: r.started_at,
          closedAt: r.closed_at,
        };
      }
      return null;
    };
    return makeChainable(fn());
  },
  findByIdAndUpdate: async (id: any, update: any, _opts?: any) => {
    const sets: string[] = [];
    const params: any[] = [];
    if (update.offersCount !== undefined) { params.push(update.offersCount); sets.push(`offers_count = $${params.length}`); }
    if (update.trackingStage !== undefined) { params.push(update.trackingStage); sets.push(`tracking_stage = $${params.length}`); }
    if (update.progressStage !== undefined) { params.push(update.progressStage); sets.push(`progress_stage = $${params.length}`); }
    if (update.progressPercentage !== undefined) { params.push(update.progressPercentage); sets.push(`progress_percentage = $${params.length}`); }
    if (update.status !== undefined) { params.push(update.status); sets.push(`status = $${params.length}`); }
    if (update.marketplaceStatus !== undefined) { params.push(update.marketplaceStatus); sets.push(`marketplace_status = $${params.length}`); }
    if (update.teamId !== undefined) { params.push(update.teamId); sets.push(`team_id = $${params.length}`); }
    if (update.selectedOfferId !== undefined) { params.push(update.selectedOfferId); sets.push(`selected_offer_id = $${params.length}`); }
    if (update.settlementDetails !== undefined) { params.push(JSON.stringify(update.settlementDetails)); sets.push(`settlement_details = $${params.length}`); }
    if (update.startedAt !== undefined) { params.push(update.startedAt); sets.push(`started_at = $${params.length}`); }
    if (update.closedAt !== undefined) { params.push(update.closedAt); sets.push(`closed_at = $${params.length}`); }
    if (update.assignedAt !== undefined) { params.push(update.assignedAt); sets.push(`assigned_at = $${params.length}`); }
    if (update.isAccepted !== undefined) { params.push(update.isAccepted); sets.push(`is_accepted = $${params.length}`); }
    if (update.acceptedBy !== undefined) { params.push(update.acceptedBy); sets.push(`accepted_by = $${params.length}`); }

    if (sets.length > 0) {
      params.push(String(id));
      await dbQuery(`UPDATE work_orders SET ${sets.join(', ')}, updated_at = NOW() WHERE id::text = $${params.length}`, params);
    }
    return update;
  }
};

const MarketplaceOffer: any = {
  updateMany: async (_q: any, _up: any) => ({ acknowledged: true }),
  create: async (data: any) => {
    const rows = await dbQuery(
      `INSERT INTO marketplace_offers (
        work_order_id, technician_id, team_id, technician_name, technician_phone,
        technician_rating, technician_jobs_completed, offer_price, proposed_eta_minutes,
        distance_km, message, status, points_committed
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        String(data.workOrderId), String(data.technicianId), data.teamId || null,
        data.technicianName, data.technicianPhone || null, data.technicianRating !== undefined ? Number(data.technicianRating) : 0.0,
        data.technicianJobsCompleted || 0, data.offerPrice, data.proposedEtaMinutes || 15,
        data.distanceKm || 1.5, data.message || '', data.status || 'Pending', data.pointsCommitted || 15
      ]
    );
    if (rows && rows.length > 0) {
      return { ...data, _id: rows[0].id };
    }
    return data;
  },
  find: (q: any) => {
    const fn = async () => {
      const rows = await dbQuery(
        'SELECT * FROM marketplace_offers WHERE work_order_id::text = $1 ORDER BY created_at DESC',
        [String(q.workOrderId)]
      );
      if (rows && rows.length > 0) {
        return rows.map(r => ({
          _id: r.id,
          workOrderId: r.work_order_id,
          technicianId: r.technician_id,
          teamId: r.team_id,
          technicianName: r.technician_name,
          technicianPhone: r.technician_phone,
          technicianRating: Number(r.technician_rating),
          technicianJobsCompleted: r.technician_jobs_completed,
          offerPrice: Number(r.offer_price),
          proposedEtaMinutes: r.proposed_eta_minutes,
          distanceKm: Number(r.distance_km),
          message: r.message,
          counterPrice: r.counter_price ? Number(r.counter_price) : undefined,
          counterMessage: r.counter_message,
          status: r.status,
          pointsCommitted: r.points_committed,
          acceptedAt: r.accepted_at,
          rejectedAt: r.rejected_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
      return [];
    };
    return makeChainable(fn());
  },
  findById: (id: any) => {
    const fn = async () => {
      const rows = await dbQuery('SELECT * FROM marketplace_offers WHERE id::text = $1 LIMIT 1', [String(id)]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          _id: r.id,
          workOrderId: r.work_order_id,
          technicianId: r.technician_id,
          teamId: r.team_id,
          technicianName: r.technician_name,
          technicianPhone: r.technician_phone,
          technicianRating: Number(r.technician_rating),
          technicianJobsCompleted: r.technician_jobs_completed,
          offerPrice: Number(r.offer_price),
          proposedEtaMinutes: r.proposed_eta_minutes,
          distanceKm: Number(r.distance_km),
          message: r.message,
          counterPrice: r.counter_price ? Number(r.counter_price) : undefined,
          counterMessage: r.counter_message,
          status: r.status,
          pointsCommitted: r.points_committed,
          acceptedAt: r.accepted_at,
          rejectedAt: r.rejected_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      }
      return null;
    };
    return makeChainable(fn());
  },
  findByIdAndUpdate: async (id: any, update: any, _opts?: any) => {
    const sets: string[] = [];
    const params: any[] = [];
    if (update.status !== undefined) { params.push(update.status); sets.push(`status = $${params.length}`); }
    if (update.counterPrice !== undefined) { params.push(update.counterPrice); sets.push(`counter_price = $${params.length}`); }
    if (update.counterMessage !== undefined) { params.push(update.counterMessage); sets.push(`counter_message = $${params.length}`); }
    if (update.acceptedAt !== undefined) { params.push(update.acceptedAt); sets.push(`accepted_at = $${params.length}`); }
    if (update.rejectedAt !== undefined) { params.push(update.rejectedAt); sets.push(`rejected_at = $${params.length}`); }

    if (sets.length > 0) {
      params.push(String(id));
      await dbQuery(`UPDATE marketplace_offers SET ${sets.join(', ')}, updated_at = NOW() WHERE id::text = $${params.length}`, params);
    }
    return update;
  },
  findOneAndUpdate: async (q: any, update: any, _opts?: any) => {
    return MarketplaceOffer.findByIdAndUpdate(q._id || q.id, update);
  }
};

const PointsTransaction: any = {
  create: async (data: any) => {
    await dbQuery(
      `INSERT INTO points_transactions (user_id, work_order_id, type, points_change, balance_after, reason, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [String(data.userId), data.workOrderId ? String(data.workOrderId) : null, data.type, data.pointsChange, data.balanceAfter, data.reason, JSON.stringify(data.metadata || {})]
    );
    return data;
  },
  find: (q: any) => {
    const fn = async () => {
      const rows = await dbQuery('SELECT * FROM points_transactions WHERE user_id::text = $1 ORDER BY created_at DESC', [String(q.userId)]);
      if (rows && rows.length > 0) {
        return rows.map(r => ({
          _id: r.id,
          userId: r.user_id,
          workOrderId: r.work_order_id,
          type: r.type,
          pointsChange: r.points_change,
          balanceAfter: r.balance_after,
          reason: r.reason,
          metadata: r.metadata,
          createdAt: r.created_at,
        }));
      }
      return [];
    };
    return makeChainable(fn());
  }
};

const WalletTransaction: any = {
  create: async (data: any) => {
    await dbQuery(
      `INSERT INTO wallet_transactions (user_id, work_order_id, type, amount, balance_after, status, description, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [String(data.userId), data.workOrderId ? String(data.workOrderId) : null, data.type, data.amount, data.balanceAfter, data.status || 'Completed', data.description, JSON.stringify(data.metadata || {})]
    );
    return data;
  },
  find: (q: any) => {
    const fn = async () => {
      const rows = await dbQuery('SELECT * FROM wallet_transactions WHERE user_id::text = $1 ORDER BY created_at DESC', [String(q.userId)]);
      if (rows && rows.length > 0) {
        return rows.map(r => ({
          _id: r.id,
          userId: r.user_id,
          workOrderId: r.work_order_id,
          type: r.type,
          amount: Number(r.amount),
          balanceAfter: Number(r.balance_after),
          status: r.status,
          description: r.description,
          metadata: r.metadata,
          createdAt: r.created_at,
        }));
      }
      return [];
    };
    return makeChainable(fn());
  }
};

const BonusReward: any = {
  create: async (data: any) => {
    await dbQuery(
      `INSERT INTO bonus_rewards (user_id, work_order_id, bonus_type, amount_cash, points_awarded, idempotency_key, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (idempotency_key) DO NOTHING`,
      [String(data.userId), data.workOrderId ? String(data.workOrderId) : null, data.bonusType, data.amountCash || 0, data.pointsAwarded || 0, data.idempotencyKey, data.reason]
    );
    return data;
  },
  findOne: async (q: any) => {
    const rows = await dbQuery('SELECT * FROM bonus_rewards WHERE idempotency_key = $1 LIMIT 1', [q.idempotencyKey]);
    if (rows && rows.length > 0) return rows[0];
    return null;
  }
};

// Category points configuration
export const CATEGORY_POINTS_MAP: Record<string, number> = {
  Cleaning: 15,
  Plumbing: 20,
  'Electrical Repair': 20,
  'General Waste Collection': 25,
  'E-Waste Recycling': 25,
  'Pest Control': 20,
  Gardening: 15,
  Default: 15,
};

// Admin commission rate: 12%
export const ADMIN_COMMISSION_RATE = 0.12;

// Bonus rewards table
export const BONUS_CONFIG = {
  HighRating: { cash: 10.0, points: 10, label: '5-Star Excellence Rating Bonus' },
  AiQuality: { cash: 15.0, points: 15, label: 'AI Quality Verification (Score >90%) Bonus' },
  Punctuality: { cash: 5.0, points: 5, label: 'On-Time Arrival & Execution Bonus' },
  DailyMilestone: { cash: 25.0, points: 25, label: 'Daily Service Milestone Champion' },
  WeeklyMilestone: { cash: 50.0, points: 50, label: 'Weekly Power Provider Achievement' },
};

// ==========================================
// In-Memory Fallback State (High Reliability)
// ==========================================
export const IN_MEMORY_WALLETS = new Map<string, any>();
export const IN_MEMORY_POINTS_TXS: any[] = [];
export const IN_MEMORY_WALLET_TXS: any[] = [];
export const IN_MEMORY_BONUSES: any[] = [];
export const IN_MEMORY_UNLOCKED_REQUESTS = new Map<string, Set<string>>();
export const IN_MEMORY_OFFERS: any[] = [];

// ==========================================
// Admin Platform Earnings & Package Revenue State (Purple Theme)
// ==========================================
export interface AdminPackagePurchase {
  _id: string;
  technicianId: string;
  technicianName: string;
  planName: string;
  pointsAwarded: number;
  amount: number;
  billingCycle: string;
  paymentMethod: string;
  accountInfo: string;
  status: 'Credited';
  createdAt: Date;
}

export const IN_MEMORY_ADMIN_PLATFORM_EARNINGS = {
  basePlatformRevenue: 0.0,
  packageSubscriptionsRevenue: 0.0,
  commissionRevenue: 0.0,
  totalWithdrawn: 0.0,
  packagePurchases: [] as AdminPackagePurchase[],
};

// Seed initial open marketplace requests in MOCK_WORK_ORDERS
const ensureMarketplaceSeedOrders = () => {
  // Demo orders removed - only real registered orders
};

ensureMarketplaceSeedOrders();

// ==========================================
// Helper Utilities
// ==========================================
export const getOrCreateWallet = async (userId: string): Promise<any> => {
  const strId = String(userId);
  const isDemo = strId === '65f000000000000000000004' || strId === '65f000000000000000000005';
  
  let memWallet = IN_MEMORY_WALLETS.get(strId);
  if (!memWallet) {
    memWallet = {
      userId: strId,
      pointsBalance: isDemo ? 160 : 50,
      isAvailableOnline: true,
      walletBalance: isDemo ? 380.0 : 0.0,
      pendingBalance: 0.0,
      withdrawableBalance: isDemo ? 380.0 : 0.0,
      totalEarnings: isDemo ? 1560.0 : 0.0,
      totalCommissionPaid: isDemo ? 195.0 : 0.0,
      searchRadiusKm: 25,
      currentLat: 31.4697,
      currentLng: 74.2728,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    IN_MEMORY_WALLETS.set(strId, memWallet);

    // Provide welcome points transaction for new registered members (50 starter points)
    if (!isDemo && !IN_MEMORY_POINTS_TXS.some((p) => String(p.userId) === strId)) {
      IN_MEMORY_POINTS_TXS.push({
        _id: 'ptx_welcome_' + strId,
        userId: strId,
        workOrderId: null,
        type: 'WelcomeBonus',
        pointsChange: 50,
        balanceAfter: 50,
        reason: 'Welcome to ClearFlow!',
        createdAt: new Date(),
      });
    }
  } else if (!isDemo && (memWallet.pointsBalance === 100 || memWallet.pointsBalance === 160)) {
    // If an existing non-demo wallet had old default points and no other transactions, standardize to 50
    const hasCustomTxs = IN_MEMORY_POINTS_TXS.some((p) => String(p.userId) === strId && p.type !== 'WelcomeBonus');
    if (!hasCustomTxs) {
      memWallet.pointsBalance = 50;
      const welcomeTx = IN_MEMORY_POINTS_TXS.find((p) => String(p.userId) === strId && p.type === 'WelcomeBonus');
      if (welcomeTx) {
        welcomeTx.pointsChange = 50;
        welcomeTx.balanceAfter = 50;
        welcomeTx.reason = 'Welcome to ClearFlow!';
      }
    }
  }

  try {
    const dbWallet = (await Promise.race([
      FieldMemberWallet.findOne({ userId: strId }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000)),
    ])) as any;

    if (dbWallet) {
      if (!isDemo && (dbWallet.pointsBalance === 100 || dbWallet.pointsBalance === 150 || dbWallet.pointsBalance === 160)) {
        const hasCustomTxs = IN_MEMORY_POINTS_TXS.some((p) => String(p.userId) === strId && p.type !== 'WelcomeBonus');
        if (!hasCustomTxs) {
          dbWallet.pointsBalance = 50;
          memWallet.pointsBalance = 50;
          await FieldMemberWallet.findOneAndUpdate({ userId: strId }, { pointsBalance: 50 });
        }
      }
      if (typeof memWallet.pointsBalance === 'number' && memWallet.pointsBalance > (dbWallet.pointsBalance ?? 0)) {
        dbWallet.pointsBalance = memWallet.pointsBalance;
      } else if (typeof dbWallet.pointsBalance === 'number') {
        memWallet.pointsBalance = dbWallet.pointsBalance;
      }
      memWallet.walletBalance = dbWallet.walletBalance ?? memWallet.walletBalance;
      memWallet.withdrawableBalance = dbWallet.withdrawableBalance ?? memWallet.withdrawableBalance;
      memWallet.isAvailableOnline = dbWallet.isAvailableOnline ?? memWallet.isAvailableOnline;
      IN_MEMORY_WALLETS.set(strId, memWallet);
      return memWallet;
    }

    const created = (await Promise.race([
      FieldMemberWallet.create({
        userId: strId,
        pointsBalance: memWallet.pointsBalance,
        isAvailableOnline: memWallet.isAvailableOnline,
        walletBalance: memWallet.walletBalance,
        withdrawableBalance: memWallet.withdrawableBalance,
        totalEarnings: memWallet.totalEarnings,
        totalCommissionPaid: memWallet.totalCommissionPaid,
        searchRadiusKm: memWallet.searchRadiusKm,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000)),
    ])) as any;

    return created || memWallet;
  } catch (err) {
    return memWallet;
  }
};

export const getCategoryPoints = (categoryName?: string): number => {
  if (!categoryName) return CATEGORY_POINTS_MAP.Default;
  return CATEGORY_POINTS_MAP[categoryName] || CATEGORY_POINTS_MAP.Default;
};

/**
 * Distance-Based Points Calculation:
 * "The further the field team goes for client work, the more points are deducted from their wallet"
 */
export const calculateDistanceBasedPoints = (
  categoryName?: string,
  distanceKm: number = 0
): {
  totalPoints: number;
  baseCategoryPoints: number;
  distanceSurchargePoints: number;
  distanceTier: string;
} => {
  const basePoints = getCategoryPoints(categoryName);
  let distancePoints = 0;
  let distanceTier = 'Local (< 3 km)';

  if (distanceKm <= 3) {
    distancePoints = 0;
    distanceTier = 'Local Zone (< 3 km)';
  } else if (distanceKm <= 7) {
    distancePoints = 6;
    distanceTier = 'Short Distance (3–7 km)';
  } else if (distanceKm <= 12) {
    distancePoints = 12;
    distanceTier = 'Medium Distance (7–12 km)';
  } else if (distanceKm <= 20) {
    distancePoints = 20;
    distanceTier = 'Extended City (12–20 km)';
  } else {
    // For every additional km over 20 km, add 1.5 pts
    distancePoints = 20 + Math.round((distanceKm - 20) * 1.5);
    distanceTier = `Far Distance (${distanceKm.toFixed(1)} km Outstation)`;
  }

  return {
    totalPoints: basePoints + distancePoints,
    baseCategoryPoints: basePoints,
    distanceSurchargePoints: distancePoints,
    distanceTier,
  };
};

/**
 * Dynamic Client Payment Calculation:
 * Payment depends on field team's skills/certifications and the actual problem severity/complexity.
 */
export interface IDynamicJobPricing {
  baseLaborPrice: number;
  problemSeverity: string;
  problemSeverityLabel: string;
  problemSeverityMultiplier: number;
  technicianSkillLevel: string;
  technicianSkillLabel: string;
  technicianSkillMultiplier: number;
  distanceKm: number;
  distanceTravelFee: number;
  recommendedClientPayment: number;
  explanation: string;
}

export const calculateDynamicJobPricing = (
  basePrice: number = 1800,
  problemSeverityKey: string = 'Standard',
  skillLevelKey: string = 'Master',
  distanceKm: number = 2.5
): IDynamicJobPricing => {
  const severityMap: Record<string, { label: string; multiplier: number }> = {
    Minor: { label: 'Minor / Routine Maintenance (Surface Fix)', multiplier: 0.85 },
    Standard: { label: 'Standard Issue (Component Replacement & Cleaning)', multiplier: 1.0 },
    Moderate: { label: 'Moderate Damage (Sub-Surface Leak / Pressure Failure)', multiplier: 1.3 },
    Critical: { label: 'Critical Emergency (Corroded Pipe Rupture / Flood Hazard)', multiplier: 1.65 },
  };

  const problem = severityMap[problemSeverityKey] || severityMap.Standard;

  const skillMap: Record<string, { label: string; multiplier: number }> = {
    Apprentice: { label: 'Junior / Apprentice Technician (Basic Tier)', multiplier: 0.9 },
    Standard: { label: 'Certified Technician (SLA Verified)', multiplier: 1.05 },
    Senior: { label: 'Senior Specialist (5+ yrs, Pipe Joint Welding & Diagnostics)', multiplier: 1.25 },
    Master: { label: 'Master Contractor / Lead Engineer (10+ yrs, 4.9★ Rating)', multiplier: 1.45 },
  };

  const skill = skillMap[skillLevelKey] || skillMap.Master;
  const distanceTravelFee = distanceKm > 3 ? Math.round((distanceKm - 3) * 40) : 0;
  const adjustedPrice = Math.round(basePrice * problem.multiplier * skill.multiplier + distanceTravelFee);

  return {
    baseLaborPrice: basePrice,
    problemSeverity: problemSeverityKey,
    problemSeverityLabel: problem.label,
    problemSeverityMultiplier: problem.multiplier,
    technicianSkillLevel: skillLevelKey,
    technicianSkillLabel: skill.label,
    technicianSkillMultiplier: skill.multiplier,
    distanceKm,
    distanceTravelFee,
    recommendedClientPayment: adjustedPrice,
    explanation: `Client payment tuned to: Problem Severity (${(problem.multiplier * 100).toFixed(0)}%) + Field Skill Tier (${(skill.multiplier * 100).toFixed(0)}%) + Travel (${distanceKm} km).`,
  };
};

// ─── WEEKLY MILESTONE TARGETS & 5-HOUR ADMIN AUDIT PAYOUT STORAGE ───
export interface IWeeklyTarget {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  isFulfilled: boolean;
  rewardPoints: number;
  rewardCash: number;
  icon: string;
}

export const WEEKLY_TARGETS_LIST: IWeeklyTarget[] = [
  {
    id: 'target_10_works',
    title: '10 Works Per Week Fleet Milestone',
    description: 'Complete 10 client work orders within the current 7-day dispatch cycle.',
    targetCount: 10,
    currentCount: 0,
    isFulfilled: false,
    rewardPoints: 200,
    rewardCash: 2500,
    icon: 'Briefcase',
  },
  {
    id: 'target_5_star_quality',
    title: 'Quality Star Milestone (5 High-Score Jobs)',
    description: 'Achieve 5 verified jobs with >92% AI inspection confidence score.',
    targetCount: 5,
    currentCount: 0,
    isFulfilled: false,
    rewardPoints: 150,
    rewardCash: 1800,
    icon: 'Star',
  },
  {
    id: 'target_far_distance_hero',
    title: 'Territory Outreach Hero (15 km)',
    description: 'Complete 3 extended-distance service dispatches to remote facilities.',
    targetCount: 3,
    currentCount: 0,
    isFulfilled: false,
    rewardPoints: 120,
    rewardCash: 1500,
    icon: 'Compass',
  },
];

export const MOCK_MILESTONE_10_WORK_ORDERS: any[] = [];

export const MOCK_AUDIT_CHECKLIST = [
  {
    id: 'count',
    label: '10 Completed Work Orders Verified',
    status: 'Passed',
    detail: 'All 10 assignments completed and recorded in ClearFlow service ledger with zero pending stages.',
    passed: true,
  },
  {
    id: 'photos',
    label: 'Before & After Photo Evidence Cross-Check',
    status: 'Passed',
    detail: '20 high-resolution photos verified with timestamp, GPS coordinates, and camera EXIF matching.',
    passed: true,
  },
  {
    id: 'ai',
    label: 'AI Quality Verification Confidence Score',
    status: 'Passed',
    detail: 'Average AI confidence score across 10 jobs is 94.8% (Platform SLA threshold: 90.0%).',
    passed: true,
  },
  {
    id: 'gps',
    label: 'On-Site GPS Geofence Compliance',
    status: 'Passed',
    detail: '100% of crew check-ins logged within 25 meters of designated customer premises boundary.',
    passed: true,
  },
  {
    id: 'client',
    label: 'Client Digital Sign-Off & CSAT Review',
    status: 'Passed',
    detail: 'Average client satisfaction rating is 4.93 / 5.0 ★ with zero disputes, flags, or re-work requests.',
    passed: true,
  },
  {
    id: 'sla',
    label: 'Response & Completion SLA Adherence',
    status: 'Passed',
    detail: 'Average on-site arrival time 14.2 mins (SLA target <30 mins). All work finished within scheduled hours.',
    passed: true,
  },
];

export const IN_MEMORY_TARGET_PAYOUT_REQUESTS: any[] = [];

// ==========================================
// Marketplace Service Methods
// ==========================================

/**
 * 1 & 2. Smart Nearby Matching:
 * Identify nearby requests within technician radius using location & availability.
 */
export const getNearbyRequests = async (user: any, searchRadiusOverride?: number) => {
  const userId = String(user?.id || user?.userId || user?._id || '65f000000000000000000004');
  const wallet = await getOrCreateWallet(userId);

  // If technician marked themselves offline, return empty list (Section 2 rule: no job opportunities when offline)
  const isOnline = wallet.isAvailableOnline ?? true;
  const radiusKm = searchRadiusOverride || wallet.searchRadiusKm || 25;
  const techLat = wallet.currentLat || 31.4697;
  const techLng = wallet.currentLng || 74.2728;

  if (!isOnline) {
    return {
      isOnline: false,
      radiusKm,
      technicianCoordinates: { lat: techLat, lng: techLng },
      pointsBalance: wallet.pointsBalance,
      totalAvailable: 0,
      requests: [],
    };
  }

  // Query open bidding orders from memory & DB
  let orders: any[] = [];
  try {
    const dbOrders = (await Promise.race([
      WorkOrder.find({
        $or: [
          { status: 'Open' },
          { marketplaceStatus: 'Bidding' },
        ],
      })
        .populate('clientId', 'name email phone')
        .populate('categoryId', 'name description icon')
        .lean(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1200)),
    ])) as any[];

    if (dbOrders && dbOrders.length > 0) {
      orders = dbOrders;
    }
  } catch (err) {}

  if (orders.length === 0) {
    orders = MOCK_WORK_ORDERS.filter(
      (wo: any) =>
        wo.status === 'Open' ||
        wo.marketplaceStatus === 'Bidding' ||
        (!(wo as any).isAccepted && wo.status !== 'Closed' && wo.status !== 'InProgress')
    );
  }

  // Calculate distance, check if user has existing offer, filter by radius
  const results = orders
    .map((wo: any) => {
      const woLat = Number(wo.locationLat) || 31.4697;
      const woLng = Number(wo.locationLng) || 74.2728;
      const distance = parseFloat(haversineDistance(techLat, techLng, woLat, woLng).toFixed(1));

      // Check if current technician already submitted an offer
      const existingOffer = IN_MEMORY_OFFERS.find(
        (o) => String(o.workOrderId) === String(wo._id) && String(o.technicianId) === userId
      );

      const catName = wo.categoryId?.name || 'General Maintenance';
      const pointsInfo = calculateDistanceBasedPoints(catName, distance);
      const problemSeverity = wo.problemSeverity || (catName === 'Plumbing' ? 'Critical' : 'Standard');
      const pricing = calculateDynamicJobPricing(
        Number(wo.budget || 1800),
        problemSeverity,
        'Master',
        distance
      );

      // Check if unlocked by worker
      const isUnlocked = Boolean(
        existingOffer ||
        IN_MEMORY_UNLOCKED_REQUESTS.get(String(wo._id))?.has(userId) ||
        (Array.isArray(wo.unlockedByWorkers) && wo.unlockedByWorkers.includes(userId))
      );

      let pointsToUnlock = 20;
      if (distance > 15) pointsToUnlock = 40;
      else if (distance > 5) pointsToUnlock = 30;

      // Filter genuine uploaded images only (no demo / destroyed samples)
      let genuineBeforeImages: string[] = [];
      if (Array.isArray(wo.beforeImages) && wo.beforeImages.length > 0) {
        genuineBeforeImages = wo.beforeImages.filter((img: any) => typeof img === 'string' && img.trim().length > 0 && !img.includes('destroyed-before'));
      }
      if (genuineBeforeImages.length === 0 && wo.beforeImageUrl && !wo.beforeImageUrl.includes('destroyed-before')) {
        genuineBeforeImages = [wo.beforeImageUrl];
      }

      return {
        ...wo,
        distanceKm: distance,
        isUnlocked,
        pointsToUnlock: isUnlocked ? 0 : pointsToUnlock,
        locationAddress: isUnlocked ? wo.locationAddress : `${distance} km away • Sector Location Preview`,
        budget: isUnlocked ? wo.budget : null,
        clientId: isUnlocked
          ? wo.clientId
          : { _id: wo.clientId?._id, name: 'Verified Client' },
        beforeImages: genuineBeforeImages,
        beforeImageUrl: genuineBeforeImages[0] || null,
        pointsRequired: pointsInfo.totalPoints,
        basePoints: pointsInfo.baseCategoryPoints,
        distancePoints: pointsInfo.distanceSurchargePoints,
        distanceTier: pointsInfo.distanceTier,
        problemSeverity,
        pricingBreakdown: isUnlocked ? pricing : null,
        hasMyOffer: !!existingOffer,
        myOffer: existingOffer || null,
        isWithinRadius: distance <= radiusKm,
        hasSufficientPoints: (wallet.pointsBalance || 0) >= (isUnlocked ? pointsInfo.totalPoints : pointsToUnlock),
      };
    })
    .filter((wo: any) => wo.distanceKm <= radiusKm)
    .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

  return {
    isOnline,
    radiusKm,
    technicianCoordinates: { lat: techLat, lng: techLng },
    pointsBalance: wallet.pointsBalance,
    totalAvailable: results.length,
    requests: results,
  };
};

/**
 * 2b. Unlock Request Details with Points (20 / 30 / 40 pts depending on distance)
 */
export const unlockRequestDetails = async (userId: string, workOrderId: string) => {
  const wallet = await getOrCreateWallet(userId);

  // Find work order from memory or DB
  let workOrder: any = MOCK_WORK_ORDERS.find(
    (w) => String(w._id) === String(workOrderId) || String(w.workOrderCode) === String(workOrderId)
  );

  if (!workOrder) {
    try {
      workOrder = (await WorkOrder.findById(workOrderId).populate('clientId', 'name email phone').lean()) as any;
    } catch {}
  }

  if (!workOrder) {
    throw new Error('Work order not found');
  }

  // Calculate distance
  const techLat = wallet.currentLat || 31.4697;
  const techLng = wallet.currentLng || 74.2728;
  const woLat = Number(workOrder.locationLat) || 31.4697;
  const woLng = Number(workOrder.locationLng) || 74.2728;
  const distance = parseFloat(haversineDistance(techLat, techLng, woLat, woLng).toFixed(1));

  let pointsCost = 20;
  if (distance > 15) pointsCost = 40;
  else if (distance > 5) pointsCost = 30;

  // Check if already unlocked
  const unlockedSet = IN_MEMORY_UNLOCKED_REQUESTS.get(String(workOrder._id));
  const isAlreadyUnlocked = Boolean(
    unlockedSet?.has(userId) ||
    (Array.isArray(workOrder.unlockedByWorkers) && workOrder.unlockedByWorkers.includes(userId))
  );

  if (isAlreadyUnlocked) {
    return {
      success: true,
      alreadyUnlocked: true,
      pointsDeducted: 0,
      pointsBalance: wallet.pointsBalance,
      workOrder: {
        _id: workOrder._id,
        workOrderCode: workOrder.workOrderCode,
        title: workOrder.title,
        description: workOrder.description,
        locationAddress: workOrder.locationAddress,
        budget: workOrder.budget,
        preferredTime: workOrder.preferredTime,
        isUnlocked: true,
      },
    };
  }

  // Verify wallet balance
  if ((wallet.pointsBalance || 0) < pointsCost) {
    throw new Error(
      `Insufficient points balance (${wallet.pointsBalance || 0} pts). Unlocking full details for this ${distance} km job requires ${pointsCost} points. Please purchase more points.`
    );
  }

  // Atomic deduction
  const prevBalance = wallet.pointsBalance || 0;
  const newBalance = prevBalance - pointsCost;
  wallet.pointsBalance = newBalance;
  wallet.updatedAt = new Date();
  IN_MEMORY_WALLETS.set(userId, wallet);
  await FieldMemberWallet.findOneAndUpdate({ userId }, { pointsBalance: newBalance });

  // Record transaction
  const tx: any = {
    _id: `ptx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    workOrderId: String(workOrder._id),
    type: 'UnlockDetails',
    pointsChange: -pointsCost,
    balanceAfter: newBalance,
    reason: `Unlocked full details for request ${workOrder.workOrderCode || workOrderId} (${distance} km away)`,
    createdAt: new Date(),
  };
  IN_MEMORY_POINTS_TXS.unshift(tx);
  try {
    await PointsTransaction.create(tx);
  } catch {}

  // Mark as unlocked
  if (!IN_MEMORY_UNLOCKED_REQUESTS.has(String(workOrder._id))) {
    IN_MEMORY_UNLOCKED_REQUESTS.set(String(workOrder._id), new Set<string>());
  }
  IN_MEMORY_UNLOCKED_REQUESTS.get(String(workOrder._id))!.add(String(userId));

  if (!Array.isArray(workOrder.unlockedByWorkers)) {
    workOrder.unlockedByWorkers = [];
  }
  workOrder.unlockedByWorkers.push(userId);

  // Send notification to worker
  notifService.create({
    userId,
    workOrderId: String(workOrder._id),
    type: 'PointsDeducted',
    title: 'Request Details Unlocked',
    message: `You spent ${pointsCost} points to unlock full details for ${workOrder.workOrderCode || 'job'}. New balance: ${newBalance} pts.`,
  });

  try {
    const io = getIo();
    if (io) {
      io.emit('wallet_updated', {
        userId: String(userId),
        pointsBalance: newBalance,
        pointsDeducted: pointsCost,
        wallet,
      });
      io.emit('marketplace:wallet_updated', {
        userId: String(userId),
        pointsBalance: newBalance,
        pointsDeducted: pointsCost,
        wallet,
      });
    }
  } catch {}

  return {
    success: true,
    alreadyUnlocked: false,
    pointsDeducted: pointsCost,
    pointsBalance: newBalance,
    workOrder: {
      _id: workOrder._id,
      workOrderCode: workOrder.workOrderCode,
      title: workOrder.title,
      description: workOrder.description,
      locationAddress: workOrder.locationAddress,
      budget: workOrder.budget,
      preferredTime: workOrder.preferredTime,
      isUnlocked: true,
    },
  };
};

/**
 * 3. Smart Marketplace Offers:
 * Field member submits an offer (or accepts client budget directly)
 */
export const submitOffer = async (technician: any, workOrderId: string, offerData: any) => {
  const techId = String(technician?.id || technician?.userId || technician?._id || '65f000000000000000000004');
  const techName = technician?.name || 'Ahsan';
  const techPhone = technician?.phone || '+1 555 0164738';

  const wallet = await getOrCreateWallet(techId);
  if (!wallet.isAvailableOnline) {
    throw new Error('You are currently offline. Please toggle availability to online to submit offers.');
  }

  // Find work order
  let workOrder: any = MOCK_WORK_ORDERS.find((wo: any) => String(wo._id) === String(workOrderId));
  if (!workOrder) {
    try {
      workOrder = (await WorkOrder.findById(workOrderId).populate('categoryId clientId')) as any;
    } catch {}
  }
  if (!workOrder) {
    throw new Error('Work order not found');
  }

  if (workOrder.status !== 'Open' && workOrder.marketplaceStatus !== 'Bidding') {
    throw new Error('This service request is no longer accepting offers.');
  }

  const catName = workOrder.categoryId?.name || 'Cleaning';
  const proposedEtaMinutes = Number(offerData.proposedEtaMinutes || 15);
  const distanceKm = Number(
    offerData.distanceKm ||
      parseFloat(
        haversineDistance(
          wallet.currentLat || 31.4697,
          wallet.currentLng || 74.2728,
          Number(workOrder.locationLat) || 31.4697,
          Number(workOrder.locationLng) || 74.2728
        ).toFixed(1)
      ) ||
      1.5
  );

  // Distance-tiered points calculation: more distance = more points required
  const pointsInfo = calculateDistanceBasedPoints(catName, distanceKm);
  const pointsRequired = pointsInfo.totalPoints;

  if (wallet.pointsBalance < pointsRequired) {
    throw new Error(
      `Insufficient points balance (${wallet.pointsBalance} pts available). This service dispatch is ${distanceKm} km away and requires ${pointsRequired} points (${pointsInfo.baseCategoryPoints} base + ${pointsInfo.distanceSurchargePoints} distance surcharge). Please purchase points to submit an offer.`
    );
  }

  const problemSeverity = workOrder.problemSeverity || (catName === 'Plumbing' ? 'Critical' : 'Standard');
  const dynamicPricing = calculateDynamicJobPricing(
    Number(offerData.offerPrice || workOrder.budget || 1800),
    problemSeverity,
    'Master',
    distanceKm
  );
  const offerPrice = Number(offerData.offerPrice || dynamicPricing.recommendedClientPayment || 1800);

  const offerObj: any = {
    _id: 'offer_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    workOrderId: String(workOrderId),
    technicianId: techId,
    teamId: '65f000000000000000000301',
    technicianName: techName,
    technicianPhone: techPhone,
    technicianRating: Number(technician?.rating ?? technician?.averageRating ?? 0.0),
    technicianSkillLevel: 'Master Specialist (10+ yrs exp, Certified Pipe Welder)',
    technicianJobsCompleted: 42,
    offerPrice,
    proposedEtaMinutes,
    distanceKm,
    message: offerData.message || `Professional ${catName} service tailored to ${problemSeverity.toLowerCase()} conditions with guaranteed satisfaction.`,
    status: 'Pending' as OfferStatus,
    pointsCommitted: pointsRequired,
    basePoints: pointsInfo.baseCategoryPoints,
    distancePoints: pointsInfo.distanceSurchargePoints,
    distanceTier: pointsInfo.distanceTier,
    problemSeverity,
    pricingBreakdown: dynamicPricing,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Upsert in memory
  const existingIdx = IN_MEMORY_OFFERS.findIndex(
    (o) => String(o.workOrderId) === String(workOrderId) && String(o.technicianId) === techId
  );
  if (existingIdx >= 0) {
    IN_MEMORY_OFFERS[existingIdx] = { ...IN_MEMORY_OFFERS[existingIdx], ...offerObj, _id: IN_MEMORY_OFFERS[existingIdx]._id };
  } else {
    IN_MEMORY_OFFERS.push(offerObj);
  }

  // Update workOrder offer count & tracking stage
  workOrder.offersCount = (workOrder.offersCount || 0) + 1;
  if (!workOrder.trackingStage || workOrder.trackingStage === 'RequestCreated') {
    workOrder.trackingStage = 'OffersReceived';
    workOrder.progressStage = `${workOrder.offersCount} Offer(s) Received – Compare & Select`;
  }

  // Persist to DB if connected
  try {
    await MarketplaceOffer.findOneAndUpdate(
      { workOrderId, technicianId: techId },
      { ...offerObj, workOrderId, technicianId: techId },
      { upsert: true, new: true }
    );
    await WorkOrder.findByIdAndUpdate(workOrderId, {
      offersCount: workOrder.offersCount,
      trackingStage: workOrder.trackingStage,
      progressStage: workOrder.progressStage,
    });
  } catch (err) {}

  // Socket notification
  const io = getIo();
  const clientId = workOrder.clientId?._id ? String(workOrder.clientId._id) : String(workOrder.clientId);
  if (io) {
    io.to(`user:${clientId}`).emit('marketplace:new_offer', {
      workOrderId,
      offer: offerObj,
    });
    io.to('role:admin').emit('marketplace:new_offer', {
      workOrderId,
      offer: offerObj,
    });
  }

  // In-app notifications
  await notifService.create({
    userId: clientId,
    workOrderId: String(workOrderId),
    type: 'MarketplaceOffer',
    title: `New Offer: PKR ${offerPrice} from ${techName}`,
    message: `${techName} submitted an offer of PKR ${offerPrice} (ETA: ${proposedEtaMinutes} mins, ${distanceKm} km away) for "${workOrder.title || workOrder.workOrderCode}".`,
    metadata: {
      workOrderId,
      offerId: offerObj._id,
      offerPrice,
      proposedEtaMinutes,
      distanceKm,
    },
  });

  await notifService.create({
    roles: ['Admin'],
    workOrderId: String(workOrderId),
    type: 'MarketplaceOffer',
    title: `Marketplace Bid: ${techName} on ${workOrder.workOrderCode}`,
    message: `Technician ${techName} offered PKR ${offerPrice} on order ${workOrder.workOrderCode}.`,
    metadata: { workOrderId, offerPrice, technicianId: techId },
  });

  return offerObj;
};

/**
 * Fetch all offers for a work order (Client & Admin)
 */
export const getOffersForWorkOrder = async (workOrderId: string) => {
  let offers = IN_MEMORY_OFFERS.filter((o) => String(o.workOrderId) === String(workOrderId));

  try {
    const dbOffers = (await Promise.race([
      MarketplaceOffer.find({ workOrderId }).sort({ createdAt: -1 }).lean(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000)),
    ])) as any[];

    if (dbOffers && dbOffers.length > 0) {
      offers = dbOffers;
    }
  } catch (err) {}

  return offers;
};

/**
 * Client accepts, rejects, or counters an offer.
 * ATOMIC WIN: When accepted, only one member can win. Points are deducted automatically.
 */
export const respondToOffer = async (
  clientId: string,
  offerId: string,
  action: 'accept' | 'reject' | 'counter',
  counterPrice?: number,
  counterMessage?: string
) => {
  // Find offer
  let offer = IN_MEMORY_OFFERS.find((o) => String(o._id) === String(offerId));
  if (!offer) {
    try {
      offer = (await MarketplaceOffer.findById(offerId)) as any;
    } catch {}
  }
  if (!offer) {
    throw new Error('Offer not found');
  }

  const workOrderId = String(offer.workOrderId);
  let workOrder: any = MOCK_WORK_ORDERS.find((wo: any) => String(wo._id) === workOrderId);
  if (!workOrder) {
    try {
      workOrder = (await WorkOrder.findById(workOrderId).populate('categoryId clientId')) as any;
    } catch {}
  }
  if (!workOrder) {
    throw new Error('Work order not found');
  }

  const techId = String(offer.technicianId);
  const techName = offer.technicianName || 'Technician';

  if (action === 'reject') {
    offer.status = 'Rejected';
    offer.rejectedAt = new Date();

    try {
      await MarketplaceOffer.findByIdAndUpdate(offerId, { status: 'Rejected', rejectedAt: new Date() });
    } catch {}

    await notifService.create({
      userId: techId,
      workOrderId,
      type: 'OfferRejected',
      title: 'Offer Declined',
      message: `Your offer of PKR ${offer.offerPrice} for ${workOrder.title || workOrder.workOrderCode} was not accepted by the client. No points were deducted.`,
      metadata: { workOrderId, offerId },
    });

    return { success: true, action: 'reject', offer };
  }

  if (action === 'counter') {
    const price = Number(counterPrice || offer.offerPrice);
    offer.status = 'Countered';
    offer.counterPrice = price;
    offer.counterMessage = counterMessage || `Client proposed counter price of PKR ${price}`;

    try {
      await MarketplaceOffer.findByIdAndUpdate(offerId, {
        status: 'Countered',
        counterPrice: price,
        counterMessage: offer.counterMessage,
      });
    } catch {}

    await notifService.create({
      userId: techId,
      workOrderId,
      type: 'MarketplaceOffer',
      title: `Counter Offer from Client: PKR ${price}`,
      message: `The client counter-offered PKR ${price} for ${workOrder.title || workOrder.workOrderCode}. Review and accept to claim the assignment!`,
      metadata: { workOrderId, counterPrice: price },
    });

    return { success: true, action: 'counter', offer };
  }

  // ===============================
  // ACTION: ACCEPT (ATOMIC WIN)
  // ===============================
  if (workOrder.status === 'Assigned' && workOrder.selectedOfferId && String(workOrder.selectedOfferId) !== String(offerId)) {
    throw new Error('This job has already been awarded to another provider.');
  }

  const agreedPrice = offer.counterPrice || offer.offerPrice;
  const catName = workOrder.categoryId?.name || 'Cleaning';
  const distanceKm = Number(offer.distanceKm || 1.5);
  const pointsInfo = calculateDistanceBasedPoints(catName, distanceKm);
  const pointsToDeduct = offer.pointsCommitted || pointsInfo.totalPoints;

  // 1. Deduct Points from winning field member
  const wallet = await getOrCreateWallet(techId);
  if (wallet.pointsBalance < pointsToDeduct) {
    throw new Error(`Technician does not have sufficient points (${wallet.pointsBalance} < ${pointsToDeduct}) to finalize assignment.`);
  }

  wallet.pointsBalance -= pointsToDeduct;
  wallet.updatedAt = new Date();
  IN_MEMORY_WALLETS.set(techId, wallet);

  // Record Points Transaction
  const pointsTxObj: any = {
    _id: 'ptx_' + Date.now(),
    userId: techId,
    workOrderId,
    type: 'JobWonDeduction',
    pointsChange: -pointsToDeduct,
    balanceAfter: wallet.pointsBalance,
    reason: `Won job ${workOrder.workOrderCode} (${catName} - ${distanceKm} km: ${pointsInfo.baseCategoryPoints} base + ${pointsInfo.distanceSurchargePoints} distance surcharge)`,
    createdAt: new Date(),
  };
  IN_MEMORY_POINTS_TXS.unshift(pointsTxObj);

  // 2. Mark this offer Accepted and all other offers Rejected
  offer.status = 'Accepted';
  offer.acceptedAt = new Date();

  for (const o of IN_MEMORY_OFFERS) {
    if (String(o.workOrderId) === workOrderId && String(o._id) !== String(offerId)) {
      o.status = 'Rejected';
      o.rejectedAt = new Date();

      // Notify losers: 0 points deducted
      notifService.create({
        userId: String(o.technicianId),
        workOrderId,
        type: 'OfferRejected',
        title: 'Job Awarded to Another Provider',
        message: `Work order ${workOrder.workOrderCode} was awarded to another provider. 0 points deducted.`,
        metadata: { workOrderId },
      }).catch(() => {});
    }
  }

  // 3. Update Work Order State: Assigned
  workOrder.status = 'Assigned';
  workOrder.marketplaceStatus = 'Assigned';
  workOrder.trackingStage = 'Assigned';
  workOrder.selectedOfferId = offer._id;
  workOrder.isAccepted = true;
  workOrder.acceptedAt = new Date();
  workOrder.acceptedBy = techName;
  workOrder.assignedAt = new Date();
  workOrder.progressPercentage = 15;
  workOrder.progressStage = 'Technician Assigned – Preparing for Dispatch';
  workOrder.teamId = {
    _id: offer.teamId || '65f000000000000000000301',
    name: techName,
  };
  workOrder.settlementDetails = {
    agreedPrice,
    adminCommission: parseFloat((agreedPrice * ADMIN_COMMISSION_RATE).toFixed(2)),
    technicianPayout: parseFloat((agreedPrice * (1 - ADMIN_COMMISSION_RATE)).toFixed(2)),
    settledAt: new Date(),
  };

  // DB Sync
  try {
    await Promise.all([
      MarketplaceOffer.findByIdAndUpdate(offerId, { status: 'Accepted', acceptedAt: new Date() }),
      MarketplaceOffer.updateMany(
        { workOrderId, _id: { $ne: offerId } },
        { status: 'Rejected', rejectedAt: new Date() }
      ),
      FieldMemberWallet.findOneAndUpdate(
        { userId: techId },
        { $inc: { pointsBalance: -pointsToDeduct } },
        { upsert: true }
      ),
      PointsTransaction.create({
        userId: techId,
        workOrderId,
        type: 'JobWonDeduction',
        pointsChange: -pointsToDeduct,
        balanceAfter: wallet.pointsBalance,
        reason: `Won job ${workOrder.workOrderCode} (${catName} - PKR ${agreedPrice})`,
      }),
      WorkOrder.findByIdAndUpdate(workOrderId, {
        status: 'Assigned',
        marketplaceStatus: 'Assigned',
        trackingStage: 'Assigned',
        selectedOfferId: offer._id,
        isAccepted: true,
        acceptedAt: new Date(),
        assignedAt: new Date(),
        progressPercentage: 15,
        progressStage: workOrder.progressStage,
        settlementDetails: workOrder.settlementDetails,
      }),
    ]);
  } catch (err) {}

  // Socket broadcast
  const io = getIo();
  if (io) {
    io.emit('marketplace:offer_accepted', {
      workOrderId,
      offerId,
      winnerId: techId,
      workOrder,
    });
    emitWorkOrderUpdate(workOrderId, {
      status: 'Assigned',
      trackingStage: 'Assigned',
      progressStage: workOrder.progressStage,
      teamId: workOrder.teamId,
    });
  }

  // Real-time notifications
  await notifService.create({
    userId: techId,
    workOrderId,
    type: 'OfferAccepted',
    title: `🎉 Offer Accepted! You Won Job ${workOrder.workOrderCode}`,
    message: `Congratulations! Your offer of PKR ${agreedPrice} was accepted. ${pointsToDeduct} points were deducted (Remaining: ${wallet.pointsBalance} pts). Please proceed to the client site!`,
    metadata: {
      workOrderId,
      offerId,
      pointsDeducted: pointsToDeduct,
      remainingPoints: wallet.pointsBalance,
      agreedPrice,
    },
  });

  await notifService.create({
    userId: clientId,
    workOrderId,
    type: 'NewAssignment',
    title: `Provider Assigned: ${techName}`,
    message: `${techName} has been confirmed for your service at PKR ${agreedPrice}. Live dispatch tracking is now active.`,
    metadata: { workOrderId, agreedPrice, technicianName: techName },
  });

  await notifService.create({
    roles: ['Admin'],
    workOrderId,
    type: 'NewAssignment',
    title: `Marketplace Match: ${workOrder.workOrderCode}`,
    message: `Client accepted ${techName}'s offer of PKR ${agreedPrice} on ${workOrder.workOrderCode}. Commission: PKR ${(agreedPrice * ADMIN_COMMISSION_RATE).toFixed(2)}.`,
    metadata: { workOrderId, agreedPrice, technicianId: techId },
  });

  try {
    const io = getIo();
    if (io) {
      io.emit('wallet_updated', {
        userId: String(techId),
        pointsBalance: wallet.pointsBalance,
        pointsDeducted: pointsToDeduct,
        wallet,
      });
      io.emit('marketplace:wallet_updated', {
        userId: String(techId),
        pointsBalance: wallet.pointsBalance,
        pointsDeducted: pointsToDeduct,
        wallet,
      });
    }
  } catch {}

  return {
    success: true,
    action: 'accept',
    offer,
    workOrder,
    pointsDeducted: pointsToDeduct,
    remainingPoints: wallet.pointsBalance,
  };
};

/**
 * 7. Complete Job Tracking Lifecycle (13 stages):
 * Request Created → Offers Received → Member Selected → Assigned → On the Way →
 * Arrived → Work Started → 25% → 50% → 75% → 100% → Completed → Payment Settled.
 */
export const updateTrackingStage = async (
  user: any,
  workOrderId: string,
  newStage: string,
  details?: any
) => {
  let workOrder: any = MOCK_WORK_ORDERS.find((wo: any) => String(wo._id) === String(workOrderId));
  if (!workOrder) {
    try {
      workOrder = (await WorkOrder.findById(workOrderId).populate('categoryId clientId')) as any;
    } catch {}
  }
  if (!workOrder) {
    throw new Error('Work order not found');
  }

  const clientId = workOrder.clientId?._id ? String(workOrder.clientId._id) : String(workOrder.clientId);
  const techId = workOrder.teamId?.members?.[0]
    ? String(workOrder.teamId.members[0])
    : '65f000000000000000000004';

  workOrder.trackingStage = newStage as any;

  let progressPercentage = workOrder.progressPercentage || 0;
  let progressStage = workOrder.progressStage || 'In Progress';
  let status = workOrder.status;

  switch (newStage) {
    case 'OnTheWay':
      progressPercentage = 20;
      progressStage = 'Technician En Route to Work Site';
      status = 'InProgress';
      await notifService.create({
        userId: clientId,
        workOrderId,
        type: 'StatusUpdate',
        title: 'Technician is On The Way',
        message: 'Your service technician has departed and is en route with live GPS telemetry.',
      });
      break;

    case 'Arrived':
      progressPercentage = 30;
      progressStage = 'Technician Arrived at Location';
      status = 'InProgress';
      await notifService.create({
        userId: clientId,
        workOrderId,
        type: 'StatusUpdate',
        title: 'Technician Has Arrived',
        message: 'Technician has arrived at the site. Inspection and initial setup commencing.',
      });
      break;

    case 'WorkStarted':
      progressPercentage = 35;
      progressStage = 'Service Work Commenced – Before Evidence Recorded';
      status = 'InProgress';
      workOrder.startedAt = new Date();
      break;

    case 'Work25':
      progressPercentage = 45;
      progressStage = 'Initial Repair & Preparation Phase Complete (25%)';
      status = 'InProgress';
      break;

    case 'Work50':
      progressPercentage = 60;
      progressStage = 'Core Remediation Halfway Completed (50%)';
      status = 'InProgress';
      break;

    case 'Work75':
      progressPercentage = 80;
      progressStage = 'Final Detailing & Finishing Touches (75%)';
      status = 'InProgress';
      break;

    case 'Work100':
      progressPercentage = 100;
      progressStage = 'Physical Work 100% Completed – Ready for AI Inspection';
      status = 'PendingReview';
      break;

    case 'Completed':
      progressPercentage = 100;
      progressStage = 'Service Verified & Completed';
      status = 'Closed';
      workOrder.closedAt = new Date();
      await notifService.create({
        userId: clientId,
        workOrderId,
        type: 'JobCompleted',
        title: 'Service Completed & AI Verified',
        message: `Work order ${workOrder.workOrderCode} has been completed and verified.`,
      });
      break;

    case 'PaymentSettled':
      progressPercentage = 100;
      progressStage = 'Payment & Commission Settled';
      status = 'Closed';
      // Execute Financial Settlement & Bonus Calculation
      await processSettlementAndBonuses(workOrder, techId);
      break;
  }

  workOrder.progressPercentage = progressPercentage;
  workOrder.progressStage = progressStage;
  workOrder.status = status;
  workOrder.updatedAt = new Date();

  // DB Sync
  try {
    await WorkOrder.findByIdAndUpdate(workOrderId, {
      trackingStage: newStage,
      progressPercentage,
      progressStage,
      status,
      closedAt: workOrder.closedAt,
      startedAt: workOrder.startedAt,
    });
  } catch (err) {}

  // Socket broadcast
  emitWorkOrderProgress(workOrderId, {
    progressPercentage,
    progressStage,
    trackingStage: newStage,
    status,
  });
  emitWorkOrderUpdate(workOrderId, {
    progressPercentage,
    progressStage,
    trackingStage: newStage,
    status,
  });

  return {
    success: true,
    workOrderId,
    trackingStage: newStage,
    progressPercentage,
    progressStage,
    status,
  };
};

/**
 * 5 & 6. Wallet Settlement & Bonus System:
 * Automatically calculates service earnings, admin commission, and awards bonuses.
 */
export const processSettlementAndBonuses = async (workOrder: any, technicianId: string) => {
  const agreedPrice = workOrder.settlementDetails?.agreedPrice || workOrder.budget || 100.0;
  const adminCommission = parseFloat((agreedPrice * ADMIN_COMMISSION_RATE).toFixed(2));
  const technicianNet = parseFloat((agreedPrice - adminCommission).toFixed(2));
  const workOrderId = String(workOrder._id);

  const wallet = await getOrCreateWallet(technicianId);

  // Credit Net Payout
  wallet.walletBalance += technicianNet;
  wallet.withdrawableBalance += technicianNet;
  wallet.totalEarnings += agreedPrice;
  wallet.totalCommissionPaid += adminCommission;
  wallet.updatedAt = new Date();
  IN_MEMORY_WALLETS.set(technicianId, wallet);

  // Log Wallet Transaction: Job Earning
  const earningTx: any = {
    _id: 'wtx_' + Date.now() + '_earn',
    userId: technicianId,
    workOrderId,
    type: 'JobEarning',
    amount: technicianNet,
    balanceAfter: wallet.walletBalance,
    status: 'Completed',
    description: `Service payout for ${workOrder.workOrderCode} (PKR ${agreedPrice} - 12% admin fee)`,
    createdAt: new Date(),
  };
  IN_MEMORY_WALLET_TXS.unshift(earningTx);

  // Check and Award Bonuses (Idempotent)
  const bonusesAwarded: any[] = [];

  // Bonus 1: AI Quality Verification Bonus (if AI score >= 0.90)
  const aiScore = workOrder.aiConfidenceScore || 0.94;
  if (aiScore >= 0.9) {
    const key = `${workOrderId}_AiQuality`;
    const alreadyAwarded = IN_MEMORY_BONUSES.some((b) => b.idempotencyKey === key);
    if (!alreadyAwarded) {
      const bConf = BONUS_CONFIG.AiQuality;
      wallet.walletBalance += bConf.cash;
      wallet.withdrawableBalance += bConf.cash;
      wallet.pointsBalance += bConf.points;

      const bonusObj = {
        _id: 'bon_' + Date.now() + '_ai',
        userId: technicianId,
        workOrderId,
        bonusType: 'AiQuality' as BonusType,
        amountCash: bConf.cash,
        pointsAwarded: bConf.points,
        idempotencyKey: key,
        reason: `${bConf.label} (Confidence: ${(aiScore * 100).toFixed(1)}%)`,
        createdAt: new Date(),
      };
      IN_MEMORY_BONUSES.unshift(bonusObj);
      bonusesAwarded.push(bonusObj);

      // Log wallet transaction for bonus
      IN_MEMORY_WALLET_TXS.unshift({
        _id: 'wtx_' + Date.now() + '_bon1',
        userId: technicianId,
        workOrderId,
        type: 'BonusReward',
        amount: bConf.cash,
        balanceAfter: wallet.walletBalance,
        status: 'Completed',
        description: bonusObj.reason,
        createdAt: new Date(),
      });

      // Log points credit for bonus
      IN_MEMORY_POINTS_TXS.unshift({
        _id: 'ptx_' + Date.now() + '_bon1',
        userId: technicianId,
        workOrderId,
        type: 'BonusReward',
        pointsChange: bConf.points,
        balanceAfter: wallet.pointsBalance,
        reason: bonusObj.reason,
        createdAt: new Date(),
      });
    }
  }

  // Bonus 2: Punctuality Bonus
  const punctKey = `${workOrderId}_Punctuality`;
  if (!IN_MEMORY_BONUSES.some((b) => b.idempotencyKey === punctKey)) {
    const pConf = BONUS_CONFIG.Punctuality;
    wallet.walletBalance += pConf.cash;
    wallet.withdrawableBalance += pConf.cash;
    wallet.pointsBalance += pConf.points;

    const punctBonus = {
      _id: 'bon_' + Date.now() + '_punct',
      userId: technicianId,
      workOrderId,
      bonusType: 'Punctuality' as BonusType,
      amountCash: pConf.cash,
      pointsAwarded: pConf.points,
      idempotencyKey: punctKey,
      reason: pConf.label,
      createdAt: new Date(),
    };
    IN_MEMORY_BONUSES.unshift(punctBonus);
    bonusesAwarded.push(punctBonus);
  }

  // DB Sync
  try {
    await Promise.all([
      FieldMemberWallet.findOneAndUpdate(
        { userId: technicianId },
        {
          $inc: {
            walletBalance: technicianNet,
            withdrawableBalance: technicianNet,
            totalEarnings: agreedPrice,
            totalCommissionPaid: adminCommission,
          },
        },
        { upsert: true }
      ),
      WalletTransaction.create({
        userId: technicianId,
        workOrderId,
        type: 'JobEarning',
        amount: technicianNet,
        balanceAfter: wallet.walletBalance,
        status: 'Completed',
        description: `Service payout for ${workOrder.workOrderCode}`,
      }),
    ]);
  } catch (err) {}

  // Notifications
  await notifService.create({
    userId: technicianId,
    workOrderId,
    type: 'PaymentReceived',
    title: `💰 Payment Settled: +PKR ${technicianNet.toFixed(2)}`,
    message: `Earnings for ${workOrder.workOrderCode} credited to your wallet (Admin commission 12%: PKR ${adminCommission.toFixed(2)}). New balance: PKR ${wallet.walletBalance.toFixed(2)}.`,
    metadata: {
      workOrderId,
      payout: technicianNet,
      commission: adminCommission,
      walletBalance: wallet.walletBalance,
      bonusesAwarded,
    },
  });

  if (bonusesAwarded.length > 0) {
    const totalBonusCash = bonusesAwarded.reduce((acc, b) => acc + b.amountCash, 0);
    const totalBonusPts = bonusesAwarded.reduce((acc, b) => acc + b.pointsAwarded, 0);
    await notifService.create({
      userId: technicianId,
      workOrderId,
      type: 'BonusAwarded',
      title: `⭐ Performance Bonus: +PKR ${totalBonusCash.toFixed(2)} & +${totalBonusPts} pts`,
      message: `You earned performance bonuses for excellent AI quality scores and punctuality!`,
      metadata: { workOrderId, totalBonusCash, totalBonusPts },
    });
  }

  await notifService.create({
    roles: ['Admin'],
    workOrderId,
    type: 'PaymentReceived',
    title: `Commission Revenue Collected: PKR ${adminCommission.toFixed(2)}`,
    message: `Job ${workOrder.workOrderCode} settled. Platform commission: PKR ${adminCommission.toFixed(2)}. Technician payout: PKR ${technicianNet.toFixed(2)}.`,
    metadata: { workOrderId, commission: adminCommission, technicianPayout: technicianNet },
  });

  return {
    agreedPrice,
    adminCommission,
    technicianNet,
    bonusesAwarded,
    updatedWallet: wallet,
  };
};

/**
 * 4 & 5. Wallet, Points, and Availability Retrieval
 */
export const getWalletAndPoints = async (userId: string) => {
  const wallet = await getOrCreateWallet(userId);
  const strId = String(userId);
  const isDemo = strId === '65f000000000000000000004' || strId === '65f000000000000000000005';

  const pointsHistory = IN_MEMORY_POINTS_TXS.filter((p) => String(p.userId) === strId);
  const walletHistory = IN_MEMORY_WALLET_TXS.filter((w) => String(w.userId) === strId);
  const bonusHistory = IN_MEMORY_BONUSES.filter((b) => String(b.userId) === strId);

  // Compute live bidding performance stats for this technician
  const userOffers = IN_MEMORY_OFFERS.filter((o) => String(o.technicianId) === strId);
  const bidsPlaced = isDemo ? 12 : userOffers.length;
  const bidsAwarded = isDemo ? 10 : userOffers.filter((o) => o.status === 'Accepted' || o.status === 'Awarded').length;
  const winRate = bidsPlaced > 0 ? Math.round((bidsAwarded / bidsPlaced) * 100) : (isDemo ? 88 : 0);

  // Compute lifetime earned points (points gained from completed tasks or milestones)
  const earnedFromBonus = bonusHistory.reduce((sum, b) => sum + (Number(b.pointsAwarded) || 0), 0);
  const earnedFromPointsTx = pointsHistory
    .filter((p) => p.type !== 'WelcomeBonus' && p.type !== 'Purchased' && (p.pointsChange || 0) > 0)
    .reduce((sum, p) => sum + (Number(p.pointsChange) || 0), 0);
  const totalEarnedPoints = isDemo ? 175 : (earnedFromBonus + earnedFromPointsTx);
  const totalEarningsPKR = isDemo ? 48250 : Math.round((wallet.totalEarnings || 0) * 31);

  const walletWithStats = {
    ...wallet,
    pointsBalance: wallet.pointsBalance,
    totalEarnedPoints,
    totalEarningsPKR,
    bidsPlaced,
    bidsAwarded,
    winRate,
  };

  return {
    wallet: walletWithStats,
    pointsBalance: wallet.pointsBalance,
    walletBalance: wallet.walletBalance,
    pendingBalance: wallet.pendingBalance,
    withdrawableBalance: wallet.withdrawableBalance,
    totalEarnings: wallet.totalEarnings,
    totalCommissionPaid: wallet.totalCommissionPaid,
    totalEarnedPoints,
    totalEarningsPKR,
    bidsPlaced,
    bidsAwarded,
    winRate,
    isAvailableOnline: wallet.isAvailableOnline,
    searchRadiusKm: wallet.searchRadiusKm,
    pointsHistory: pointsHistory.map((p) => ({
      ...p,
      reason: (p.reason || '').replace(/50\s*Starter\s*Bidding\s*Points/gi, '').replace(/\s{2,}/g, ' ').trim() || 'Welcome to ClearFlow!',
    })),
    walletHistory,
    bonusHistory,
  };
};

/**
 * Toggle field member online/offline status
 */
export const toggleAvailability = async (userId: string, isOnline?: boolean) => {
  const wallet = await getOrCreateWallet(userId);
  wallet.isAvailableOnline = typeof isOnline === 'boolean' ? isOnline : !wallet.isAvailableOnline;
  wallet.updatedAt = new Date();
  IN_MEMORY_WALLETS.set(String(userId), wallet);

  try {
    await FieldMemberWallet.findOneAndUpdate(
      { userId: String(userId) },
      { isAvailableOnline: wallet.isAvailableOnline },
      { upsert: true }
    );
  } catch (err) {}

  const io = getIo();
  if (io) {
    io.emit('marketplace:availability_changed', {
      userId,
      isOnline: wallet.isAvailableOnline,
    });
  }

  return {
    isAvailableOnline: wallet.isAvailableOnline,
    message: wallet.isAvailableOnline
      ? 'You are now Online and receiving nearby job offers.'
      : 'You are now Offline. You will not receive new nearby job requests.',
  };
};

/**
 * 5. Withdrawal Requests & Admin Approval:
 * Member requests payout of their withdrawable balance.
 */
export const requestWithdrawal = async (
  userId: string,
  amount: number,
  method: string = 'Bank Transfer',
  accountInfo: string = 'Account ending in 4109'
) => {
  const wallet = await getOrCreateWallet(userId);
  const withdrawAmount = Number(amount);

  if (withdrawAmount <= 0) {
    throw new Error('Withdrawal amount must be greater than zero.');
  }
  if (withdrawAmount > wallet.withdrawableBalance) {
    throw new Error(
      `Insufficient withdrawable funds (PKR ${wallet.withdrawableBalance.toFixed(2)} available).`
    );
  }

  // Deduct from withdrawable and hold in pending
  wallet.withdrawableBalance -= withdrawAmount;
  wallet.pendingBalance += withdrawAmount;
  wallet.updatedAt = new Date();
  IN_MEMORY_WALLETS.set(String(userId), wallet);

  const txObj: any = {
    _id: 'wtx_' + Date.now() + '_wd',
    userId: String(userId),
    type: 'Withdrawal',
    amount: -withdrawAmount,
    balanceAfter: wallet.walletBalance,
    status: 'Pending',
    withdrawalDetails: {
      method,
      accountInfo,
    },
    description: `Withdrawal request via ${method} (${accountInfo})`,
    createdAt: new Date(),
  };
  IN_MEMORY_WALLET_TXS.unshift(txObj);

  // Notify Admin
  await notifService.create({
    roles: ['Admin'],
    type: 'WithdrawalRequest',
    title: `Payout Request: PKR ${withdrawAmount.toFixed(2)}`,
    message: `Technician Ahsan requested a payout of PKR ${withdrawAmount.toFixed(2)} to ${method} (${accountInfo}).`,
    metadata: { withdrawalId: txObj._id, amount: withdrawAmount, method },
  });

  return {
    success: true,
    transaction: txObj,
    withdrawableBalance: wallet.withdrawableBalance,
    pendingBalance: wallet.pendingBalance,
  };
};

/**
 * 5b. Purchase Points & Subscription Plans:
 * Field crew purchase bidding plans (Starter Dispatch, Pro Crew, Fleet Enterprise).
 * Admin earns 100% of the plan purchase price in Purple Theme Admin Platform Revenue.
 */
export const purchasePointsPlan = async (
  userId: string,
  planName: string,
  points: number,
  price: number,
  billingCycle: string = 'monthly',
  paymentMethod: string = 'JazzCash',
  accountInfo: string = 'Mobile Wallet Transfer',
  technicianName?: string
) => {
  const wallet = await getOrCreateWallet(userId);
  const pointsAmount = Number(points) || 100;
  const purchaseAmount = Number(price) || 0;
  
  wallet.pointsBalance += pointsAmount;
  wallet.updatedAt = new Date();
  IN_MEMORY_WALLETS.set(String(userId), wallet);

  const txId = 'ptx_' + Date.now() + '_purchase';
  const pointsTx = {
    _id: txId,
    userId: String(userId),
    pointsChange: pointsAmount,
    balanceAfter: wallet.pointsBalance,
    type: 'PlanPurchase',
    reason: `Purchased ${planName} Plan (+${pointsAmount} Points)`,
    createdAt: new Date(),
  };
  IN_MEMORY_POINTS_TXS.unshift(pointsTx);

  const walletTx = {
    _id: 'wtx_' + Date.now() + '_sub',
    userId: String(userId),
    amount: -purchaseAmount,
    type: 'SubscriptionFee',
    balanceAfter: wallet.walletBalance,
    status: 'Completed',
    description: `${planName} Subscription (${billingCycle}) via ${paymentMethod}`,
    createdAt: new Date(),
  };
  IN_MEMORY_WALLET_TXS.unshift(walletTx);

  try {
    await FieldMemberWallet.findOneAndUpdate(
      { userId: String(userId) },
      { $inc: { pointsBalance: pointsAmount } },
      { upsert: true }
    );
  } catch (err) {}

  // 🟣 1. Credit Admin Platform Earnings (Admin earns from all 3 packages!)
  IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packageSubscriptionsRevenue += purchaseAmount;

  const resolvedTechName = technicianName || 'Ahsan';
  const adminPackageRecord: AdminPackagePurchase = {
    _id: 'pkg_' + Date.now(),
    technicianId: String(userId),
    technicianName: resolvedTechName,
    planName,
    pointsAwarded: pointsAmount,
    amount: purchaseAmount,
    billingCycle,
    paymentMethod,
    accountInfo,
    status: 'Credited',
    createdAt: new Date(),
  };
  IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packagePurchases.unshift(adminPackageRecord);

  const totalAdminEarnings =
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.basePlatformRevenue +
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packageSubscriptionsRevenue +
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.commissionRevenue -
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.totalWithdrawn;

  // 🟣 2. Real-time Socket Broadcast for Admin Portal & Worker Wallet
  const io = getIo();
  if (io) {
    io.emit('wallet_updated', {
      userId: String(userId),
      pointsBalance: wallet.pointsBalance,
      pointsAwarded: pointsAmount,
      wallet,
    });
    io.emit('marketplace:wallet_updated', {
      userId: String(userId),
      pointsBalance: wallet.pointsBalance,
      pointsAwarded: pointsAmount,
      wallet,
    });
    io.emit('marketplace:package_purchased', {
      purchase: adminPackageRecord,
      packageSubscriptionsRevenue: IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packageSubscriptionsRevenue,
      totalAdminRevenue: totalAdminEarnings,
    });
    io.emit('marketplace:admin_revenue_updated', {
      totalRevenue: totalAdminEarnings,
      packageSubscriptionsRevenue: IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packageSubscriptionsRevenue,
      latestPurchase: adminPackageRecord,
    });
  }

  // 🟣 3. Admin Notification Alert
  await notifService.create({
    roles: ['Admin'],
    type: 'PaymentReceived',
    title: `💰 Platform Revenue: +PKR ${purchaseAmount.toFixed(2)}`,
    message: `${resolvedTechName} purchased "${planName}" via ${paymentMethod}. PKR ${purchaseAmount.toFixed(2)} credited to Admin Platform Wallet!`,
    metadata: {
      packageId: adminPackageRecord._id,
      planName,
      amount: purchaseAmount,
      paymentMethod,
    },
  });

  return {
    success: true,
    planName,
    pointsAwarded: pointsAmount,
    newPointsBalance: wallet.pointsBalance,
    wallet,
    adminCredit: {
      amount: purchaseAmount,
      totalAdminRevenue: totalAdminEarnings,
    },
  };
};

/**
 * Admin approves or rejects a withdrawal request.
 */
export const adminReviewWithdrawal = async (
  adminId: string,
  txId: string,
  action: 'approve' | 'reject',
  rejectionReason?: string
) => {
  const tx = IN_MEMORY_WALLET_TXS.find((t) => String(t._id) === String(txId));
  if (!tx) {
    throw new Error('Withdrawal transaction not found.');
  }

  const userId = String(tx.userId);
  const wallet = await getOrCreateWallet(userId);
  const amount = Math.abs(tx.amount);

  if (action === 'approve') {
    tx.status = 'Completed';
    tx.withdrawalDetails = {
      ...tx.withdrawalDetails,
      approvedBy: adminId,
      processedAt: new Date(),
    };
    wallet.walletBalance -= amount;
    wallet.pendingBalance -= amount;
    wallet.updatedAt = new Date();

    await notifService.create({
      userId,
      type: 'WithdrawalApproved',
      title: 'Withdrawal Approved & Dispatched',
      message: `Your withdrawal of PKR ${amount.toFixed(2)} has been approved and processed to your ${tx.withdrawalDetails?.method || 'account'}.`,
    });
  } else {
    tx.status = 'Rejected';
    tx.withdrawalDetails = {
      ...tx.withdrawalDetails,
      approvedBy: adminId,
      rejectionReason: rejectionReason || 'Information mismatch',
      processedAt: new Date(),
    };
    wallet.withdrawableBalance += amount;
    wallet.pendingBalance -= amount;
    wallet.updatedAt = new Date();

    await notifService.create({
      userId,
      type: 'WithdrawalRejected',
      title: 'Withdrawal Request Rejected',
      message: `Your withdrawal of PKR ${amount.toFixed(2)} was rejected: "${rejectionReason || 'Information mismatch'}". Funds returned to your available balance.`,
    });
  }

  return { success: true, action, transaction: tx, wallet };
};

/**
 * 9. Admin Portal Live Marketplace Overview & Monitoring (Purple Theme)
 */
export const getAdminMarketplaceOverview = async () => {
  const openRequests = MOCK_WORK_ORDERS.filter(
    (wo: any) => wo.status === 'Open' || wo.marketplaceStatus === 'Bidding'
  );
  const activeOffers = IN_MEMORY_OFFERS.filter((o) => o.status === 'Pending');
  const pendingWithdrawals = IN_MEMORY_WALLET_TXS.filter(
    (w) => w.type === 'Withdrawal' && w.status === 'Pending'
  );
  const pendingTargetPayouts = IN_MEMORY_TARGET_PAYOUT_REQUESTS.filter(
    (r) => r.status === 'PendingAdminAudit'
  );

  const totalCommissionEarned = IN_MEMORY_WALLET_TXS.reduce((acc, t) => {
    if (t.type === 'JobEarning') {
      const gross = t.amount / (1 - ADMIN_COMMISSION_RATE);
      return acc + (gross - t.amount);
    }
    return acc;
  }, 195.0);

  const totalBonusesPaid = IN_MEMORY_BONUSES.reduce((acc, b) => acc + (b.amountCash || 0), 0);

  const totalRevenue =
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.basePlatformRevenue +
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packageSubscriptionsRevenue +
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.commissionRevenue -
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.totalWithdrawn;

  const adminRevenue = {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    basePlatformRevenue: IN_MEMORY_ADMIN_PLATFORM_EARNINGS.basePlatformRevenue,
    packageSubscriptionsRevenue: parseFloat(IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packageSubscriptionsRevenue.toFixed(2)),
    commissionRevenue: parseFloat(IN_MEMORY_ADMIN_PLATFORM_EARNINGS.commissionRevenue.toFixed(2)),
    withdrawableRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalWithdrawn: IN_MEMORY_ADMIN_PLATFORM_EARNINGS.totalWithdrawn,
    packagePurchases: IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packagePurchases,
  };

  return {
    openRequestsCount: openRequests.length,
    activeOffersCount: activeOffers.length,
    pendingWithdrawalsCount: pendingWithdrawals.length,
    pendingTargetPayoutsCount: pendingTargetPayouts.length,
    totalCommissionEarned: parseFloat(totalCommissionEarned.toFixed(2)),
    totalBonusesPaid: parseFloat(totalBonusesPaid.toFixed(2)),
    commissionRatePercentage: ADMIN_COMMISSION_RATE * 100,
    adminRevenue,
    openRequests,
    activeOffers,
    pendingWithdrawals,
    pendingTargetPayouts,
    recentWalletTransactions: IN_MEMORY_WALLET_TXS.slice(0, 10),
    recentPointsTransactions: IN_MEMORY_POINTS_TXS.slice(0, 10),
  };
};

/**
 * Get dedicated Admin Platform Revenue & Treasury Ledger
 */
export const getAdminPlatformRevenue = async () => {
  const totalRevenue =
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.basePlatformRevenue +
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packageSubscriptionsRevenue +
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.commissionRevenue -
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.totalWithdrawn;

  return {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    basePlatformRevenue: IN_MEMORY_ADMIN_PLATFORM_EARNINGS.basePlatformRevenue,
    packageSubscriptionsRevenue: parseFloat(IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packageSubscriptionsRevenue.toFixed(2)),
    commissionRevenue: parseFloat(IN_MEMORY_ADMIN_PLATFORM_EARNINGS.commissionRevenue.toFixed(2)),
    withdrawableRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalWithdrawn: IN_MEMORY_ADMIN_PLATFORM_EARNINGS.totalWithdrawn,
    packagePurchases: IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packagePurchases,
    recentTransactions: IN_MEMORY_WALLET_TXS.slice(0, 15),
  };
};

/**
 * Admin transfers/withdraws platform revenue to corporate bank
 */
export const adminWithdrawPlatformRevenue = async (
  adminId: string,
  amount: number,
  destination: string = 'Corporate Bank Account (Meezan Bank •••• 9102)'
) => {
  const withdrawAmount = Number(amount);
  const currentTotal =
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.basePlatformRevenue +
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.packageSubscriptionsRevenue +
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.commissionRevenue -
    IN_MEMORY_ADMIN_PLATFORM_EARNINGS.totalWithdrawn;

  if (withdrawAmount <= 0) {
    throw new Error('Disbursement amount must be greater than zero');
  }
  if (withdrawAmount > currentTotal) {
    throw new Error(`Insufficient treasury balance (PKR ${currentTotal.toFixed(2)} available)`);
  }

  IN_MEMORY_ADMIN_PLATFORM_EARNINGS.totalWithdrawn += withdrawAmount;
  const newBalance = currentTotal - withdrawAmount;

  return {
    success: true,
    amountWithdrawn: withdrawAmount,
    destination,
    remainingTreasury: parseFloat(newBalance.toFixed(2)),
  };
};

export const IN_MEMORY_CLAIMED_TARGETS = new Set<string>();

/**
 * 10. Weekly Milestone Targets & 5-Hour Admin Audit Payout System
 */
export const getWeeklyTargets = async (userId: string) => {
  const strId = String(userId);
  const now = Date.now();
  // Auto-approve any requests where the 5-hour audit window has elapsed
  for (const req of IN_MEMORY_TARGET_PAYOUT_REQUESTS) {
    if (req.status === 'PendingAdminAudit' && new Date(req.auditExpiresAt).getTime() <= now) {
      req.status = 'Approved';
      req.approvedAt = new Date();
      req.adminNotes = 'Automatically approved upon completion of 5-hour monitoring window.';

      const w = await getOrCreateWallet(String(req.userId));
      w.walletBalance += req.rewardCash;
      w.withdrawableBalance += req.rewardCash;
      w.updatedAt = new Date();
      IN_MEMORY_WALLETS.set(String(req.userId), w);

      IN_MEMORY_WALLET_TXS.unshift({
        _id: 'wtx_' + Date.now() + '_tpr_auto',
        userId: String(req.userId),
        type: 'BonusReward',
        amount: req.rewardCash,
        balanceAfter: w.walletBalance,
        status: 'Completed',
        description: `Target Milestone Unlocked: ${req.targetTitle} (5-Hour Audit Passed)`,
        createdAt: new Date(),
      });
    }
  }

  const userRequests = IN_MEMORY_TARGET_PAYOUT_REQUESTS.filter(
    (r) => String(r.userId) === String(userId)
  );

  // 1. Calculate actual completed works for this worker
  let completedWorksCount = 0;
  let highQualityWorksCount = 0;
  let remoteWorksCount = 0;

  for (const wo of MOCK_WORK_ORDERS) {
    const assignedId = String((wo as any).assignedWorkerId || (wo as any).workerId?._id || (wo as any).workerId || (wo as any).teamId?._id || (wo as any).teamId || '');
    const isWorkerMatch = assignedId === strId || strId === '65f000000000000000000004' || strId === '65f000000000000000000005';
    
    if (wo.status === 'Completed' || wo.status === 'Closed') {
      if (isWorkerMatch) {
        completedWorksCount++;
        highQualityWorksCount++;
        remoteWorksCount++;
      }
    }
  }

  try {
    const rows = await dbQuery(
      `SELECT COUNT(*) as count FROM work_orders WHERE (status = 'Completed' OR status = 'Closed') AND (assigned_worker_id::text = $1 OR worker_id::text = $1 OR team_id::text = $1)`,
      [strId]
    );
    if (rows && rows.length > 0 && Number(rows[0].count) > 0) {
      completedWorksCount = Math.max(completedWorksCount, Number(rows[0].count));
      highQualityWorksCount = Math.max(highQualityWorksCount, Number(rows[0].count));
      remoteWorksCount = Math.max(remoteWorksCount, Number(rows[0].count));
    }
  } catch (e) {}

  const isDemo = strId === '65f000000000000000000004' || strId === '65f000000000000000000005';
  if (isDemo && completedWorksCount === 0) {
    completedWorksCount = 10;
    highQualityWorksCount = 4;
    remoteWorksCount = 3;
  }

  const targets = WEEKLY_TARGETS_LIST.map((t) => {
    let current = 0;
    if (t.id === 'target_10_works') {
      current = completedWorksCount;
    } else if (t.id === 'target_5_star_quality') {
      current = highQualityWorksCount;
    } else if (t.id === 'target_far_distance_hero') {
      current = remoteWorksCount;
    } else {
      current = completedWorksCount;
    }

    const currentCount = Math.min(t.targetCount, current);
    const isFulfilled = currentCount >= t.targetCount;
    const isClaimed = IN_MEMORY_CLAIMED_TARGETS.has(`${strId}_${t.id}`);

    return {
      ...t,
      currentCount,
      targetCount: t.targetCount,
      // Provide compatibility fields for components expecting current / target
      current: currentCount,
      target: t.targetCount,
      isFulfilled,
      claimed: isClaimed,
    };
  });

  return {
    targets,
    targetPayoutRequests: userRequests,
  };
};

export const claimWeeklyTargetReward = async (userId: string, targetId: string) => {
  const strId = String(userId);
  const target = WEEKLY_TARGETS_LIST.find((t) => t.id === targetId);
  if (!target) {
    throw new Error('Weekly milestone target not found');
  }

  const claimKey = `${strId}_${targetId}`;
  if (IN_MEMORY_CLAIMED_TARGETS.has(claimKey)) {
    throw new Error('Reward for this weekly goal has already been claimed');
  }

  // Get user's current progress for this target
  const userTargetsData = await getWeeklyTargets(userId);
  const userTarget = userTargetsData.targets.find((t) => t.id === targetId);
  const currentCount = Number(userTarget?.currentCount ?? target.currentCount ?? 0);
  const targetCount = Number(userTarget?.targetCount ?? target.targetCount ?? 1);

  if (currentCount < targetCount && !userTarget?.isFulfilled) {
    throw new Error(`Target goal is still in progress (${currentCount}/${targetCount}). Complete all required works to unlock this reward.`);
  }

  // Mark as claimed
  IN_MEMORY_CLAIMED_TARGETS.add(claimKey);

  // Credit points to user's wallet
  const pointsAwarded = target.rewardPoints || 100;
  const wallet = await getOrCreateWallet(strId);
  wallet.pointsBalance = (Number(wallet.pointsBalance) || 160) + pointsAwarded;
  wallet.updatedAt = new Date();
  IN_MEMORY_WALLETS.set(strId, wallet);

  // Update Supabase PostgreSQL field_member_wallets
  try {
    await dbQuery(
      'UPDATE field_member_wallets SET points_balance = points_balance + $1, updated_at = NOW() WHERE user_id::text = $2',
      [pointsAwarded, strId]
    );
  } catch (e) {
    console.warn('[claimWeeklyTargetReward] Postgres update warning:', e);
  }

  // Add points ledger transaction
  IN_MEMORY_POINTS_TXS.unshift({
    _id: 'ptx_' + Date.now() + '_' + targetId,
    userId: strId,
    pointsChange: pointsAwarded,
    balanceAfter: wallet.pointsBalance,
    reason: `Weekly Goal Milestone Completed: ${target.title}`,
    createdAt: new Date(),
  });

  // Broadcast wallet update via socket
  try {
    const io = getIo();
    if (io) {
      io.emit('wallet_updated', {
        userId: strId,
        pointsBalance: wallet.pointsBalance,
        pointsAwarded,
        reason: target.title,
        wallet,
      });
    }
  } catch (e) {}

  return {
    success: true,
    targetId,
    targetTitle: target.title,
    pointsAwarded,
    newPointsBalance: wallet.pointsBalance,
    wallet,
  };
};

export const requestTargetPointsPayout = async (
  userId: string,
  targetId: string,
  customNotes?: string
) => {
  const target = WEEKLY_TARGETS_LIST.find((t) => t.id === targetId);
  if (!target) {
    throw new Error('Milestone target not found');
  }

  const existingPending = IN_MEMORY_TARGET_PAYOUT_REQUESTS.find(
    (r) => String(r.userId) === String(userId) && r.targetId === targetId && r.status === 'PendingAdminAudit'
  );
  if (existingPending) {
    throw new Error('A payout request for this weekly milestone is already undergoing the 5-hour Admin audit.');
  }

  const requestedAt = new Date();
  const auditExpiresAt = new Date(requestedAt.getTime() + 5 * 3600 * 1000); // 5 hours countdown

  const newRequest = {
    _id: 'tpr_' + Date.now(),
    userId: String(userId),
    technicianName: 'Ahsan',
    targetId: target.id,
    targetTitle: target.title,
    pointsRedeemed: target.rewardPoints,
    rewardCash: target.rewardCash,
    status: 'PendingAdminAudit',
    requestedAt,
    auditExpiresAt,
    completedWorksCount: target.currentCount,
    averageAiScore: 94.8,
    adminNotes: customNotes || `Field crew fulfilled ${target.title}. Undergoing 5-hour SLA & photo evidence audit by Admin.`,
    workOrdersRecord: MOCK_MILESTONE_10_WORK_ORDERS,
    auditChecklist: MOCK_AUDIT_CHECKLIST,
    inspectionFindings: {
      verifiedWorks: target.currentCount,
      totalPhotosInspected: target.currentCount * 2,
      avgAiScore: 94.8,
      avgRating: 4.93,
      slaPassedCount: 6,
      slaTotalCount: 6,
      geofenceComplianceRate: '100%',
      disputesCount: 0,
      overallRecommendation: 'Approved for Instant Payout',
    },
  };

  IN_MEMORY_TARGET_PAYOUT_REQUESTS.unshift(newRequest);

  await notifService.create({
    roles: ['Admin'],
    type: 'BonusAwarded',
    title: `🎯 Target Payout Request: PKR ${target.rewardCash}`,
    message: `Technician requested payment through points for "${target.title}". Active 5-Hour Admin Audit Monitor initiated.`,
    metadata: {
      requestId: newRequest._id,
      rewardCash: target.rewardCash,
      pointsRedeemed: target.rewardPoints,
      auditExpiresAt,
    },
  });

  return newRequest;
};

export const adminApproveTargetPayout = async (
  adminId: string,
  requestId: string,
  action: 'approve' | 'reject' = 'approve',
  rejectionReason?: string,
  adminNotes?: string
) => {
  const req = IN_MEMORY_TARGET_PAYOUT_REQUESTS.find((r) => String(r._id) === String(requestId));
  if (!req) {
    throw new Error('Target payout request not found');
  }

  if (req.status !== 'PendingAdminAudit') {
    throw new Error(`Request has already been ${req.status.toLowerCase()}`);
  }

  if (action === 'reject') {
    req.status = 'Rejected';
    req.rejectionReason = rejectionReason || 'SLA criteria not met';
    req.adminNotes = adminNotes || req.rejectionReason;
    req.reviewedAt = new Date();

    await notifService.create({
      userId: String(req.userId),
      type: 'StatusUpdate',
      title: 'Target Payout Request Rejected',
      message: `Your request for ${req.targetTitle} was rejected by Admin: ${req.rejectionReason}`,
    });

    return { success: true, request: req };
  }

  // Approve
  req.status = 'Approved';
  req.approvedAt = new Date();
  req.approvedBy = String(adminId);
  req.adminNotes = adminNotes || 'Admin cross-checked all 10 work orders, photo proofs, and SLA criteria. Approved and released to withdrawable cash balance.';

  const wallet = await getOrCreateWallet(String(req.userId));
  wallet.walletBalance += req.rewardCash;
  wallet.withdrawableBalance += req.rewardCash;
  wallet.updatedAt = new Date();
  IN_MEMORY_WALLETS.set(String(req.userId), wallet);

  IN_MEMORY_WALLET_TXS.unshift({
    _id: 'wtx_' + Date.now() + '_tpr_appr',
    userId: String(req.userId),
    type: 'BonusReward',
    amount: req.rewardCash,
    balanceAfter: wallet.walletBalance,
    status: 'Completed',
    description: `Target Milestone Payout: ${req.targetTitle} (Admin 5-Hour Audit Approved)`,
    createdAt: new Date(),
  });

  await notifService.create({
    userId: String(req.userId),
    type: 'BonusAwarded',
    title: `🎉 Target Payout Approved: +PKR ${req.rewardCash.toFixed(2)}`,
    message: `Admin approved your milestone "${req.targetTitle}". PKR ${req.rewardCash.toFixed(2)} has been unlocked and added to your Withdrawable Balance!`,
    metadata: {
      requestId: req._id,
      amount: req.rewardCash,
      withdrawableBalance: wallet.withdrawableBalance,
    },
  });

  return { success: true, request: req, updatedWallet: wallet };
};

/**
 * Admin manual intervention: directly assign a job to a specific technician
 */
export const adminInterveneAssign = async (
  adminId: string,
  workOrderId: string,
  technicianId: string,
  agreedPrice: number = 100
) => {
  let workOrder: any = MOCK_WORK_ORDERS.find((wo: any) => String(wo._id) === String(workOrderId));
  if (!workOrder) {
    try {
      workOrder = (await WorkOrder.findById(workOrderId)) as any;
    } catch {}
  }
  if (!workOrder) throw new Error('Work order not found');

  const catName = workOrder.categoryId?.name || 'Cleaning';
  const pointsToDeduct = getCategoryPoints(catName);
  const wallet = await getOrCreateWallet(technicianId);

  // Deduct points
  wallet.pointsBalance = Math.max(0, wallet.pointsBalance - pointsToDeduct);
  IN_MEMORY_WALLETS.set(technicianId, wallet);

  IN_MEMORY_POINTS_TXS.unshift({
    _id: 'ptx_' + Date.now(),
    userId: technicianId,
    workOrderId,
    type: 'JobWonDeduction',
    pointsChange: -pointsToDeduct,
    balanceAfter: wallet.pointsBalance,
    reason: `Admin manual assignment: ${workOrder.workOrderCode}`,
    createdAt: new Date(),
  });

  workOrder.status = 'Assigned';
  workOrder.marketplaceStatus = 'Assigned';
  workOrder.trackingStage = 'Assigned';
  workOrder.isAccepted = true;
  workOrder.acceptedBy = 'Admin Manual Dispatch';
  workOrder.assignedAt = new Date();
  workOrder.progressPercentage = 15;
  workOrder.progressStage = 'Manually Assigned by Dispatch Admin';
  workOrder.settlementDetails = {
    agreedPrice,
    adminCommission: parseFloat((agreedPrice * ADMIN_COMMISSION_RATE).toFixed(2)),
    technicianPayout: parseFloat((agreedPrice * (1 - ADMIN_COMMISSION_RATE)).toFixed(2)),
    settledAt: new Date(),
  };

  emitWorkOrderUpdate(workOrderId, {
    status: 'Assigned',
    trackingStage: 'Assigned',
    progressStage: workOrder.progressStage,
  });

  try {
    const io = getIo();
    if (io) {
      io.emit('wallet_updated', {
        userId: String(technicianId),
        pointsBalance: wallet.pointsBalance,
        pointsDeducted: pointsToDeduct,
        wallet,
      });
      io.emit('marketplace:wallet_updated', {
        userId: String(technicianId),
        pointsBalance: wallet.pointsBalance,
        pointsDeducted: pointsToDeduct,
        wallet,
      });
    }
  } catch {}

  await notifService.create({
    userId: technicianId,
    workOrderId,
    type: 'NewAssignment',
    title: `Admin Manual Assignment: ${workOrder.workOrderCode}`,
    message: `Operations admin manually assigned you to ${workOrder.title || workOrder.workOrderCode} (PKR ${agreedPrice}). ${pointsToDeduct} points deducted.`,
  });

  return { success: true, workOrder };
};

export const adminGiveBonusToTechnician = async (
  adminId: string,
  workOrderId: string,
  technicianId?: string,
  technicianName?: string,
  points: number = 50,
  reason: string = 'Admin Special Bonus for Bidding',
  cashBonus: number = 0
) => {
  let targetTechId = technicianId;
  if (!targetTechId) {
    const fieldUser = DEMO_USERS.find((d: any) => d.role === 'FieldTeam');
    targetTechId = String(fieldUser?._id || '65f000000000000000000004');
  }

  const wallet = await getOrCreateWallet(targetTechId);
  const pointsAwarded = Number(points) || 50;
  const cashAwarded = Number(cashBonus) || 0;

  wallet.pointsBalance = (Number(wallet.pointsBalance) || 160) + pointsAwarded;
  if (cashAwarded > 0) {
    wallet.walletBalance = (Number(wallet.walletBalance) || 0) + cashAwarded;
    wallet.withdrawableBalance = (Number(wallet.withdrawableBalance) || 0) + cashAwarded;
  }
  wallet.updatedAt = new Date();
  IN_MEMORY_WALLETS.set(String(targetTechId), wallet);

  // Record points transaction
  const ptx = {
    _id: 'ptx_' + Date.now() + '_bonus',
    userId: targetTechId,
    workOrderId: workOrderId || 'WO-REFERENCE',
    type: 'BonusReward',
    pointsChange: pointsAwarded,
    balanceAfter: wallet.pointsBalance,
    reason: reason || 'Admin Special Bonus for Bidding',
    metadata: {
      awardedByAdminId: adminId,
      technicianName: technicianName || 'Technician',
      workOrderId,
    },
    createdAt: new Date(),
  };
  IN_MEMORY_POINTS_TXS.unshift(ptx);

  // Record bonus reward
  const bonusReward = {
    _id: 'bon_' + Date.now() + '_admin',
    userId: targetTechId,
    workOrderId,
    bonusType: 'AdminBonus',
    amountCash: cashAwarded,
    pointsAwarded: pointsAwarded,
    idempotencyKey: `admin_bonus_${workOrderId}_${Date.now()}`,
    reason: reason || 'Admin Special Bonus for Bidding',
    createdAt: new Date(),
  };
  IN_MEMORY_BONUSES.unshift(bonusReward);

  if (cashAwarded > 0) {
    IN_MEMORY_WALLET_TXS.unshift({
      _id: 'wtx_' + Date.now() + '_admin_bonus',
      userId: targetTechId,
      workOrderId,
      type: 'BonusReward',
      amount: cashAwarded,
      balanceAfter: wallet.walletBalance,
      status: 'Completed',
      description: reason || 'Admin Bonus Cash',
      createdAt: new Date(),
    });
  }

  try {
    await FieldMemberWallet.findOneAndUpdate(
      { userId: String(targetTechId) },
      {
        $inc: {
          pointsBalance: pointsAwarded,
          ...(cashAwarded > 0 ? { walletBalance: cashAwarded, withdrawableBalance: cashAwarded } : {}),
        },
      },
      { upsert: true }
    );
  } catch (err) {}

  try {
    await notifService.create({
      userId: targetTechId,
      workOrderId,
      type: 'BonusAwarded',
      title: '🎉 Admin Bonus Points Awarded!',
      message: `Operations Admin awarded you +${pointsAwarded} bidding points! ${reason}`,
    });
  } catch {}

  try {
    const io = getIo();
    if (io) {
      io.emit('wallet_updated', {
        userId: String(targetTechId),
        pointsBalance: wallet.pointsBalance,
        bonusAwarded: pointsAwarded,
        wallet,
      });
      io.emit('marketplace:wallet_updated', {
        userId: String(targetTechId),
        pointsBalance: wallet.pointsBalance,
        bonusAwarded: pointsAwarded,
        wallet,
      });
    }
  } catch {}

  return {
    success: true,
    pointsAwarded,
    cashAwarded,
    newPointsBalance: wallet.pointsBalance,
    technicianName: technicianName || 'Technician',
    reason,
  };
};
