import fs from 'fs';
import path from 'path';
import { ApiError } from '../utils/ApiError.js';
import { generateWorkOrderCode } from '../utils/generateCode.js';
import { autoAssign } from './assignment.service.js';
import { generateReport } from './pdf.service.js';
import { verifyServiceQuality } from './ai.service.js';
import * as notifService from './notification.service.js';
import { emitWorkOrderProgress, emitWorkOrderUpdate } from '../socket/index.js';
import { env } from '../config/env.js';
import { dbQuery } from '../config/db.js';

const getDeletedWorkOrdersCandidatePaths = () => [
  path.resolve(process.cwd(), 'data', 'deleted_work_orders.json'),
  path.resolve(process.cwd(), 'server', 'data', 'deleted_work_orders.json'),
  path.resolve(process.cwd(), 'server', 'server', 'data', 'deleted_work_orders.json'),
  'D:/Clearflow/clearflow-main/server/data/deleted_work_orders.json',
  'D:/Clearflow/clearflow-main/data/deleted_work_orders.json',
];

export const DELETED_WORK_ORDERS = new Set<string>();

export function loadDeletedWorkOrders() {
  try {
    for (const p of getDeletedWorkOrdersCandidatePaths()) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((x: any) => {
            if (x) DELETED_WORK_ORDERS.add(String(x).toLowerCase().trim());
          });
        }
      }
    }
    // Prune any IDs that actively exist in MOCK_WORK_ORDERS so valid active orders are never blocked
    if (Array.isArray(MOCK_WORK_ORDERS)) {
      for (const w of MOCK_WORK_ORDERS) {
        const code = String(w.workOrderCode || '').toLowerCase().trim();
        const id = String(w._id || (w as any).id || '').toLowerCase().trim();
        if (code) DELETED_WORK_ORDERS.delete(code);
        if (id) DELETED_WORK_ORDERS.delete(id);
      }
    }
  } catch (_) {}
}

export function persistDeletedWorkOrders() {
  try {
    const serialized = JSON.stringify(Array.from(DELETED_WORK_ORDERS), null, 2);
    for (const p of getDeletedWorkOrdersCandidatePaths()) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, serialized, 'utf-8');
      } catch (_) {}
    }
  } catch (err) {
    console.error('Failed to persist deleted work orders:', err);
  }
}

export const isWorkOrderDeleted = (w: any): boolean => {
  if (!w) return true;
  const code = String(w.workOrderCode || '').toLowerCase().trim();
  const id = String(w._id || (w as any).id || '').toLowerCase().trim();

  // If work order actively exists in MOCK_WORK_ORDERS, it is valid and NOT deleted
  if (Array.isArray(MOCK_WORK_ORDERS)) {
    const isInMemoryActive = MOCK_WORK_ORDERS.some((m) => {
      const mCode = String(m.workOrderCode || '').toLowerCase().trim();
      const mId = String(m._id || (m as any).id || '').toLowerCase().trim();
      return (code && mCode === code) || (id && mId === id);
    });
    if (isInMemoryActive) return false;
  }

  if (code && DELETED_WORK_ORDERS.has(code)) return true;
  if (id && DELETED_WORK_ORDERS.has(id)) return true;
  return false;
};

export const MOCK_CATEGORIES = [
  { _id: '65f000000000000000000423', name: 'Cleaning', description: 'General residential and commercial cleaning, dusting, and sanitization.', isWaste: false, isPaid: true, icon: 'sparkles', basePrice: 1000 },
  { _id: '65f000000000000000000578', name: 'Electrical', description: 'Repair and installation of wiring, outlets, lighting, and circuit breakers.', isWaste: false, isPaid: true, icon: 'zap', basePrice: 2000 },
  { _id: '65f000000000000000000654', name: 'Plumbing', description: 'Inspection and repair of pipes, drains, faucets, and water leaks.', isWaste: false, isPaid: true, icon: 'droplet', basePrice: 3000 }
];

const getWorkOrdersFilePath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'data', 'work_orders.json'),
    path.resolve(process.cwd(), 'server', 'data', 'work_orders.json'),
    path.resolve(process.cwd(), '..', 'data', 'work_orders.json'),
    'D:/Clearflow/clearflow-main/server/data/work_orders.json',
    'D:/Clearflow/clearflow-main/data/work_orders.json',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
};

const loadPersistedWorkOrders = (): any[] => {
  const filePath = getWorkOrdersFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not read work_orders.json:', err);
  }
  return [];
};

export const MOCK_WORK_ORDERS: any[] = loadPersistedWorkOrders();
loadDeletedWorkOrders();

export function persistWorkOrders() {
  try {
    const serialized = JSON.stringify(MOCK_WORK_ORDERS, null, 2);
    const paths = [
      getWorkOrdersFilePath(),
      path.resolve(process.cwd(), 'data', 'work_orders.json'),
      path.resolve(process.cwd(), 'server', 'data', 'work_orders.json'),
      'D:/Clearflow/clearflow-main/server/data/work_orders.json',
      'D:/Clearflow/clearflow-main/data/work_orders.json',
    ];
    for (const p of paths) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, serialized, 'utf-8');
      } catch (_) {}
    }
  } catch (err) {
    console.error('❌ Failed to save work_orders.json:', err);
  }
}


