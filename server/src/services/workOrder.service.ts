import { WorkOrder } from '../models/workOrder.model.js';
import { Rating } from '../models/rating.model.js';
import { FieldTeam } from '../models/fieldTeam.model.js';
import { ServiceCategory } from '../models/serviceCategory.model.js';
import { AiVerificationLog } from '../models/aiVerificationLog.model.js';
import { ApiError } from '../utils/ApiError.js';
import { generateWorkOrderCode } from '../utils/generateCode.js';
import { autoAssign } from './assignment.service.js';
import { generateReport } from './pdf.service.js';
import { verifyServiceQuality } from './ai.service.js';
import { env } from '../config/env.js';

export const MOCK_CATEGORIES = [
  { _id: '65f000000000000000000101', name: 'Cleaning', description: 'Janitorial & deep cleaning', isWaste: false, icon: 'sparkles' },
  { _id: '65f000000000000000000102', name: 'Electrical Repair', description: 'Wiring, fixtures & power systems', isWaste: false, icon: 'zap' },
  { _id: '65f000000000000000000103', name: 'Plumbing', description: 'Pipes, leaks & drainage', isWaste: false, icon: 'droplet' },
  { _id: '65f000000000000000000104', name: 'General Waste Collection', description: 'Trash collection & disposal', isWaste: true, icon: 'trash-2' },
  { _id: '65f000000000000000000105', name: 'Pest Control', description: 'Fumigation & pest management', isWaste: false, icon: 'bug' },
  { _id: '65f000000000000000000106', name: 'Gardening', description: 'Lawn mowing & landscape care', isWaste: false, icon: 'leaf' },
  { _id: '65f000000000000000000107', name: 'E-Waste Recycling', description: 'Electronics disposal & recycling', isWaste: true, icon: 'recycle' }
];

export const MOCK_WORK_ORDERS = [
  {
    _id: '65f000000000000000000201',
    workOrderCode: 'WO-2026-0001',
    clientId: { _id: '65f000000000000000000002', name: 'James Chen', email: 'james@clearflow.com' },
    teamId: { _id: '65f000000000000000000301', name: 'Alpha Crew (Cleaning)' },
    categoryId: MOCK_CATEGORIES[0],
    status: 'InProgress',
    locationAddress: 'Building A, Room 302, Central Facility Complex',
    locationLat: 31.4697,
    locationLng: 74.2728,
    description: 'Deep cleaning required for lecture hall 302 following event.',
    urgency: 'Medium',
    isWasteCategory: false,
    beforeImageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    createdAt: new Date(Date.now() - 7200 * 1000),
    startedAt: new Date(Date.now() - 3600 * 1000)
  },
  {
    _id: '65f000000000000000000202',
    workOrderCode: 'WO-2026-0002',
    clientId: { _id: '65f000000000000000000003', name: 'Priya Sharma', email: 'priya@clearflow.com' },
    teamId: { _id: '65f000000000000000000303', name: 'Voltage Elite (Electrical)' },
    categoryId: MOCK_CATEGORIES[1],
    status: 'Assigned',
    locationAddress: 'Library Block B, 2nd Floor, Central Facility Complex',
    locationLat: 31.4700,
    locationLng: 74.2730,
    description: 'Circuit breaker tripping repeatedly in reading area.',
    urgency: 'High',
    isWasteCategory: false,
    createdAt: new Date(Date.now() - 3600 * 1000)
  },
  {
    _id: '65f000000000000000000203',
    workOrderCode: 'WO-2026-0003',
    clientId: { _id: '65f000000000000000000002', name: 'James Chen', email: 'james@clearflow.com' },
    teamId: { _id: '65f000000000000000000302', name: 'Pipe Pros (Plumbing)' },
    categoryId: MOCK_CATEGORIES[2],
    status: 'PendingReview',
    locationAddress: 'Main Cafeteria Washrooms, Ground Floor, Central Facility Complex',
    locationLat: 31.4695,
    locationLng: 74.2725,
    description: 'Major water pipe leakage under main sink unit.',
    urgency: 'High',
    isWasteCategory: false,
    beforeImageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    afterImageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800',
    aiConfidenceScore: 0.94,
    aiResult: 'Pass',
    createdAt: new Date(Date.now() - 1800 * 1000)
  },
  {
    _id: '65f000000000000000000204',
    workOrderCode: 'WO-2026-0004',
    clientId: { _id: '65f000000000000000000002', name: 'James Chen', email: 'james@clearflow.com' },
    teamId: { _id: '65f000000000000000000301', name: 'Alpha Crew (Cleaning)' },
    categoryId: MOCK_CATEGORIES[0],
    status: 'Closed',
    locationAddress: 'Faculty Lounge, 4th Floor, Academic Block, Central Facility Complex',
    locationLat: 31.4698,
    locationLng: 74.2729,
    description: 'Weekly carpet shampoo and window cleaning completed.',
    urgency: 'Low',
    beforeImageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    afterImageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=800',
    aiConfidenceScore: 0.96,
    aiResult: 'Pass',
    createdAt: new Date(Date.now() - 86400 * 1000),
    closedAt: new Date(Date.now() - 72000 * 1000)
  }
];