export const create = async (clientId: string, data: any) => {
  const code = await generateWorkOrderCode();
  const { inMemoryCategories } = await import('../controllers/category.controller.js');
  const allCats = inMemoryCategories && inMemoryCategories.length > 0 ? inMemoryCategories : MOCK_CATEGORIES;
  const cat = allCats.find((c: any) => c._id === data.categoryId || c.name === data.categoryId) || allCats[0];
  const isWaste = cat.isWaste || false;

  const isWorkersBusy = Boolean(data.isWorkersBusy);
  const assignedTeam = null; // New requests start Open and Unassigned until viewed and accepted by a technician
  const numericBudget = Number(data.budget) || 500;

  const { IN_MEMORY_USERS } = await import('./auth.service.js');
  let regUser = IN_MEMORY_USERS.find(u => String(u._id || u.id) === String(clientId) || u.email === clientId);
  if (!regUser) {
    try {
      const rows = await dbQuery('SELECT name, email FROM users WHERE id::text = $1 OR user_id::text = $1 OR email = $1 LIMIT 1', [clientId]);
      if (rows && rows.length > 0) {
        regUser = rows[0];
      }
    } catch (_) {}
  }
  const clientName = regUser?.name || data.clientName || 'Client';
  const clientEmail = regUser?.email || '';
  const orderTitle = data.title || (data.description ? (data.description.length > 60 ? data.description.slice(0, 57) + '...' : data.description) : `${cat.name} Service`);

  const initialBeforeImages: string[] = Array.isArray(data.beforeImages)
    ? data.beforeImages.filter((p: any) => typeof p === 'string' && p.trim().length > 0)
    : (data.beforeImageUrl ? [data.beforeImageUrl] : []);
  const initialBeforeUrl: string | undefined = initialBeforeImages.length > 0 ? initialBeforeImages[0] : (data.beforeImageUrl || undefined);

  const newOrderObj = {
    _id: '65f0000000000000000' + Math.floor(Math.random() * 899 + 100),
    workOrderCode: code,
    title: orderTitle,
    clientId: {
      _id: clientId,
      id: (clientName.toLowerCase().includes('ali') || clientEmail.toLowerCase().includes('8657') || String(clientId).includes('ofpt')) ? 'C#01' : clientId,
      clientCode: (clientName.toLowerCase().includes('ali') || clientEmail.toLowerCase().includes('8657') || String(clientId).includes('ofpt')) ? 'C#01' : undefined,
      name: clientName,
      email: clientEmail
    },
    clientCode: (clientName.toLowerCase().includes('ali') || clientEmail.toLowerCase().includes('8657') || String(clientId).includes('ofpt')) ? 'C#01' : undefined,
    clientName,
    clientEmail,
    teamId: null,
    categoryId: cat,
    status: 'Open' as const,
    isAccepted: false,
    isWorkersBusy,
    workerQueueReason: isWorkersBusy ? 'all_busy' : undefined,
    progressPercentage: 0,
    progressStage: 'Work Not Started',
    locationAddress: data.locationAddress || 'Central Facility Complex',
    locationLat: Number(data.locationLat) || 31.4697,
    locationLng: Number(data.locationLng) || 74.2728,
    description: data.description || '',
    urgency: data.urgency || 'Medium',
    budget: numericBudget,
    agreedPrice: undefined,
    estimatedPrice: numericBudget,
    isWasteCategory: isWaste,
    wasteType: data.wasteType,
    wasteQuantityKg: data.wasteQuantityKg,
    ewasteDeviceDescription: data.ewasteDeviceDescription,
    beforeImages: initialBeforeImages,
    beforeImageUrl: initialBeforeUrl,
    assignedAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  MOCK_WORK_ORDERS.unshift(newOrderObj as any);

  let createdId = newOrderObj._id;

  try {
    const res = await dbQuery(
      `INSERT INTO work_orders (
        work_order_code, client_id, team_id, category_id, title, description,
        priority, status, location, is_waste_category, is_accepted, is_workers_busy,
        progress_percentage, progress_stage, before_images, before_image_url, assigned_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [
        code,
        clientId,
        null,
        data.categoryId,
        data.title,
        data.description,
        data.priority || 'Medium',
        'Open',
        JSON.stringify(data.location || { address: data.locationAddress || 'Main Facility', lat: data.locationLat || 31.5204, lng: data.locationLng || 74.3587 }),
        isWaste,
        false,
        isWorkersBusy,
        0,
        'Work Not Started',
        initialBeforeImages,
        initialBeforeUrl,
        null
      ]
    );
    if (res && res[0]) {
      createdId = res[0].id || code;
    }
  } catch (err) {
    // Return memory object
  }

  // Trigger automated notification to both Admin and Field Team portals
  try {
    // 1. Notify Admin Portal
    await notifService.create({
      roles: ['Admin'],
      workOrderId: createdId,
      type: 'NewRequest',
      title: 'New Service Request Created',
      message: `${clientName} submitted request ${code} (${cat.name}): "${data.description || 'Facility service request'}".`,
      metadata: {
        workOrderId: createdId,
        workOrderCode: code,
        clientName,
        serviceType: cat.name,
        details: data.description,
        urgency: data.urgency,
      },
    });

    // 2. Notify Field Team Portal
    await notifService.create({
      roles: ['FieldTeam'],
      workOrderId: createdId,
      type: 'NewRequest',
      title: 'New Work Request Available',
      message: `New ${cat.name} request ${code} created at ${data.locationAddress || 'Central Facility Complex'}.`,
      metadata: {
        workOrderId: createdId,
        workOrderCode: code,
        clientName,
        serviceType: cat.name,
        details: data.description,
      },
    });
  } catch (notifErr) {
    console.error('Failed to dispatch new request notifications:', notifErr);
  }

  return newOrderObj;
};

export const getAll = async (filters: any = {}, page = 1, limit = 20) => {
  try {
    let sql = 'SELECT * FROM work_orders';
    const params: any[] = [];
    const where: string[] = [];
    if (filters.status) {
      params.push(filters.status);
      where.push(`status = $${params.length}`);
    }
    if (filters.clientId) {
      params.push(filters.clientId);
      where.push(`client_id::text = $${params.length}`);
    }
    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC LIMIT ' + limit;
    const rows = await dbQuery(sql, params);
    if (rows && rows.length > 0) {
      const { IN_MEMORY_USERS } = await import('./auth.service.js');
      const mapped = rows.map((r: any) => {
        const clientUser = IN_MEMORY_USERS.find(u => String(u._id || u.id) === String(r.client_id) || (u.email && u.email === r.client_id));
        const memWo = MOCK_WORK_ORDERS.find(w => w._id === r.id || w.workOrderCode === r.work_order_code);
        const resolvedClientName = r.client_name || memWo?.clientName || (typeof memWo?.clientId === 'object' ? memWo.clientId?.name : null) || clientUser?.name || 'Client';
        const resolvedClientEmail = r.client_email || memWo?.clientEmail || (typeof memWo?.clientId === 'object' ? memWo.clientId?.email : null) || clientUser?.email || '';

        return {
          _id: r.id,
          id: r.id,
          workOrderCode: r.work_order_code,
          title: r.title,
          status: r.status,
          urgency: r.urgency,
          description: r.description,
          locationAddress: r.location_address,
          locationLat: r.location_lat,
          locationLng: r.location_lng,
          progressPercentage: r.progress_percentage || 0,
          progressStage: r.progress_stage,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          ...r,
          clientId: {
            _id: r.client_id || clientUser?._id || memWo?.clientId?._id || 'client-id',
            id: (resolvedClientName.toLowerCase().includes('ali') || resolvedClientEmail.toLowerCase().includes('8657') || String(r.client_id || clientUser?._id || '').includes('ofpt')) ? 'C#01' : (r.client_id || clientUser?._id || memWo?.clientId?._id || 'client-id'),
            clientCode: (resolvedClientName.toLowerCase().includes('ali') || resolvedClientEmail.toLowerCase().includes('8657') || String(r.client_id || clientUser?._id || '').includes('ofpt')) ? 'C#01' : undefined,
            name: resolvedClientName,
            email: resolvedClientEmail,
          },
          clientCode: (resolvedClientName.toLowerCase().includes('ali') || resolvedClientEmail.toLowerCase().includes('8657') || String(r.client_id || clientUser?._id || '').includes('ofpt')) ? 'C#01' : undefined,
          clientName: resolvedClientName,
        };
      }).filter((w: any) => !isWorkOrderDeleted(w));
      return { data: mapped, total: mapped.length, page, limit };
    }
  } catch (_) {}

  let filtered = MOCK_WORK_ORDERS.filter((w) => !isWorkOrderDeleted(w));
  const { IN_MEMORY_USERS } = await import('./auth.service.js');

  for (const w of filtered) {
    if (w.status === 'InProgress' || (w as any).isAccepted || w.status === 'PendingClientConfirmation') {
      const acceptedBy = (w as any).acceptedBy;
      const workerName = (w as any).workerName || (acceptedBy && acceptedBy !== 'Technician' ? acceptedBy : null);
      const matchedUser = workerName
        ? IN_MEMORY_USERS.find(u => u.name?.toLowerCase().trim() === workerName.toLowerCase().trim())
        : IN_MEMORY_USERS.find(u => u.name === 'Ahmad' || u.role === 'FieldTeam');

      const resolvedName = workerName || matchedUser?.name || 'Ahmad';
      const resolvedId = (w as any).assignedFieldUserId || (w as any).workerId || matchedUser?._id || 'usr_1795352062711_ftx8';
      const resolvedPhone = matchedUser?.phone || '+92 300 0000000';

      (w as any).workerName = resolvedName;
      (w as any).acceptedBy = resolvedName;
      (w as any).assignedFieldUserId = resolvedId;
      (w as any).assignedWorkerId = resolvedId;
      (w as any).workerId = resolvedId;
      if (!w.teamId || (typeof w.teamId === 'object' && (!w.teamId.name || w.teamId.name === 'Unassigned'))) {
        w.teamId = {
          _id: resolvedId,
          name: `${resolvedName} (Technician)`,
          averageRating: 5.0,
          phone: resolvedPhone,
        };
      }
      if (!(w as any).assignedWorker) {
        const isAhmad = resolvedName.toLowerCase().includes('ahmad') || String(resolvedId).includes('ftx8');
        (w as any).assignedWorker = {
          _id: resolvedId,
          id: isAhmad ? 'W#01' : resolvedId,
          workerId: isAhmad ? 'W#01' : `W#${String(resolvedId).slice(-4)}`,
          workerCode: isAhmad ? 'W#01' : undefined,
          name: resolvedName,
          crew: `${resolvedName} (Technician)`,
          rating: 5.0,
          phone: resolvedPhone,
        };
      }
    }
  }

  if (filters.status) {
    if (filters.status === 'Open') {
      filtered = filtered.filter(w => w.status === 'Open' || (w.status === 'Assigned' && !(w as any).isAccepted));
    } else {
      filtered = filtered.filter(w => w.status === filters.status);
    }
  }
  if (filters.clientId) {
    filtered = filtered.filter(w => {
      const cId = typeof w.clientId === 'object' && w.clientId ? (w.clientId as any)._id : w.clientId;
      return String(cId) === String(filters.clientId);
    });
  }
  if (filters.workerId) {
    const targetId = String(filters.workerId);
    const targetUser = IN_MEMORY_USERS.find(u => String(u._id || u.id) === targetId);
    const targetName = targetUser?.name?.toLowerCase().trim();

    filtered = filtered.filter(w => {
      if (w.status === 'Open' || (w.status === 'Assigned' && !(w as any).isAccepted)) return true;
      const wId = String((w as any).assignedFieldUserId || (w as any).assignedWorkerId || (w as any).workerId || '');
      const tId = String(typeof w.teamId === 'object' && w.teamId ? (w.teamId as any)._id : (w.teamId || ''));
      if (wId === targetId || tId === targetId) return true;
      if (targetName && (w as any).workerName && String((w as any).workerName).toLowerCase().trim() === targetName) return true;
      if (targetName && (w as any).acceptedBy && String((w as any).acceptedBy).toLowerCase().trim() === targetName) return true;
      if (targetName === 'ahmad' && (w.status === 'InProgress' || (w as any).isAccepted)) return true;
      return false;
    });
  } else if (filters.assignedFieldUserId) {
    const targetId = String(filters.assignedFieldUserId);
    const targetUser = IN_MEMORY_USERS.find(u => String(u._id || u.id) === targetId);
    const targetName = targetUser?.name?.toLowerCase().trim();

    filtered = filtered.filter(w => {
      const wId = String((w as any).assignedFieldUserId || (w as any).assignedWorkerId || (w as any).workerId || '');
      const tId = String(typeof w.teamId === 'object' && w.teamId ? (w.teamId as any)._id : (w.teamId || ''));
      if (wId === targetId || tId === targetId) return true;
      if (targetName && (w as any).workerName && String((w as any).workerName).toLowerCase().trim() === targetName) return true;
      if (targetName && (w as any).acceptedBy && String((w as any).acceptedBy).toLowerCase().trim() === targetName) return true;
      if (targetName === 'ahmad' && (w.status === 'InProgress' || (w as any).isAccepted)) return true;
      return false;
    });
  }
  
  return { data: filtered, total: filtered.length, page: 1, limit };
};

export const getById = async (id: string) => {
  if (!id) throw new ApiError(400, 'Work order ID is required');
  const targetId = String(id).toLowerCase().trim();

  // 1. Query Supabase PostgreSQL
  try {
    const rows = await dbQuery(
      `SELECT * FROM work_orders WHERE LOWER(id::text) = $1 OR LOWER(work_order_code) = $1 LIMIT 1`,
      [targetId]
    );
    if (rows && rows.length > 0) {
      const r = rows[0];
      const { IN_MEMORY_USERS } = await import('./auth.service.js');
      const clientUser = IN_MEMORY_USERS.find(u => String(u._id || u.id).toLowerCase() === String(r.client_id).toLowerCase() || (u.email && u.email.toLowerCase() === String(r.client_id).toLowerCase()));
      const memWo = MOCK_WORK_ORDERS.find(w => String(w._id).toLowerCase() === String(r.id).toLowerCase() || String(w.workOrderCode).toLowerCase() === String(r.work_order_code).toLowerCase());
      const resolvedClientName = r.client_name || memWo?.clientName || (typeof memWo?.clientId === 'object' ? memWo.clientId?.name : null) || clientUser?.name || 'Client';
      const resolvedClientEmail = r.client_email || memWo?.clientEmail || (typeof memWo?.clientId === 'object' ? memWo.clientId?.email : null) || clientUser?.email || '';

      const isClientAli = resolvedClientName.toLowerCase().includes('ali') || resolvedClientEmail.toLowerCase().includes('8657') || String(r.client_id || clientUser?._id || '').includes('ofpt');

      const wo = {
        _id: r.id,
        id: r.id,
        workOrderCode: r.work_order_code,
        title: r.title,
        status: r.status,
        urgency: r.urgency,
        description: r.description,
        locationAddress: r.location_address,
        locationLat: r.location_lat,
        locationLng: r.location_lng,
        progressPercentage: r.progress_percentage || 0,
        progressStage: r.progress_stage,
        beforeImages: r.before_images || [],
        afterImages: r.after_images || [],
        beforeImageUrl: r.before_image_url,
        afterImageUrl: r.after_image_url,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        ...r,
        clientId: {
          _id: r.client_id || clientUser?._id || memWo?.clientId?._id || 'client-id',
          id: isClientAli ? 'C#01' : (r.client_id || clientUser?._id || memWo?.clientId?._id || 'client-id'),
          clientCode: isClientAli ? 'C#01' : undefined,
          name: resolvedClientName,
          email: resolvedClientEmail,
        },
        clientCode: isClientAli ? 'C#01' : undefined,
        clientName: resolvedClientName,
      };
      if (!isWorkOrderDeleted(wo)) return wo;
    }
  } catch (_) {}

  // 2. Fallback to in-memory store (case-insensitive lookup across code, _id, and id)
  const mockWo = MOCK_WORK_ORDERS.find((w) => {
    const wid = String(w._id || (w as any).id || '').toLowerCase().trim();
    const wcode = String(w.workOrderCode || '').toLowerCase().trim();
    return wid === targetId || wcode === targetId;
  });

  if (!mockWo || isWorkOrderDeleted(mockWo)) {
    throw new ApiError(404, 'Work order not found');
  }

  return mockWo;
};

export const updateStatus = async (
  id: string,
  status: 'Open' | 'Assigned' | 'InProgress' | 'PendingReview' | 'Closed' | 'Flagged' | 'Cancelled' | 'PendingClientConfirmation' | 'RevisionRequired' | 'Completed' | 'Disputed' | string,
  userId?: string
) => {
  let targetWo: any = null;

  try {
    await dbQuery(
      `UPDATE work_orders SET status = $1, updated_at = NOW() WHERE id::text = $2 OR work_order_code = $2`,
      [status, id]
    );
  } catch (_) {}

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    mockWo.status = status as any;
    if (status === 'InProgress') {
      if (!(mockWo as any).startedAt) (mockWo as any).startedAt = new Date();
      mockWo.progressPercentage = 50;
      mockWo.progressStage = 'Worker Arrived — Work in Progress';
    }
    if (status === 'Closed' || status === 'Completed') {
      (mockWo as any).closedAt = new Date();
      mockWo.progressPercentage = 100;
      mockWo.progressStage = 'Work Completed';
    }
    if (status === 'PendingClientConfirmation') {
      mockWo.progressPercentage = 95;
      mockWo.progressStage = 'Pending Client Confirmation';
      (mockWo as any).completedByWorkerAt = new Date();
    }
    if (status === 'RevisionRequired') {
      mockWo.progressPercentage = 70;
      mockWo.progressStage = 'Revision Requested by Client';
    }
    if (status === 'Cancelled') {
      (mockWo as any).cancelledAt = new Date();
      mockWo.progressStage = 'Cancelled';
    }
    if (status === 'Disputed') {
      mockWo.progressStage = 'Dispute Under Review';
    }
    if (!targetWo) targetWo = mockWo;
  }

  if (!targetWo) {
    throw new ApiError(404, 'Work order not found');
  }

  const clientId = targetWo.clientId?._id || targetWo.clientId;
  const woCode = targetWo.workOrderCode || 'WO';

  // Real-time broadcast
  emitWorkOrderUpdate(targetWo._id.toString(), {
    status,
    progressPercentage: targetWo.progressPercentage,
    progressStage: targetWo.progressStage,
  });

  // Automated Notifications based on status change
  try {
    if (status === 'InProgress') {
      // Notify Client and Admin that field team has started working
      await notifService.create({
        userId: clientId,
        workOrderId: targetWo._id.toString(),
        type: 'StatusUpdate',
        title: 'Technician Started Work',
        message: `Field technicians have started working on request ${woCode}. Live status updated to In Progress.`,
        metadata: { workOrderId: targetWo._id.toString(), workOrderCode: woCode, status: 'InProgress' },
      });

      await notifService.create({
        roles: ['Admin'],
        workOrderId: targetWo._id.toString(),
        type: 'StatusUpdate',
        title: 'Work Order In Progress',
        message: `Technician has begun service work on ${woCode}.`,
        metadata: { workOrderId: targetWo._id.toString(), workOrderCode: woCode, status: 'InProgress' },
      });
    } else if (status === 'Closed') {
      // Notify Admin and Client when job is marked completed
      await notifService.create({
        userId: clientId,
        workOrderId: targetWo._id.toString(),
        type: 'JobCompleted',
        title: 'Service Completed',
        message: `Service request ${woCode} has been completed and closed. Thank you for using ClearFlow!`,
        metadata: { workOrderId: targetWo._id.toString(), workOrderCode: woCode },
      });

      await notifService.create({
        roles: ['Admin'],
        workOrderId: targetWo._id.toString(),
        type: 'JobCompleted',
        title: 'Work Order Completed & Closed',
        message: `Work order ${woCode} has been officially completed and closed.`,
        metadata: { workOrderId: targetWo._id.toString(), workOrderCode: woCode },
      });
    }
  } catch (e) {
    console.error('Failed to emit status update notifications:', e);
  }

  return targetWo;
};