export const create = async (clientId: string, data: any) => {
  const code = await generateWorkOrderCode();
  const cat = MOCK_CATEGORIES.find(c => c._id === data.categoryId || c.name === data.categoryId) || MOCK_CATEGORIES[0];
  const isWaste = cat.isWaste || false;

  const assignedTeam = {
    _id: '65f000000000000000000301',
    name: 'Alpha Crew (' + cat.name + ')'
  };

  const newOrderObj = {
    _id: '65f0000000000000000' + Math.floor(Math.random() * 899 + 100),
    workOrderCode: code,
    clientId: {
      _id: clientId,
      name: clientId === '65f000000000000000000002' ? 'James Chen' : 'Client User',
      email: clientId === '65f000000000000000000002' ? 'james@clearflow.com' : 'client@clearflow.com'
    },
    teamId: assignedTeam,
    categoryId: cat,
    status: 'Assigned' as const,
    locationAddress: data.locationAddress || 'Central Facility Complex',
    locationLat: Number(data.locationLat) || 31.4697,
    locationLng: Number(data.locationLng) || 74.2728,
    description: data.description || '',
    urgency: data.urgency || 'Medium',
    isWasteCategory: isWaste,
    wasteType: data.wasteType,
    wasteQuantityKg: data.wasteQuantityKg,
    ewasteDeviceDescription: data.ewasteDeviceDescription,
    assignedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  MOCK_WORK_ORDERS.unshift(newOrderObj as any);

  try {
    const wo = await Promise.race([
      WorkOrder.create({
        ...data,
        workOrderCode: code,
        clientId,
        teamId: assignedTeam._id,
        isWasteCategory: isWaste,
        status: 'Assigned',
        assignedAt: new Date()
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
    ]) as any;

    if (wo) {
      newOrderObj._id = wo._id.toString();
      try {
        await autoAssign(wo._id.toString());
      } catch {}
      const populated = await WorkOrder.findById(wo._id).populate(['clientId', 'teamId', 'categoryId']).catch(() => null);
      if (populated) return populated;
    }
  } catch (err) {
    // Return memory object
  }

  return newOrderObj;
};

export const getAll = async (filters: any = {}, page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;
    const data = await Promise.race([
      WorkOrder.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(['clientId', 'teamId', 'categoryId']),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
    ]) as any[];

    if (data && data.length > 0) {
      const total = await WorkOrder.countDocuments(filters).catch(() => data.length);
      return { data, total, page, limit };
    }
  } catch (err) {
    // Fallback to in-memory store
  }

  let filtered = [...MOCK_WORK_ORDERS];
  if (filters.status) filtered = filtered.filter(w => w.status === filters.status);
  if (filters.clientId) {
    filtered = filtered.filter(w => {
      const cId = typeof w.clientId === 'object' && w.clientId ? (w.clientId as any)._id : w.clientId;
      return String(cId) === String(filters.clientId);
    });
  }
  
  return { data: filtered, total: filtered.length, page: 1, limit };
};

export const getById = async (id: string) => {
  try {
    const wo = await Promise.race([
      WorkOrder.findById(id).populate(['clientId', 'teamId', 'categoryId']),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
    ]);
    if (wo) return wo;
  } catch (err) {
    // Fallback
  }

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) return mockWo;
  throw new ApiError(404, 'Work order not found');
};

export const updateStatus = async (id: string, status: 'Open' | 'Assigned' | 'InProgress' | 'PendingReview' | 'Closed' | 'Flagged', userId?: string) => {
  try {
    const wo = await WorkOrder.findById(id);
    if (wo) {
      wo.status = status;
      if (status === 'Assigned' && !wo.assignedAt) wo.assignedAt = new Date();
      if (status === 'InProgress' && !wo.startedAt) wo.startedAt = new Date();
      if (status === 'Closed' && !wo.closedAt) wo.closedAt = new Date();
      await wo.save();
      return wo;
    }
  } catch (err) {}

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    mockWo.status = status as any;
    return mockWo;
  }
  throw new ApiError(404, 'Work order not found');
};