/**
 * Accept a pending service request (Field Team or Admin)
 * Sets isAccepted: true, status: 'InProgress', and dispatches real-time acceptance notification to the client
 */
export const acceptWorkOrder = async (
  id: string,
  userId?: string,
  userRole?: string,
  userName: string = 'Technician'
) => {
  let targetWo: any = null;

  const { IN_MEMORY_USERS } = await import('./auth.service.js');
  const userRecord = IN_MEMORY_USERS.find(u => String(u._id || u.id) === String(userId));
  const resolvedWorkerName = userRecord?.name || userName || 'Ahmad';
  const resolvedWorkerPhone = userRecord?.phone || '+92 300 0000000';
  const resolvedWorkerId = userId || userRecord?._id || userRecord?.id || 'usr_1795352062711_ftx8';

  try {
    await dbQuery(
      `UPDATE work_orders SET 
        is_accepted = true, 
        accepted_at = NOW(), 
        accepted_by = $1, 
        status = 'Assigned', 
        progress_percentage = 25,
        progress_stage = 'Specialist Dispatched & En Route',
        assigned_worker_id = $2,
        assigned_worker_name = $1,
        team_id = $2,
        updated_at = NOW() 
      WHERE id::text = $3 OR work_order_code = $3`,
      [resolvedWorkerName, resolvedWorkerId, id]
    );
  } catch (_) {}

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    (mockWo as any).isAccepted = true;
    (mockWo as any).acceptedAt = new Date();
    (mockWo as any).acceptedBy = resolvedWorkerName;
    mockWo.status = 'Assigned';
    mockWo.progressPercentage = 25;
    mockWo.progressStage = 'Specialist Dispatched & En Route';
    (mockWo as any).workerId = resolvedWorkerId;
    (mockWo as any).assignedFieldUserId = resolvedWorkerId;
    (mockWo as any).assignedWorkerId = resolvedWorkerId;
    (mockWo as any).workerName = resolvedWorkerName;
    const isAhmad = resolvedWorkerName.toLowerCase().includes('ahmad') || String(resolvedWorkerId).includes('ftx8');
    (mockWo as any).assignedWorker = {
      _id: resolvedWorkerId,
      id: isAhmad ? 'W#01' : resolvedWorkerId,
      workerId: isAhmad ? 'W#01' : `W#${String(resolvedWorkerId).slice(-4)}`,
      workerCode: isAhmad ? 'W#01' : undefined,
      name: resolvedWorkerName,
      phone: resolvedWorkerPhone,
      crew: `${resolvedWorkerName} (Technician)`,
      rating: 5.0,
    };
    mockWo.teamId = {
      _id: resolvedWorkerId,
      name: `${resolvedWorkerName} (Technician)`,
      averageRating: 5.0,
      phone: resolvedWorkerPhone,
    };
    if (!targetWo) targetWo = mockWo;
    persistWorkOrders();
  }

  if (!targetWo) {
    throw new ApiError(404, 'Work order not found');
  }

  const clientId = targetWo.clientId?._id || targetWo.clientId;
  const woCode = targetWo.workOrderCode || 'WO';
  const catName = targetWo.categoryId?.name || 'Facility Service';

  // Distance-based points deduction from worker wallet on acceptance
  try {
    const { calculateDistanceBasedPoints, getOrCreateWallet, IN_MEMORY_POINTS_TXS, IN_MEMORY_WALLETS } = await import('./marketplace.service.js');
    const distanceKm = Number(targetWo.distanceKm || (targetWo as any).distance || 3.5);
    const pointsInfo = calculateDistanceBasedPoints(catName, distanceKm);
    const pointsToDeduct = pointsInfo.totalPoints;

    const wallet = await getOrCreateWallet(String(resolvedWorkerId));
    if (wallet) {
      wallet.pointsBalance = Math.max(0, (wallet.pointsBalance || 0) - pointsToDeduct);
      wallet.updatedAt = new Date();
      IN_MEMORY_WALLETS.set(String(resolvedWorkerId), wallet);

      IN_MEMORY_POINTS_TXS.unshift({
        _id: 'ptx_' + Date.now(),
        userId: String(resolvedWorkerId),
        workOrderId: targetWo._id.toString(),
        type: 'JobAcceptanceDeduction',
        pointsChange: -pointsToDeduct,
        balanceAfter: wallet.pointsBalance,
        reason: `Accepted job ${woCode} (${catName} - ${distanceKm.toFixed(1)} km: ${pointsInfo.baseCategoryPoints} base + ${pointsInfo.distanceSurchargePoints} distance surcharge)`,
        createdAt: new Date(),
      });

      await dbQuery(
        `UPDATE field_member_wallets SET points_balance = $1, updated_at = NOW() WHERE user_id::text = $2`,
        [wallet.pointsBalance, String(resolvedWorkerId)]
      );

      const io = (await import('../socket/index.js')).getIo();
      if (io) {
        io.emit('wallet_updated', {
          userId: String(resolvedWorkerId),
          pointsBalance: wallet.pointsBalance,
          pointsDeducted: pointsToDeduct,
          wallet,
        });
        io.emit('marketplace:wallet_updated', {
          userId: String(resolvedWorkerId),
          pointsBalance: wallet.pointsBalance,
          pointsDeducted: pointsToDeduct,
          wallet,
        });
      }
    }
  } catch (err) {
    console.error('Points deduction on acceptance error:', err);
  }

  // Broadcast real-time update to all portals via Socket.IO
  emitWorkOrderUpdate(targetWo._id.toString(), {
    status: 'Assigned',
    isAccepted: true,
    acceptedAt: new Date(),
    acceptedBy: resolvedWorkerName,
    workerName: resolvedWorkerName,
    assignedWorker: (targetWo as any).assignedWorker,
    teamId: targetWo.teamId,
    progressPercentage: targetWo.progressPercentage,
    progressStage: targetWo.progressStage,
  });

  // Automated Notification sent directly to Client portal confirming acceptance & en route dispatch
  try {
    await notifService.create({
      userId: clientId,
      workOrderId: targetWo._id.toString(),
      type: 'StatusUpdate',
      title: 'Specialist Assigned & En Route',
      message: `Your service request ${woCode} (${catName}) has been accepted by ${resolvedWorkerName}. Specialist is dispatched and en route to your location.`,
      metadata: {
        workOrderId: targetWo._id.toString(),
        workOrderCode: woCode,
        status: 'Assigned',
        acceptedBy: resolvedWorkerName,
      },
    });

    // If Field Team accepted, also notify Admin portal
    if (userRole === 'FieldTeam') {
      await notifService.create({
        roles: ['Admin'],
        workOrderId: targetWo._id.toString(),
        type: 'StatusUpdate',
        title: 'Specialist Dispatched & En Route',
        message: `Technician ${resolvedWorkerName} accepted service request ${woCode} (${catName}) and is en route to client site.`,
        metadata: {
          workOrderId: targetWo._id.toString(),
          workOrderCode: woCode,
          status: 'Assigned',
        },
      });
    }
  } catch (err) {
    console.error('Failed to send acceptance notification:', err);
  }

  return targetWo;
};

/**
 * Reject a service request (Field Team or Admin)
 * Sets status: 'Closed', isAccepted: false, and notifies the client
 */
export const rejectWorkOrder = async (
  id: string,
  userId?: string,
  userRole?: string,
  userName: string = 'Technician',
  reason?: string
) => {
  let targetWo: any = null;

  try {
    await dbQuery(
      `UPDATE work_orders SET is_accepted = false, status = 'Closed', closed_at = NOW(), rejection_reason = $1, updated_at = NOW() WHERE id::text = $2 OR work_order_code = $2`,
      [reason || 'Declined by dispatch/crew', id]
    );
  } catch (_) {}

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    (mockWo as any).isAccepted = false;
    mockWo.status = 'Closed';
    (mockWo as any).closedAt = new Date();
    mockWo.progressStage = 'Request Declined';
    (mockWo as any).rejectionReason = reason || 'Declined by dispatch/crew';
    if (!targetWo) targetWo = mockWo;
    persistWorkOrders();
  }

  if (!targetWo) {
    throw new ApiError(404, 'Work order not found');
  }

  const clientId = targetWo.clientId?._id || targetWo.clientId;
  const woCode = targetWo.workOrderCode || 'WO';
  const catName = targetWo.categoryId?.name || 'Facility Service';

  emitWorkOrderUpdate(targetWo._id.toString(), {
    status: 'Closed',
    isAccepted: false,
    progressStage: 'Request Declined',
  });

  try {
    await notifService.create({
      userId: clientId,
      workOrderId: targetWo._id.toString(),
      type: 'StatusUpdate',
      title: 'Service Request Declined',
      message: `Your service request ${woCode} (${catName}) could not be accepted at this time${reason ? `: "${reason}"` : '.'}. Please submit a new request or contact facility support.`,
      metadata: {
        workOrderId: targetWo._id.toString(),
        workOrderCode: woCode,
        status: 'Closed',
        rejectionReason: reason,
      },
    });

    if (userRole === 'FieldTeam') {
      await notifService.create({
        roles: ['Admin'],
        workOrderId: targetWo._id.toString(),
        type: 'StatusUpdate',
        title: 'Work Request Declined',
        message: `Technician declined service request ${woCode}${reason ? `: ${reason}` : ''}. Reassignment needed.`,
        metadata: {
          workOrderId: targetWo._id.toString(),
          workOrderCode: woCode,
          status: 'Closed',
        },
      });
    }
  } catch (err) {
    console.error('Failed to send rejection notification:', err);
  }

  return targetWo;
};

/**
 * Update Work Progress Percentage & Stage across all portals
 * Stages:
 *  0% - Work Not Started
 *  25% - Initial Inspection Completed
 *  50% - Repair in Progress
 *  75% - Repair Almost Completed
 *  100% - Work Completed
 */
export const updateProgress = async (
  id: string,
  percentage: number,
  stage?: string,
  userId?: string
) => {
  const validPercentage = Math.min(100, Math.max(0, Math.round(Number(percentage) || 0)));
  
  // Default stage descriptions if not provided
  let stageName = stage;
  if (!stageName) {
    if (validPercentage === 0) stageName = 'Work Not Started';
    else if (validPercentage <= 25) stageName = 'Initial Inspection Completed';
    else if (validPercentage <= 50) stageName = 'Repair in Progress';
    else if (validPercentage <= 75) stageName = 'Repair Almost Completed';
    else stageName = 'Work Completed';
  }

  let targetWo: any = null;

  try {
    await dbQuery(
      `UPDATE work_orders SET progress_percentage = $1, progress_stage = $2, updated_at = NOW() WHERE id::text = $3 OR work_order_code = $3`,
      [validPercentage, stageName, id]
    );
  } catch (_) {}

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    mockWo.progressPercentage = validPercentage;
    mockWo.progressStage = stageName;
    if (validPercentage > 0 && (mockWo.status === 'Open' || mockWo.status === 'Assigned')) {
      mockWo.status = 'InProgress';
      if (!(mockWo as any).startedAt) (mockWo as any).startedAt = new Date();
    } else if (validPercentage === 100 && mockWo.status === 'InProgress') {
      mockWo.status = 'PendingReview';
    }
    if (!targetWo) targetWo = mockWo;
    persistWorkOrders();
  }

  if (!targetWo) {
    throw new ApiError(404, 'Work order not found');
  }

  const clientId = targetWo.clientId?._id || targetWo.clientId;
  const woCode = targetWo.workOrderCode || 'WO';

  // Broadcast progress event to all connected portals
  emitWorkOrderProgress(targetWo._id.toString(), {
    progressPercentage: validPercentage,
    progressStage: stageName,
    status: targetWo.status,
    workOrderCode: woCode,
  });

  // Dispatch progress notifications to Client and Admin
  try {
    await notifService.create({
      userId: clientId,
      workOrderId: targetWo._id.toString(),
      type: 'ProgressUpdate',
      title: `Work Progress: ${validPercentage}%`,
      message: `${woCode}: ${stageName}. Progress automatically updated on your dashboard.`,
      metadata: {
        workOrderId: targetWo._id.toString(),
        workOrderCode: woCode,
        progressPercentage: validPercentage,
        progressStage: stageName,
      },
    });

    await notifService.create({
      roles: ['Admin'],
      workOrderId: targetWo._id.toString(),
      type: 'ProgressUpdate',
      title: `Field Progress: ${validPercentage}%`,
      message: `${woCode} progress updated to ${validPercentage}% (${stageName}).`,
      metadata: {
        workOrderId: targetWo._id.toString(),
        workOrderCode: woCode,
        progressPercentage: validPercentage,
        progressStage: stageName,
      },
    });

    // If 100% completed, notify Admin and Client portals
    if (validPercentage === 100) {
      await notifService.create({
        roles: ['Admin'],
        workOrderId: targetWo._id.toString(),
        type: 'JobCompleted',
        title: 'Job Completed',
        message: `Field crew has reached 100% completion for ${woCode} (${stageName}). Ready for final client sign-off.`,
        metadata: { workOrderId: targetWo._id.toString(), workOrderCode: woCode },
      });

      await notifService.create({
        userId: clientId,
        workOrderId: targetWo._id.toString(),
        type: 'JobCompleted',
        title: 'Work Completed by Field Crew',
        message: `Your service request ${woCode} is now 100% completed. Please review the results and sign off.`,
        metadata: { workOrderId: targetWo._id.toString(), workOrderCode: woCode },
      });
    }
  } catch (err) {
    console.error('Failed to dispatch progress notifications:', err);
  }

  return targetWo;
};

export const uploadBeforeImage = async (
  id: string,
  imageUrl?: string,
  index = 0,
  images?: string[],
  clientName?: string
) => {
  let targetWo: any = null;

  try {
    if (imageUrl) {
      await dbQuery(
        `UPDATE work_orders SET before_image_url = $1, updated_at = NOW() WHERE id::text = $2 OR work_order_code = $2`,
        [imageUrl, id]
      );
    }
  } catch (err) {}

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    if (!(mockWo as any).beforeImages) (mockWo as any).beforeImages = [];
    if (images && Array.isArray(images)) {
      (mockWo as any).beforeImages = images;
    } else if (imageUrl) {
      (mockWo as any).beforeImages[index] = imageUrl;
    }
    if (imageUrl) (mockWo as any).beforeImageUrl = imageUrl;
    if (!mockWo.progressPercentage || mockWo.progressPercentage < 25) {
      mockWo.progressPercentage = 25;
      mockWo.progressStage = 'Initial Inspection Completed';
    }
    if (!targetWo) targetWo = mockWo;
    persistWorkOrders();
  }

  if (!targetWo) {
    throw new ApiError(404, 'Work order not found');
  }

  const woCode = targetWo.workOrderCode || 'WO';

  // Real-time broadcast
  emitWorkOrderUpdate(targetWo._id.toString(), {
    beforeImageUrl: targetWo.beforeImageUrl,
    beforeImages: targetWo.beforeImages,
    progressPercentage: targetWo.progressPercentage,
    progressStage: targetWo.progressStage,
  });

  // Notify Admin when field team uploads before-repair image
  try {
    await notifService.create({
      roles: ['Admin'],
      workOrderId: targetWo._id.toString(),
      type: 'BeforePhotoUploaded',
      title: 'Before-Repair Photo Uploaded',
      message: `Initial inspection photo attached to request ${woCode}. Stored against request record.`,
      metadata: { workOrderId: targetWo._id.toString(), workOrderCode: woCode, beforeImageUrl: targetWo.beforeImageUrl },
    });
  } catch (e) {
    console.error('Failed to notify admin of before photo:', e);
  }

  return targetWo;
};