export const uploadBeforeImage = async (id: string, imageUrl: string) => {
  try {
    const wo = await WorkOrder.findByIdAndUpdate(id, { beforeImageUrl: imageUrl }, { new: true });
    if (wo) return wo;
  } catch (err) {}

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    (mockWo as any).beforeImageUrl = imageUrl;
    return mockWo;
  }
  throw new ApiError(404, 'Work order not found');
};

export const uploadAfterImage = async (id: string, imageUrl: string) => {
  let beforeUrl: string | undefined;

  try {
    const existing = await WorkOrder.findById(id);
    if (existing) {
      beforeUrl = existing.beforeImageUrl;
    }
  } catch (err) {}

  if (!beforeUrl) {
    const mockMatch = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
    if (mockMatch) beforeUrl = (mockMatch as any).beforeImageUrl;
  }

  // Run AI Verification with structural difference & fraud check (F-29)
  const aiResult = await verifyServiceQuality(id, beforeUrl, imageUrl);
  const confidence = aiResult.confidenceScore;
  const result = aiResult.result;
  const status = result === 'Pass' ? 'PendingReview' : 'Flagged';

  try {
    const wo = await WorkOrder.findById(id);
    if (wo) {
      wo.afterImageUrl = imageUrl;
      wo.aiConfidenceScore = confidence;
      wo.aiResult = result;
      wo.aiVerificationDetails = aiResult;
      wo.status = status as any;
      await wo.save();

      const populated = await WorkOrder.findById(wo._id).populate(['clientId', 'teamId', 'categoryId']).catch(() => null);
      if (populated) {
        (populated as any).aiVerificationDetails = aiResult;
        return populated;
      }
    }
  } catch (err) {}

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    (mockWo as any).afterImageUrl = imageUrl;
    (mockWo as any).aiConfidenceScore = confidence;
    (mockWo as any).aiResult = result;
    (mockWo as any).aiVerificationDetails = aiResult;
    (mockWo as any).status = status;
    return mockWo;
  }

  return await getById(id);
};

export const submitRating = async (id: string, clientId: string, stars: number, comment?: string) => {
  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    mockWo.status = 'Closed' as any;
    (mockWo as any).closedAt = new Date();
  }

  try {
    const wo = await WorkOrder.findById(id);
    if (wo) {
      wo.status = 'Closed';
      wo.closedAt = new Date();
      await wo.save();
      
      await Rating.create({
        workOrderId: id,
        clientId,
        teamId: wo.teamId,
        stars,
        comment,
        ratedAt: new Date()
      });

      if (wo.teamId) {
        const team = await FieldTeam.findById(wo.teamId);
        if (team) {
          const allRatings = await Rating.find({ teamId: wo.teamId });
          const totalStars = allRatings.reduce((acc, r) => acc + r.stars, 0);
          team.averageRating = allRatings.length > 0 ? (totalStars / allRatings.length) : stars;
          team.totalJobsCompleted = (team.totalJobsCompleted || 0) + 1;
          await team.save();
        }
      }

      try {
        const reportUrl = await generateReport(id);
        wo.pdfReportUrl = reportUrl;
        await wo.save();
      } catch (err) {
        console.error('Failed to generate PDF report:', err);
      }
    }
  } catch (err) {}

  return { success: true, stars, comment };
};

export const getCategories = async () => {
  try {
    const dbCats = await Promise.race([
      ServiceCategory.find(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
    ]) as any[];
    if (dbCats && dbCats.length > 0) return dbCats;
  } catch (err) {}

  return MOCK_CATEGORIES;
};