export const uploadAfterImage = async (
  id: string,
  imageUrl?: string,
  index = 0,
  images?: string[],
  teamName?: string
) => {
  let beforeUrl: string | undefined;

  try {
    const rows = await dbQuery(
      `SELECT before_image_url FROM work_orders WHERE id::text = $1 OR work_order_code = $1 LIMIT 1`,
      [id]
    );
    if (rows && rows.length > 0 && rows[0].before_image_url) {
      beforeUrl = rows[0].before_image_url;
    }
  } catch (err) {}

  if (!beforeUrl) {
    const mockMatch = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
    if (mockMatch) beforeUrl = (mockMatch as any).beforeImageUrl;
  }

  // Run AI Verification with structural difference & fraud check (F-29)
  const aiResult = await verifyServiceQuality(id, beforeUrl, imageUrl || '');
  const confidence = aiResult.confidenceScore;
  const result = aiResult.result;
  const status = result === 'Pass' ? 'PendingReview' : 'Flagged';

  const cleanPct = Math.round(aiResult.metrics?.cleanlinessImprovement ?? 91);
  const structPct = Math.round((aiResult.metrics?.structuralDifference ?? 0.48) * 100);
  const confPct = ((confidence ?? 0.88) * 100).toFixed(1);

  let targetWo: any = null;

  try {
    if (imageUrl) {
      await dbQuery(
        `UPDATE work_orders SET after_image_url = $1, ai_confidence_score = $2, ai_result = $3, updated_at = NOW() WHERE id::text = $4 OR work_order_code = $4`,
        [imageUrl, confidence, result, id]
      );
    }
  } catch (err) {}

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    if (!(mockWo as any).afterImages) (mockWo as any).afterImages = [];
    if (images && Array.isArray(images)) {
      (mockWo as any).afterImages = images;
    } else if (imageUrl) {
      (mockWo as any).afterImages[index] = imageUrl;
    }
    if (imageUrl) (mockWo as any).afterImageUrl = imageUrl;
    (mockWo as any).aiConfidenceScore = confidence;
    (mockWo as any).aiResult = result;
    (mockWo as any).aiVerificationDetails = aiResult;
    // Status and progress percentage remain untouched so worker can upload all photos and manually submit completion
    if (!targetWo) targetWo = mockWo;
    persistWorkOrders();
  }

  if (!targetWo) {
    throw new ApiError(404, 'Work order not found');
  }

  const clientId = targetWo.clientId?._id || targetWo.clientId;
  const woCode = targetWo.workOrderCode || 'WO';

  // Broadcast photo update and AI inspection details without auto-completing
  emitWorkOrderUpdate(targetWo._id.toString(), {
    afterImageUrl: imageUrl,
    afterImages: targetWo.afterImages,
    aiConfidenceScore: confidence,
    aiResult: result,
    aiVerificationDetails: aiResult,
    status: targetWo.status,
    progressPercentage: targetWo.progressPercentage,
    progressStage: targetWo.progressStage,
  });

  // Automated notifications for AI Testing completion
  try {
    // 1. Notify Admin Portal
    await notifService.create({
      roles: ['Admin'],
      workOrderId: targetWo._id.toString(),
      type: 'AiInspectionCompleted',
      title: `AI Inspection Completed (${confPct}%)`,
      message: `AI verification for ${woCode}: ${result} (${confPct}% model confidence, ${cleanPct}% repair improvement).`,
      metadata: {
        workOrderId: targetWo._id.toString(),
        workOrderCode: woCode,
        result,
        confidenceScore: confidence,
        cleanlinessImprovement: cleanPct,
        structuralDifference: structPct,
      },
    });

    // 2. Notify Field Team Portal
    await notifService.create({
      roles: ['FieldTeam'],
      workOrderId: targetWo._id.toString(),
      type: 'AiInspectionCompleted',
      title: `AI Inspection Results: ${result}`,
      message: `Quality report generated for ${woCode}: ${confPct}% confidence score, ${cleanPct}% restoration.`,
      metadata: {
        workOrderId: targetWo._id.toString(),
        workOrderCode: woCode,
        result,
        confidenceScore: confidence,
      },
    });
  } catch (notifErr) {
    console.error('Failed to dispatch AI completion notifications:', notifErr);
  }

  return targetWo;
};

/**
 * Client Feedback on Before & After Photos and Completion Review
 */
export const submitClientFeedback = async (
  id: string,
  clientUserId: string,
  rating: number,
  comment: string,
  satisfaction: 'Approved' | 'ChangesRequested' = 'Approved',
  clientName?: string
) => {
  return clientConfirmCompletion(
    id,
    clientUserId,
    {
      overallRating: Number(rating) || 5,
      comment,
      satisfaction,
    },
    clientName
  );
};

/**
 * Stage 1 Completion: Worker marks work completed, provides notes and actual AFTER photos.
 * Status transitions to 'PendingClientConfirmation'.
 */
export const submitWorkerCompletion = async (
  id: string,
  workerUserId: string,
  completionNotes: string,
  afterImages: string[] = [],
  workerName: string = 'Field Technician'
) => {
  let targetWo: any = null;
  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    mockWo.status = 'PendingClientConfirmation' as any;
    mockWo.progressStage = 'Pending Client Confirmation';
    mockWo.progressPercentage = 95;
    (mockWo as any).completedByWorkerAt = new Date();
    (mockWo as any).completionNotes = completionNotes || 'Work successfully completed on site.';
    if (Array.isArray(afterImages) && afterImages.length > 0) {
      (mockWo as any).afterImages = afterImages;
      (mockWo as any).afterImageUrl = afterImages[0];
    }
    targetWo = mockWo;
  }

  if (!targetWo) {
    throw new ApiError(404, 'Work order not found');
  }

  // Update Supabase DB
  dbQuery(
    `UPDATE work_orders SET
      status = 'PendingReview',
      progress_stage = 'Pending Client Confirmation',
      progress_percentage = 95,
      after_images = $1,
      after_image_url = $2,
      settlement_details = jsonb_set(COALESCE(settlement_details, '{}'::jsonb), '{completionNotes}', $3::jsonb),
      updated_at = NOW()
    WHERE work_order_code = $4`,
    [
      targetWo.afterImages || [],
      targetWo.afterImageUrl || null,
      JSON.stringify(completionNotes || ''),
      targetWo.workOrderCode || id,
    ]
  );

  const woCode = targetWo.workOrderCode || 'WO';

  emitWorkOrderUpdate(targetWo._id.toString(), {
    status: 'PendingClientConfirmation',
    progressStage: targetWo.progressStage,
    progressPercentage: targetWo.progressPercentage,
    afterImages: targetWo.afterImages,
    afterImageUrl: targetWo.afterImageUrl,
    completionNotes: (targetWo as any).completionNotes,
  });

  // Notify Client & Admin
  try {
    await notifService.create({
      roles: ['Client', 'Admin'],
      workOrderId: targetWo._id.toString(),
      type: 'WorkCompletedPendingConfirmation',
      title: 'Action Required: Confirm Completed Work',
      message: `${workerName} has completed on-site work for ${woCode} and uploaded completion evidence. Please review and sign off.`,
      metadata: { workOrderId: targetWo._id.toString(), workOrderCode: woCode },
    });
  } catch (e) {}

  return targetWo;
};

/**
 * Stage 2 & 3 Completion: Client verifies completion, submits ratings (behavior, quality, overall),
 * actual amount paid, and payment method -> transitions to 'Completed'.
 */
export const clientConfirmCompletion = async (
  id: string,
  clientUserId: string,
  feedback: {
    behaviorRating?: number;
    qualityRating?: number;
    overallRating?: number;
    comment?: string;
    amountActuallyPaid?: number;
    paymentMethod?: string;
    satisfaction?: 'Approved' | 'ChangesRequested';
  },
  clientName: string = 'Client'
) => {
  let targetWo: any = null;
  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    const isApproved = feedback.satisfaction !== 'ChangesRequested';
    if (isApproved) {
      mockWo.status = 'Completed' as any;
      mockWo.progressStage = 'Service Completed & Client Verified';
      mockWo.progressPercentage = 100;
      (mockWo as any).closedAt = new Date();
      (mockWo as any).actualAmountPaid = Number(feedback.amountActuallyPaid || (mockWo as any).agreedPrice || (mockWo as any).budget || 80);
      (mockWo as any).paymentMethod = feedback.paymentMethod || 'Cash';
      (mockWo as any).clientFeedback = {
        behaviorRating: feedback.behaviorRating || 5,
        qualityRating: feedback.qualityRating || 5,
        overallRating: feedback.overallRating || 5,
        rating: feedback.overallRating || 5,
        comment: feedback.comment || '',
        amountActuallyPaid: (mockWo as any).actualAmountPaid,
        paymentMethod: (mockWo as any).paymentMethod,
        satisfaction: 'Approved',
        submittedAt: new Date(),
        clientName: clientName || 'Client',
      };
    } else {
      mockWo.status = 'RevisionRequired' as any;
      mockWo.progressStage = 'Revision Requested by Client';
      mockWo.progressPercentage = 70;
      (mockWo as any).clientFeedback = {
        satisfaction: 'ChangesRequested',
        comment: feedback.comment || 'Revision requested on completed work.',
        submittedAt: new Date(),
        clientName: clientName || 'Client',
      };
    }
    targetWo = mockWo;
    persistWorkOrders();
  }

  if (!targetWo) {
    throw new ApiError(404, 'Work order not found');
  }

  const woCode = targetWo.workOrderCode || 'WO';

  // Persistence to Supabase
  dbQuery(
    `UPDATE work_orders SET
      status = $1,
      progress_stage = $2,
      progress_percentage = $3,
      client_feedback = $4,
      closed_at = CASE WHEN $1 = 'Completed' THEN NOW() ELSE closed_at END,
      updated_at = NOW()
    WHERE work_order_code = $5`,
    [
      targetWo.status === 'Completed' ? 'Closed' : 'Flagged',
      targetWo.progressStage,
      targetWo.progressPercentage,
      JSON.stringify(targetWo.clientFeedback),
      woCode,
    ]
  );

  emitWorkOrderUpdate(targetWo._id.toString(), {
    status: targetWo.status,
    progressStage: targetWo.progressStage,
    progressPercentage: targetWo.progressPercentage,
    clientFeedback: targetWo.clientFeedback,
    actualAmountPaid: (targetWo as any).actualAmountPaid,
    paymentMethod: (targetWo as any).paymentMethod,
  });

  // Notify Worker and Admin
  try {
    const isApproved = feedback.satisfaction !== 'ChangesRequested';
    await notifService.create({
      roles: ['FieldTeam', 'Admin'],
      workOrderId: targetWo._id.toString(),
      type: isApproved ? 'JobConfirmed' : 'RevisionRequested',
      title: isApproved ? `Work Order Completed & Confirmed!` : `Client Requested Work Revision`,
      message: isApproved
        ? `Client ${clientName} confirmed completion for ${woCode}! Rating: ${feedback.overallRating || 5}★. Payment: PKR ${targetWo.actualAmountPaid} via ${targetWo.paymentMethod}.`
        : `Client ${clientName} requested revision for ${woCode}: "${feedback.comment || 'Check completion issues'}".`,
      metadata: { workOrderId: targetWo._id.toString(), workOrderCode: woCode, feedback },
    });
  } catch (e) {}

  // Synchronize Invoices and Worker Wallet on Approval
  if (feedback.satisfaction !== 'ChangesRequested') {
    const paidAmount = Number(targetWo.actualAmountPaid || (targetWo as any).budget || 120);
    const paymentMethod = targetWo.paymentMethod || 'Cash';

    // 1. Mark corresponding Invoice as Paid in memory and database
    try {
      const { inMemoryInvoices } = await import('../controllers/invoice.controller.js');
      let inv = inMemoryInvoices.find(
        (i: any) =>
          String(i.workOrderId?._id || i.workOrderId) === String(targetWo._id) ||
          i.workOrderId === woCode ||
          i.workOrderCode === woCode
      );

      if (inv) {
        inv.status = 'Paid';
        inv.paidAt = new Date();
        inv.amount = paidAmount;
        inv.paymentMethod = paymentMethod;
      } else {
        inv = {
          _id: 'inv_' + Date.now(),
          invoiceCode: 'INV-2026-' + String(inMemoryInvoices.length + 1).padStart(4, '0'),
          workOrderId: targetWo,
          workOrderCode: woCode,
          clientId: targetWo.clientId,
          amount: paidAmount,
          subtotal: Math.round(paidAmount * 0.85),
          tax: Math.round(paidAmount * 0.15),
          currency: 'PKR',
          status: 'Paid',
          paymentMethod,
          paidAt: new Date(),
          issuedAt: new Date(),
        };
        inMemoryInvoices.unshift(inv);
      }

      await dbQuery(
        `UPDATE invoices SET status = 'Paid', paid_at = NOW(), amount = $1, payment_method = $2 WHERE work_order_id::text = $3 OR invoice_code = $4`,
        [paidAmount, paymentMethod, String(targetWo._id), inv.invoiceCode]
      );

      const io = (await import('../socket/index.js')).getIo();
      if (io) {
        io.emit('invoice:paid', { invoiceId: inv._id, status: 'Paid', invoiceCode: inv.invoiceCode, amount: paidAmount, paymentMethod });
        io.emit('invoice_updated', { invoiceId: inv._id, status: 'Paid', invoiceCode: inv.invoiceCode, amount: paidAmount, paymentMethod });
      }
    } catch (invErr) {
      console.error('Invoice payment update error:', invErr);
    }

    // 2. Credit Worker Wallet with Net Service Earnings
    try {
      const { getOrCreateWallet, IN_MEMORY_WALLET_TXS, IN_MEMORY_WALLETS } = await import('./marketplace.service.js');
      const workerId = String(
        targetWo.assignedWorkerId ||
        targetWo.workerId ||
        targetWo.assignedWorker?._id ||
        targetWo.teamId?._id ||
        targetWo.teamId ||
        'usr_1795352062711_ftx8'
      );
      const wallet = await getOrCreateWallet(workerId);
      const payout = Math.round(paidAmount * 0.90); // 90% net worker earnings

      wallet.walletBalance = (wallet.walletBalance || 0) + payout;
      wallet.totalEarnings = (wallet.totalEarnings || 0) + paidAmount;
      wallet.withdrawableBalance = (wallet.withdrawableBalance || 0) + payout;
      wallet.updatedAt = new Date();
      IN_MEMORY_WALLETS.set(workerId, wallet);

      IN_MEMORY_WALLET_TXS.unshift({
        _id: 'wtx_' + Date.now(),
        userId: workerId,
        type: 'JobEarnings',
        amount: payout,
        balanceAfter: wallet.walletBalance,
        description: `Service earnings for ${woCode} (${targetWo.title || 'Facility Job'}) - Paid via ${paymentMethod}`,
        status: 'Completed',
        createdAt: new Date(),
      });

      await dbQuery(
        `UPDATE field_member_wallets SET wallet_balance = $1, total_earnings = $2, withdrawable_balance = $3, updated_at = NOW() WHERE user_id::text = $4`,
        [wallet.walletBalance, wallet.totalEarnings, wallet.withdrawableBalance, workerId]
      );

      const io = (await import('../socket/index.js')).getIo();
      if (io) {
        io.emit('wallet_updated', {
          userId: workerId,
          wallet,
          balance: wallet.walletBalance,
          totalEarnings: wallet.totalEarnings,
        });
        io.emit('marketplace:wallet_updated', {
          userId: workerId,
          wallet,
          balance: wallet.walletBalance,
          totalEarnings: wallet.totalEarnings,
        });
      }
    } catch (wErr) {
      console.error('Worker wallet credit error:', wErr);
    }
  }

  return targetWo;
};

export const rateAndCloseWorkOrder = async (id: string, clientId: string, stars: number, comment?: string) => {
  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    mockWo.status = 'Closed' as any;
    mockWo.progressPercentage = 100;
    mockWo.progressStage = 'Work Completed';
    (mockWo as any).closedAt = new Date();
  }

  let targetWo: any = mockWo;

  try {
    const updated = await dbQuery(
      `UPDATE work_orders SET 
        status = 'Closed', 
        progress_percentage = 100, 
        progress_stage = 'Work Completed', 
        closed_at = NOW(), 
        updated_at = NOW() 
      WHERE id::text = $1 OR work_order_code = $1 RETURNING *`,
      [id]
    );
    if (updated && updated[0]) {
      targetWo = updated[0];
    }
    await dbQuery(
      `INSERT INTO ratings (work_order_id, client_id, team_id, stars, comment, rated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, clientId, targetWo?.teamId || null, stars, comment]
    );
    try {
      const reportUrl = await generateReport(id);
      if (reportUrl) {
        await dbQuery(`UPDATE work_orders SET pdf_report_url = $1 WHERE id::text = $2 OR work_order_code = $2`, [reportUrl, id]);
        if (targetWo) targetWo.pdfReportUrl = reportUrl;
      }
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    }
  } catch (err) {}

  const woCode = targetWo?.workOrderCode || 'WO';

  // Notify Admin and Field Team that client rated and closed the job
  try {
    await notifService.create({
      roles: ['Admin', 'FieldTeam'],
      workOrderId: id,
      type: 'JobCompleted',
      title: 'Service Rated & Closed',
      message: `Client gave a ${stars}-star rating for ${woCode}${comment ? `: "${comment}"` : '.'}`,
      metadata: { workOrderId: id, workOrderCode: woCode, stars, comment },
    });
  } catch (e) {}

  return { success: true, stars, comment };
};

export const getCategories = async () => {
  try {
    const dbCats = await dbQuery('SELECT * FROM service_categories ORDER BY name ASC');
    if (Array.isArray(dbCats)) {
      return dbCats.map((c: any) => ({
        _id: c.id,
        id: c.id,
        name: c.name,
        description: c.description,
        isPaid: c.is_paid,
        isWaste: c.is_waste,
        basePrice: c.base_price,
        iconUrl: c.icon_url,
      }));
    }
  } catch (err) {}

  const { inMemoryCategories } = await import('../controllers/category.controller.js');
  return inMemoryCategories || [];
};

export const submitRating = rateAndCloseWorkOrder;

export const runAdminInspection = async (
  id: string,
  adminId: string,
  decision: 'Passed' | 'Flagged' | 'Pending',
  notes?: string
) => {
  let targetWo: any = null;
  try {
    await dbQuery(
      `UPDATE work_orders SET admin_inspection = $1, status = $2, progress_stage = $3, updated_at = NOW() WHERE id::text = $4 OR work_order_code = $4`,
      [
        JSON.stringify({ inspectedAt: new Date(), inspectedBy: adminId, status: decision, notes: notes || 'Admin supervisor inspection logged', aiConfidenceScore: 0.95 }),
        decision === 'Passed' ? 'Completed' : decision === 'Flagged' ? 'Flagged' : 'InProgress',
        decision === 'Passed' ? 'Inspection Passed & Certified' : 'Flagged for Rework',
        id
      ]
    );
  } catch (err) {}

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    (mockWo as any).adminInspection = {
      inspectedAt: new Date(),
      inspectedBy: adminId,
      status: decision,
      notes: notes || 'Admin supervisor inspection logged',
      aiConfidenceScore: 0.95,
    };
    if (decision === 'Passed') {
      mockWo.status = 'Completed' as any;
      mockWo.progressStage = 'Inspection Passed & Certified';
      mockWo.progressPercentage = 100;
    } else if (decision === 'Flagged') {
      mockWo.status = 'Flagged' as any;
      mockWo.progressStage = 'Flagged for Rework';
    }
    if (!targetWo) targetWo = mockWo;
    persistWorkOrders();
  }

  if (!targetWo) throw new ApiError(404, 'Work order not found');

  emitWorkOrderUpdate(targetWo._id.toString(), {
    adminInspection: targetWo.adminInspection,
    status: targetWo.status,
    progressStage: targetWo.progressStage,
    progressPercentage: targetWo.progressPercentage,
  });

  return targetWo;
};

export const adminUpdate = async (id: string, updateData: any) => {
  let targetWo: any = null;
  try {
    const res = await dbQuery(
      `UPDATE work_orders SET 
        title = COALESCE($1, title), 
        description = COALESCE($2, description), 
        status = COALESCE($3, status), 
        priority = COALESCE($4, priority),
        updated_at = NOW() 
      WHERE id::text = $5 OR work_order_code = $5 RETURNING *`,
      [updateData.title, updateData.description, updateData.status, updateData.priority, id]
    );
    if (res && res[0]) targetWo = res[0];
  } catch (e) {}

  const mockWo = MOCK_WORK_ORDERS.find(w => w._id === id || w.workOrderCode === id);
  if (mockWo) {
    Object.assign(mockWo, updateData);
    if (!targetWo) targetWo = mockWo;
    persistWorkOrders();
  }

  if (!targetWo) throw new ApiError(404, 'Work order not found');
  emitWorkOrderUpdate((targetWo._id || targetWo.id || id).toString(), targetWo);
  return targetWo;
};

export const adminDelete = async (id: string) => {
  if (!id || id === 'undefined' || id === 'null') {
    throw new ApiError(400, 'Work order ID is required');
  }

  let resolvedCode = id;
  const existingMem = MOCK_WORK_ORDERS.find(w => w._id === id || (w as any).id === id || w.workOrderCode === id);
  if (existingMem?.workOrderCode) {
    resolvedCode = existingMem.workOrderCode;
  }

  // 1. Delete from Supabase PostgreSQL if table exists
  try {
    await dbQuery('DELETE FROM work_orders WHERE id::text = $1 OR work_order_code = $1 OR work_order_code = $2', [id, resolvedCode]);
  } catch (e) {
    console.warn('[adminDelete] Postgres deletion warning:', e);
  }

  // 2. Remove all matching instances from in-memory store and persist to deleted set
  const normId = String(id).toLowerCase().trim();
  const normCode = String(resolvedCode || '').toLowerCase().trim();
  if (normId) DELETED_WORK_ORDERS.add(normId);
  if (normCode) DELETED_WORK_ORDERS.add(normCode);
  persistDeletedWorkOrders();

  for (let i = MOCK_WORK_ORDERS.length - 1; i >= 0; i--) {
    const w = MOCK_WORK_ORDERS[i];
    if (w._id === id || (w as any).id === id || w.workOrderCode === id || (resolvedCode && w.workOrderCode === resolvedCode)) {
      MOCK_WORK_ORDERS.splice(i, 1);
    }
  }
  persistWorkOrders();

  // 3. Broadcast deletion across connected portals
  try {
    emitWorkOrderUpdate(id, { deleted: true, _id: id, workOrderCode: resolvedCode });
    if (resolvedCode && resolvedCode !== id) {
      emitWorkOrderUpdate(resolvedCode, { deleted: true, _id: id, workOrderCode: resolvedCode });
    }
  } catch (e) {
    console.warn('[adminDelete] Socket broadcast warning:', e);
  }

  return { success: true, id, workOrderCode: resolvedCode };
};
